import React, { useState, useEffect, useCallback } from 'react';
import { X, Users, UserPlus, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { useConfirm } from '../components/ConfirmModal';
import RicercaSocioModal from './RicercaSocioModal';

const today = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
};

const diffDays = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return Math.floor((d - today()) / 86400000);
};

// Restituisce 'ok' | 'warning' | 'expired'
const getStatus = (dateStr, giorniAvviso) => {
    const days = diffDays(dateStr);
    if (days === null) return 'expired';
    if (days < 0) return 'expired';
    if (days <= (giorniAvviso || 30)) return 'warning';
    return 'ok';
};

const StatusBadge = ({ status, label }) => {
    if (status === 'ok') return null;
    const style = status === 'expired'
        ? { background: '#ffebee', color: '#c62828', border: '1px solid #ef9a9a' }
        : { background: '#fff8e1', color: '#e65100', border: '1px solid #ffe082' };
    return (
        <span style={{ ...style, borderRadius: 4, fontSize: '0.72rem', padding: '1px 6px', marginLeft: 4, whiteSpace: 'nowrap' }}>
            <AlertTriangle size={11} style={{ verticalAlign: 'middle', marginRight: 2 }} />
            {label}
        </span>
    );
};

const IscrittilCorsoModal = ({ isOpen, onClose, corso, societaId }) => {
    const [iscrizioni, setIscrizioni] = useState([]);
    const [sociMap, setSociMap] = useState({});
    const [paymentsMap, setPaymentsMap] = useState({});
    const [abbonamento, setAbbonamento] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showRicerca, setShowRicerca] = useState(false);
    const confirm = useConfirm();

    const fetchIscritti = useCallback(async () => {
        if (!corso?.id) return;
        setLoading(true);
        try {
            const res = await fetch(`/activities/api/corsi/${corso.id}/iscritti`);
            const data = res.ok ? await res.json() : [];
            setIscrizioni(data);

            // Fetch soci details
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
            setLoading(false);
        }
    }, [corso?.id, societaId]);

    // Fetch abbonamento product for giorniAvvisoScadenza
    useEffect(() => {
        if (!corso?.abbonamentoId) return;
        fetch(`/products/api/${corso.abbonamentoId}`)
            .then(r => r.ok ? r.json() : null)
            .then(p => setAbbonamento(p))
            .catch(() => {});
    }, [corso?.abbonamentoId]);

    useEffect(() => {
        if (isOpen) fetchIscritti();
        else {
            setIscrizioni([]);
            setSociMap({});
            setPaymentsMap({});
        }
    }, [isOpen, fetchIscritti]);

    const handleAddSocio = async (socio) => {
        setShowRicerca(false);
        await fetch(`/activities/api/corsi/${corso.id}/iscritti`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ socioId: socio.id }),
        });
        fetchIscritti();
    };

    const handleRemove = async (socioId) => {
        if (!await confirm('Rimuovere questo socio dal corso?')) return;
        await fetch(`/activities/api/corsi/${corso.id}/iscritti/${socioId}`, { method: 'DELETE' });
        fetchIscritti();
    };

    if (!isOpen) return null;

    const giorniAvviso = abbonamento?.giorniAvvisoScadenza ?? 30;

    return (
        <>
            <div className="modal-overlay">
                <div className="modal-box" style={{ maxWidth: 700, width: '95%' }}>
                    {/* Header */}
                    <div className="modal-header modal-header-blue">
                        <Users size={20} />
                        <span>Iscritti al corso</span>
                        <button className="modal-header-close" onClick={onClose}><X size={20} /></button>
                    </div>

                    {/* Sottotitolo corso */}
                    <div style={{ padding: '8px 20px', background: '#f5f7fa', borderBottom: '1px solid #e0e0e0', fontSize: '0.85rem', color: '#555' }}>
                        {corso?.attivita?.descrizione || '—'} — {corso?.struttura?.descrizione || ''} — {corso?.oraInizio}
                        {abbonamento && (
                            <span style={{ marginLeft: 12, color: '#1976d2', fontWeight: 500 }}>
                                Abbonamento: {abbonamento.description}
                            </span>
                        )}
                    </div>

                    {/* Body */}
                    <div className="modal-body" style={{ padding: '16px 20px', minHeight: 200 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <span style={{ fontWeight: 600, color: '#333' }}>
                                {iscrizioni.length} / {corso?.maxSoci ?? '∞'} iscritti
                            </span>
                            <button
                                className="btn-success"
                                style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                                onClick={() => setShowRicerca(true)}
                                disabled={iscrizioni.length >= (corso?.maxSoci ?? Infinity)}
                            >
                                <UserPlus size={14} /> Aggiungi socio
                            </button>
                        </div>

                        {loading ? (
                            <div style={{ padding: 24, textAlign: 'center', color: '#888' }}>Caricamento...</div>
                        ) : iscrizioni.length === 0 ? (
                            <div style={{ padding: 24, textAlign: 'center', color: '#aaa' }}>Nessun iscritto</div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                                <thead>
                                    <tr style={{ background: '#f0f4f8', borderBottom: '2px solid #e0e0e0' }}>
                                        <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600 }}>Socio</th>
                                        <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>Cert. medico</th>
                                        <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>Ult. pagamento</th>
                                        <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>Iscritto dal</th>
                                        <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 600, width: 36 }}></th>
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

                                        // Cert medico
                                        const certStatus = getStatus(socio?.scadenza_certificato, giorniAvviso);

                                        // Abbonamento: cerca il pagamento più recente con product_id = corso.abbonamentoId
                                        const abbPay = payments
                                            .filter(p => p.product_id === corso.abbonamentoId && p.data_scadenza_abbonamento)
                                            .sort((a, b) => new Date(b.data_scadenza_abbonamento) - new Date(a.data_scadenza_abbonamento))[0];
                                        const abbStatus = getStatus(abbPay?.data_scadenza_abbonamento, giorniAvviso);

                                        const rowBg = (certStatus === 'expired' || abbStatus === 'expired')
                                            ? '#fff8f8'
                                            : (certStatus === 'warning' || abbStatus === 'warning')
                                                ? '#fffde7'
                                                : 'transparent';

                                        return (
                                            <tr key={i.socioId} style={{ borderBottom: '1px solid #eee', background: rowBg }}>
                                                <td style={{ padding: '8px 10px' }}>
                                                    {socio
                                                        ? <span style={{ fontWeight: 500 }}>{socio.cognome} {socio.nome}</span>
                                                        : <span style={{ color: '#aaa' }}>#{i.socioId}</span>
                                                    }
                                                </td>
                                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                                    {socio?.scadenza_certificato
                                                        ? <>
                                                            <span style={{ fontSize: '0.82rem' }}>{new Date(socio.scadenza_certificato).toLocaleDateString('it-IT')}</span>
                                                            <StatusBadge status={certStatus} label={certStatus === 'expired' ? 'SCADUTO' : 'IN SCADENZA'} />
                                                          </>
                                                        : <span style={{ color: '#ccc' }}>—</span>
                                                    }
                                                </td>
                                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>
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
                                                    })() : <span style={{ color: '#e65100', fontSize: '0.8rem' }}>⚠ Non trovato</span>}
                                                </td>
                                                <td style={{ padding: '8px 10px', textAlign: 'center', color: '#888', fontSize: '0.82rem' }}>
                                                    {i.dataIscrizione ? new Date(i.dataIscrizione).toLocaleDateString('it-IT') : '—'}
                                                </td>
                                                <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                                                    <button
                                                        title="Rimuovi"
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53935', padding: 2 }}
                                                        onClick={() => handleRemove(i.socioId)}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="modal-footer">
                        <button className="btn-danger" onClick={onClose}><X size={15} /> Chiudi</button>
                    </div>
                </div>
            </div>

            <RicercaSocioModal
                isOpen={showRicerca}
                onClose={() => setShowRicerca(false)}
                onSelect={handleAddSocio}
                societaId={societaId}
            />
        </>
    );
};

export default IscrittilCorsoModal;
