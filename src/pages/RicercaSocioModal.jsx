import React, { useState, useEffect } from 'react';
import { Search, X, User, Building2, MousePointerClick, Contact } from 'lucide-react';
import { useAnno } from '../data/AnnoContext';
import './RicercaSocioModal.css';

// Nome visualizzato: ragione sociale per le associazioni, cognome + nome altrimenti
const getNomeSocio = (s) => s.tipo_socio === 'associazione'
    ? (s.ragione_sociale || '-')
    : `${s.cognome || ''} ${s.nome || ''}`.trim() || '-';

const RicercaSocioModal = ({ isOpen, onClose, onSelect, societaId, abbonamentoId, abbonamentoNome, enrolledIds = [] }) => {
    const { selectedAnno } = useAnno();

    // Stato di iscrizione, coerente con la vista Soci (senza dati pagamenti: usa libro soci e iscrizioni)
    const getIscrizioneLabel = (socio) => {
        if (socio.data_ammissione) return 'SOCIO';
        const hasCurrent = (socio.iscrizioni || []).some(i => i.anno === selectedAnno);
        if (hasCurrent) return 'ISCRITTO';
        const hasPast = (socio.iscrizioni || []).some(i => i.anno < selectedAnno);
        if (hasPast) return 'SCADUTO';
        return 'NO';
    };

    const enrolledSet = new Set(enrolledIds);
    const enrolledKey = enrolledIds.join(',');
    const [soci, setSoci] = useState([]);
    const [filteredSoci, setFilteredSoci] = useState([]);
    const [filters, setFilters] = useState({ cognome: '', nome: '' });
    // map socioId -> last payment date (for abbonamento filter mode)
    const [lastPaymentMap, setLastPaymentMap] = useState({});
    // map socioId -> scadenza passepartout valida (solo soci NON nel lastPaymentMap)
    const [passepartoutMap, setPassepartoutMap] = useState({});

    useEffect(() => {
        if (!societaId || !isOpen) return;

        const fetchData = async () => {
            try {
                const sociRes = await fetch(`/users/api/soci?societa_id=${societaId}`);
                const sociData = sociRes.ok ? await sociRes.json() : [];

                if (abbonamentoId) {
                    // Fetch payments for this specific product
                    const payRes = await fetch(
                        `/payments/api?societa_id=${societaId}&product_id=${abbonamentoId}`
                    );
                    const payments = payRes.ok ? await payRes.json() : [];

                    // Build map socioId -> most recent data_pagamento
                    const map = {};
                    payments.forEach(p => {
                        if (!p.socio_id) return;
                        const existing = map[p.socio_id];
                        if (!existing || new Date(p.data_pagamento) > new Date(existing.dataPagamento)) {
                            map[p.socio_id] = {
                                dataPagamento: p.data_pagamento,
                                dataScadenza: p.data_scadenza_abbonamento || null,
                            };
                        }
                    });
                    setLastPaymentMap(map);

                    // Fetch passepartout products and their non-expired payments
                    let ppMap = {};
                    try {
                        const prodRes = await fetch(`/products/api?societaId=${societaId}`);
                        const prodData = prodRes.ok ? await prodRes.json() : [];
                        const ppProducts = prodData.filter(p => p.passepartout && p.type === 'subscription');
                        if (ppProducts.length > 0) {
                            const oggi = new Date();
                            oggi.setHours(0, 0, 0, 0);
                            const ppPaymentsAll = await Promise.all(
                                ppProducts.map(pp =>
                                    fetch(`/payments/api?societa_id=${societaId}&product_id=${pp.id}`)
                                        .then(r => r.ok ? r.json() : [])
                                )
                            );
                            ppPaymentsAll.flat().forEach(p => {
                                if (!p.socio_id || !p.data_scadenza_abbonamento) return;
                                const scad = new Date(p.data_scadenza_abbonamento);
                                scad.setHours(0, 0, 0, 0);
                                if (scad < oggi) return; // scaduto
                                const existing = ppMap[p.socio_id];
                                if (!existing || scad > new Date(existing.scadenza)) {
                                    ppMap[p.socio_id] = { scadenza: p.data_scadenza_abbonamento, pagamento: p.data_pagamento };
                                }
                            });
                        }
                    } catch (e) {
                        console.error('Error fetching passepartout products', e);
                    }
                    setPassepartoutMap(ppMap);

                    // Include soci with specific abbonamento OR valid passepartout
                    const socioIds = new Set(Object.keys(map).map(Number));
                    const ppIds = new Set(Object.keys(ppMap).map(Number));
                    const allIds = new Set([...socioIds, ...ppIds]);
                    const filtered = Array.isArray(sociData)
                        ? sociData.filter(s => allIds.has(s.id))
                        : [];
                    setSoci(filtered);
                    setFilteredSoci(filtered);
                } else {
                    setLastPaymentMap({});
                    setPassepartoutMap({});
                    if (Array.isArray(sociData)) {
                        setSoci(sociData);
                        setFilteredSoci(sociData);
                    }
                }
            } catch (error) {
                console.error('Error fetching soci/pagamenti', error);
            }
        };

        fetchData();
    }, [societaId, isOpen, abbonamentoId]);

    useEffect(() => {
        let result = soci;
        if (filters.cognome) {
            const v = filters.cognome.toLowerCase();
            result = result.filter(s =>
                (s.cognome || '').toLowerCase().includes(v) ||
                (s.ragione_sociale || '').toLowerCase().includes(v)
            );
        }
        if (filters.nome) {
            const v = filters.nome.toLowerCase();
            result = result.filter(s => (s.nome || '').toLowerCase().includes(v));
        }
        // Già iscritti in fondo
        result = [...result].sort((a, b) => {
            const aEnr = enrolledSet.has(a.id) ? 1 : 0;
            const bEnr = enrolledSet.has(b.id) ? 1 : 0;
            return aEnr - bEnr;
        });
        setFilteredSoci(result);
    }, [filters, soci, enrolledKey]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!isOpen) return null;

    return (
        <div className="rsm-overlay">
            <div className="modal-container ricerva-socio-modal">
                <div className="modal-header">
                    <h2 className="modal-title" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <Search size={20} /> Ricerca socio
                    </h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>
                
                <div className="modal-content" style={{padding: '20px'}}>
                    <div className="ricerca-filters">
                        <div className="form-group-rm">
                            <label>Cognome</label>
                            <input 
                                type="text" 
                                placeholder="Cognome" 
                                value={filters.cognome}
                                onChange={(e) => setFilters({...filters, cognome: e.target.value})}
                                className="md-input-rm"
                            />
                        </div>
                        <div className="form-group-rm">
                            <label>Nome</label>
                            <input 
                                type="text" 
                                placeholder="Nome" 
                                value={filters.nome}
                                onChange={(e) => setFilters({...filters, nome: e.target.value})}
                                className="md-input-rm"
                            />
                        </div>
                    </div>

                    {abbonamentoId && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
                            Elenco soci iscritti all'abbonamento <strong>{abbonamentoNome}</strong>
                            {filteredSoci.length === 0 && ' — nessun socio trovato'}
                        </div>
                    )}

                    <div className="ricerca-list">
                        <table className="md-table-rm">
                            <thead>
                                <tr>
                                    <th style={{width: abbonamentoId ? '35%' : '40%'}}>Socio</th>
                                    <th style={{width: '18%'}}>Data nascita</th>
                                    {abbonamentoId && <th style={{width: '20%'}}>Ult. pagamento</th>}
                                    <th style={{width: '17%'}}>Iscrizione</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSoci.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={abbonamentoId ? 5 : 4}
                                            style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-tertiary)', fontStyle: 'italic' }}
                                        >
                                            {abbonamentoId
                                                ? `Nessun socio risulta associato all'abbonamento "${abbonamentoNome || 'selezionato'}"`
                                                : 'Nessun socio trovato'}
                                        </td>
                                    </tr>
                                ) : filteredSoci.map(socio => {
                                    const isEnrolled = enrolledSet.has(socio.id);
                                    return (
                                    <tr key={socio.id} style={isEnrolled ? { opacity: 0.5, background: 'var(--surface-1)' } : {}}>
                                        <td style={{width: abbonamentoId ? '35%' : '40%'}}>
                                            <div style={{display:'flex', alignItems:'center', gap:'8px', color: isEnrolled ? 'var(--text-tertiary)' : 'var(--primary)', fontWeight: 'bold'}}>
                                                {socio.tipo_socio === 'associazione' ? <Building2 size={18}/> : <User size={18}/>}
                                                <span
                                                    style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                    onClick={() => window.open(`/soci?apriSocioPath=${socio.id}`, '_blank')}
                                                >{getNomeSocio(socio)}</span>
                                                {isEnrolled && <span style={{fontSize:'0.72rem', background:'var(--border-color)', color:'var(--text-secondary)', borderRadius:4, padding:'1px 6px', fontWeight:'normal', whiteSpace:'nowrap'}}>già iscritto</span>}
                                                {!isEnrolled && abbonamentoId && !lastPaymentMap[socio.id] && passepartoutMap[socio.id] && (
                                                    <span style={{fontSize:'0.72rem', background:'var(--warning-container)', color:'var(--on-warning-container)', border:'1px solid var(--warning)', borderRadius:4, padding:'1px 6px', fontWeight:'normal', whiteSpace:'nowrap'}}>jolly</span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{width: '18%'}}>
                                            {socio.data_nascita ? new Date(socio.data_nascita).toLocaleDateString('it-IT') : ''}
                                        </td>
                                        {abbonamentoId && (
                                            <td style={{width: '20%'}}>
                                                {(() => {
                                                    const entry = lastPaymentMap[socio.id];
                                                    if (!entry) {
                                                        const ppEntry = passepartoutMap[socio.id];
                                                        if (!ppEntry) return '—';
                                                        const scad = new Date(ppEntry.scadenza);
                                                        scad.setHours(0,0,0,0);
                                                        const oggi = new Date();
                                                        oggi.setHours(0,0,0,0);
                                                        const diff = Math.round((scad - oggi) / 86400000);
                                                        let nota = null;
                                                        if (diff === 0) nota = <small style={{color:'var(--warning)', display:'block'}}>scade oggi</small>;
                                                        else nota = <small style={{color:'var(--success)', display:'block'}}>{diff} gg alla scad.</small>;
                                                        const dateStr = ppEntry.pagamento ? new Date(ppEntry.pagamento).toLocaleDateString('it-IT') : '—';
                                                        return <>{dateStr}{nota}</>;
                                                    }
                                                    const dateStr = entry.dataPagamento
                                                        ? new Date(entry.dataPagamento).toLocaleDateString('it-IT')
                                                        : '—';
                                                    let nota = null;
                                                    if (entry.dataScadenza) {
                                                        const scad = new Date(entry.dataScadenza);
                                                        scad.setHours(0,0,0,0);
                                                        const oggi = new Date();
                                                        oggi.setHours(0,0,0,0);
                                                        const diff = Math.round((scad - oggi) / 86400000);
                                                        if (diff < 0) {
                                                            nota = <small style={{color:'var(--danger)', display:'block'}}>scad. da {Math.abs(diff)} gg</small>;
                                                        } else if (diff === 0) {
                                                            nota = <small style={{color:'var(--warning)', display:'block'}}>scade oggi</small>;
                                                        } else {
                                                            nota = <small style={{color:'var(--success)', display:'block'}}>{diff} gg alla scad.</small>;
                                                        }
                                                    }
                                                    return <>{dateStr}{nota}</>;
                                                })()}
                                            </td>
                                        )}
                                        <td style={{width: '17%'}}>
                                            {(() => {
                                                const label = getIscrizioneLabel(socio);
                                                const badgeClass = {
                                                    'SOCIO': 'badge-info',
                                                    'ISCRITTO': 'badge-success',
                                                    'SCADUTO': 'badge-warning',
                                                    'NO': 'badge-danger',
                                                }[label] || 'badge-danger';
                                                return <span className={`badge-rm ${badgeClass}`}>{label === 'NO' ? 'NON ISCRITTO' : label}</span>;
                                            })()}
                                        </td>
                                        <td style={{textAlign: 'right'}}>
                                            <div style={{display:'flex', gap:'5px', justifyContent:'flex-end'}}>
                                                <button className="btn-scheda-rm" onClick={() => window.open(`/soci?apriSocioPath=${socio.id}`, '_blank')}>
                                                    <Contact size={14}/> Scheda
                                                </button>
                                                <button
                                                    className="btn-seleziona-rm"
                                                    onClick={() => !isEnrolled && onSelect(socio)}
                                                    disabled={isEnrolled}
                                                    style={isEnrolled ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                                                >
                                                    <MousePointerClick size={14}/> Seleziona
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default RicercaSocioModal;
