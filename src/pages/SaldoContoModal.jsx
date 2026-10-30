import React, { useEffect, useState } from 'react';
import { X, Wallet, History } from 'lucide-react';
import { formatDateIT, formatDateTimeIT } from '../utils/dateUtils';
import './NuovaOperazioneModal.css';

// Prima Nota → saldo iniziale di un conto: modifica di importo e data (amministratori della
// società e superuser; se il saldo non è mai stato impostato, chiunque) con lo storico di
// tutte le modifiche (PUT /conti/:id/saldo, GET /conti/:id/saldo/storico).
const euro = (v) => (v == null ? '—' : `${Number(v).toFixed(2).replace('.', ',')} €`);

const SaldoContoModal = ({ conto, onClose, onSaved }) => {
    const ruolo = localStorage.getItem('user_role') || '';
    const impostato = !!conto && (conto.saldo_iniziale_data != null || (conto.saldo_iniziale != null && Number(conto.saldo_iniziale) !== 0));
    const puoModificare = !impostato || ['admin', 'superuser'].includes(ruolo);

    const [saldo, setSaldo] = useState('');
    const [data, setData] = useState('');
    const [storico, setStorico] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // All'apertura: valori attuali del conto (aggiornamento durante il render)
    const [apertoPer, setApertoPer] = useState(null);
    if (conto && apertoPer !== conto.id) {
        setApertoPer(conto.id);
        setSaldo(conto.saldo_iniziale != null ? String(conto.saldo_iniziale) : '0');
        setData(conto.saldo_iniziale_data || '');
        setError(null);
        setStorico(null);
    }
    if (!conto && apertoPer !== null) setApertoPer(null);

    useEffect(() => {
        if (!conto) return;
        let annullato = false;
        const token = localStorage.getItem('token');
        fetch(`/payments/api/conti/${conto.id}/saldo/storico`, { headers: { 'Authorization': `Bearer ${token}` } })
            .then(r => (r.ok ? r.json() : []))
            .then(d => { if (!annullato) setStorico(Array.isArray(d) ? d : []); })
            .catch(() => { if (!annullato) setStorico([]); });
        return () => { annullato = true; };
    }, [conto]);

    if (!conto) return null;

    const salva = async (e) => {
        e.preventDefault();
        setError(null);
        const valore = String(saldo).trim().replace(',', '.');
        if (valore !== '' && isNaN(Number(valore))) { setError('Inserisci un importo valido (es. 1250,00 o -300).'); return; }
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/payments/api/conti/${conto.id}/saldo`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ saldo_iniziale: valore === '' ? 0 : Number(valore), saldo_iniziale_data: data || null, origine: 'prima_nota' }),
            });
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                throw new Error(d.error || 'Salvataggio non riuscito');
            }
            onSaved?.();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="nom-overlay">
            <div className="nom-modal" style={{ maxWidth: '560px' }} onClick={e => e.stopPropagation()}>
                <div className="nom-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Wallet size={20} />
                        <span>Saldo iniziale · {conto.descrizione}</span>
                    </div>
                    <button className="nom-close-btn" onClick={onClose} title="Chiudi"><X size={20} /></button>
                </div>

                <form onSubmit={salva} className="nom-body">
                    <div className="nom-section">
                        <div className="nom-section-title">Saldo del conto</div>
                        <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            È il punto di partenza del conto: la Prima Nota lo mostra alla sua data e lo riporta
                            all'inizio delle stagioni successive sommando i movimenti.
                        </p>
                        <div className="nom-fields-grid">
                            <div className="nom-field nom-field--half">
                                <label>Saldo (€)</label>
                                <input className="md-input" inputMode="decimal" value={saldo} onChange={e => setSaldo(e.target.value)} disabled={!puoModificare} />
                            </div>
                            <div className="nom-field nom-field--half">
                                <label>Alla data</label>
                                <input type="date" className="md-input" value={data} onChange={e => setData(e.target.value)} disabled={!puoModificare} />
                            </div>
                        </div>
                        {!puoModificare && (
                            <p style={{ margin: '10px 0 0', fontSize: '0.82rem', color: 'var(--warning)' }}>
                                Il saldo è già impostato: può modificarlo solo un amministratore della società.
                            </p>
                        )}
                    </div>

                    <div className="nom-section">
                        <div className="nom-section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><History size={14} /> Storico modifiche</div>
                        {storico === null ? (
                            <div className="nom-loading">Caricamento…</div>
                        ) : storico.length === 0 ? (
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Nessuna modifica registrata.</p>
                        ) : (
                            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                    <thead>
                                        <tr style={{ color: 'var(--text-secondary)', textAlign: 'left' }}>
                                            <th style={{ padding: '4px 6px' }}>Quando</th>
                                            <th style={{ padding: '4px 6px' }}>Chi</th>
                                            <th style={{ padding: '4px 6px' }}>Prima</th>
                                            <th style={{ padding: '4px 6px' }}>Dopo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {storico.map(r => (
                                            <tr key={r.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                                                <td style={{ padding: '6px', whiteSpace: 'nowrap' }}>{formatDateTimeIT(r.createdAt)}</td>
                                                <td style={{ padding: '6px' }}>{r.utente_email || '—'}{r.origine === 'conti' ? <span style={{ color: 'var(--text-tertiary)' }}> · da Conti</span> : null}</td>
                                                <td style={{ padding: '6px', whiteSpace: 'nowrap' }}>{euro(r.saldo_precedente)}<br /><span style={{ color: 'var(--text-tertiary)' }}>{r.data_precedente ? formatDateIT(r.data_precedente) : 'senza data'}</span></td>
                                                <td style={{ padding: '6px', whiteSpace: 'nowrap' }}><strong>{euro(r.saldo_nuovo)}</strong><br /><span style={{ color: 'var(--text-tertiary)' }}>{r.data_nuova ? formatDateIT(r.data_nuova) : 'senza data'}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {error && <div className="nom-error">{error}</div>}

                    <div className="nom-footer">
                        <button type="button" className="nom-btn nom-btn--cancel" onClick={onClose} disabled={saving}>Chiudi</button>
                        {puoModificare && (
                            <button type="submit" className="nom-btn nom-btn--save" disabled={saving}>{saving ? 'Salvataggio…' : 'Salva saldo'}</button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SaldoContoModal;
