import React, { useState, useEffect } from 'react';
import { Search, X, User, MousePointerClick, Contact } from 'lucide-react';
import './RicercaSocioModal.css';

const getCertStatus = (scadenza) => {
    if (!scadenza) return 'NON ISCRITTO';
    const scadenzaDate = new Date(scadenza);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (scadenzaDate < today) {
        return 'SCADUTO';
    } else {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);
        if (scadenzaDate <= thirtyDaysFromNow) {
            return 'IN SCADENZA';
        }
        return 'ISCRITTO';
    }
};

const RicercaSocioModal = ({ isOpen, onClose, onSelect, societaId, abbonamentoId, abbonamentoNome }) => {
    const [soci, setSoci] = useState([]);
    const [filteredSoci, setFilteredSoci] = useState([]);
    const [filters, setFilters] = useState({ cognome: '', nome: '' });
    // map socioId -> last payment date (for abbonamento filter mode)
    const [lastPaymentMap, setLastPaymentMap] = useState({});

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

                    // Keep only soci that have at least one payment for this product
                    const socioIds = new Set(Object.keys(map).map(Number));
                    const filtered = Array.isArray(sociData)
                        ? sociData.filter(s => socioIds.has(s.id))
                        : [];
                    setSoci(filtered);
                    setFilteredSoci(filtered);
                } else {
                    setLastPaymentMap({});
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
            result = result.filter(s => s.cognome.toLowerCase().includes(filters.cognome.toLowerCase()));
        }
        if (filters.nome) {
            result = result.filter(s => s.nome.toLowerCase().includes(filters.nome.toLowerCase()));
        }
        setFilteredSoci(result);
    }, [filters, soci]);

    if (!isOpen) return null;

    return (
        <div className="rsm-overlay">
            <div className="modal-container ricerva-socio-modal">
                <div className="modal-header" style={{backgroundColor: '#4fc3f7', color: 'white'}}>
                    <h2 className="modal-title">
                        <Search size={20} /> Ricerca socio
                    </h2>
                    <button className="modal-close" onClick={onClose} style={{color: 'white'}}>
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
                        <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 10 }}>
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
                                    <th style={{width: '17%'}}>Certificato</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSoci.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={abbonamentoId ? 5 : 4}
                                            style={{ padding: '24px 16px', textAlign: 'center', color: '#9ca3af', fontStyle: 'italic' }}
                                        >
                                            {abbonamentoId
                                                ? `Nessun socio risulta associato all'abbonamento "${abbonamentoNome || 'selezionato'}"`
                                                : 'Nessun socio trovato'}
                                        </td>
                                    </tr>
                                ) : filteredSoci.map(socio => (
                                    <tr key={socio.id}>
                                        <td style={{width: abbonamentoId ? '35%' : '40%'}}>
                                            <div style={{display:'flex', alignItems:'center', gap:'8px', color: socio.sesso === 'F' ? '#ff4081' : '#1976d2', fontWeight: 'bold'}}>
                                                <User size={18}/>
                                                <span>{socio.id} {socio.cognome} {socio.nome}</span>
                                            </div>
                                        </td>
                                        <td style={{width: '18%'}}>
                                            {socio.data_nascita ? new Date(socio.data_nascita).toLocaleDateString('it-IT') : ''}
                                        </td>
                                        {abbonamentoId && (
                                            <td style={{width: '20%'}}>
                                                {(() => {
                                                    const entry = lastPaymentMap[socio.id];
                                                    if (!entry) return '—';
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
                                                            nota = <small style={{color:'#c62828', display:'block'}}>scad. da {Math.abs(diff)} gg</small>;
                                                        } else if (diff === 0) {
                                                            nota = <small style={{color:'#e65100', display:'block'}}>scade oggi</small>;
                                                        } else {
                                                            nota = <small style={{color:'#2e7d32', display:'block'}}>{diff} gg alla scad.</small>;
                                                        }
                                                    }
                                                    return <>{dateStr}{nota}</>;
                                                })()}
                                            </td>
                                        )}
                                        <td style={{width: '17%'}}>
                                            <span className={`badge-rm ${getCertStatus(socio.scadenza_certificato) === 'ISCRITTO' ? 'badge-success' : 'badge-danger'}`}>
                                                {getCertStatus(socio.scadenza_certificato) === 'ISCRITTO' ? 'ISCRITTO' : 'NON ISCRITTO'}
                                            </span>
                                        </td>
                                        <td style={{textAlign: 'right'}}>
                                            <div style={{display:'flex', gap:'5px', justifyContent:'flex-end'}}>
                                                <button className="btn-scheda-rm" onClick={() => window.open(`/soci?apriSocioPath=${socio.id}`, '_blank')}>
                                                    <Contact size={14}/> Scheda
                                                </button>
                                                <button className="btn-seleziona-rm" onClick={() => onSelect(socio)}>
                                                    <MousePointerClick size={14}/> Seleziona
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default RicercaSocioModal;
