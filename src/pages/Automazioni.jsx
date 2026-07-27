import React, { useState, useEffect, useMemo } from 'react';
import { Mail, Save, PlayCircle, Info } from 'lucide-react';
import { useSocieta } from '../data/SocietaContext';
import { useConfirm } from '../components/ConfirmModal';
import './Automazioni.css';

const CATEGORIA_LABEL = {
    ets_point: 'ETS Point',
    associazioni: 'Associazioni',
};

const Automazioni = () => {
    const { selectedSocietaId } = useSocieta();
    const confirm = useConfirm();
    const [activeTab, setActiveTab] = useState('config');

    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [runningNow, setRunningNow] = useState(false);
    const [message, setMessage] = useState(null);

    const [logRows, setLogRows] = useState([]);
    const [logLoading, setLogLoading] = useState(false);
    const [logFilters, setLogFilters] = useState({ tipo: '', dataDa: '', dataA: '' });

    const fetchConfig = async () => {
        if (!selectedSocietaId) return;
        setLoading(true);
        try {
            const res = await fetch(`/users/api/automazioni/config?societaId=${selectedSocietaId}`);
            if (res.ok) {
                const data = await res.json();
                setRules(data.rules);
            }
        } catch (e) {
            console.error('Errore caricamento configurazione automazioni', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchLog = async () => {
        if (!selectedSocietaId) return;
        setLogLoading(true);
        try {
            const params = new URLSearchParams({ societaId: selectedSocietaId });
            if (logFilters.tipo) params.append('tipo', logFilters.tipo);
            if (logFilters.dataDa) params.append('dataDa', logFilters.dataDa);
            if (logFilters.dataA) params.append('dataA', logFilters.dataA);
            const res = await fetch(`/users/api/automazioni/log?${params.toString()}`);
            if (res.ok) setLogRows(await res.json());
        } catch (e) {
            console.error('Errore caricamento log automazioni', e);
        } finally {
            setLogLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
        setMessage(null);
    }, [selectedSocietaId]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (activeTab === 'log') fetchLog();
    }, [activeTab, selectedSocietaId]); // eslint-disable-line react-hooks/exhaustive-deps

    const updateRule = (tipo, patch) => {
        setRules(prev => prev.map(r => r.tipo === tipo ? { ...r, ...patch } : r));
    };

    const updateExtraConfig = (tipo, patch) => {
        setRules(prev => prev.map(r => r.tipo === tipo ? { ...r, extra_config: { ...r.extra_config, ...patch } } : r));
    };

    const handleSave = async () => {
        if (!selectedSocietaId) return;
        setSaving(true);
        setMessage(null);
        try {
            const payload = {
                societaId: selectedSocietaId,
                rules: rules.map(r => ({
                    tipo: r.tipo,
                    attiva: r.attiva,
                    giorni_anticipo: parseInt(r.giorni_anticipo, 10) || 0,
                    extra_config: r.extra_config || null,
                    oggetto_email: r.oggetto_email || null,
                    testo_email: r.testo_email || null,
                })),
            };
            const res = await fetch('/users/api/automazioni/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                setMessage({ type: 'success', text: 'Configurazione salvata con successo' });
                fetchConfig();
            } else {
                const err = await res.json();
                setMessage({ type: 'error', text: 'Errore durante il salvataggio: ' + (err.error || err.message) });
            }
        } catch (e) {
            console.error(e);
            setMessage({ type: 'error', text: 'Errore di rete' });
        } finally {
            setSaving(false);
        }
    };

    const handleRunNow = async () => {
        if (!selectedSocietaId) return;
        const ok = await confirm(
            'Verranno controllate subito tutte le automazioni attive di questa società e, per quelle risultate in scadenza, verrà inviata SUBITO la relativa email ai soci interessati (non è una simulazione). Le email già inviate in precedenza per la stessa scadenza non vengono duplicate. Procedere?',
            'Esegui controllo ora',
            { confirmLabel: 'Esegui e invia', confirmColor: 'var(--warning)' }
        );
        if (!ok) return;
        setRunningNow(true);
        setMessage(null);
        try {
            const res = await fetch('/users/api/automazioni/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ societaId: selectedSocietaId }),
            });
            if (res.ok) {
                const data = await res.json();
                setMessage({ type: 'success', text: `Controllo eseguito — inviati: ${data.inviati}, errori: ${data.errori}, saltati: ${data.saltati}` });
                fetchConfig();
                if (activeTab === 'log') fetchLog();
            } else {
                const err = await res.json();
                setMessage({ type: 'error', text: 'Errore durante l\'esecuzione: ' + (err.error || err.message) });
            }
        } catch (e) {
            console.error(e);
            setMessage({ type: 'error', text: 'Errore di rete' });
        } finally {
            setRunningNow(false);
        }
    };

    const grouped = useMemo(() => {
        const byCategoria = {};
        for (const r of rules) {
            if (!byCategoria[r.categoria]) byCategoria[r.categoria] = [];
            byCategoria[r.categoria].push(r);
        }
        return byCategoria;
    }, [rules]);

    const formatDate = (s) => {
        if (!s) return '—';
        return new Date(s).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    if (!selectedSocietaId) {
        return <div className="auto-container"><p>Seleziona una società per gestire le automazioni.</p></div>;
    }

    return (
        <div className="auto-container">
            <div className="auto-tabs-header">
                <button className={`auto-tab-btn ${activeTab === 'config' ? 'active' : ''}`} onClick={() => setActiveTab('config')}>
                    Configurazione
                </button>
                <button className={`auto-tab-btn ${activeTab === 'log' ? 'active' : ''}`} onClick={() => setActiveTab('log')}>
                    Log invii
                </button>
            </div>

            {message && (
                <div className={`auto-message auto-message-${message.type}`}>{message.text}</div>
            )}

            {activeTab === 'config' && (
                <div className="auto-panel">
                    {loading ? (
                        <p>Caricamento...</p>
                    ) : (
                        <>
                            <div className="auto-info-note">
                                <Info size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                                <span>
                                    Il controllo delle scadenze e l'invio delle email vengono eseguiti automaticamente
                                    <strong> una volta al giorno, alle 6:00</strong>. Il pulsante "Esegui controllo ora"
                                    in fondo alla pagina forza subito lo stesso controllo, inviando immediatamente le
                                    email eventualmente dovute (senza duplicare quelle già inviate).
                                </span>
                            </div>

                            {['ets_point', 'associazioni'].map(categoria => (
                                grouped[categoria] && (
                                    <div key={categoria} className="auto-section card">
                                        <div className="auto-section-title">
                                            <Mail size={16} /> {CATEGORIA_LABEL[categoria]}
                                        </div>
                                        <div className="table-responsive">
                                            <table className="md-table auto-table">
                                                <thead>
                                                    <tr>
                                                        <th>Automazione</th>
                                                        <th>Attiva</th>
                                                        <th>Giorni anticipo</th>
                                                        <th>Dati scadenza</th>
                                                        <th>Prossimo invio</th>
                                                        <th>Ultimo invio</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {grouped[categoria].map(r => (
                                                        <tr key={r.tipo} className={!r.applicabile ? 'auto-row-disabled' : ''}>
                                                            <td>
                                                                {r.label}
                                                                {!r.applicabile && (
                                                                    <div className="auto-row-note">Non applicabile per questa società</div>
                                                                )}
                                                            </td>
                                                            <td>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={!!r.attiva}
                                                                    disabled={!r.applicabile}
                                                                    onChange={(e) => updateRule(r.tipo, { attiva: e.target.checked })}
                                                                />
                                                            </td>
                                                            <td>
                                                                <input
                                                                    className="md-input auto-input-num"
                                                                    type="number"
                                                                    min="0"
                                                                    disabled={!r.applicabile}
                                                                    value={r.giorni_anticipo}
                                                                    onChange={(e) => updateRule(r.tipo, { giorni_anticipo: e.target.value })}
                                                                />
                                                            </td>
                                                            <td>
                                                                {r.richiedeExtraBiennale && (
                                                                    <div className="auto-biannual">
                                                                        <span>1ª:</span>
                                                                        <input className="md-input auto-input-num" type="number" min="1" max="31" disabled={!r.applicabile}
                                                                            value={r.extra_config?.giorno1 || ''} onChange={(e) => updateExtraConfig(r.tipo, { giorno1: parseInt(e.target.value, 10) || 1 })} placeholder="gg" />
                                                                        <input className="md-input auto-input-num" type="number" min="1" max="12" disabled={!r.applicabile}
                                                                            value={r.extra_config?.mese1 || ''} onChange={(e) => updateExtraConfig(r.tipo, { mese1: parseInt(e.target.value, 10) || 1 })} placeholder="mm" />
                                                                        <span>2ª:</span>
                                                                        <input className="md-input auto-input-num" type="number" min="1" max="31" disabled={!r.applicabile}
                                                                            value={r.extra_config?.giorno2 || ''} onChange={(e) => updateExtraConfig(r.tipo, { giorno2: parseInt(e.target.value, 10) || 1 })} placeholder="gg" />
                                                                        <input className="md-input auto-input-num" type="number" min="1" max="12" disabled={!r.applicabile}
                                                                            value={r.extra_config?.mese2 || ''} onChange={(e) => updateExtraConfig(r.tipo, { mese2: parseInt(e.target.value, 10) || 1 })} placeholder="mm" />
                                                                    </div>
                                                                )}
                                                                {r.ambito === 'socio' && (
                                                                    <span className="auto-row-note">Gestito per singolo socio</span>
                                                                )}
                                                            </td>
                                                            <td>{r.ambito === 'societa' ? formatDate(r.prossimo_invio) : '—'}</td>
                                                            <td>{formatDate(r.ultimo_invio)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )
                            ))}

                            <div className="auto-actions">
                                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                    <Save size={16} /> {saving ? 'Salvataggio...' : 'Salva configurazione'}
                                </button>
                                <button className="btn btn-secondary" onClick={handleRunNow} disabled={runningNow}>
                                    <PlayCircle size={16} /> {runningNow ? 'Esecuzione...' : 'Esegui controllo ora'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {activeTab === 'log' && (
                <div className="auto-panel">
                    <div className="toolbar-card auto-log-filters">
                        <div className="auto-log-filter-group">
                            <label className="field-label">Tipo</label>
                            <select className="md-select" value={logFilters.tipo} onChange={(e) => setLogFilters(prev => ({ ...prev, tipo: e.target.value }))}>
                                <option value="">Tutti i tipi</option>
                                {rules.map(r => <option key={r.tipo} value={r.tipo}>{r.label}</option>)}
                            </select>
                        </div>
                        <div className="auto-log-filter-group auto-log-filter-date">
                            <label className="field-label">Data da</label>
                            <input type="date" className="md-input" value={logFilters.dataDa} onChange={(e) => setLogFilters(prev => ({ ...prev, dataDa: e.target.value }))} />
                        </div>
                        <div className="auto-log-filter-group auto-log-filter-date">
                            <label className="field-label">Data a</label>
                            <input type="date" className="md-input" value={logFilters.dataA} onChange={(e) => setLogFilters(prev => ({ ...prev, dataA: e.target.value }))} />
                        </div>
                        <button className="btn btn-secondary auto-log-filter-btn" onClick={fetchLog}>Filtra</button>
                    </div>

                    <div className="card">
                        <div className="table-responsive">
                            <table className="md-table">
                                <thead>
                                    <tr>
                                        <th>Data invio</th>
                                        <th>Tipo</th>
                                        <th>Destinatario</th>
                                        <th>Esito</th>
                                        <th>Scadenza riferimento</th>
                                        <th>Dettaglio</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logLoading ? (
                                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>Caricamento...</td></tr>
                                    ) : logRows.length === 0 ? (
                                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>Nessun invio registrato</td></tr>
                                    ) : logRows.map(row => (
                                        <tr key={row.id}>
                                            <td>{new Date(row.data_invio).toLocaleString('it-IT')}</td>
                                            <td>{rules.find(r => r.tipo === row.tipo)?.label || row.tipo}</td>
                                            <td>{row.destinatario || (row.socio ? `${row.socio.cognome} ${row.socio.nome}` : '—')}</td>
                                            <td>
                                                <span className={`auto-badge auto-badge-${row.esito === 'INVIATO' ? 'ok' : 'error'}`}>{row.esito}</span>
                                            </td>
                                            <td>{formatDate(row.scadenza_riferimento)}</td>
                                            <td>{row.dettaglio_errore || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Automazioni;
