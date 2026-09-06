import React, { useState, useEffect, useMemo } from 'react';
import { X, ArrowLeftRight } from 'lucide-react';
import { useAnno, getAnnoDateRange } from '../data/AnnoContext';
import { useSocieta } from '../data/SocietaContext';
import './NuovaOperazioneModal.css';

const EMPTY_FORM = {
    data_pagamento: new Date().toISOString().split('T')[0],
    importo: '',
    conto_uscita_id: '',
    conto_entrata_id: '',
};

// Trasferimento tra due conti della società (es. da Cassa a Banca). Genera due
// righe di prima nota collegate (uscita + entrata) con modalità "Giroconto",
// un valore che esiste solo qui: non è selezionabile in anagrafica Conti e non
// viene conteggiato nel Bilancio (è un movimento interno, non un'entrata/uscita
// reale della società).
const GirocontoModal = ({ isOpen, onClose, onSaved, societaId }) => {
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

    const [conti, setConti] = useState([]);
    const [loadingConti, setLoadingConti] = useState(false);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && societaId) {
            setLoadingConti(true);
            const token = localStorage.getItem('token');
            fetch(`/payments/api/conti?societa_id=${societaId}`, { headers: { 'Authorization': `Bearer ${token}` } })
                .then(r => r.ok ? r.json() : [])
                .then(data => setConti(data || []))
                .catch(() => setConti([]))
                .finally(() => setLoadingConti(false));
        }
        if (!isOpen) {
            setForm({ ...EMPTY_FORM });
            setError(null);
        }
    }, [isOpen, societaId]);

    const handleFieldChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!form.conto_uscita_id || !form.conto_entrata_id) {
            setError('Seleziona il conto di uscita e il conto di entrata.');
            return;
        }
        if (form.conto_uscita_id === form.conto_entrata_id) {
            setError('Il conto di uscita e il conto di entrata devono essere diversi.');
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

        const contoUscita = conti.find(c => c.id === parseInt(form.conto_uscita_id, 10));
        const contoEntrata = conti.find(c => c.id === parseInt(form.conto_entrata_id, 10));

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/payments/api/giroconto', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    societa_id: societaId,
                    data_pagamento: form.data_pagamento,
                    importo: parseFloat(form.importo),
                    conto_uscita: contoUscita?.descrizione,
                    conto_entrata: contoEntrata?.descrizione,
                }),
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

    return (
        <div className="nom-overlay">
            <div className="nom-modal" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
                <div className="nom-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ArrowLeftRight size={20} />
                        <span>Giroconto</span>
                    </div>
                    <button className="nom-close-btn" onClick={onClose} title="Chiudi">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="nom-body">
                    <div className="nom-section">
                        <div className="nom-section-title">Trasferimento tra conti</div>
                        {loadingConti ? (
                            <div className="nom-loading">Caricamento...</div>
                        ) : (
                            <div className="nom-fields-grid">
                                <div className="nom-field nom-field--half">
                                    <label>Conto di uscita *</label>
                                    <select
                                        className="md-select"
                                        value={form.conto_uscita_id}
                                        onChange={e => handleFieldChange('conto_uscita_id', e.target.value)}
                                    >
                                        <option value="">— Seleziona conto —</option>
                                        {conti.map(c => (
                                            <option key={c.id} value={c.id}>{c.descrizione}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="nom-field nom-field--half">
                                    <label>Conto di entrata *</label>
                                    <select
                                        className="md-select"
                                        value={form.conto_entrata_id}
                                        onChange={e => handleFieldChange('conto_entrata_id', e.target.value)}
                                    >
                                        <option value="">— Seleziona conto —</option>
                                        {conti.map(c => (
                                            <option key={c.id} value={c.id}>{c.descrizione}</option>
                                        ))}
                                    </select>
                                </div>

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
                            </div>
                        )}
                    </div>

                    {error && <div className="nom-error">{error}</div>}

                    <div className="nom-footer">
                        <button type="button" className="nom-btn nom-btn--cancel" onClick={onClose} disabled={saving}>
                            Annulla
                        </button>
                        <button type="submit" className="nom-btn nom-btn--save" disabled={saving}>
                            {saving ? 'Salvataggio…' : 'Salva giroconto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default GirocontoModal;
