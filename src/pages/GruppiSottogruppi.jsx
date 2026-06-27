import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, Lock } from 'lucide-react';
import { useSocieta } from '../data/SocietaContext';
import { useConfirm } from '../components/ConfirmModal';
import './Soci.css';

const API = '/payments/api';

const SEZIONI = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const NUMERI = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const TIPO_CODICE = { 'Entrata': 'E', 'Uscita': 'U', 'Entrata/Uscita': 'EU' };

// Gruppi: codice = sezione + tipo_abbreviation (nessun numero)
const computeCodiceGruppo = (sezione, tipo) => {
    if (!sezione) return '';
    return `${sezione}${TIPO_CODICE[tipo] || ''}`;
};

// Sottogruppi: codice = codice_parent + numero
const computeCodiceSotto = (parentCodice, numero) => {
    if (!parentCodice || !numero) return '';
    return `${parentCodice}${numero}`;
};

const TIPO_BADGE_COLORS = {
    Entrata:        { bg: 'var(--success-container)', color: 'var(--success)' },
    Uscita:         { bg: 'var(--danger-container)', color: 'var(--danger)' },
    'Entrata/Uscita': { bg: 'var(--info-container)', color: 'var(--primary-hover)' },
};

const FORM_EMPTY_GRUPPO = { descrizione: '', tipo: 'Entrata', sezione: '', codice: '' };
const FORM_EMPTY_SOTTO  = { descrizione: '', tipo: 'Entrata', sezione: '', numero: '', codice: '', gruppo_id: '', senza_codice: false };

// ---------------------------------------------------------------------------
// Tab: Gruppi
// ---------------------------------------------------------------------------
const GruppiTab = ({ gruppi, loading, onRefresh, selectedSocietaId }) => {
    const [form, setForm] = useState(FORM_EMPTY_GRUPPO);
    const [editingId, setEditingId] = useState(null);
    const [error, setError] = useState(null);
    const confirm = useConfirm();

    useEffect(() => { setForm(FORM_EMPTY_GRUPPO); setEditingId(null); setError(null); }, [selectedSocietaId]);

    const handleChange = (field, value) => {
        setForm(prev => {
            const next = { ...prev, [field]: value };
            if (['sezione', 'tipo'].includes(field)) {
                next.codice = computeCodiceGruppo(
                    field === 'sezione' ? value : next.sezione,
                    field === 'tipo'    ? value : next.tipo,
                );
            }
            return next;
        });
    };

    const resetForm = () => { setForm(FORM_EMPTY_GRUPPO); setEditingId(null); setError(null); };

    const handleEdit = (g) => {
        setEditingId(g.id);
        setForm({
            descrizione: g.descrizione,
            tipo: g.tipo,
            sezione: g.sezione || '',
            codice: g.codice || '',
        });
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        // Validazione unicità codice
        if (form.codice) {
            const duplicate = soloGruppi.find(g => g.codice === form.codice && g.id !== editingId);
            if (duplicate) {
                setError(`Il codice "${form.codice}" è già utilizzato da un altro gruppo o sottogruppo.`);
                return;
            }
        }
        const payload = {
            societa_id: selectedSocietaId,
            descrizione: form.descrizione.trim(),
            tipo: form.tipo,
            sezione: form.sezione || null,
            numero: null,
            codice: form.codice || null,
            gruppo_id: null,
            is_default: false,
        };
        const token = localStorage.getItem('token');
        const url    = editingId ? `${API}/gruppi/${editingId}` : `${API}/gruppi`;
        const method = editingId ? 'PUT' : 'POST';
        try {
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Errore nel salvataggio'); }
            resetForm();
            onRefresh();
        } catch (err) { setError(err.message); }
    };

    const handleDelete = async (id) => {
        if (!await confirm('Eliminare questo gruppo?')) return;
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API}/gruppi/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Errore nell'eliminazione"); }
            onRefresh();
        } catch (err) { setError(err.message); }
    };

    const soloGruppi = useMemo(() => gruppi.filter(g => !g.gruppo_id), [gruppi]);

    return (
        <>
            {error && <div style={{ backgroundColor: 'var(--danger-container)', color: 'var(--danger)', padding: '12px', borderRadius: '4px', marginBottom: '16px' }}>{error}</div>}

            {/* Form */}
            <div className="toolbar-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'stretch', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
                    {editingId ? 'Modifica Gruppo' : 'Aggiungi Gruppo'}
                </h3>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 3, minWidth: '200px' }}>
                        <label style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Descrizione *</label>
                        <input className="md-input" placeholder="Es. Entrate da attività di interesse generale" value={form.descrizione} onChange={e => handleChange('descrizione', e.target.value)} required />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: '150px' }}>
                        <label style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Tipo *</label>
                        <select className="md-select" style={{ padding: '10px 12px' }} value={form.tipo} onChange={e => handleChange('tipo', e.target.value)} required>
                            <option value="Entrata">Entrata</option>
                            <option value="Uscita">Uscita</option>
                            <option value="Entrata/Uscita">Entrata/Uscita</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: '90px' }}>
                        <label style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Sezione <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(opz.)</span></label>
                        <select className="md-select" style={{ padding: '10px 12px' }} value={form.sezione} onChange={e => handleChange('sezione', e.target.value)}>
                            <option value="">—</option>
                            {SEZIONI.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: '100px' }}>
                        <label style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Codice</label>
                        <input className="md-input" value={form.codice} readOnly style={{ background: 'var(--surface-1)', cursor: 'default', fontWeight: '600', letterSpacing: '0.05em' }} placeholder="auto" />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-end' }}>
                        {editingId && <button type="button" className="btn-outlined" onClick={resetForm} style={{ height: '42px' }}>Annulla</button>}
                        <button type="submit" className="btn-contained" style={{ height: '42px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {editingId ? <Edit2 size={16} /> : <Plus size={16} />}
                            {editingId ? 'Aggiorna' : 'Crea'}
                        </button>
                    </div>
                </form>
            </div>

            {!form.sezione && (
                <div style={{ marginBottom: '12px', padding: '8px 14px', background: 'var(--warning-container)', border: '1px solid var(--warning-container)', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--on-warning-container)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    ⚠️ Senza sezione/codice il gruppo non apparirà nel Bilancio
                </div>
            )}

            {/* Tabella */}
            <div style={{ flex: 1, overflow: 'auto', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <table className="md-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--surface-1)', zIndex: 1, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <tr>
                            <th style={{ padding: '16px', fontWeight: '600', color: 'var(--text-secondary)' }}>Codice</th>
                            <th style={{ padding: '16px', fontWeight: '600', color: 'var(--text-secondary)' }}>Descrizione</th>
                            <th style={{ padding: '16px', fontWeight: '600', color: 'var(--text-secondary)' }}>Tipo</th>
                            <th style={{ padding: '16px', fontWeight: '600', color: 'var(--text-secondary)', textAlign: 'right' }}>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>Caricamento...</td></tr>
                        ) : soloGruppi.length === 0 ? (
                            <tr><td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>Nessun gruppo trovato.</td></tr>
                        ) : soloGruppi.map(g => {
                            const badge = TIPO_BADGE_COLORS[g.tipo] || {};
                            return (
                                <tr key={g.id} style={{ borderBottom: '1px solid #eee' }} className="hover-row">
                                    <td style={{ padding: '12px 16px' }}>
                                        {g.codice
                                            ? <span style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)' }}>{g.codice}</span>
                                            : <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>— <span style={{ fontSize: '0.72rem', color: 'var(--warning)' }}>(no bilancio)</span></span>
                                        }
                                    </td>
                                    <td style={{ padding: '12px 16px', fontWeight: '500', color: 'var(--text-primary)' }}>
                                        {g.descrizione}
                                        {g.is_default && <Lock size={12} title="Predefinito — non eliminabile" style={{ marginLeft: '6px', color: 'var(--text-tertiary)', verticalAlign: 'middle' }} />}
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '12px', fontSize: '0.82rem', fontWeight: '500', backgroundColor: badge.bg, color: badge.color }}>{g.tipo}</span>
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                        {!g.is_default && <button className="btn-icon-small" title="Modifica" onClick={() => handleEdit(g)}><Edit2 size={18} /></button>}
                                        {!g.is_default && (
                                            <button className="btn-icon-small" title="Elimina" onClick={() => handleDelete(g.id)} style={{ color: 'var(--danger)' }}><Trash2 size={18} /></button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </>
    );
};

// ---------------------------------------------------------------------------
// Tab: Sottogruppi
// ---------------------------------------------------------------------------
const SottogruppiTab = ({ gruppi, loading, onRefresh, selectedSocietaId }) => {
    const [form, setForm] = useState(FORM_EMPTY_SOTTO);
    const [editingId, setEditingId] = useState(null);
    const [error, setError] = useState(null);
    const confirm = useConfirm();

    useEffect(() => { setForm(FORM_EMPTY_SOTTO); setEditingId(null); setError(null); }, [selectedSocietaId]);

    const soloGruppi = useMemo(() => gruppi.filter(g => !g.gruppo_id), [gruppi]);
    const sottogruppi = useMemo(() => gruppi.filter(g => g.gruppo_id), [gruppi]);

    const handleChange = (field, value) => {
        setForm(prev => {
            const next = { ...prev, [field]: value };
            if (field === 'gruppo_id' || field === 'numero') {
                const parentId = field === 'gruppo_id' ? value : prev.gruppo_id;
                const parent = soloGruppi.find(g => g.id === parseInt(parentId, 10));
                const parentCodice = parent?.codice || '';
                const numero = field === 'numero' ? value : prev.numero;
                next.codice = computeCodiceSotto(parentCodice, numero);
                if (field === 'gruppo_id') {
                    // Eredita tipo e sezione dal gruppo genitore
                    next.tipo = parent?.tipo || 'Entrata';
                    next.sezione = parent?.sezione || '';
                    next.numero = '';
                }
            }
            return next;
        });
    };

    const resetForm = () => { setForm(FORM_EMPTY_SOTTO); setEditingId(null); setError(null); };

    const handleEdit = (g) => {
        setEditingId(g.id);
        setForm({
            descrizione: g.descrizione,
            tipo: g.tipo,
            sezione: g.sezione || '',
            numero: g.numero || '',
            codice: g.codice || '',
            gruppo_id: g.gruppo_id || '',
        });
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        if (!form.gruppo_id) { setError('Selezionare il gruppo genitore'); return; }
        // Validazione unicità codice (tra tutti i gruppi e sottogruppi)
        if (form.codice) {
            const duplicate = gruppi.find(g => g.codice === form.codice && g.id !== editingId);
            if (duplicate) {
                setError(`Il codice "${form.codice}" è già utilizzato da un altro gruppo o sottogruppo.`);
                return;
            }
        }
        const payload = {
            societa_id: selectedSocietaId,
            descrizione: form.descrizione.trim(),
            tipo: form.tipo,
            sezione: form.sezione || null,
            numero: form.numero ? parseInt(form.numero, 10) : null,
            codice: form.codice || null,
            gruppo_id: parseInt(form.gruppo_id, 10),
            is_default: false,
        };
        const token = localStorage.getItem('token');
        const url    = editingId ? `${API}/gruppi/${editingId}` : `${API}/gruppi`;
        const method = editingId ? 'PUT' : 'POST';
        try {
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Errore nel salvataggio'); }
            resetForm();
            onRefresh();
        } catch (err) { setError(err.message); }
    };

    const handleDelete = async (id) => {
        if (!await confirm('Eliminare questo sottogruppo?')) return;
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API}/gruppi/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Errore nell'eliminazione"); }
            onRefresh();
        } catch (err) { setError(err.message); }
    };

    const getGruppoLabel = (gruppoId) => {
        const g = soloGruppi.find(x => x.id === gruppoId);
        if (!g) return '—';
        return g.codice ? `${g.codice} — ${g.descrizione}` : g.descrizione;
    };

    return (
        <>
            {error && <div style={{ backgroundColor: 'var(--danger-container)', color: 'var(--danger)', padding: '12px', borderRadius: '4px', marginBottom: '16px' }}>{error}</div>}

            {/* Form */}
            <div className="toolbar-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'stretch', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
                    {editingId ? 'Modifica Sottogruppo' : 'Aggiungi Sottogruppo'}
                </h3>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '180px' }}>
                        <label style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Gruppo genitore *</label>
                        <select className="md-select" style={{ padding: '10px 12px' }} value={form.gruppo_id} onChange={e => handleChange('gruppo_id', e.target.value)} required>
                            <option value="">Seleziona...</option>
                            {soloGruppi.map(g => (
                                <option key={g.id} value={g.id}>
                                    {g.codice ? `${g.codice} — ` : ''}{g.descrizione}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 3, minWidth: '180px' }}>
                        <label style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Descrizione *</label>
                        <input className="md-input" placeholder="Es. Quote associative" value={form.descrizione} onChange={e => handleChange('descrizione', e.target.value)} required />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: '90px' }}>
                        <label style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Numero <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(opz.)</span></label>
                        <select className="md-select" style={{ padding: '10px 12px' }} value={form.numero} onChange={e => handleChange('numero', e.target.value)}>
                            <option value="">—</option>
                            {NUMERI.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: '120px' }}>
                        <label style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Codice</label>
                        <input className="md-input" value={form.codice} readOnly style={{ background: 'var(--surface-1)', cursor: 'default', fontWeight: '600', letterSpacing: '0.05em' }} placeholder="auto" />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-end' }}>
                        {editingId && <button type="button" className="btn-outlined" onClick={resetForm} style={{ height: '42px' }}>Annulla</button>}
                        <button type="submit" className="btn-contained" style={{ height: '42px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {editingId ? <Edit2 size={16} /> : <Plus size={16} />}
                            {editingId ? 'Aggiorna' : 'Crea'}
                        </button>
                    </div>
                </form>
            </div>

            {!form.codice && form.gruppo_id && (
                <div style={{ marginBottom: '12px', padding: '8px 14px', background: 'var(--warning-container)', border: '1px solid var(--warning-container)', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--on-warning-container)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    ⚠️ Senza numero il sottogruppo non apparirà nel Bilancio
                </div>
            )}

            {/* Tabella */}
            <div style={{ flex: 1, overflow: 'auto', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <table className="md-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--surface-1)', zIndex: 1, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <tr>
                            <th style={{ padding: '16px', fontWeight: '600', color: 'var(--text-secondary)' }}>Codice</th>
                            <th style={{ padding: '16px', fontWeight: '600', color: 'var(--text-secondary)' }}>Descrizione</th>
                            <th style={{ padding: '16px', fontWeight: '600', color: 'var(--text-secondary)' }}>Tipo</th>
                            <th style={{ padding: '16px', fontWeight: '600', color: 'var(--text-secondary)' }}>Gruppo genitore</th>
                            <th style={{ padding: '16px', fontWeight: '600', color: 'var(--text-secondary)', textAlign: 'right' }}>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>Caricamento...</td></tr>
                        ) : sottogruppi.length === 0 ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>Nessun sottogruppo trovato.</td></tr>
                        ) : sottogruppi.map(g => {
                            const badge = TIPO_BADGE_COLORS[g.tipo] || {};
                            return (
                                <tr key={g.id} style={{ borderBottom: '1px solid #eee' }} className="hover-row">
                                    <td style={{ padding: '12px 16px' }}>
                                        {g.codice
                                            ? <span style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)' }}>{g.codice}</span>
                                            : <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>— <span style={{ fontSize: '0.72rem', color: 'var(--warning)' }}>(no bilancio)</span></span>
                                        }
                                    </td>
                                    <td style={{ padding: '12px 16px', fontWeight: '500', color: 'var(--text-primary)' }}>
                                        {g.descrizione}
                                        {g.is_default && <Lock size={12} title="Predefinito — non eliminabile" style={{ marginLeft: '6px', color: 'var(--text-tertiary)', verticalAlign: 'middle' }} />}
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '12px', fontSize: '0.82rem', fontWeight: '500', backgroundColor: badge.bg, color: badge.color }}>{g.tipo}</span>
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{getGruppoLabel(g.gruppo_id)}</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                        {!g.is_default && <button className="btn-icon-small" title="Modifica" onClick={() => handleEdit(g)}><Edit2 size={18} /></button>}
                                        {!g.is_default && (
                                            <button className="btn-icon-small" title="Elimina" onClick={() => handleDelete(g.id)} style={{ color: 'var(--danger)' }}><Trash2 size={18} /></button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </>
    );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const GruppiSottogruppi = () => {
    const [activeTab, setActiveTab] = useState('gruppi');
    const { selectedSocietaId } = useSocieta();
    const [gruppi, setGruppi] = useState([]);
    const [loading, setLoading] = useState(false);
    const [globalError, setGlobalError] = useState(null);

    const fetchGruppi = async () => {
        if (!selectedSocietaId) { setGruppi([]); return; }
        setLoading(true);
        setGlobalError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API}/gruppi?societa_id=${selectedSocietaId}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Errore nel caricamento');
            setGruppi(await res.json());
        } catch (err) {
            setGlobalError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchGruppi(); }, [selectedSocietaId]); // eslint-disable-line react-hooks/exhaustive-deps

    const tabStyle = (name) => ({
        padding: '12px 32px',
        border: 'none',
        borderRadius: '8px 8px 0 0',
        backgroundColor: activeTab === name ? 'var(--primary-color, var(--primary))' : 'transparent',
        cursor: 'pointer',
        fontWeight: '500',
        color: activeTab === name ? '#fff' : 'var(--text-secondary)',
        fontSize: '1rem',
        transition: 'all 0.2s',
    });

    return (
        <div className="soci-full-container">
            <div className="main-content">
                {globalError && <div style={{ backgroundColor: 'var(--danger-container)', color: 'var(--danger)', padding: '12px', borderRadius: '4px', marginBottom: '16px' }}>{globalError}</div>}

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--border-color)', padding: '6px 6px 0 6px', borderBottom: '1px solid var(--border-color)', marginBottom: '20px' }}>
                    <button
                        style={tabStyle('gruppi')}
                        onClick={() => setActiveTab('gruppi')}
                        onMouseEnter={e => { if (activeTab !== 'gruppi') e.currentTarget.style.backgroundColor = 'var(--border-color)'; }}
                        onMouseLeave={e => { if (activeTab !== 'gruppi') e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >Gruppi</button>
                    <button
                        style={tabStyle('sottogruppi')}
                        onClick={() => setActiveTab('sottogruppi')}
                        onMouseEnter={e => { if (activeTab !== 'sottogruppi') e.currentTarget.style.backgroundColor = 'var(--border-color)'; }}
                        onMouseLeave={e => { if (activeTab !== 'sottogruppi') e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >Sottogruppi</button>
                </div>

                {activeTab === 'gruppi' && (
                    <GruppiTab gruppi={gruppi} loading={loading} onRefresh={fetchGruppi} selectedSocietaId={selectedSocietaId} />
                )}
                {activeTab === 'sottogruppi' && (
                    <SottogruppiTab gruppi={gruppi} loading={loading} onRefresh={fetchGruppi} selectedSocietaId={selectedSocietaId} />
                )}
            </div>
        </div>
    );
};

export default GruppiSottogruppi;
