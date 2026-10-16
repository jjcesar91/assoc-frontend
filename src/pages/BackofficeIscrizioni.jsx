import React, { useState, useEffect, useCallback } from 'react';
import { Edit2, Building2 } from 'lucide-react';
import BackofficeSocietaModal, { ABBONAMENTO_DEFAULT } from './BackofficeSocietaModal';
import { formatDateIT } from '../utils/dateUtils';
import './Prodotti.css';

const TIPO_OPTIONS = ['ASD', 'APS'];

// Backoffice → Iscrizioni: società registrate (solo superuser).
const BackofficeIscrizioni = () => {
    const [societa, setSocieta] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [filters, setFilters] = useState({ denominazione: '', tipo_associazione: '' });

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/users/api/societa');
            if (res.ok) setSocieta(await res.json());
        } catch (e) {
            console.error('Errore caricamento società', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Dopo il salvataggio dell'anagrafica aggiorna la riga e la società aperta nel modal
    const handleSaved = (updated) => {
        setSocieta(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s));
        setSelected(prev => prev && prev.id === updated.id ? { ...prev, ...updated } : prev);
    };

    const filtered = societa
        .filter(s => {
            if (filters.denominazione && !(s.denominazione || '').toLowerCase().includes(filters.denominazione.toLowerCase())) return false;
            if (filters.tipo_associazione && s.tipo_associazione !== filters.tipo_associazione) return false;
            return true;
        })
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    return (
        <div className="prodotti-full-container">
            <div className="main-content">
                <div className="toolbar-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 2, minWidth: '200px' }}>
                            <label style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Denominazione</label>
                            <input
                                className="md-input"
                                placeholder="Denominazione"
                                value={filters.denominazione}
                                onChange={e => setFilters(f => ({ ...f, denominazione: e.target.value }))}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '160px' }}>
                            <label style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Tipo</label>
                            <select
                                className="md-select"
                                value={filters.tipo_associazione}
                                onChange={e => setFilters(f => ({ ...f, tipo_associazione: e.target.value }))}
                            >
                                <option value="">Tutti</option>
                                {TIPO_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="table-card">
                    <div className="table-responsive">
                        <table className="md-table">
                            <thead>
                                <tr>
                                    <th>Denominazione</th>
                                    <th>Tipo</th>
                                    <th>Codice fiscale</th>
                                    <th>Email</th>
                                    <th>Data registrazione</th>
                                    <th>Abbonamento</th>
                                    <th style={{ textAlign: 'right' }}>Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                                            Caricamento...
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                                            Nessuna società trovata
                                        </td>
                                    </tr>
                                ) : filtered.map(s => (
                                    <tr key={s.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{
                                                    width: '40px', height: '40px', borderRadius: '50%',
                                                    backgroundColor: 'var(--info-container)', color: 'var(--primary)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    flexShrink: 0,
                                                }}>
                                                    <Building2 size={20} />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 500 }}>{s.denominazione}</div>
                                                    {s.partita_iva && (
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                            P.IVA {s.partita_iva}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ fontSize: '0.875rem' }}>{s.tipo_associazione || '–'}</td>
                                        <td style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>{s.codice_fiscale || '–'}</td>
                                        <td style={{ fontSize: '0.875rem' }}>{s.email || '–'}</td>
                                        <td style={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{s.createdAt ? formatDateIT(s.createdAt) : '–'}</td>
                                        <td><span className="badge badge-info">{ABBONAMENTO_DEFAULT}</span></td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button
                                                className="btn-icon-small"
                                                title="Modifica"
                                                style={{ backgroundColor: 'var(--warning)', color: '#fff', borderRadius: '4px', padding: '5px 8px' }}
                                                onClick={() => setSelected(s)}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {!loading && (
                        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            Tot righe: <strong>{filtered.length}</strong>
                        </div>
                    )}
                </div>
            </div>

            {selected && (
                <BackofficeSocietaModal
                    key={selected.id}
                    societa={selected}
                    onClose={() => setSelected(null)}
                    onSaved={handleSaved}
                />
            )}
        </div>
    );
};

export default BackofficeIscrizioni;
