import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Ban, Calendar, Check, Download, FileCheck, Plus, Tag, Trash2, User, X } from 'lucide-react';
import { getAnnoDateRange, useAnno } from '../data/AnnoContext';
import { getStatoOrdine, getStatoOrdineBadgeStyle, STATO_ORDINE_CONFIG } from '../utils/ordineUtils';
import ChiediInvioComunicazioneModal from '../components/ChiediInvioComunicazioneModal';
import { getComConfig, applyShortcodes, sendComunicazioneEmail, formatImporto } from '../utils/comunicazioniOrdini';
import { generateRicevutaPdfBase64, openRicevutaCaricata } from '../utils/ricevuta';
import './DettaglioPagamentoModal.css';

const DettaglioOrdineModal = ({ isOpen, onClose, ordine: pagamento, onAnnulla, onConvertProforma, onDeleteProforma, onUpdate, societa, products, allEtichette = [] }) => {
    const [showConferma, setShowConferma] = useState(false);
    const [showConvertForm, setShowConvertForm] = useState(false);
    const [showEliminaConferma, setShowEliminaConferma] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [convertAnno, setConvertAnno] = useState(null);
    const [convertData, setConvertData] = useState('');
    const [convertNextNumero, setConvertNextNumero] = useState(null);
    const [convertNextRaw, setConvertNextRaw] = useState(null); // progressivo grezzo: ===1 → prima ricevuta
    const [convertStartNumber, setConvertStartNumber] = useState('1'); // numero di partenza scelto
    const [converting, setConverting] = useState(false);

    // Comunicazione "pagamento registrato" (stato CHIEDI → modal di conferma)
    const [chiediModal, setChiediModal] = useState(null);
    const chiediResolveRef = useRef(null);
    const sendDataRef = useRef(null);

    // Feedback (snackbar) dopo l'invio della comunicazione
    const [comFeedback, setComFeedback] = useState(null);
    const comFeedbackTimerRef = useRef(null);
    // Spinner mentre si prepara la comunicazione (generazione PDF + recupero socio)
    // prima che compaia il modal di conferma invio.
    const [preparingCom, setPreparingCom] = useState(false);
    const showComFeedback = (text, type = 'success') => {
        setComFeedback({ text, type });
        clearTimeout(comFeedbackTimerRef.current);
        comFeedbackTimerRef.current = setTimeout(() => setComFeedback(null), 3000);
    };

    // Apertura/download della ricevuta di pagamento caricata dal socio
    const [apriRicevutaBusy, setApriRicevutaBusy] = useState(false);
    const handleApriRicevuta = async () => {
        if (apriRicevutaBusy) return;
        setApriRicevutaBusy(true);
        const r = await openRicevutaCaricata(pagamento.id);
        setApriRicevutaBusy(false);
        if (!r.ok) showComFeedback(r.error || 'Impossibile aprire la ricevuta', 'error');
    };

    // Etichette
    const [etichette, setEtichette] = useState([]);
    const [originalEtichette, setOriginalEtichette] = useState([]); // pool fisso all'apertura
    const [newEtichetta, setNewEtichetta] = useState('');
    const [savingEtichette, setSavingEtichette] = useState(false);
    const [savedFlash, setSavedFlash] = useState(false);
    const etichettaInputRef = useRef(null);
    const savedTimerRef = useRef(null);
    const tagInputRef = useRef(null);
    const [activeIdx, setActiveIdx] = useState(-1);
    const [inputFocused, setInputFocused] = useState(false);

    const { annoOptions, formatAnnoLabel, selectedAnno } = useAnno();

    const todayStr = new Date().toISOString().split('T')[0];

    // Pulizia timer snackbar allo smontaggio
    useEffect(() => () => clearTimeout(comFeedbackTimerRef.current), []);

    // Sincronizza etichette locali all'apertura/cambio ordine
    useEffect(() => {
        if (!pagamento) return;
        const tags = pagamento.etichette
            ? pagamento.etichette.split(',').map(s => s.trim()).filter(Boolean)
            : [];
        setEtichette(tags);
        setOriginalEtichette(tags); // snapshot immutabile per il pool suggerimenti
        setNewEtichetta('');
        setActiveIdx(-1);
        setInputFocused(false);
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
                body: JSON.stringify({ etichette: tags.length ? tags.join(', ') : null }),
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

    const handleAddEtichetta = (forced) => {
        const val = (forced ?? newEtichetta).trim();
        if (!val || etichette.includes(val)) { setNewEtichetta(''); setActiveIdx(-1); return; }
        const updated = [...etichette, val];
        setEtichette(updated);
        setNewEtichetta('');
        setActiveIdx(-1);
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
        setConvertNextRaw(null);
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
                    setConvertNextRaw(data.nextNumero ?? null);
                    setConvertStartNumber(String(data.nextNumero ?? 1));
                }
            } catch (e) { /* silenzioso */ }
        };
        fetch_();
        return () => { cancelled = true; };
    }, [showConvertForm, convertAnno, societa?.id]);

    if (!isOpen || !pagamento) return null;

    const handleOpenConvertForm = () => {
        setConvertAnno(selectedAnno);
        setConvertData(todayStr);
        setConvertNextNumero(null);
        setShowConvertForm(true);
    };

    const handleConfermaConverti = async () => {
        if (converting) return;
        setConverting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/payments/api/${pagamento.id}/converti-proforma`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    anno_ricevuta: convertAnno,
                    data_ricevuta: convertData,
                    progressivo_iniziale: convertNextRaw === 1 ? (parseInt(convertStartNumber, 10) || 1) : null,
                }),
            });
            if (res.ok) {
                const updated = await res.json();
                setShowConvertForm(false);
                if (onConvertProforma) onConvertProforma(updated);
                // 1. Feedback immediato: proforma convertita correttamente in pagamento.
                showComFeedback('Pagamento registrato', 'success');
                // 2. Prepara/invia la comunicazione (spinner gestito in handlePagamentoComunicazione).
                try {
                    await handlePagamentoComunicazione(updated);
                } catch (e) {
                    console.error('Errore gestione comunicazione pagamento', e);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setConverting(false);
        }
    };

    const nomeSocio = (s) => {
        if (!s) return '';
        return s.tipo_socio === 'associazione'
            ? (s.ragione_sociale || '')
            : [s.nome, s.cognome].filter(Boolean).join(' ');
    };

    const askInvioComunicazione = ({ titolo, destinatario, oggetto, testoHtml, allegatoNome, sendData }) =>
        new Promise(resolve => {
            chiediResolveRef.current = resolve;
            sendDataRef.current = sendData;
            setChiediModal({ titolo, destinatario, oggetto, testoHtml, allegatoNome, sending: false });
        });

    const handleChiediConfirm = async (cc) => {
        setChiediModal(m => (m ? { ...m, sending: true } : m));
        const res = await sendComunicazioneEmail({ ...sendDataRef.current, ccSocieta: cc });
        setChiediModal(null);
        if (res?.ok) showComFeedback(res.warning || 'Comunicazione inviata al socio', res.warning ? 'error' : 'success');
        else showComFeedback(res?.error || 'Errore invio comunicazione', 'error');
        if (chiediResolveRef.current) { chiediResolveRef.current(); chiediResolveRef.current = null; }
    };

    const handleChiediClose = () => {
        setChiediModal(null);
        if (chiediResolveRef.current) { chiediResolveRef.current(); chiediResolveRef.current = null; }
    };

    // Comunicazione al socio quando una proforma viene registrata come pagamento.
    // Allega la ricevuta in PDF.
    const handlePagamentoComunicazione = async (updated) => {
        const config = getComConfig(societa, 'pagamento');
        if (config.stato === 'NON_ATTIVA') return;

        // Spinner: stiamo preparando la comunicazione (PDF + dati socio) prima che
        // compaia il modal di conferma invio / parta l'invio automatico.
        setPreparingCom(true);
        try {
        const socioId = updated?.socio_id || pagamento?.socio_id || null;

        // Recupera email e nominativo del socio
        let email = null;
        let nome = updated?.intestatario || '';
        if (socioId) {
            try {
                const token = localStorage.getItem('token');
                const r = await fetch(`/users/api/soci/${socioId}`, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                });
                if (r.ok) {
                    const s = await r.json();
                    email = s.email || null;
                    nome = nomeSocio(s) || nome;
                }
            } catch { /* ignore */ }
        }

        const ctx = {
            nome,
            importo: formatImporto(updated?.importo),
            numeroOrdine: updated?.numero_ricevuta || `#${updated?.id || ''}`,
            numeroRicevuta: updated?.numero_ricevuta || '',
            nomeAssociazione: societa?.denominazione || '',
            istruzioni: '',
        };
        const testo = applyShortcodes(config.testo, ctx);
        const oggetto = applyShortcodes(config.oggetto, ctx);

        // Genera la ricevuta PDF da allegare
        let allegati = [];
        try {
            const base64 = await generateRicevutaPdfBase64(updated, { societa, products });
            if (base64) {
                // Il numero ricevuta può contenere "/" (es. 35/2025-26): non valido in un filename.
                const safeNumero = String(updated?.numero_ricevuta || updated?.id || 'pagamento').replace(/[\\/:*?"<>|]/g, '-');
                allegati = [{ filename: `Ricevuta_${safeNumero}.pdf`, content: base64 }];
            }
        } catch (e) {
            console.error('Errore generazione PDF ricevuta per allegato', e);
        }

        // AUTOMATICA: usa il flag CC configurato; CHIEDI: sarà la spunta del modal a decidere.
        const sendData = { socioId, oggetto, testo, allegati, ccSocieta: config.cc };

        if (config.stato === 'AUTOMATICA') {
            if (!socioId || !email) return; // nessuna email → niente invio automatico
            const res = await sendComunicazioneEmail(sendData);
            if (res?.ok) showComFeedback(res.warning || 'Comunicazione inviata al socio', res.warning ? 'error' : 'success');
            else showComFeedback(res?.error || 'Errore invio comunicazione', 'error');
            return;
        }

        // CHIEDI: nascondi lo spinner e mostra il modal di conferma invio.
        setPreparingCom(false);
        await askInvioComunicazione({
            titolo: 'Comunicazione pagamento registrato',
            destinatario: email,
            oggetto,
            testoHtml: testo,
            allegatoNome: allegati[0]?.filename,
            sendData,
        });
        } finally {
            setPreparingCom(false);
        }
    };

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

    const formatDate = (s) => {
        if (!s) return '';
        return new Date(s).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatCurrency = (amount) => parseFloat(amount || 0).toFixed(2).replace('.', ',');

    const getScadenzaTesseramento = () => {
        const types = (pagamento.quote_types || '').split(',').map(t => t.trim().toLowerCase());
        if (!types.includes('tesseramento') || !pagamento.data_pagamento) return null;
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
            if (tipo === 'associativo') { if (m < 9) anno = d.getFullYear() - 1; }
            else if (tipo === 'personalizzato' && societa?.data_inizio_anno_associativo) {
                const parts = societa.data_inizio_anno_associativo.split('-');
                const cDay = parseInt(parts[0], 10); const cMonth = parseInt(parts[1], 10);
                if (m < cMonth || (m === cMonth && day < cDay)) anno = d.getFullYear() - 1;
            }
            const { end } = getAnnoDateRange(anno, societa);
            return end;
        }
        return null;
    };

    const scadenzaTess = getScadenzaTesseramento();
    const isAnnullato = pagamento.stato_pagamento?.startsWith('3.');
    const statoOrdine = getStatoOrdine(pagamento);
    const statoCfg = STATO_ORDINE_CONFIG[statoOrdine] || STATO_ORDINE_CONFIG.pagato;

    // Resolve quote items
    const getProductName = (productId) => {
        if (!productId || !products?.length) return null;
        return products.find(p => Number(p.id) === Number(productId))?.description || null;
    };
    let quoteItems = null;
    let piArr = pagamento.payment_items;
    if (typeof piArr === 'string') { try { piArr = JSON.parse(piArr); } catch { piArr = null; } }
    if (Array.isArray(piArr) && piArr.length > 0) {
        quoteItems = piArr.map((item, idx) => ({
            name: getProductName(item.product_id) || item.quote || `Voce ${idx + 1}`,
            importo: item.importo,
        }));
    } else {
        const name = getProductName(pagamento.product_id) || pagamento.quote || '';
        if (name) quoteItems = [{ name, importo: pagamento.importo }];
    }

    const _etichetteQuery = newEtichetta.toLowerCase().trim();
    const _etichettePool = [...new Set([...allEtichette, ...originalEtichette])].sort((a, b) => a.localeCompare(b, 'it'));
    const suggestions = _etichettePool.filter(t => !etichette.includes(t) && (_etichetteQuery === '' || t.toLowerCase().includes(_etichetteQuery)));
    const showDropdown = inputFocused && suggestions.length > 0;
    const isNewValue = newEtichetta.trim() !== '' && !allEtichette.some(t => t.toLowerCase() === newEtichetta.trim().toLowerCase()) && !etichette.some(t => t.toLowerCase() === newEtichetta.trim().toLowerCase());

    return (
        <div className="dpm-overlay">
            <div className="dpm-modal">

                {/* ── Header ── */}
                <div className="dpm-header">
                    <div className="dpm-title">
                        <Calendar size={17} />
                        <span>Dettaglio ordine</span>
                    </div>
                    <button className="dpm-close-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="dpm-body">

                    {/* ── Hero ── */}
                    <div className="dpm-hero" style={{ borderLeft: `4px solid ${statoCfg.border}` }}>
                        <div className="dpm-hero-left">
                            <div className="dpm-hero-name">{pagamento.intestatario || '—'}</div>
                            {pagamento.utente_nome && (
                                <div className="dpm-hero-sub"><User size={11} /> {pagamento.utente_nome}</div>
                            )}
                        </div>
                        <div className="dpm-hero-right">
                            <span style={getStatoOrdineBadgeStyle(statoOrdine)}>
                                {statoOrdine?.toUpperCase()}
                            </span>
                            <div className="dpm-hero-importo" style={{ color: statoCfg.color }}>
                                € {formatCurrency(pagamento.importo)}
                            </div>
                        </div>
                    </div>

                    {/* ── Documento ── */}
                    <div className="dpm-card">
                        <div className="dpm-card-label">Documento</div>
                        <div className="dpm-row-3">
                            <div className="dpm-field">
                                <div className="dpm-fl">N. Ricevuta</div>
                                <div className="dpm-fv dpm-ricevuta">
                                    <span>{pagamento.tipo_documento === 'proforma' ? '—' : (pagamento.numero_ricevuta || '—')}</span>
                                    {pagamento.numero_ricevuta && pagamento.tipo_documento !== 'proforma' && (
                                        isAnnullato
                                            ? <span className="dpm-badge-annullata">ANNULLATA</span>
                                            : <span className="dpm-badge-valida">VALIDA</span>
                                    )}
                                </div>
                            </div>
                            <div className="dpm-field">
                                <div className="dpm-fl">Data ordine</div>
                                <div className="dpm-fv">{formatDate(pagamento.data_ricevuta || pagamento.data_pagamento) || '—'}</div>
                            </div>
                            <div className="dpm-field">
                                <div className="dpm-fl">Data pagamento</div>
                                <div className="dpm-fv">
                                    {pagamento.tipo_documento === 'proforma'
                                        ? <span className="dpm-fv-empty">Non registrato</span>
                                        : (formatDate(pagamento.data_pagamento) || '—')
                                    }
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Ricevuta di pagamento caricata dal socio ── */}
                    {pagamento.ricevuta_uploaded_at && (
                        <div className="dpm-card">
                            <div className="dpm-card-label dpm-card-label-row">
                                <span className="dpm-card-label-icon"><FileCheck size={11} /> Ricevuta di pagamento</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, wordBreak: 'break-word' }}>
                                        {pagamento.ricevuta_file_nome || 'Ricevuta caricata'}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        Caricata il {new Date(pagamento.ricevuta_uploaded_at).toLocaleString('it-IT', {
                                            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
                                        })}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="dpm-btn-converti"
                                    onClick={handleApriRicevuta}
                                    disabled={apriRicevutaBusy}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                                >
                                    <Download size={15} /> {apriRicevutaBusy ? 'Apertura…' : 'Apri / Scarica'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Quote ── */}
                    {quoteItems && (
                        <div className="dpm-card">
                            <div className="dpm-card-label">Quote</div>
                            <div className="dpm-quote-list">
                                {quoteItems.map((item, idx) => (
                                    <div key={idx} className="dpm-quote-row">
                                        <span className="dpm-quote-name">
                                            {item.name}
                                            {idx === 0 && scadenzaTess && (
                                                <span className="dpm-quote-scad">
                                                    Scad. {scadenzaTess.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                </span>
                                            )}
                                        </span>
                                        <span className="dpm-quote-amount">€ {formatCurrency(item.importo)}</span>
                                    </div>
                                ))}
                                {quoteItems.length > 1 && (
                                    <div className="dpm-quote-row dpm-quote-total">
                                        <span>Totale</span>
                                        <span>€ {formatCurrency(pagamento.importo)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Etichette ── */}
                    <div className="dpm-card">
                                <div className="dpm-card-label dpm-card-label-row">
                                    <span className="dpm-card-label-icon"><Tag size={11} /> Etichette</span>
                                    <span className={`dpm-save-status ${savedFlash ? 'dpm-save-flash' : ''}`}>
                                        {savedFlash && <><Check size={11} /> Salvato</>}
                                        {savingEtichette && !savedFlash && 'Salvataggio…'}
                                    </span>
                                </div>
                                {/* Tag-input: chips + input in flow */}
                                <div ref={tagInputRef}>
                                    <div
                                        className="dpm-tag-input"
                                        onClick={() => etichettaInputRef.current?.focus()}
                                    >
                                        {etichette.map(tag => (
                                            <span key={tag} className="dpm-chip">
                                                {tag}
                                                <button
                                                    className="dpm-chip-remove"
                                                    onClick={e => { e.stopPropagation(); handleRemoveEtichetta(tag); }}
                                                    disabled={savingEtichette}
                                                    title="Rimuovi"
                                                >
                                                    <X size={11} />
                                                </button>
                                            </span>
                                        ))}
                                        <input
                                            ref={etichettaInputRef}
                                            className="dpm-chip-input"
                                            value={newEtichetta}
                                            onChange={e => { setNewEtichetta(e.target.value); setActiveIdx(-1); }}
                                            onFocus={() => setInputFocused(true)}
                                            onBlur={() => { setInputFocused(false); setActiveIdx(-1); }}
                                            onKeyDown={e => {
                                                if (e.key === 'ArrowDown') {
                                                    e.preventDefault();
                                                    if (showDropdown) setActiveIdx(i => Math.min(i + 1, suggestions.length - 1));
                                                } else if (e.key === 'ArrowUp') {
                                                    e.preventDefault();
                                                    if (showDropdown) setActiveIdx(i => Math.max(i - 1, -1));
                                                } else if (e.key === 'Escape') {
                                                    e.preventDefault();
                                                    setInputFocused(false); setActiveIdx(-1); setNewEtichetta('');
                                                } else if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (showDropdown && activeIdx >= 0) handleAddEtichetta(suggestions[activeIdx]);
                                                    else if (newEtichetta.trim()) handleAddEtichetta();
                                                } else if (e.key === 'Backspace' && !newEtichetta && etichette.length > 0) {
                                                    handleRemoveEtichetta(etichette[etichette.length - 1]);
                                                }
                                            }}
                                            placeholder={etichette.length === 0 ? 'Aggiungi etichetta…' : 'Altra…'}
                                            disabled={savingEtichette}
                                        />
                                    </div>

                                    {/* Hint: solo se nessun dropdown e valore nuovo */}
                                    {!showDropdown && isNewValue && (
                                        <div className="dpm-chip-hint">
                                            Premi <kbd>Invio</kbd> per aggiungere <strong>"{newEtichetta.trim()}"</strong>
                                        </div>
                                    )}
                                </div>
                            </div>
                    {showDropdown && tagInputRef.current && createPortal(
                        (() => {
                            const rect = tagInputRef.current.getBoundingClientRect();
                            return (
                                <ul className="dpm-suggestions" style={{
                                    position: 'fixed',
                                    top: rect.bottom + 2,
                                    left: rect.left,
                                    right: 'auto',
                                    width: rect.width,
                                    zIndex: 9999,
                                }}>
                                    {suggestions.map((s, i) => (
                                        <li
                                            key={s}
                                            className={`dpm-suggestion-item${i === activeIdx ? ' dpm-suggestion-active' : ''}`}
                                            onMouseDown={e => e.preventDefault()}
                                            onClick={() => handleAddEtichetta(s)}
                                        >
                                            <Tag size={11} className="dpm-suggestion-icon" />
                                            {s}
                                        </li>
                                    ))}
                                    {isNewValue && (
                                        <li
                                            className="dpm-suggestion-new"
                                            onMouseDown={e => e.preventDefault()}
                                            onClick={() => handleAddEtichetta()}
                                        >
                                            <Plus size={11} /> Crea <strong>"{newEtichetta.trim()}"</strong>
                                        </li>
                                    )}
                                </ul>
                            );
                        })(),
                        document.body
                    )}

                </div>

                {/* ── Footer azioni ── */}
                {!isAnnullato && pagamento.tipo_documento !== 'proforma' && (
                    <div className="dpm-footer">
                        <button className="dpm-btn-annulla" onClick={() => setShowConferma(true)}>
                            <Ban size={15} /> Annulla ricevuta
                        </button>
                    </div>
                )}
                {!isAnnullato && pagamento.tipo_documento === 'proforma' && (
                    <div className="dpm-footer dpm-footer-proforma">
                        <button className="dpm-btn-converti" onClick={handleOpenConvertForm}>
                            <Check size={15} /> Registra Pagamento
                        </button>
                        <button className="dpm-btn-elimina" onClick={() => setShowEliminaConferma(true)}>
                            <Trash2 size={15} /> Elimina Ordine
                        </button>
                    </div>
                )}
                {isAnnullato && (
                    <div className="dpm-footer dpm-footer-annullato">
                        <Ban size={15} /> Ricevuta annullata
                    </div>
                )}
            </div>

            {/* ── Modal conversione proforma → pagamento ── */}
            {showConvertForm && (
                <div className="dpm-confirm-overlay">
                    <div className="dpm-confirm-modal" style={{ maxWidth: '480px' }}>
                        <div className="dpm-confirm-header" style={{ background: 'var(--primary-hover)' }}>
                            <Check size={20} /><span>Registra Pagamento</span>
                        </div>
                        <div className="dpm-confirm-body">
                            <p>Stai per registrare il pagamento per l'ordine intestato a <strong>{pagamento.intestatario}</strong> e generare la relativa ricevuta.</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', margin: '16px 0' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Anno ricevuta</label>
                                    <select
                                        className="gpm-select"
                                        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}
                                        value={convertAnno ?? ''}
                                        onChange={e => setConvertAnno(parseInt(e.target.value, 10))}
                                    >
                                        {annoOptions.map(anno => (
                                            <option key={anno} value={anno}>{formatAnnoLabel(anno)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Data ricevuta</label>
                                    <input
                                        type="date"
                                        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                                        value={convertData}
                                        max={todayStr}
                                        onChange={e => setConvertData(e.target.value)}
                                    />
                                </div>
                            </div>
                            {convertNextRaw === 1 ? (
                                <div style={{ background: 'var(--primary-container)', border: '1px solid var(--primary-container)', borderRadius: '6px', padding: '10px 14px', fontSize: '0.9rem', color: 'var(--primary)' }}>
                                    <div style={{ marginBottom: '8px' }}>
                                        Questa è la <strong>prima ricevuta</strong> dell'anno: scegli da quale numero far partire la numerazione.
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <input
                                            type="number"
                                            min="1"
                                            style={{ width: '90px', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}
                                            value={convertStartNumber}
                                            onChange={e => setConvertStartNumber(e.target.value)}
                                        />
                                        <span>
                                            → <strong>
                                                {(() => {
                                                    const n = parseInt(convertStartNumber, 10);
                                                    const suffix = convertNextNumero && convertNextNumero.includes('/')
                                                        ? convertNextNumero.slice(convertNextNumero.indexOf('/'))
                                                        : '';
                                                    return (!isNaN(n) && n >= 1 ? n : '—') + suffix;
                                                })()}
                                            </strong>
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ background: 'var(--primary-container)', border: '1px solid var(--primary-container)', borderRadius: '6px', padding: '10px 14px', fontSize: '0.9rem', color: 'var(--primary)' }}>
                                    <strong>N. ricevuta assegnato:</strong>{' '}
                                    {convertNextNumero
                                        ? <strong>{convertNextNumero}</strong>
                                        : <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>calcolo in corso…</span>
                                    }
                                </div>
                            )}
                        </div>
                        <div className="dpm-confirm-footer">
                            <button className="dpm-confirm-btn-cancel" onClick={() => setShowConvertForm(false)}>
                                <X size={14} /> Annulla
                            </button>
                            <button
                                className="dpm-btn-converti"
                                onClick={handleConfermaConverti}
                                disabled={converting || !convertNextNumero || (convertNextRaw === 1 && (() => { const n = parseInt(convertStartNumber, 10); return isNaN(n) || n < 1; })())}
                                style={{ opacity: (converting || !convertNextNumero) ? 0.6 : 1, cursor: (converting || !convertNextNumero) ? 'not-allowed' : 'pointer' }}
                            >
                                <Check size={14} /> {converting ? 'Conversione…' : 'Conferma e converti'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal eliminazione proforma ── */}
            {showEliminaConferma && (
                <div className="dpm-confirm-overlay">
                    <div className="dpm-confirm-modal">
                        <div className="dpm-confirm-header" style={{ background: 'var(--danger)' }}>
                            <Trash2 size={20} /><span>Conferma eliminazione ordine</span>
                        </div>
                        <div className="dpm-confirm-body">
                            <p>Stai per eliminare definitivamente l'ordine intestato a <strong>{pagamento.intestatario}</strong> di <strong>€ {formatCurrency(pagamento.importo)}</strong>.</p>
                            <p className="dpm-confirm-warning">Il record verrà cancellato dal database in modo permanente. Questa operazione non può essere annullata.</p>
                        </div>
                        <div className="dpm-confirm-footer">
                            <button className="dpm-confirm-btn-cancel" onClick={() => setShowEliminaConferma(false)} disabled={deleting}>
                                <X size={14} /> No, torna indietro
                            </button>
                            <button
                                className="dpm-btn-elimina"
                                onClick={handleConfermaEliminaProforma}
                                disabled={deleting}
                                style={{ opacity: deleting ? 0.6 : 1, cursor: deleting ? 'not-allowed' : 'pointer' }}
                            >
                                <Trash2 size={14} /> {deleting ? 'Eliminazione…' : 'Sì, elimina ordine'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal conferma annullamento ── */}
            {showConferma && (
                <div className="dpm-confirm-overlay">
                    <div className="dpm-confirm-modal">
                        <div className="dpm-confirm-header">
                            <AlertTriangle size={20} /><span>Conferma annullamento</span>
                        </div>
                        <div className="dpm-confirm-body">
                            <p>Stai per annullare la ricevuta <strong>{pagamento.numero_ricevuta}</strong> intestata a <strong>{pagamento.intestatario}</strong>.</p>
                            <p>Il pagamento e la ricevuta verranno marcati come <strong>ANNULLATI</strong> e l'importo non verrà più conteggiato tra gli incassi validi.</p>
                            <p className="dpm-confirm-warning">Questa operazione non può essere annullata.</p>
                        </div>
                        <div className="dpm-confirm-footer">
                            <button className="dpm-confirm-btn-cancel" onClick={() => setShowConferma(false)}>
                                <X size={14} /> No, torna indietro
                            </button>
                            <button className="dpm-confirm-btn-ok" onClick={handleConfermaAnnulla}>
                                <Ban size={14} /> Sì, annulla ricevuta
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ChiediInvioComunicazioneModal
                isOpen={chiediModal !== null}
                titolo={chiediModal?.titolo}
                destinatario={chiediModal?.destinatario}
                oggetto={chiediModal?.oggetto}
                testoHtml={chiediModal?.testoHtml}
                allegatoNome={chiediModal?.allegatoNome}
                ccEmail={societa?.email}
                sending={chiediModal?.sending}
                onConfirm={handleChiediConfirm}
                onClose={handleChiediClose}
            />

            {preparingCom && (
                <div className="dpm-com-spinner-overlay">
                    <div className="dpm-com-progress-box">
                        <span className="dpm-com-progress-label">Invio comunicazione in corso…</span>
                        <div className="dpm-com-progress">
                            <div className="dpm-com-progress-bar" />
                        </div>
                    </div>
                </div>
            )}

            {comFeedback && (
                <div className={`dpm-snackbar dpm-snackbar-${comFeedback.type}`}>
                    {comFeedback.type === 'success'
                        ? <Check size={18} strokeWidth={2.5} />
                        : <X size={18} strokeWidth={2.5} />}
                    {comFeedback.text}
                </div>
            )}
        </div>
    );
};

export default DettaglioOrdineModal;
