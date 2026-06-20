import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Ban, Calendar, Check, Plus, Tag, Trash2, User, X } from 'lucide-react';
import { getAnnoDateRange, useAnno } from '../data/AnnoContext';
import { getStatoOrdine, getStatoOrdineBadgeStyle } from '../utils/ordineUtils';
import './DettaglioPagamentoModal.css';

const DettaglioOrdineModal = ({ isOpen, onClose, ordine: pagamento, onAnnulla, onConvertProforma, onDeleteProforma, onUpdate, societa, products }) => {
    const [showConferma, setShowConferma] = useState(false);
    const [showConvertForm, setShowConvertForm] = useState(false);
    const [showEliminaConferma, setShowEliminaConferma] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [convertAnno, setConvertAnno] = useState(null);
    const [convertData, setConvertData] = useState('');
    const [convertNextNumero, setConvertNextNumero] = useState(null);
    const [converting, setConverting] = useState(false);

    // Etichette
    const [etichette, setEtichette] = useState([]);
    const [newEtichetta, setNewEtichetta] = useState('');
    const [savingEtichette, setSavingEtichette] = useState(false);
    const [savedFlash, setSavedFlash] = useState(false);
    const etichettaInputRef = useRef(null);
    const savedTimerRef = useRef(null);

    const { annoOptions, formatAnnoLabel, selectedAnno } = useAnno();

    const todayStr = new Date().toISOString().split('T')[0];

    // Sincronizza etichette locali all'apertura/cambio ordine
    useEffect(() => {
        if (!pagamento) return;
        const tags = pagamento.etichette
            ? pagamento.etichette.split(',').map(s => s.trim()).filter(Boolean)
            : [];
        setEtichette(tags);
        setNewEtichetta('');
        setSavedFlash(false);
        clearTimeout(savedTimerRef.current);
    }, [pagamento?.id]);

    const saveEtichette = async (tags) => {
        if (!pagamento?.id || savingEtichette) return;
        setSavingEtichette(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/payments/api/${pagamento.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ etichette: tags.join(', ') || null }),
            });
            if (res.ok) {
                const updated = await res.json();
                setSavedFlash(true);
                clearTimeout(savedTimerRef.current);
                savedTimerRef.current = setTimeout(() => setSavedFlash(false), 2000);
                if (onUpdate) onUpdate(updated);
            }
        } catch (e) {
            console.error('Errore salvataggio etichette:', e);
        } finally {
            setSavingEtichette(false);
        }
    };

    const handleAddEtichetta = () => {
        const val = newEtichetta.trim();
        if (!val || etichette.includes(val)) { setNewEtichetta(''); return; }
        const updated = [...etichette, val];
        setEtichette(updated);
        setNewEtichetta('');
        saveEtichette(updated);
        etichettaInputRef.current?.focus();
    };

    const handleRemoveEtichetta = (tag) => {
        const updated = etichette.filter(t => t !== tag);
        setEtichette(updated);
        saveEtichette(updated);
    };

    // Fetch preview numero ricevuta al cambio dell'anno nel form di conversione
    useEffect(() => {
        if (!showConvertForm || convertAnno == null || !societa?.id) return;
        let cancelled = false;
        setConvertNextNumero(null);
        const fetch_ = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(
                    `/payments/api/next-numero?societa_id=${societa.id}&anno=${convertAnno}`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );
                if (res.ok && !cancelled) {
                    const data = await res.json();
                    setConvertNextNumero(data.formatted);
                }
            } catch (e) { /* silenzioso */ }
        };
        fetch_();
        return () => { cancelled = true; };
    }, [showConvertForm, convertAnno, societa?.id]);

    if (!isOpen || !pagamento) return null;

    // Inizializza anno conversione all'apertura del form
    const handleOpenConvertForm = () => {
        setConvertAnno(selectedAnno);
        setConvertData(todayStr);
        setConvertNextNumero(null);
        setShowConvertForm(true);
    };

    // Gestione submit conversione
    const handleConfermaConverti = async () => {
        if (converting) return;
        setConverting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/payments/api/${pagamento.id}/converti-proforma`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ anno_ricevuta: convertAnno, data_ricevuta: convertData }),
            });
            if (res.ok) {
                const updated = await res.json();
                setShowConvertForm(false);
                if (onConvertProforma) onConvertProforma(updated);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setConverting(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatCurrency = (amount) => {
        return parseFloat(amount || 0).toFixed(2).replace('.', ',');
    };

    // Calcola la data di scadenza del tesseramento
    const getScadenzaTesseramento = () => {
        const types = (pagamento.quote_types || '').split(',').map(t => t.trim().toLowerCase());
        if (!types.includes('tesseramento')) return null;
        if (!pagamento.data_pagamento) return null;

        const periodicity = pagamento.periodicity_tesseramento;
        if (!periodicity) return null;

        const d = new Date(pagamento.data_pagamento);

        if (periodicity === 'anno_solare') {
            const scad = new Date(d);
            scad.setFullYear(scad.getFullYear() + 1);
            scad.setDate(scad.getDate() - 1);
            return scad;
        }

        if (periodicity === 'anno_associativo') {
            const tipo = societa?.tipo_anno_associativo || 'solare';
            let anno = d.getFullYear();
            const m = d.getMonth() + 1;
            const day = d.getDate();
            if (tipo === 'associativo') {
                if (m < 9) anno = d.getFullYear() - 1;
            } else if (tipo === 'personalizzato' && societa?.data_inizio_anno_associativo) {
                const parts = societa.data_inizio_anno_associativo.split('-');
                const cDay = parseInt(parts[0], 10);
                const cMonth = parseInt(parts[1], 10);
                if (m < cMonth || (m === cMonth && day < cDay)) anno = d.getFullYear() - 1;
            }
            const { end } = getAnnoDateRange(anno, societa);
            return end;
        }

        return null;
    };

    const scadenzaTess = getScadenzaTesseramento();

    const isAnnullato = pagamento.stato_pagamento?.startsWith('3.');

    const handleConfermaAnnulla = () => {
        setShowConferma(false);
        if (onAnnulla) onAnnulla(pagamento.id);
    };

    const handleConfermaEliminaProforma = async () => {
        if (deleting) return;
        setDeleting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/payments/api/${pagamento.id}/proforma`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (res.ok) {
                setShowEliminaConferma(false);
                if (onDeleteProforma) onDeleteProforma(pagamento.id);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="dpm-overlay">
            <div className="dpm-modal">
                <div className="dpm-header">
                    <div className="dpm-title">
                        <Calendar size={20} />
                        <h2>Dettaglio ordine</h2>
                    </div>
                    <button className="dpm-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="dpm-body">
                    {/* Dettagli Section */}
                    <div className="dpm-section">
                        <div className="dpm-section-title">Dettagli</div>

                        <div className="dpm-grid-3">
                            <div className="dpm-field">
                                <label><User size={14} /> Intestatario</label>
                                <div className="dpm-value">{pagamento.intestatario}</div>
                            </div>
                            <div className="dpm-field">
                                <label><Calendar size={14} /> Data ordine</label>
                                <div className="dpm-value">{formatDate(pagamento.data_ricevuta || pagamento.data_pagamento)}</div>
                            </div>
                            <div className="dpm-field">
                                <label>€ Importo</label>
                                <div className="dpm-value">{formatCurrency(pagamento.importo)}</div>
                            </div>
                        </div>

                        <div className="dpm-divider"></div>

                        <div className="dpm-grid-3">
                            <div className="dpm-field">
                                <label>Stato ordine</label>
                                <div className="dpm-value">
                                    <span style={getStatoOrdineBadgeStyle(getStatoOrdine(pagamento))}>
                                        {getStatoOrdine(pagamento)?.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            <div className="dpm-field">
                                <label>Numero ricevuta</label>
                                <div className="dpm-value dpm-ricevuta">
                                    {pagamento.tipo_documento === 'proforma' ? '—' : (pagamento.numero_ricevuta || '—')}
                                    {pagamento.numero_ricevuta && pagamento.tipo_documento !== 'proforma' && (
                                        isAnnullato
                                            ? <span className="dpm-badge-annullata">ANNULLATA</span>
                                            : <span className="dpm-badge-valida">VALIDA</span>
                                    )}
                                </div>
                            </div>
                            <div className="dpm-field">
                                <label>Data pagamento</label>
                                <div className="dpm-value">
                                    {pagamento.tipo_documento === 'proforma'
                                        ? <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Non ancora registrato</span>
                                        : formatDate(pagamento.data_pagamento)
                                    }
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quote Section */}
                    <div className="dpm-section dpm-section-quote">
                        <div className="dpm-section-title">Quote</div>
                        {(() => {
                            // Parse payment_items difensivo: può arrivare come array o stringa JSON
                            let items = pagamento.payment_items;
                            if (typeof items === 'string') {
                                try { items = JSON.parse(items); } catch { items = null; }
                            }
                            const getProductName = (productId) => {
                                if (!productId || !products?.length) return null;
                                return products.find(p => Number(p.id) === Number(productId))?.description || null;
                            };
                            if (Array.isArray(items) && items.length > 0) {
                                if (items.length === 1) {
                                    const item = items[0];
                                    const prodName = getProductName(item.product_id) || item.quote || '';
                                    return (
                                        <div className="dpm-quote-row">
                                            <span>{prodName}</span>
                                            <span>
                                                € {formatCurrency(pagamento.importo)}
                                                {scadenzaTess && !prodName.includes('(Scadenza') && (
                                                    <span style={{ marginLeft: '8px', color: '#6b7280', fontSize: '0.9em' }}>
                                                        (Scadenza {scadenzaTess.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })})
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    );
                                }
                                return (
                                    <>
                                        {items.map((item, idx) => {
                                            const prodName = getProductName(item.product_id) || item.quote || '';
                                            return (
                                                <div key={idx} className="dpm-quote-row">
                                                    <span>{prodName}</span>
                                                    <span>€ {formatCurrency(item.importo)}</span>
                                                </div>
                                            );
                                        })}
                                        <div className="dpm-quote-row" style={{ borderTop: '1px solid #e5e7eb', marginTop: '4px', paddingTop: '6px', fontWeight: 700 }}>
                                            <span>Totale</span>
                                            <span>€ {formatCurrency(pagamento.importo)}</span>
                                        </div>
                                    </>
                                );
                            }
                            // Fallback: nessun payment_items, usa campi top-level
                            const prodName = getProductName(pagamento.product_id) || pagamento.quote || '';
                            return (
                                <div className="dpm-quote-row">
                                    <span>{prodName}</span>
                                    <span>
                                        € {formatCurrency(pagamento.importo)}
                                        {scadenzaTess && !prodName.includes('(Scadenza') && (
                                            <span style={{ marginLeft: '8px', color: '#6b7280', fontSize: '0.9em' }}>
                                                (Scadenza {scadenzaTess.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })})
                                            </span>
                                        )}
                                    </span>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Etichette Section */}
                    <div className="dpm-section">
                        <div className="dpm-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Tag size={14} /> Etichette
                            </span>
                            {savedFlash && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#15803d', fontWeight: 600 }}>
                                    <Check size={13} /> Salvato
                                </span>
                            )}
                            {savingEtichette && (
                                <span style={{ fontSize: '0.78rem', color: '#6b7280', fontStyle: 'italic' }}>Salvataggio…</span>
                            )}
                        </div>

                        {/* Chips etichette correnti */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                            {etichette.map(tag => (
                                <span key={tag} style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                                    background: '#eff6ff', color: '#1d4ed8',
                                    border: '1px solid #bfdbfe', borderRadius: '6px',
                                    padding: '3px 10px', fontSize: '0.82rem', fontWeight: 600,
                                }}>
                                    {tag}
                                    <button
                                        onClick={() => handleRemoveEtichetta(tag)}
                                        disabled={savingEtichette}
                                        style={{ display: 'inline-flex', alignItems: 'center', background: 'none', border: 'none', cursor: savingEtichette ? 'not-allowed' : 'pointer', padding: '0', color: '#6b7280', lineHeight: 1 }}
                                        title="Rimuovi etichetta"
                                    >
                                        <X size={13} />
                                    </button>
                                </span>
                            ))}
                            {etichette.length === 0 && (
                                <span style={{ fontSize: '0.85rem', color: '#9ca3af', fontStyle: 'italic' }}>Nessuna etichetta</span>
                            )}
                        </div>

                        {/* Input aggiungi etichetta */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                                ref={etichettaInputRef}
                                type="text"
                                value={newEtichetta}
                                onChange={e => setNewEtichetta(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddEtichetta(); } }}
                                placeholder="Nuova etichetta…"
                                disabled={savingEtichette}
                                style={{
                                    flex: 1, padding: '6px 12px', border: '1px solid #d1d5db',
                                    borderRadius: '6px', fontSize: '0.88rem', outline: 'none',
                                    opacity: savingEtichette ? 0.6 : 1,
                                }}
                            />
                            <button
                                onClick={handleAddEtichetta}
                                disabled={!newEtichetta.trim() || savingEtichette}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                    padding: '6px 14px', border: 'none', borderRadius: '6px',
                                    background: (!newEtichetta.trim() || savingEtichette) ? '#e5e7eb' : '#2563eb',
                                    color: (!newEtichetta.trim() || savingEtichette) ? '#9ca3af' : '#fff',
                                    fontWeight: 600, fontSize: '0.85rem',
                                    cursor: (!newEtichetta.trim() || savingEtichette) ? 'not-allowed' : 'pointer',
                                }}
                            >
                                <Plus size={14} /> Aggiungi
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer azioni */}
                {!isAnnullato && pagamento.tipo_documento !== 'proforma' && (
                    <div className="dpm-footer">
                        <button className="dpm-btn-annulla" onClick={() => setShowConferma(true)}>
                            <Ban size={16} />
                            Annulla ricevuta
                        </button>
                    </div>
                )}
                {!isAnnullato && pagamento.tipo_documento === 'proforma' && (
                    <div className="dpm-footer" style={{ display: 'flex', gap: '10px' }}>
                        <button
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', border: 'none', borderRadius: '6px', background: '#7c3aed', color: '#fff', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
                            onClick={handleOpenConvertForm}
                        >
                            <Check size={16} /> Registra Pagamento
                        </button>
                        <button
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', border: '1.5px solid #dc2626', borderRadius: '6px', background: '#fff', color: '#dc2626', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
                            onClick={() => setShowEliminaConferma(true)}
                        >
                            <Trash2 size={16} /> Elimina Ordine
                        </button>
                    </div>
                )}
                {isAnnullato && (
                    <div className="dpm-footer dpm-footer-annullato">
                        <Ban size={16} />
                        Ricevuta annullata
                    </div>
                )}
            </div>

            {/* Modal conversione proforma → pagamento */}
            {showConvertForm && (
                <div className="dpm-confirm-overlay">
                    <div className="dpm-confirm-modal" style={{ maxWidth: '480px' }}>
                        <div className="dpm-confirm-header" style={{ background: '#7c3aed' }}>
                            <Check size={22} />
                            <span>Registra Pagamento</span>
                        </div>
                        <div className="dpm-confirm-body">
                            <p style={{ marginBottom: '16px' }}>
                                Stai per registrare il pagamento per l'ordine intestato a <strong>{pagamento.intestatario}</strong> e generare la relativa ricevuta.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '0.88rem', color: '#374151' }}>Anno ricevuta</label>
                                    <select
                                        className="gpm-select"
                                        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.9rem' }}
                                        value={convertAnno ?? ''}
                                        onChange={e => setConvertAnno(parseInt(e.target.value, 10))}
                                    >
                                        {annoOptions.map(anno => (
                                            <option key={anno} value={anno}>{formatAnnoLabel(anno)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '0.88rem', color: '#374151' }}>Data ricevuta</label>
                                    <input
                                        type="date"
                                        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.9rem', boxSizing: 'border-box' }}
                                        value={convertData}
                                        max={todayStr}
                                        onChange={e => setConvertData(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '6px', padding: '10px 14px', fontSize: '0.9rem', color: '#4c1d95' }}>
                                <strong>N. ricevuta assegnato:</strong>{' '}
                                {convertNextNumero
                                    ? <span style={{ fontWeight: 700 }}>{convertNextNumero}</span>
                                    : <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>calcolo in corso…</span>
                                }
                            </div>
                        </div>
                        <div className="dpm-confirm-footer">
                            <button className="dpm-confirm-btn-cancel" onClick={() => setShowConvertForm(false)}>
                                <X size={15} /> Annulla
                            </button>
                            <button
                                style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 18px', border: 'none', borderRadius: '6px', background: converting ? '#a78bfa' : '#7c3aed', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: converting ? 'not-allowed' : 'pointer' }}
                                onClick={handleConfermaConverti}
                                disabled={converting || !convertNextNumero}
                            >
                                <Check size={15} /> {converting ? 'Conversione…' : 'Conferma e converti'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal di conferma eliminazione proforma */}
            {showEliminaConferma && (
                <div className="dpm-confirm-overlay">
                    <div className="dpm-confirm-modal">
                        <div className="dpm-confirm-header" style={{ background: '#dc2626' }}>
                            <Trash2 size={22} />
                            <span>Conferma eliminazione ordine</span>
                        </div>
                        <div className="dpm-confirm-body">
                            <p>Stai per eliminare definitivamente l'ordine intestato a <strong>{pagamento.intestatario}</strong> di <strong>€ {formatCurrency(pagamento.importo)}</strong>.</p>
                            <p className="dpm-confirm-warning">Il record verrà cancellato dal database in modo permanente. Questa operazione non può essere annullata.</p>
                        </div>
                        <div className="dpm-confirm-footer">
                            <button className="dpm-confirm-btn-cancel" onClick={() => setShowEliminaConferma(false)} disabled={deleting}>
                                <X size={15} /> No, torna indietro
                            </button>
                            <button
                                style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 18px', border: 'none', borderRadius: '6px', background: deleting ? '#fca5a5' : '#dc2626', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: deleting ? 'not-allowed' : 'pointer' }}
                                onClick={handleConfermaEliminaProforma}
                                disabled={deleting}
                            >
                                <Trash2 size={15} /> {deleting ? 'Eliminazione…' : 'Sì, elimina ordine'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal di conferma annullamento */}
            {showConferma && (
                <div className="dpm-confirm-overlay">
                    <div className="dpm-confirm-modal">
                        <div className="dpm-confirm-header">
                            <AlertTriangle size={22} />
                            <span>Conferma annullamento</span>
                        </div>
                        <div className="dpm-confirm-body">
                            <p>Stai per annullare la ricevuta <strong>{pagamento.numero_ricevuta}</strong> intestata a <strong>{pagamento.intestatario}</strong>.</p>
                            <p>Il pagamento e la ricevuta verranno marcati come <strong>ANNULLATI</strong> e l'importo non verrà più conteggiato tra gli incassi validi.</p>
                            <p className="dpm-confirm-warning">Questa operazione non può essere annullata.</p>
                        </div>
                        <div className="dpm-confirm-footer">
                            <button className="dpm-confirm-btn-cancel" onClick={() => setShowConferma(false)}>
                                <X size={15} /> No, torna indietro
                            </button>
                            <button className="dpm-confirm-btn-ok" onClick={handleConfermaAnnulla}>
                                <Ban size={15} /> Sì, annulla ricevuta
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DettaglioOrdineModal;
