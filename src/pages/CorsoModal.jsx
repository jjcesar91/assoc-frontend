import React, { useState, useEffect, useCallback } from 'react';
import { X, CalendarDays, Users, UserPlus, Trash2, AlertTriangle } from 'lucide-react';
import { useConfirm } from '../components/ConfirmModal';
import RicercaSocioModal from './RicercaSocioModal';
import './CorsoModal.css';

const GIORNI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

const defaultForm = {
    descrizione: '',
    attivitaId: '',
    strutturaId: '',
    areaId: '',
    staffId: '',
    abbonamentoId: '',
    giorno: '0',
    oraInizio: '08:00',
    durataMinuti: 50,
    maxSoci: 10,
    note: '',
};

// ── Iscritti helpers ──────────────────────────────────────────
const todayDate = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const diffDays = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr); d.setHours(0,0,0,0);
    return Math.floor((d - todayDate()) / 86400000);
};
const getStatus = (dateStr, giorniAvviso) => {
    const days = diffDays(dateStr);
    if (days === null || days < 0) return 'expired';
    if (days <= (giorniAvviso || 30)) return 'warning';
    return 'ok';
};
const StatusBadge = ({ status, label }) => {
    if (status === 'ok') return null;
    return (
        <span className={`cm-badge ${status === 'expired' ? 'cm-badge-expired' : 'cm-badge-warning'}`}>
            <AlertTriangle size={10} />
            {label}
        </span>
    );
};

const CorsoModal = ({ isOpen, onClose, onSave, corso, attivita, strutture, staff, abbonamenti = [], societaId, initialTab = 'impostazioni' }) => {
    // ── Tab ──────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState(initialTab);
    const confirm = useConfirm();

    useEffect(() => {
        if (isOpen) setActiveTab(initialTab);
    }, [isOpen, initialTab]);

    // ── Impostazioni form ────────────────────────────────────────
    const [form, setForm] = useState(defaultForm);
    const [aree, setAree] = useState([]);
    const [formError, setFormError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setForm({
                descrizione: corso?.descrizione || '',
                attivitaId: corso?.attivitaId || '',
                strutturaId: corso?.strutturaId || '',
                areaId: corso?.areaId || '',
                staffId: corso?.staffId || '',
                abbonamentoId: corso?.abbonamentoId || '',
                giorno: corso?.giorno !== undefined ? String(corso.giorno) : '0',
                oraInizio: corso?.oraInizio || '08:00',
                durataMinuti: corso?.durataMinuti ?? 50,
                maxSoci: corso?.maxSoci ?? 10,
                note: corso?.note || '',
            });
        }
    }, [isOpen, corso]);

    useEffect(() => {
        if (form.strutturaId) {
            fetch(`/activities/api/strutture/${form.strutturaId}/aree`)
                .then(r => r.ok ? r.json() : [])
                .then(data => setAree(data))
                .catch(() => setAree([]));
        } else {
            setAree([]);
        }
    }, [form.strutturaId]);

    const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
    const handleStrutturaChange = (val) => setForm(prev => ({ ...prev, strutturaId: val, areaId: '' }));

    const handleSubmit = () => {
        if (!form.oraInizio) return;
        if (!form.abbonamentoId) {
            setFormError('Selezionare un abbonamento obbligatorio.');
            return;
        }
        setFormError('');
        const payload = {
            ...form,
            giorno: parseInt(form.giorno, 10),
            durataMinuti: parseInt(form.durataMinuti, 10),
            maxSoci: parseInt(form.maxSoci, 10),
            attivitaId: form.attivitaId || null,
            strutturaId: form.strutturaId || null,
            areaId: form.areaId || null,
            staffId: form.staffId || null,
            abbonamentoId: parseInt(form.abbonamentoId, 10),
        };
        if (corso?.id) payload.id = corso.id;
        onSave(payload);
    };

    // ── Iscritti ─────────────────────────────────────────────────
    const [iscrizioni, setIscrizioni] = useState([]);
    const [sociMap, setSociMap] = useState({});
    const [paymentsMap, setPaymentsMap] = useState({});
    const [abbonamentoProd, setAbbonamentoProd] = useState(null);
    const [loadingIscritti, setLoadingIscritti] = useState(false);
    const [showRicerca, setShowRicerca] = useState(false);

    const fetchIscritti = useCallback(async () => {
        if (!corso?.id) return;
        setLoadingIscritti(true);
        try {
            const res = await fetch(`/activities/api/corsi/${corso.id}/iscritti`);
            const data = res.ok ? await res.json() : [];
            setIscrizioni(data);
            if (data.length > 0) {
                const [allSociRes, paymentsResults] = await Promise.all([
                    fetch(`/users/api/soci?societa_id=${societaId}`),
                    Promise.all(data.map(i =>
                        fetch(`/payments/api?societa_id=${societaId}&socio_id=${i.socioId}`)
                            .then(r => r.ok ? r.json() : [])
                            .then(payments => ({ socioId: i.socioId, payments }))
                    )),
                ]);
                if (allSociRes.ok) {
                    const soci = await allSociRes.json();
                    const map = {};
                    soci.forEach(s => { map[s.id] = s; });
                    setSociMap(map);
                }
                const pmap = {};
                paymentsResults.forEach(({ socioId, payments }) => { pmap[socioId] = payments; });
                setPaymentsMap(pmap);
            }
        } finally {
            setLoadingIscritti(false);
        }
    }, [corso?.id, societaId]);

    useEffect(() => {
        if (!corso?.abbonamentoId) return;
        fetch(`/products/api/${corso.abbonamentoId}`)
            .then(r => r.ok ? r.json() : null)
            .then(p => setAbbonamentoProd(p))
            .catch(() => {});
    }, [corso?.abbonamentoId]);

    useEffect(() => {
        if (isOpen && activeTab === 'iscritti') fetchIscritti();
        if (!isOpen) {
            setIscrizioni([]);
            setSociMap({});
            setPaymentsMap({});
        }
    }, [isOpen, activeTab, fetchIscritti]);

    const handleAddSocio = async (socio) => {
        setShowRicerca(false);
        await fetch(`/activities/api/corsi/${corso.id}/iscritti`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ socioId: socio.id }),
        });
        fetchIscritti();
    };

    const handleRemoveIscritto = async (socioId) => {
        if (!await confirm('Rimuovere questo socio dal corso?')) return;
        await fetch(`/activities/api/corsi/${corso.id}/iscritti/${socioId}`, { method: 'DELETE' });
        fetchIscritti();
    };

    // ─────────────────────────────────────────────────────────────
    if (!isOpen) return null;

    const giorniAvviso = abbonamentoProd?.giorniAvvisoScadenza ?? 30;
    const isExisting = !!corso?.id;

    return (
        <>
        <div className="cm-overlay">
            <div className="cm-modal">

                {/* ── Header ── */}
                <div className="cm-header">
                    <CalendarDays size={20} />
                    <h2>Scheda corso</h2>
                    <button className="cm-header-close" onClick={onClose} title="Chiudi">
                        <X size={20} />
                    </button>
                </div>

                {/* ── Tab bar ── */}
                <div className="cm-tabs">
                    <button
                        className={`cm-tab-btn${activeTab === 'impostazioni' ? ' active' : ''}`}
                        onClick={() => setActiveTab('impostazioni')}
                    >
                        <CalendarDays size={14} />
                        Impostazioni
                    </button>
                    <button
                        className={`cm-tab-btn${activeTab === 'iscritti' ? ' active' : ''}`}
                        onClick={() => isExisting && setActiveTab('iscritti')}
                        disabled={!isExisting}
                        title={!isExisting ? 'Salva prima il corso per gestire gli iscritti' : undefined}
                    >
                        <Users size={14} />
                        Iscritti
                        {isExisting && (
                            <span className="cm-tab-badge">{iscrizioni.length}</span>
                        )}
                    </button>
                </div>

                {/* ── Tab Impostazioni ── */}
                {activeTab === 'impostazioni' && (
                    <div className="cm-body">

                        <div className="cm-form-row">
                            <div className="cm-form-field cm-col-2">
                                <label>Descrizione</label>
                                <input
                                    className="md-input"
                                    type="text"
                                    placeholder="Descrizione"
                                    value={form.descrizione}
                                    onChange={e => set('descrizione', e.target.value)}
                                />
                            </div>
                            <div className="cm-form-field cm-col-2">
                                <label>Tipo attività</label>
                                <select className="md-select" value={form.attivitaId} onChange={e => set('attivitaId', e.target.value)}>
                                    <option value=""></option>
                                    {attivita.map(a => (
                                        <option key={a.id} value={a.id}>{a.descrizione}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="cm-form-row">
                            <div className="cm-form-field cm-col-1">
                                <label>Struttura</label>
                                <select className="md-select" value={form.strutturaId} onChange={e => handleStrutturaChange(e.target.value)}>
                                    <option value=""></option>
                                    {strutture.map(s => (
                                        <option key={s.id} value={s.id}>{s.descrizione}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="cm-form-field cm-col-1">
                                <label>Area</label>
                                <select className="md-select" value={form.areaId} onChange={e => set('areaId', e.target.value)} disabled={!form.strutturaId}>
                                    <option value=""></option>
                                    {aree.map(a => (
                                        <option key={a.id} value={a.id}>{a.descrizione}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="cm-form-field cm-col-2">
                                <label>Tecnico</label>
                                <select className="md-select" value={form.staffId} onChange={e => set('staffId', e.target.value)}>
                                    <option value=""></option>
                                    {staff.map(s => (
                                        <option key={s.id} value={s.id}>{s.cognome} {s.nome}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="cm-form-row">
                            <div className="cm-form-field cm-col-1">
                                <label>Giorno</label>
                                <select className="md-select" value={form.giorno} onChange={e => set('giorno', e.target.value)}>
                                    {GIORNI.map((g, i) => (
                                        <option key={i} value={i}>{g}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="cm-form-field cm-col-1">
                                <label>Ora inizio</label>
                                <input
                                    className="md-input"
                                    type="time"
                                    value={form.oraInizio}
                                    onChange={e => set('oraInizio', e.target.value)}
                                />
                            </div>
                            <div className="cm-form-field cm-col-1">
                                <label>Durata (min)</label>
                                <input
                                    className="md-input"
                                    type="number"
                                    min={1}
                                    value={form.durataMinuti}
                                    onChange={e => set('durataMinuti', e.target.value)}
                                />
                            </div>
                            <div className="cm-form-field cm-col-1">
                                <label>Max soci</label>
                                <input
                                    className="md-input"
                                    type="number"
                                    min={1}
                                    value={form.maxSoci}
                                    onChange={e => set('maxSoci', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="cm-form-row">
                            <div className="cm-form-field cm-col-2">
                                <label>Abbonamento <span className="required">*</span></label>
                                <select
                                    className={`md-select${formError && !form.abbonamentoId ? ' cm-select-error' : ''}`}
                                    value={form.abbonamentoId}
                                    onChange={e => { setFormError(''); set('abbonamentoId', e.target.value); }}
                                >
                                    <option value="">Seleziona abbonamento...</option>
                                    {abbonamenti.map(a => (
                                        <option key={a.id} value={a.id}>{a.description}</option>
                                    ))}
                                </select>
                                {formError && !form.abbonamentoId && (
                                    <span className="cm-error-text">{formError}</span>
                                )}
                            </div>
                        </div>

                        <div className="cm-form-row">
                            <div className="cm-form-field" style={{ flex: 1 }}>
                                <label>Note</label>
                                <textarea
                                    className="md-input"
                                    rows={3}
                                    style={{ resize: 'vertical' }}
                                    value={form.note}
                                    onChange={e => set('note', e.target.value)}
                                />
                            </div>
                        </div>

                    </div>
                )}

                {/* ── Tab Iscritti ── */}
                {activeTab === 'iscritti' && (
                    <div className="cm-body">

                        <div className="cm-iscritti-toolbar">
                            <span className="cm-iscritti-count">
                                {iscrizioni.length} / {corso?.maxSoci ?? '∞'} iscritti
                            </span>
                            <button
                                className="btn-success"
                                onClick={() => setShowRicerca(true)}
                                disabled={iscrizioni.length >= (corso?.maxSoci ?? Infinity)}
                            >
                                <UserPlus size={15} /> Aggiungi socio
                            </button>
                        </div>

                        {loadingIscritti ? (
                            <div className="cm-iscritti-loading">Caricamento...</div>
                        ) : iscrizioni.length === 0 ? (
                            <div className="cm-iscritti-empty">Nessun iscritto</div>
                        ) : (
                            <table className="cm-table">
                                <thead>
                                    <tr>
                                        <th>Socio</th>
                                        <th className="center">Cert. medico</th>
                                        <th className="center">Ult. pagamento</th>
                                        <th className="center">Iscritto dal</th>
                                        <th style={{ width: 36 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...iscrizioni].sort((a, b) => {
                                        const rank = (i) => {
                                            const socio = sociMap[i.socioId];
                                            const payments = paymentsMap[i.socioId] || [];
                                            const certStatus = getStatus(socio?.scadenza_certificato, giorniAvviso);
                                            const abbPay = payments
                                                .filter(p => p.product_id === corso.abbonamentoId && p.data_scadenza_abbonamento)
                                                .sort((x, y) => new Date(y.data_scadenza_abbonamento) - new Date(x.data_scadenza_abbonamento))[0];
                                            const abbStatus = getStatus(abbPay?.data_scadenza_abbonamento, giorniAvviso);
                                            if (certStatus === 'expired' || abbStatus === 'expired') return 0;
                                            if (certStatus === 'warning' || abbStatus === 'warning') return 1;
                                            return 2;
                                        };
                                        const ra = rank(a), rb = rank(b);
                                        if (ra !== rb) return ra - rb;
                                        const cognA = (sociMap[a.socioId]?.cognome || '').toLowerCase();
                                        const cognB = (sociMap[b.socioId]?.cognome || '').toLowerCase();
                                        return cognA.localeCompare(cognB, 'it');
                                    }).map(i => {
                                        const socio = sociMap[i.socioId];
                                        const payments = paymentsMap[i.socioId] || [];
                                        const certStatus = getStatus(socio?.scadenza_certificato, giorniAvviso);
                                        const abbPay = payments
                                            .filter(p => p.product_id === corso.abbonamentoId && p.data_scadenza_abbonamento)
                                            .sort((a, b) => new Date(b.data_scadenza_abbonamento) - new Date(a.data_scadenza_abbonamento))[0];
                                        const abbStatus = getStatus(abbPay?.data_scadenza_abbonamento, giorniAvviso);
                                        const rowClass = (certStatus === 'expired' || abbStatus === 'expired')
                                            ? 'row-expired'
                                            : (certStatus === 'warning' || abbStatus === 'warning') ? 'row-warning' : '';
                                        return (
                                            <tr key={i.socioId} className={rowClass}>
                                                <td>
                                                    {socio
                                                        ? <span className="cm-socio-name">{socio.cognome} {socio.nome}</span>
                                                        : <span className="cm-socio-id">#{i.socioId}</span>
                                                    }
                                                </td>
                                                <td className="center">
                                                    {socio?.scadenza_certificato
                                                        ? <>{new Date(socio.scadenza_certificato).toLocaleDateString('it-IT')}<StatusBadge status={certStatus} label={certStatus === 'expired' ? 'SCADUTO' : 'IN SCADENZA'} /></>
                                                        : <span className="cm-date-missing">—</span>
                                                    }
                                                </td>
                                                <td className="center">
                                                    {abbPay ? (() => {
                                                        const dateStr = abbPay.data_pagamento
                                                            ? new Date(abbPay.data_pagamento).toLocaleDateString('it-IT')
                                                            : '—';
                                                        let nota = null;
                                                        if (abbPay.data_scadenza_abbonamento) {
                                                            const scad = new Date(abbPay.data_scadenza_abbonamento);
                                                            scad.setHours(0, 0, 0, 0);
                                                            const oggi = new Date();
                                                            oggi.setHours(0, 0, 0, 0);
                                                            const diff = Math.round((scad - oggi) / 86400000);
                                                            if (diff < 0) {
                                                                nota = <small style={{ color: '#c62828', display: 'block' }}>scad. da {Math.abs(diff)} gg</small>;
                                                            } else if (diff === 0) {
                                                                nota = <small style={{ color: '#e65100', display: 'block' }}>scade oggi</small>;
                                                            } else {
                                                                nota = <small style={{ color: '#2e7d32', display: 'block' }}>{diff} gg alla scad.</small>;
                                                            }
                                                        }
                                                        return <>{dateStr}{nota}</>;
                                                    })() : <span className="cm-abb-missing"><AlertTriangle size={13} /> Non trovato</span>}
                                                </td>
                                                <td className="center" style={{ color: '#6b7280', fontSize: '0.83rem' }}>
                                                    {i.dataIscrizione ? new Date(i.dataIscrizione).toLocaleDateString('it-IT') : '—'}
                                                </td>
                                                <td className="center">
                                                    <button
                                                        className="cm-btn-remove"
                                                        title="Rimuovi"
                                                        onClick={() => handleRemoveIscritto(i.socioId)}
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}

                    </div>
                )}

                {/* ── Footer ── */}
                <div className="cm-footer">
                    <button className="btn-danger" onClick={onClose}>
                        <X size={15} /> {activeTab === 'impostazioni' ? 'Annulla' : 'Chiudi'}
                    </button>
                    {activeTab === 'impostazioni' && (
                        <button className="btn-success" onClick={handleSubmit}>
                            ✓ Salva impostazioni
                        </button>
                    )}
                </div>

            </div>
        </div>

        <RicercaSocioModal
            isOpen={showRicerca}
            onClose={() => setShowRicerca(false)}
            onSelect={handleAddSocio}
            societaId={societaId}
            abbonamentoId={corso?.abbonamentoId}
            abbonamentoNome={abbonamenti.find(a => a.id === corso?.abbonamentoId)?.description || ''}
        />
        </>
    );
};

export default CorsoModal;

