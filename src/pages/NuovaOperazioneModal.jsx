import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Search, User, Truck, Type, ChevronDown, ChevronUp, Star } from 'lucide-react';
import RicercaSocioModal from './RicercaSocioModal';
import { useAnno, getAnnoDateRange } from '../data/AnnoContext';
import { useSocieta } from '../data/SocietaContext';
import './NuovaOperazioneModal.css';

const MODALITA = ['Contanti', 'Bonifico', 'Carta di credito', 'Assegno', 'POS', 'Altro'];

const EMPTY_FORM = {
    data_pagamento: new Date().toISOString().split('T')[0],
    importo: '',
    descrizione: '',
    modalita_pagamento: 'Contanti',
    conto_destinazione: '',
    note: '',
};

// ---------------------------------------------------------------------------
// Componente selezione fornitore inline con creazione al volo
// ---------------------------------------------------------------------------
const FornitoreSelector = ({ fornitori, selected, onSelect, societaId, onFornitoreCreated }) => {
    const [query, setQuery] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [newForm, setNewForm] = useState({ denominazione: '', comune: '', codice_fiscale: '' });
    const [saving, setSaving] = useState(false);
    const [newError, setNewError] = useState(null);

    const filtered = useMemo(() => {
        if (!query.trim()) return fornitori;
        const q = query.toLowerCase();
        return fornitori.filter(f =>
            (f.denominazione || '').toLowerCase().includes(q) ||
            (f.comune || '').toLowerCase().includes(q)
        );
    }, [fornitori, query]);

    const handleCreate = async () => {
        if (!newForm.denominazione.trim()) {
            setNewError('La denominazione è obbligatoria.');
            return;
        }
        setNewError(null);
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/payments/api/fornitori', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ denominazione: newForm.denominazione.trim(), comune: newForm.comune.trim() || null, codice_fiscale: newForm.codice_fiscale.trim() || null, societa_id: societaId }),
            });
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                throw new Error(d.error || 'Errore creazione fornitore');
            }
            const created = await res.json();
            onFornitoreCreated?.(created);
            onSelect(created);
            setShowNew(false);
            setNewForm({ denominazione: '', comune: '', codice_fiscale: '' });
        } catch (e) {
            setNewError(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="nom-selector-box">
            <div className="nom-selector-search">
                <Search size={14} />
                <input
                    className="md-input"
                    placeholder="Cerca fornitore..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    autoFocus
                />
            </div>
            <div className="nom-selector-list">
                {filtered.length === 0 ? (
                    <div className="nom-selector-empty">Nessun fornitore trovato</div>
                ) : filtered.map(f => (
                    <div
                        key={f.id}
                        className={`nom-selector-item${selected?.id === f.id ? ' nom-selector-item--active' : ''}`}
                        onClick={() => onSelect(f)}
                    >
                        <Truck size={14} style={{ flexShrink: 0, color: 'var(--danger)' }} />
                        <span>{f.denominazione}</span>
                        {f.comune && <span className="nom-selector-sub">{f.comune}</span>}
                    </div>
                ))}
            </div>
            {/* Aggiungi nuovo fornitore */}
            <div className="nom-nuovo-fornitore">
                <button
                    type="button"
                    className="nom-nuovo-fornitore-toggle"
                    onClick={() => { setShowNew(v => !v); setNewError(null); }}
                >
                    {showNew ? <ChevronUp size={13} /> : <Plus size={13} />}
                    {showNew ? 'Annulla' : 'Nuovo fornitore'}
                </button>
                {showNew && (
                    <div className="nom-nuovo-fornitore-form">
                        <input
                            className="md-input"
                            placeholder="Denominazione *"
                            value={newForm.denominazione}
                            onChange={e => setNewForm(p => ({ ...p, denominazione: e.target.value.toUpperCase() }))}
                        />
                        <div className="nom-nuovo-fornitore-row">
                            <input
                                className="md-input"
                                placeholder="Comune"
                                value={newForm.comune}
                                onChange={e => setNewForm(p => ({ ...p, comune: e.target.value }))}
                            />
                            <input
                                className="md-input"
                                placeholder="Codice fiscale / P.IVA"
                                value={newForm.codice_fiscale}
                                onChange={e => setNewForm(p => ({ ...p, codice_fiscale: e.target.value.toUpperCase() }))}
                            />
                        </div>
                        {newError && <div className="nom-nuovo-fornitore-error">{newError}</div>}
                        <button
                            type="button"
                            className="nom-nuovo-fornitore-save"
                            onClick={handleCreate}
                            disabled={saving}
                        >
                            {saving ? 'Salvataggio…' : 'Crea e seleziona'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Modal principale
// ---------------------------------------------------------------------------
const NuovaOperazioneModal = ({ isOpen, onClose, onSaved, societaId, initialData }) => {
    const { selectedAnno } = useAnno();
    const { societaList } = useSocieta();
    const selectedSocieta = useMemo(
        () => societaList.find(s => s.id == societaId) || null,
        [societaList, societaId]
    );

    const { minDate, maxDate } = useMemo(() => {
        if (!selectedAnno) return { minDate: undefined, maxDate: undefined };
        const range = getAnnoDateRange(selectedAnno, selectedSocieta);
        const today = new Date();
        const effectiveMax = range.end < today ? range.end : today;
        const fmt = (d) => d.toISOString().split('T')[0];
        return { minDate: fmt(range.start), maxDate: fmt(effectiveMax) };
    }, [selectedAnno, selectedSocieta]);

    const [gruppi, setGruppi] = useState([]);
    const [fornitori, setFornitori] = useState([]);
    const [conti, setConti] = useState([]);
    const [loadingGruppi, setLoadingGruppi] = useState(false);

    // Selezione gruppo/sottogruppo
    const [selectedGruppo, setSelectedGruppo] = useState(null);      // parent gruppo
    const [selectedSottogruppo, setSelectedSottogruppo] = useState(null); // sottogruppo (opzionale)

    // Se il tipo è Entrata/Uscita l'utente sceglie il segno
    const [segno, setSegno] = useState('Entrata'); // 'Entrata' | 'Uscita'

    // Intestatario
    const [intestatarioTipo, setIntestatarioTipo] = useState('socio'); // 'socio' | 'fornitore' | 'libero'
    const [intestatarioLibero, setIntestatarioLibero] = useState('');
    const [selectedSocio, setSelectedSocio] = useState(null);
    const [selectedFornitore, setSelectedFornitore] = useState(null);
    const [socioModalOpen, setSocioModalOpen] = useState(false);

    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // Salva preferiti
    const [salvaPreferiteOpen, setSalvaPreferiteOpen] = useState(false);
    const [preferitaNome, setPreferitaNome] = useState('');

    // Tipo effettivo dell'operazione basato sulla selezione corrente
    const tipoEffettivo = useMemo(() => {
        const selected = selectedSottogruppo || selectedGruppo;
        if (!selected) return null;
        if (selected.tipo === 'Entrata/Uscita') return segno;
        return selected.tipo; // 'Entrata' | 'Uscita'
    }, [selectedGruppo, selectedSottogruppo, segno]);

    // Gruppi radice (senza gruppo_id)
    const gruppiRadice = useMemo(() => gruppi.filter(g => !g.gruppo_id), [gruppi]);

    // Sottogruppi del gruppo selezionato
    const sottogruppiDelGruppo = useMemo(() => {
        if (!selectedGruppo) return [];
        return gruppi.filter(g => g.gruppo_id === selectedGruppo.id);
    }, [gruppi, selectedGruppo]);

    // Reset al cambio società o apertura/chiusura
    useEffect(() => {
        if (isOpen && societaId) {
            loadData(initialData || null);
        }
        if (!isOpen) {
            resetAll();
        }
    }, [isOpen, societaId]); // eslint-disable-line react-hooks/exhaustive-deps

    const loadData = async (initial = null) => {
        setLoadingGruppi(true);
        const token = localStorage.getItem('token');
        try {
            const [gRes, fRes, cRes] = await Promise.all([
                fetch(`/payments/api/gruppi?societa_id=${societaId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`/payments/api/fornitori?societa_id=${societaId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`/payments/api/conti?societa_id=${societaId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
            ]);
            const [gData, fData, cData] = await Promise.all([
                gRes.ok ? gRes.json() : [],
                fRes.ok ? fRes.json() : [],
                cRes.ok ? cRes.json() : [],
            ]);
            setGruppi(gData);
            setFornitori(fData);
            setConti(cData);
            if (initial) {
                const g = initial.gruppoId ? gData.find(x => x.id === initial.gruppoId) || null : null;
                const sg = initial.sottogruppoId ? gData.find(x => x.id === initial.sottogruppoId) || null : null;
                setSelectedGruppo(g);
                setSelectedSottogruppo(sg);
                setSegno(initial.segno || 'Entrata');
                setIntestatarioTipo(initial.intestatarioTipo || 'socio');
                setIntestatarioLibero(initial.intestatarioLibero || '');
                setSelectedSocio(initial.socio || null);
                const f = initial.fornitoreId ? fData.find(x => x.id === initial.fornitoreId) || null : null;
                setSelectedFornitore(f);
                if (initial.form) {
                    setForm({
                        ...initial.form,
                        data_pagamento: new Date().toISOString().split('T')[0],
                    });
                }
            } else {
                const defaultConto = cData.find(c => c.modalita_pagamento === 'Contanti') || cData[0];
                setForm(prev => ({ ...prev, conto_destinazione: defaultConto?.descrizione || '' }));
            }
        } catch (e) {
            console.error('Errore caricamento dati:', e);
        } finally {
            setLoadingGruppi(false);
        }
    };

    const resetAll = () => {
        setSelectedGruppo(null);
        setSelectedSottogruppo(null);
        setSelectedSocio(null);
        setSelectedFornitore(null);
        setIntestatarioTipo('socio');
        setIntestatarioLibero('');
        setSegno('Entrata');
        setForm({ ...EMPTY_FORM });
        setError(null);
        setSalvaPreferiteOpen(false);
        setPreferitaNome('');
    };

    const handleConfermaPreferita = () => {
        const nome = preferitaNome.trim();
        if (!nome) return;
        const snapshot = {
            gruppoId: selectedGruppo?.id || null,
            sottogruppoId: selectedSottogruppo?.id || null,
            segno,
            intestatarioTipo,
            intestatarioLibero,
            socio: selectedSocio ? {
                id: selectedSocio.id,
                nome: selectedSocio.nome,
                cognome: selectedSocio.cognome,
                codice_fiscale: selectedSocio.codice_fiscale || null,
            } : null,
            fornitoreId: selectedFornitore?.id || null,
            form: { ...form },
        };
        const key = `op_preferite_${societaId}`;
        const stored = JSON.parse(localStorage.getItem(key) || '[]');
        stored.push({ id: Date.now(), nome, snapshot });
        localStorage.setItem(key, JSON.stringify(stored));
        setSalvaPreferiteOpen(false);
        setPreferitaNome('');
    };

    const handleGruppoChange = (id) => {
        if (!id) {
            setSelectedGruppo(null);
        } else {
            setSelectedGruppo(gruppiRadice.find(g => g.id === parseInt(id, 10)) || null);
        }
        setSelectedSottogruppo(null);
    };

    const handleSottogruppoChange = (id) => {
        if (!id) {
            setSelectedSottogruppo(null);
        } else {
            setSelectedSottogruppo(sottogruppiDelGruppo.find(sg => sg.id === parseInt(id, 10)) || null);
        }
    };

    const handleFieldChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleModalitaChange = (newModalita) => {
        const associati = conti.filter(c => c.modalita_pagamento === newModalita);
        setForm(prev => ({
            ...prev,
            modalita_pagamento: newModalita,
            conto_destinazione: associati.length > 0 ? associati[0].descrizione : '',
        }));
    };

    const handleSocioSelect = (socio) => {
        setSelectedSocio(socio);
        setSocioModalOpen(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        const selected = selectedSottogruppo || selectedGruppo;
        if (!selected) {
            setError('Seleziona un gruppo o sottogruppo.');
            return;
        }
        if (!form.importo || parseFloat(form.importo) <= 0) {
            setError('Inserisci un importo valido.');
            return;
        }
        if (!form.data_pagamento) {
            setError('Inserisci una data.');
            return;
        }
        if (minDate && form.data_pagamento < minDate) {
            setError(`La data non può essere precedente all'inizio della stagione (${minDate}).`);
            return;
        }
        if (maxDate && form.data_pagamento > maxDate) {
            setError(`La data non può essere successiva a oggi o alla fine della stagione (${maxDate}).`);
            return;
        }

        // Costruzione intestatario in base al tipo scelto
        let intestatario = '';
        let socio_id = null;
        let fornitore_id = null;
        let codice_fiscale = null;

        if (intestatarioTipo === 'socio') {
            if (selectedSocio) {
                intestatario = `${selectedSocio.cognome} ${selectedSocio.nome}`;
                socio_id = selectedSocio.id;
                codice_fiscale = selectedSocio.codice_fiscale || null;
            }
        } else if (intestatarioTipo === 'fornitore') {
            if (selectedFornitore) {
                intestatario = selectedFornitore.denominazione;
                fornitore_id = selectedFornitore.id;
            }
        } else {
            intestatario = intestatarioLibero.trim();
        }

        const importoSegnato = tipoEffettivo === 'Uscita'
            ? -Math.abs(parseFloat(form.importo))
            : Math.abs(parseFloat(form.importo));

        const descrizioneFinal = form.descrizione.trim() || selected.descrizione || '';

        const payload = {
            societa_id: societaId,
            intestatario: intestatario || null,
            data_pagamento: form.data_pagamento,
            importo: importoSegnato,
            quote: descrizioneFinal,
            quote_types: 'operazione_manuale',
            modalita_pagamento: form.modalita_pagamento,
            conto_destinazione: form.conto_destinazione || null,
            note: form.note || null,
            stato_pagamento: '1. VALIDO CON RICEVUTA',
            emetti_ricevuta: 'NO',
            gruppo_id: selectedSottogruppo?.id || selectedGruppo?.id || null,
            ...(socio_id ? { socio_id, codice_fiscale } : {}),
            ...(fornitore_id ? { fornitore_id } : {}),
        };

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/payments/api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                throw new Error(d.error || 'Errore nel salvataggio');
            }
            onSaved?.();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const selectedItem = selectedSottogruppo || selectedGruppo;
    const isMisto = selectedItem?.tipo === 'Entrata/Uscita';

    return (
        <>
            <div className="nom-overlay">
                <div className="nom-modal" onClick={e => e.stopPropagation()}>

                    {/* Header */}
                    <div className="nom-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Plus size={20} />
                            <span>Nuova Operazione</span>
                        </div>
                        <button className="nom-close-btn" onClick={onClose} title="Chiudi">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="nom-body">

                        {/* ── SEZIONE 1: Gruppo / Sottogruppo ── */}
                        <div className="nom-section">
                            <div className="nom-fields-grid">
                                <div className="nom-field nom-field--half">
                                    <label className="nom-section-title" style={{ marginBottom: '6px' }}>Gruppo *</label>
                                    {loadingGruppi ? (
                                        <div className="nom-loading">Caricamento...</div>
                                    ) : (
                                        <select
                                            className="md-select"
                                            value={selectedGruppo?.id ?? ''}
                                            onChange={e => handleGruppoChange(e.target.value)}
                                        >
                                            <option value="">— Seleziona gruppo —</option>
                                            {gruppiRadice.map(g => (
                                                <option key={g.id} value={g.id}>
                                                    {g.codice ? `[${g.codice}] ` : ''}{g.descrizione} ({g.tipo})
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {sottogruppiDelGruppo.length > 0 && (
                                    <div className="nom-field nom-field--half">
                                        <label className="nom-section-title" style={{ marginBottom: '6px' }}>Sottogruppo</label>
                                        <select
                                            className="md-select"
                                            value={selectedSottogruppo?.id ?? ''}
                                            onChange={e => handleSottogruppoChange(e.target.value)}
                                        >
                                            <option value="">— Nessun sottogruppo —</option>
                                            {sottogruppiDelGruppo.map(sg => (
                                                <option key={sg.id} value={sg.id}>
                                                    {sg.codice ? `[${sg.codice}] ` : ''}{sg.descrizione} ({sg.tipo})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── SEZIONE 2: Segno (solo per Entrata/Uscita) ── */}
                        {isMisto && (
                            <div className="nom-section">
                                <div className="nom-section-title">Tipo operazione</div>
                                <div className="nom-segno-toggle">
                                    <button
                                        type="button"
                                        className={`nom-segno-btn nom-segno-btn--entrata${segno === 'Entrata' ? ' active' : ''}`}
                                        onClick={() => { setSegno('Entrata'); setSelectedSocio(null); setSelectedFornitore(null); }}
                                    >
                                        + Entrata
                                    </button>
                                    <button
                                        type="button"
                                        className={`nom-segno-btn nom-segno-btn--uscita${segno === 'Uscita' ? ' active' : ''}`}
                                        onClick={() => { setSegno('Uscita'); setSelectedSocio(null); setSelectedFornitore(null); }}
                                    >
                                        − Uscita
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── SEZIONE 3: Intestatario ── */}
                        <div className="nom-section">
                            <div className="nom-section-title">Intestatario</div>

                            {/* Toggle 3 vie */}
                            <div className="nom-intst-toggle">
                                <button
                                    type="button"
                                    className={`nom-intst-btn${intestatarioTipo === 'socio' ? ' nom-intst-btn--active' : ''}`}
                                    onClick={() => setIntestatarioTipo('socio')}
                                >
                                    <User size={14} /> Socio
                                </button>
                                <button
                                    type="button"
                                    className={`nom-intst-btn${intestatarioTipo === 'fornitore' ? ' nom-intst-btn--active' : ''}`}
                                    onClick={() => setIntestatarioTipo('fornitore')}
                                >
                                    <Truck size={14} /> Fornitore
                                </button>
                                <button
                                    type="button"
                                    className={`nom-intst-btn${intestatarioTipo === 'libero' ? ' nom-intst-btn--active' : ''}`}
                                    onClick={() => setIntestatarioTipo('libero')}
                                >
                                    <Type size={14} /> Campo libero
                                </button>
                            </div>

                            {/* Contenuto per tipo */}
                            <div className="nom-intst-content">
                                {intestatarioTipo === 'socio' && (
                                    selectedSocio ? (
                                        <div className="nom-controparte-selected">
                                            <User size={16} />
                                            <span>{selectedSocio.cognome} {selectedSocio.nome}</span>
                                            {selectedSocio.codice_fiscale && (
                                                <span className="nom-controparte-cf">{selectedSocio.codice_fiscale}</span>
                                            )}
                                            <button type="button" className="nom-controparte-change" onClick={() => setSocioModalOpen(true)}>
                                                Cambia
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            className="nom-select-btn"
                                            onClick={() => setSocioModalOpen(true)}
                                        >
                                            <Search size={15} /> Seleziona socio…
                                        </button>
                                    )
                                )}

                                {intestatarioTipo === 'fornitore' && (
                                    selectedFornitore ? (
                                        <div className="nom-controparte-selected">
                                            <Truck size={16} style={{ color: 'var(--danger)' }} />
                                            <span>{selectedFornitore.denominazione}</span>
                                            {selectedFornitore.comune && (
                                                <span className="nom-controparte-cf">{selectedFornitore.comune}</span>
                                            )}
                                            <button type="button" className="nom-controparte-change" onClick={() => setSelectedFornitore(null)}>
                                                Cambia
                                            </button>
                                        </div>
                                    ) : (
                                        <FornitoreSelector
                                            fornitori={fornitori}
                                            selected={selectedFornitore}
                                            onSelect={setSelectedFornitore}
                                            societaId={societaId}
                                            onFornitoreCreated={f => setFornitori(prev => [...prev, f])}
                                        />
                                    )
                                )}

                                {intestatarioTipo === 'libero' && (
                                    <input
                                        type="text"
                                        className="md-input"
                                        placeholder="Inserisci intestatario..."
                                        value={intestatarioLibero}
                                        onChange={e => setIntestatarioLibero(e.target.value)}
                                        autoFocus
                                    />
                                )}
                            </div>
                        </div>

                        {/* ── SEZIONE 4: Campi operazione ── */}
                        <div className="nom-section">
                            <div className="nom-section-title">Dettagli</div>
                            <div className="nom-fields-grid">

                                <div className="nom-field nom-field--half">
                                    <label>Data *</label>
                                    <input
                                        type="date"
                                        className="md-input"
                                        value={form.data_pagamento}
                                        onChange={e => handleFieldChange('data_pagamento', e.target.value)}
                                        min={minDate}
                                        max={maxDate}
                                        required
                                    />
                                </div>

                                <div className="nom-field nom-field--half">
                                    <label>Importo (€) *</label>
                                    <input
                                        type="number"
                                        className="md-input"
                                        placeholder="0,00"
                                        min="0.01"
                                        step="0.01"
                                        value={form.importo}
                                        onChange={e => handleFieldChange('importo', e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="nom-field nom-field--full">
                                    <label>Descrizione</label>
                                    <input
                                        type="text"
                                        className="md-input"
                                        placeholder={selectedItem ? selectedItem.descrizione : 'Descrizione operazione...'}
                                        value={form.descrizione}
                                        onChange={e => handleFieldChange('descrizione', e.target.value)}
                                    />
                                </div>

                                <div className="nom-field nom-field--half">
                                    <label>Modalità pagamento</label>
                                    <select
                                        className="md-select"
                                        value={form.modalita_pagamento}
                                        onChange={e => handleModalitaChange(e.target.value)}
                                    >
                                        {MODALITA.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>

                                <div className="nom-field nom-field--half">
                                    <label>Conto destinazione</label>
                                    <select
                                        className="md-select"
                                        value={form.conto_destinazione}
                                        onChange={e => handleFieldChange('conto_destinazione', e.target.value)}
                                    >
                                        <option value="">— Nessuno —</option>
                                        {conti.map(c => (
                                            <option key={c.id} value={c.descrizione}>{c.descrizione}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="nom-field nom-field--full">
                                    <label>Note</label>
                                    <textarea
                                        className="md-input"
                                        rows={2}
                                        placeholder="Note aggiuntive..."
                                        value={form.note}
                                        onChange={e => handleFieldChange('note', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Errore */}
                        {error && <div className="nom-error">{error}</div>}

                        {/* Azioni */}
                        <div className="nom-footer">
                            <button type="button" className="nom-btn nom-btn--cancel" onClick={onClose} disabled={saving}>
                                Annulla
                            </button>
                            <button
                                type="button"
                                className="nom-btn nom-btn--star"
                                onClick={() => setSalvaPreferiteOpen(true)}
                                disabled={saving}
                                title="Salva come operazione preferita"
                            >
                                <Star size={15} />
                                Salva preferiti
                            </button>
                            <button type="submit" className="nom-btn nom-btn--save" disabled={saving || !selectedItem}>
                                {saving ? 'Salvataggio…' : 'Salva operazione'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Modal ricerca socio */}
            <RicercaSocioModal
                isOpen={socioModalOpen}
                onClose={() => setSocioModalOpen(false)}
                onSelect={handleSocioSelect}
                societaId={societaId}
            />

            {/* Mini-modal: nome operazione preferita */}
            {salvaPreferiteOpen && (
                <div className="nom-overlay" style={{ zIndex: 1500 }}>
                    <div className="nom-modal" style={{ width: '400px', maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
                        <div className="nom-header" style={{ background: 'var(--warning)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Star size={18} />
                                <span>Salva come operazione preferita</span>
                            </div>
                            <button className="nom-close-btn" onClick={() => setSalvaPreferiteOpen(false)} title="Chiudi">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="nom-body">
                            <p style={{ margin: '0 0 12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                Inserisci un nome per questa operazione preferita:
                            </p>
                            <input
                                className="md-input"
                                placeholder="Nome operazione preferita…"
                                value={preferitaNome}
                                onChange={e => setPreferitaNome(e.target.value)}
                                autoFocus
                                onKeyDown={e => { if (e.key === 'Enter') handleConfermaPreferita(); }}
                                style={{ width: '100%', boxSizing: 'border-box' }}
                            />
                            <div className="nom-footer" style={{ borderTop: 'none', paddingTop: '16px' }}>
                                <button
                                    type="button"
                                    className="nom-btn nom-btn--cancel"
                                    onClick={() => { setSalvaPreferiteOpen(false); setPreferitaNome(''); }}
                                >
                                    Annulla
                                </button>
                                <button
                                    type="button"
                                    className="nom-btn nom-btn--star"
                                    onClick={handleConfermaPreferita}
                                    disabled={!preferitaNome.trim()}
                                >
                                    Salva
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default NuovaOperazioneModal;
