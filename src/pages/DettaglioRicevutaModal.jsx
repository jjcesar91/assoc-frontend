import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Ban, Calendar, Check, CreditCard, Download, Edit2, FileCheck, History, Plus, Tag, Trash2, User, X } from 'lucide-react';
import { getAnnoDateRange, useAnno } from '../data/AnnoContext';
import { getStatoRicevuta, getStatoRicevutaBadgeStyle, STATO_RICEVUTA_CONFIG } from '../utils/ricevutaUtils';
import ChiediInvioComunicazioneModal from '../components/ChiediInvioComunicazioneModal';
import { getComConfig, applyShortcodes, sendComunicazioneEmail, formatImporto } from '../utils/comunicazioniRicevute';
import { generateRicevutaPdf } from '../utils/ricevuta';
import { openQuietanzaCaricata } from '../utils/quietanza';
import { getRangeDataRicevuta, validaDataRicevuta, oggiStr } from '../utils/dataRicevutaUtils';
import { formatDateIT, formatDateTimeIT } from '../utils/dateUtils';
import { contiPerModalita, contoDopoCambioModalita, modalitaDisponibili } from '../utils/modalitaPagamento';
import './DettaglioRicevutaModal.css';

// Da dove è partita una modifica (storico ricevuta)
const ORIGINE_LABEL = {
    dettaglio_ricevuta: 'da Dettaglio ricevuta',
    prima_nota: 'da Prima Nota',
    scadenziario: 'da Scadenziario',
    area_soci: 'dall\'area soci',
    import: 'da import',
};

const DettaglioRicevutaModal = ({ isOpen, onClose, ricevuta: pagamento, onAnnulla, onConvertProforma, onDeleteProforma, onUpdate, societa, products, allEtichette = [] }) => {
    const [showConferma, setShowConferma] = useState(false);
    const [showConvertForm, setShowConvertForm] = useState(false);
    const [showEliminaConferma, setShowEliminaConferma] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [convertAnno, setConvertAnno] = useState(null);
    const [convertData, setConvertData] = useState('');
    const [convertNextNumero, setConvertNextNumero] = useState(null);
    const [convertNextRaw, setConvertNextRaw] = useState(null); // progressivo grezzo: ===1 → prima ricevuta
    // Data dell'ultima ricevuta dell'anno selezionato: estremo inferiore per la
    // data ricevuta (non si può retrodatare prima dell'ultima ricevuta emessa).
    const [convertLastPaymentDate, setConvertLastPaymentDate] = useState('');
    // Errore sulla data mostrato dopo un tentativo di conferma.
    const [convertDataError, setConvertDataError] = useState('');
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

    // Apertura/download della quietanza di pagamento caricata dal socio
    const [apriQuietanzaBusy, setApriQuietanzaBusy] = useState(false);
    const handleApriQuietanza = async () => {
        if (apriQuietanzaBusy) return;
        setApriQuietanzaBusy(true);
        const r = await openQuietanzaCaricata(pagamento.id);
        setApriQuietanzaBusy(false);
        if (!r.ok) showComFeedback(r.error || 'Impossibile aprire la quietanza', 'error');
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

    // Modalità di pagamento / conto: modifica tracciata (payment_modifiche + storico socio)
    const [pagValori, setPagValori] = useState({ modalita: '', conto: '' });
    const [editPag, setEditPag] = useState(false);
    const [formPag, setFormPag] = useState({ modalita: '', conto: '' });
    const [conti, setConti] = useState([]);
    const [savingPag, setSavingPag] = useState(false);
    const [errorPag, setErrorPag] = useState(null);
    const [modifiche, setModifiche] = useState([]);
    const [tab, setTab] = useState('dettaglio'); // 'dettaglio' | 'storico'

    const { annoOptions, formatAnnoLabel, selectedAnno } = useAnno();

    const todayStr = oggiStr();

    // Intervallo consentito per la data ricevuta in fase di conversione
    // proforma → pagamento: stesse regole della creazione di una nuova ricevuta
    // (vedi utils/dataRicevutaUtils).
    const rangeConvertData = useMemo(
        () => getRangeDataRicevuta(convertAnno, societa, convertLastPaymentDate),
        [convertAnno, societa, convertLastPaymentDate]
    );
    const esitoConvertData = useMemo(
        () => validaDataRicevuta(convertData, rangeConvertData),
        [convertData, rangeConvertData]
    );

    // Clamp difensivo al variare degli estremi (cambio anno o arrivo di
    // lastPaymentDate dal backend).
    useEffect(() => {
        if (!showConvertForm) return;
        setConvertData(prev => {
            if (!prev) return prev;
            if (prev > rangeConvertData.max) return rangeConvertData.max;
            if (rangeConvertData.min && prev < rangeConvertData.min) return rangeConvertData.min;
            return prev;
        });
    }, [showConvertForm, rangeConvertData.min, rangeConvertData.max]);

    // Pulizia timer snackbar allo smontaggio
    useEffect(() => () => clearTimeout(comFeedbackTimerRef.current), []);

    // Sincronizza etichette locali all'apertura/cambio ricevuta
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

    // Modalità/conto attuali e modifiche registrate all'apertura/cambio ricevuta
    useEffect(() => {
        if (!isOpen || !pagamento?.id) return;
        setPagValori({ modalita: pagamento.modalita_pagamento || '', conto: pagamento.conto_destinazione || '' });
        setEditPag(false);
        setErrorPag(null);
        setTab('dettaglio');
        setModifiche([]);
        let cancelled = false;
        caricaStorico(() => cancelled);
        return () => { cancelled = true; };
    }, [isOpen, pagamento?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Storico ricevuta: si ricarica anche quando la ricevuta cambia (annullamento, conversione…)
    useEffect(() => {
        if (isOpen && pagamento?.id) caricaStorico();
    }, [pagamento?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

    async function caricaStorico(annullato = () => false) {
        if (!pagamento?.id) return;
        try {
            const token = localStorage.getItem('token');
            const r = await fetch(`/payments/api/${pagamento.id}/modifiche`, { headers: { 'Authorization': `Bearer ${token}` } });
            const d = r.ok ? await r.json() : [];
            if (!annullato()) setModifiche(Array.isArray(d) ? d : []);
        } catch { /* lo storico resta quello già mostrato */ }
    }

    const apriModificaPagamento = async () => {
        setFormPag({ ...pagValori });
        setErrorPag(null);
        setEditPag(true);
        if (conti.length || !pagamento?.societa_id) return;
        try {
            const token = localStorage.getItem('token');
            const r = await fetch(`/payments/api/conti?societa_id=${pagamento.societa_id}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const d = r.ok ? await r.json() : [];
            setConti(Array.isArray(d) ? d : []);
        } catch { setConti([]); }
    };

    const salvaModificaPagamento = async () => {
        if (savingPag) return;
        if (formPag.modalita === pagValori.modalita && formPag.conto === pagValori.conto) { setEditPag(false); return; }
        setSavingPag(true);
        setErrorPag(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/payments/api/${pagamento.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    modalita_pagamento: formPag.modalita || null,
                    conto_destinazione: formPag.conto || null,
                    origine_modifica: 'dettaglio_ricevuta',
                }),
            });
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                throw new Error(d.error || 'Salvataggio non riuscito');
            }
            const updated = await res.json();
            setPagValori({ modalita: updated.modalita_pagamento || '', conto: updated.conto_destinazione || '' });
            setEditPag(false);
            showComFeedback('Pagamento aggiornato', 'success');
            caricaStorico();
            if (onUpdate) onUpdate(updated);
        } catch (e) {
            setErrorPag(e.message);
        } finally {
            setSavingPag(false);
        }
    };

    const saveEtichette = async (tags) => {
        if (!pagamento?.id || savingEtichette) return;
        setSavingEtichette(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/payments/api/${pagamento.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ etichette: tags.length ? tags.join(', ') : null, origine_modifica: 'dettaglio_ricevuta' }),
            });
            if (res.ok) {
                const updated = await res.json();
                caricaStorico();
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
                    setConvertLastPaymentDate(data.lastPaymentDate || '');
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
        setConvertLastPaymentDate('');
        setConvertDataError('');
        setShowConvertForm(true);
    };

    const handleConfermaConverti = async () => {
        if (converting) return;

        // min/max sull'input sono solo indicativi: ricontrolla prima di inviare.
        if (!esitoConvertData.ok) {
            setConvertDataError(esitoConvertData.error);
            return;
        }
        setConvertDataError('');

        setConverting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/payments/api/${pagamento.id}/converti-proforma`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    anno_ricevuta: convertAnno,
                    data_ricevuta: convertData,
                    origine: 'dettaglio_ricevuta',
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
            } else {
                let errMsg = 'Errore durante la registrazione del pagamento';
                try { const errBody = await res.json(); if (errBody?.error) errMsg = errBody.error; } catch { /* ignore */ }
                showComFeedback(errMsg, 'error');
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

    const handleChiediConfirm = async (ccn, testoModificato) => {
        setChiediModal(m => (m ? { ...m, sending: true } : m));
        const payload = { ...sendDataRef.current, ccnSocieta: ccn };
        if (testoModificato != null) payload.testo = testoModificato;
        const res = await sendComunicazioneEmail(payload);
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
            numeroRiferimento: updated?.numero_ricevuta || `#${updated?.id || ''}`,
            numeroRicevuta: updated?.numero_ricevuta || '',
            nomeAssociazione: societa?.denominazione || '',
            istruzioni: '',
        };
        const testo = applyShortcodes(config.testo, ctx);
        const oggetto = applyShortcodes(config.oggetto, ctx);

        // Genera la ricevuta PDF da allegare
        let allegati = [];
        try {
            // Nome file "COGNOME NOME - Ricevuta N.pdf" (vedi utils/nomeFileSocio.js)
            const { base64, filename } = await generateRicevutaPdf(updated, { societa, products });
            if (base64) {
                allegati = [{ filename, content: base64 }];
            }
        } catch (e) {
            console.error('Errore generazione PDF ricevuta per allegato', e);
        }

        // AUTOMATICA: usa il flag CCn configurato; CHIEDI: sarà la spunta del modal a decidere.
        const sendData = { socioId, oggetto, testo, allegati, ccnSocieta: config.ccn };

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
    const statoRicevuta = getStatoRicevuta(pagamento);
    const statoCfg = STATO_RICEVUTA_CONFIG[statoRicevuta] || STATO_RICEVUTA_CONFIG.pagato;

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
                        <span>Dettaglio ricevuta</span>
                    </div>
                    <button className="dpm-close-btn" onClick={onClose}><X size={20} /></button>
                </div>

                {/* ── Tab ── */}
                <div className="dpm-tabs" role="tablist">
                    <button type="button" role="tab" aria-selected={tab === 'dettaglio'} className={`dpm-tab${tab === 'dettaglio' ? ' dpm-tab-active' : ''}`} onClick={() => setTab('dettaglio')}>
                        Dettaglio
                    </button>
                    <button type="button" role="tab" aria-selected={tab === 'storico'} className={`dpm-tab${tab === 'storico' ? ' dpm-tab-active' : ''}`} onClick={() => setTab('storico')}>
                        <History size={14} /> Storico modifiche{modifiche.length > 0 && <span className="dpm-tab-count">{modifiche.length}</span>}
                    </button>
                </div>

                {tab === 'storico' ? (
                <div className="dpm-body">
                    <ul className="dpm-storico">
                        {modifiche.map(m => (
                            <li key={m.id} className={`dpm-storico-item dpm-storico-${m.tipo}`}>
                                <div className="dpm-storico-meta">
                                    <span>{formatDateTimeIT(m.createdAt)}</span>
                                    <span>· {m.utente_email || 'Sistema'}</span>
                                    {ORIGINE_LABEL[m.origine] && <span>· {ORIGINE_LABEL[m.origine]}</span>}
                                </div>
                                <div className="dpm-storico-desc">{m.descrizione}</div>
                                {Array.isArray(m.modifiche) && m.modifiche.length > 0 && (
                                    <table className="dpm-storico-diff">
                                        <tbody>
                                            {m.modifiche.map((c, i) => (
                                                <tr key={i}>
                                                    <th>{c.etichetta}</th>
                                                    <td><s>{c.da ?? '—'}</s></td>
                                                    <td aria-hidden="true">→</td>
                                                    <td><strong>{c.a ?? '—'}</strong></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </li>
                        ))}
                        <li className="dpm-storico-item dpm-storico-creazione">
                            <div className="dpm-storico-meta">
                                <span>{formatDateTimeIT(pagamento.createdAt) || '—'}</span>
                                {pagamento.utente_nome && <span>· {pagamento.utente_nome}</span>}
                                {pagamento.origine === 'cliente' && <span>· dall'area soci</span>}
                            </div>
                            <div className="dpm-storico-desc">{pagamento.tipo_documento === 'proforma' ? 'Proforma creata' : 'Documento creato'}</div>
                        </li>
                    </ul>
                    {modifiche.length === 0 && (
                        <p className="dpm-storico-vuoto">Nessuna modifica registrata dopo la creazione.</p>
                    )}
                </div>
                ) : (
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
                            <span style={getStatoRicevutaBadgeStyle(statoRicevuta)}>
                                {statoRicevuta?.toUpperCase()}
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
                                <div className="dpm-fl">Origine</div>
                                <div className="dpm-fv">
                                    {pagamento.origine === 'cliente'
                                        ? <span style={{
                                            display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
                                            fontSize: '0.75rem', fontWeight: 'bold',
                                            background: 'var(--warning-container)', color: 'var(--on-warning-container)',
                                            border: '1px solid var(--warning)',
                                        }}>DA CLIENTE</span>
                                        : 'Backoffice'
                                    }
                                </div>
                            </div>
                            <div className="dpm-field">
                                <div className="dpm-fl">Data ricevuta</div>
                                <div className="dpm-fv">{formatDateIT(pagamento.data_ricevuta || pagamento.data_pagamento) || '—'}</div>
                            </div>
                            <div className="dpm-field">
                                <div className="dpm-fl">Data pagamento</div>
                                <div className="dpm-fv">
                                    {pagamento.tipo_documento === 'proforma'
                                        ? <span className="dpm-fv-empty">Non registrato</span>
                                        : (formatDateIT(pagamento.data_pagamento) || '—')
                                    }
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Pagamento: modalità e conto (modificabili, con storico) ── */}
                    <div className="dpm-card">
                        <div className="dpm-card-label dpm-card-label-row">
                            <span className="dpm-card-label-icon"><CreditCard size={11} /> Pagamento</span>
                            {!isAnnullato && !editPag && (
                                <button type="button" className="dpm-link-btn" onClick={apriModificaPagamento}>
                                    <Edit2 size={12} /> Modifica
                                </button>
                            )}
                        </div>
                        {!editPag ? (
                            <div className="dpm-row-3">
                                <div className="dpm-field">
                                    <div className="dpm-fl">Modalità di pagamento</div>
                                    <div className="dpm-fv">{pagValori.modalita || <span className="dpm-fv-empty">Non indicata</span>}</div>
                                </div>
                                <div className="dpm-field">
                                    <div className="dpm-fl">Conto</div>
                                    <div className="dpm-fv">{pagValori.conto || <span className="dpm-fv-empty">Nessun conto</span>}</div>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="dpm-pag-form">
                                    <label className="dpm-field">
                                        <span className="dpm-fl">Modalità di pagamento</span>
                                        <select
                                            className="dpm-select"
                                            value={formPag.modalita}
                                            onChange={e => {
                                                const m = e.target.value;
                                                setFormPag(f => ({ modalita: m, conto: f.conto ? contoDopoCambioModalita(conti, f.conto, m) : f.conto }));
                                            }}
                                            disabled={savingPag}
                                        >
                                            <option value="">— Non indicata —</option>
                                            {modalitaDisponibili(conti, undefined, pagValori.modalita).map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </label>
                                    <label className="dpm-field">
                                        <span className="dpm-fl">Conto</span>
                                        <select className="dpm-select" value={formPag.conto} onChange={e => setFormPag(f => ({ ...f, conto: e.target.value }))} disabled={savingPag}>
                                            <option value="">— Nessun conto —</option>
                                            {contiPerModalita(conti, formPag.modalita).map(c => <option key={c.id} value={c.descrizione}>{c.descrizione}</option>)}
                                            {formPag.conto && !contiPerModalita(conti, formPag.modalita).some(c => c.descrizione === formPag.conto) && (
                                                <option value={formPag.conto}>{formPag.conto}</option>
                                            )}
                                        </select>
                                    </label>
                                </div>
                                <div className="dpm-pag-hint">La modifica viene registrata con data e autore nello storico della ricevuta{pagamento.socio_id ? ' e del socio' : ''}.</div>
                                {errorPag && (
                                    <div className="dpm-pag-error"><AlertTriangle size={14} /> <span>{errorPag}</span></div>
                                )}
                                <div className="dpm-pag-actions">
                                    <button type="button" className="dpm-confirm-btn-cancel" onClick={() => setEditPag(false)} disabled={savingPag}>
                                        <X size={14} /> Annulla
                                    </button>
                                    <button type="button" className="dpm-btn-converti" onClick={salvaModificaPagamento} disabled={savingPag}>
                                        <Check size={14} /> {savingPag ? 'Salvataggio…' : 'Salva'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Quietanza di pagamento caricata dal socio ── */}
                    {pagamento.ricevuta_uploaded_at && (
                        <div className="dpm-card">
                            <div className="dpm-card-label dpm-card-label-row">
                                <span className="dpm-card-label-icon"><FileCheck size={11} /> Quietanza di pagamento</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, wordBreak: 'break-word' }}>
                                        {pagamento.ricevuta_file_nome || 'Quietanza caricata'}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        Caricata il {formatDateTimeIT(pagamento.ricevuta_uploaded_at)}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="dpm-btn-converti"
                                    onClick={handleApriQuietanza}
                                    disabled={apriQuietanzaBusy}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                                >
                                    <Download size={15} /> {apriQuietanzaBusy ? 'Apertura…' : 'Apri / Scarica'}
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
                                                    Scad. {formatDateIT(scadenzaTess)}
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
                )}

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
                            <Trash2 size={15} /> Elimina Ricevuta
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
                            <p>Stai per registrare il pagamento per la ricevuta intestata a <strong>{pagamento.intestatario}</strong> e generare la relativa ricevuta.</p>
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
                                        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: `1px solid ${esitoConvertData.ok ? 'var(--border-color)' : 'var(--danger)'}`, fontSize: '0.9rem', boxSizing: 'border-box' }}
                                        value={convertData}
                                        min={rangeConvertData.min || undefined}
                                        max={rangeConvertData.max}
                                        onChange={e => { setConvertData(e.target.value); setConvertDataError(''); }}
                                    />
                                </div>
                            </div>
                            {(convertDataError || !esitoConvertData.ok) && (
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', margin: '-8px 0 16px', fontSize: '0.82rem', color: 'var(--danger)', lineHeight: 1.35 }}>
                                    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                                    <span>{convertDataError || esitoConvertData.error}</span>
                                </div>
                            )}
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
                                disabled={converting || !convertNextNumero || !esitoConvertData.ok || (convertNextRaw === 1 && (() => { const n = parseInt(convertStartNumber, 10); return isNaN(n) || n < 1; })())}
                                title={!esitoConvertData.ok ? esitoConvertData.error : undefined}
                                style={{ opacity: (converting || !convertNextNumero || !esitoConvertData.ok) ? 0.6 : 1, cursor: (converting || !convertNextNumero || !esitoConvertData.ok) ? 'not-allowed' : 'pointer' }}
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
                            <Trash2 size={20} /><span>Conferma eliminazione ricevuta</span>
                        </div>
                        <div className="dpm-confirm-body">
                            <p>Stai per eliminare definitivamente la ricevuta intestata a <strong>{pagamento.intestatario}</strong> di <strong>€ {formatCurrency(pagamento.importo)}</strong>.</p>
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
                                <Trash2 size={14} /> {deleting ? 'Eliminazione…' : 'Sì, elimina ricevuta'}
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

export default DettaglioRicevutaModal;
