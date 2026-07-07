import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, List, CreditCard, Check, X, User, FileEdit, AlertTriangle, Folder } from 'lucide-react';
import { useSocieta } from '../data/SocietaContext';
import { useAnno, getAnnoDateRange } from '../data/AnnoContext';
import { computeScadenzaCertificato } from '../utils/certificatoUtils';
import RicercaSocioModal from './RicercaSocioModal';
import GeneraOrdineModal from './GeneraOrdineModal';
import AbbonamentoDateModal from './AbbonamentoDateModal';
import DettaglioOrdineModal from './DettaglioOrdineModal';
import IscrizioneCorsoDopoModal from './IscrizioneCorsoDopoModal';
import ChiediInvioComunicazioneModal from '../components/ChiediInvioComunicazioneModal';
import {
    getComConfig, applyShortcodes, buildIstruzioniPagamento,
    sendComunicazioneEmail, formatImporto,
} from '../utils/comunicazioniOrdini';
import { generateRicevutaPdfBase64 } from '../utils/ricevuta';
import './NuovoPagamento.css'; // Make sure we use the right CSS with isolated namespaces

const getCertStatus = (scadenza) => {
    if (!scadenza) return 'NON ISCRITTO';
    // Calcola scadenza: data presentazione + 1 anno - 1 giorno
    const scadenzaDate = computeScadenzaCertificato(scadenza);
    if (!scadenzaDate) return 'NON ISCRITTO';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (scadenzaDate < today) return 'SCADUTO';
    return 'ISCRITTO';
};

const NuovoOrdine = () => {
    const { selectedSocietaId, societaList } = useSocieta();
    const { selectedAnno } = useAnno();
    const navigate = useNavigate();
    const location = useLocation();
    const [isRicercaModalOpen, setIsRicercaModalOpen] = useState(false);
    const [isGeneraModalOpen, setIsGeneraModalOpen] = useState(false);
    const [isAbbonamentoDateModalOpen, setIsAbbonamentoDateModalOpen] = useState(false);
    const [subscriptionDuration, setSubscriptionDuration] = useState('');
    const [subscriptionDates, setSubscriptionDates] = useState(null);
    const [selectedPaymentDetail, setSelectedPaymentDetail] = useState(null);
    const [selectedSocio, setSelectedSocio] = useState(location.state?.socio ?? null);
    const prefilledQuoteType = location.state?.prefilledQuoteType ?? null;
    const prefilledProductId = location.state?.prefilledProductId ?? null;
    const [snackbar, setSnackbar] = useState({ show: false, message: '', type: 'success' });
    const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
    const [lastPaymentType, setLastPaymentType] = useState('pagamento');

    const [showAbbWarningModal, setShowAbbWarningModal] = useState(false);
    const [isCorsoIscrizioneModalOpen, setIsCorsoIscrizioneModalOpen] = useState(false);
    const [corsiPerAbbonamento, setCorsiPerAbbonamento] = useState([]);

    const showSnackbar = (message, type = 'success') => {
        setSnackbar({ show: true, message, type });
        setTimeout(() => setSnackbar(s => ({ ...s, show: false })), 3000);
    };

    // Comunicazione "creazione proforma" (stato CHIEDI → modal di conferma)
    const [chiediModal, setChiediModal] = useState(null);
    const chiediResolveRef = useRef(null);
    const sendDataRef = useRef(null);

    const askInvioComunicazione = ({ titolo, destinatario, oggetto, testoHtml, allegatoNome, sendData }) =>
        new Promise(resolve => {
            chiediResolveRef.current = resolve;
            sendDataRef.current = sendData;
            setChiediModal({ titolo, destinatario, oggetto, testoHtml, allegatoNome, sending: false });
        });

    const handleChiediConfirm = async () => {
        setChiediModal(m => (m ? { ...m, sending: true } : m));
        const res = await sendComunicazioneEmail(sendDataRef.current);
        if (res.ok) showSnackbar(res.warning || 'Comunicazione inviata al socio', res.warning ? 'error' : 'success');
        else showSnackbar(res.error || 'Errore invio comunicazione', 'error');
        setChiediModal(null);
        if (chiediResolveRef.current) { chiediResolveRef.current(); chiediResolveRef.current = null; }
    };

    const handleChiediClose = () => {
        setChiediModal(null);
        if (chiediResolveRef.current) { chiediResolveRef.current(); chiediResolveRef.current = null; }
    };

    const nomeSocio = (s) => {
        if (!s) return '';
        return s.tipo_socio === 'associazione'
            ? (s.ragione_sociale || '')
            : [s.nome, s.cognome].filter(Boolean).join(' ');
    };

    // Gestisce la comunicazione al socio dopo la creazione di una proforma.
    const handleProformaComunicazione = async (created, paymentData) => {
        const societa = societaList.find(s => s.id == selectedSocietaId);
        const config = getComConfig(societa, 'proforma');
        if (config.stato === 'NON_ATTIVA') return;

        const socioId = created?.socio_id || selectedSocio?.id || null;
        // L'email può essere sul socio oppure sull'account utente collegato
        // (stessa precedenza della scheda socio): consideriamo entrambe.
        // selectedSocio proviene dalla ricerca e può NON contenere il campo email:
        // in tal caso recuperiamo il socio aggiornato dal backend (come fanno le
        // altre comunicazioni), così non segnaliamo erroneamente "email mancante".
        let email = selectedSocio?.email || selectedSocio?.user?.email || null;
        let nomeDestinatario = nomeSocio(selectedSocio) || created?.intestatario || '';
        if (socioId && !email) {
            try {
                const token = localStorage.getItem('token');
                const r = await fetch(`/users/api/soci/${socioId}`, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                });
                if (r.ok) {
                    const s = await r.json();
                    email = s.email || s.user?.email || null;
                    nomeDestinatario = nomeSocio(s) || nomeDestinatario;
                }
            } catch { /* ignore */ }
        }
        const modalita = paymentData?.modalita_pagamento || created?.modalita_pagamento;
        const contoDest = paymentData?.conto_destinazione || created?.conto_destinazione;

        const isBonifico = (modalita || '').toLowerCase() === 'bonifico';

        let conti = [];
        let linkRicevuta = '';
        if (isBonifico) {
            try {
                const token = localStorage.getItem('token');
                const r = await fetch(`/payments/api/conti?societa_id=${selectedSocietaId}`, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                });
                if (r.ok) conti = await r.json();
            } catch { /* ignore */ }

            // Genera un token (valido 3 giorni) per il caricamento della ricevuta — solo per bonifico.
            if (created?.id) {
                try {
                    const token = localStorage.getItem('token');
                    const tr = await fetch('/payments/api/ricevuta-tokens', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                        },
                        body: JSON.stringify({ payment_id: created.id }),
                    });
                    if (tr.ok) {
                        const { token: ricevutaToken } = await tr.json();
                        if (ricevutaToken) {
                            linkRicevuta = `${window.location.origin}/carica-ricevuta?token=${ricevutaToken}`;
                        }
                    }
                } catch { /* ignore */ }
            }
        }

        const istruzioni = buildIstruzioniPagamento(conti, contoDest, modalita);
        const testo = applyShortcodes(config.testo, {
            nome: nomeDestinatario,
            importo: formatImporto(created?.importo),
            numeroOrdine: created?.numero_ricevuta || `#${created?.id || ''}`,
            istruzioni,
            linkRicevuta,
        });
        const sendData = { socioId, oggetto: config.oggetto, testo };

        if (config.stato === 'AUTOMATICA') {
            if (!socioId || !email) {
                showSnackbar('Comunicazione non inviata: il socio non ha un indirizzo email', 'error');
                return;
            }
            const res = await sendComunicazioneEmail(sendData);
            if (res.ok) showSnackbar(res.warning || 'Comunicazione inviata al socio', res.warning ? 'error' : 'success');
            else showSnackbar(res.error || 'Errore invio comunicazione', 'error');
            return;
        }

        // CHIEDI
        await askInvioComunicazione({
            titolo: 'Comunicazione creazione ordine',
            destinatario: email,
            oggetto: config.oggetto,
            testoHtml: testo,
            sendData,
        });
    };

    // Gestisce la comunicazione al socio dopo la registrazione di un pagamento
    // ("Proforma registrata"). Allega la ricevuta in PDF.
    const handlePagamentoComunicazione = async (created) => {
        const societa = societaList.find(s => s.id == selectedSocietaId);
        const config = getComConfig(societa, 'pagamento');
        if (config.stato === 'NON_ATTIVA') return;

        const socioId = created?.socio_id || selectedSocio?.id || null;
        let email = selectedSocio?.email || selectedSocio?.user?.email || null;
        let nomeDestinatario = nomeSocio(selectedSocio) || created?.intestatario || '';
        if (socioId && !email) {
            try {
                const token = localStorage.getItem('token');
                const r = await fetch(`/users/api/soci/${socioId}`, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                });
                if (r.ok) {
                    const s = await r.json();
                    email = s.email || s.user?.email || null;
                    nomeDestinatario = nomeSocio(s) || nomeDestinatario;
                }
            } catch { /* ignore */ }
        }

        const testo = applyShortcodes(config.testo, {
            nome: nomeDestinatario,
            importo: formatImporto(created?.importo),
            numeroOrdine: created?.numero_ricevuta || `#${created?.id || ''}`,
            istruzioni: '',
        });

        // Genera la ricevuta PDF da allegare
        let allegati = [];
        try {
            const base64 = await generateRicevutaPdfBase64(created, { societa, products });
            if (base64) {
                // Il numero ricevuta può contenere "/" (es. 35/2025-26): non valido in un filename.
                const safeNumero = String(created?.numero_ricevuta || created?.id || 'pagamento').replace(/[\\/:*?"<>|]/g, '-');
                allegati = [{ filename: `Ricevuta_${safeNumero}.pdf`, content: base64 }];
            }
        } catch (e) {
            console.error('Errore generazione PDF ricevuta per allegato', e);
        }

        const sendData = { socioId, oggetto: config.oggetto, testo, allegati };

        if (config.stato === 'AUTOMATICA') {
            if (!socioId || !email) {
                showSnackbar('Comunicazione non inviata: il socio non ha un indirizzo email', 'error');
                return;
            }
            const res = await sendComunicazioneEmail(sendData);
            if (res.ok) showSnackbar(res.warning || 'Comunicazione inviata al socio', res.warning ? 'error' : 'success');
            else showSnackbar(res.error || 'Errore invio comunicazione', 'error');
            return;
        }

        // CHIEDI
        await askInvioComunicazione({
            titolo: 'Comunicazione pagamento registrato',
            destinatario: email,
            oggetto: config.oggetto,
            testoHtml: testo,
            allegatoNome: allegati[0]?.filename,
            sendData,
        });
    };

    const [recentPayments, setRecentPayments] = useState([]);
    const prevSocietaId = useRef(undefined);
    
    // Iscrizione / Tesseramento CF sets (stessa logica di Soci.jsx)
    const [quotaPaymentCFs, setQuotaPaymentCFs] = useState(new Set());
    const [tessCurrentCFs, setTessCurrentCFs] = useState(new Set());
    const [quotaPaymentSocioIds, setQuotaPaymentSocioIds] = useState(new Set());
    const [tessCurrentSocioIds, setTessCurrentSocioIds] = useState(new Set());

    // Products
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [productSearch, setProductSearch] = useState('');
    
    // Cart
    const [cart, setCart] = useState([]);

    useEffect(() => {
        const prev = prevSocietaId.current;
        prevSocietaId.current = selectedSocietaId;

        // Resetta il socio solo se la società è cambiata da un valore già presente
        // (non al mount iniziale o alla prima inizializzazione del context)
        if (prev !== undefined && prev !== selectedSocietaId) {
            setSelectedSocio(null);
            setCart([]);
            setProductSearch('');
            setRecentPayments([]);
            setIsRicercaModalOpen(false);
            setIsGeneraModalOpen(false);
            setSelectedPaymentDetail(null);
        }

        if (selectedSocietaId) {
            fetchProducts();
        } else {
            setProducts([]);
            setFilteredProducts([]);
        }
    }, [selectedSocietaId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Carica i set CF iscritti/tesserati per l'anno corrente (stessa logica di Soci.jsx)
    useEffect(() => {
        const fetchQuotaPayments = async () => {
            if (!selectedSocietaId || !selectedAnno) return;
            const societa = societaList.find(s => s.id == selectedSocietaId);
            const { start, end } = getAnnoDateRange(selectedAnno, societa);
            try {
                const response = await fetch(`/payments/api?societa_id=${selectedSocietaId}`);
                if (!response.ok) return;
                const data = await response.json();
                const quotaCFs = new Set(
                    data
                        .filter(p => p.quote_types && p.quote_types.split(',').map(t => t.trim()).includes('quota_associativa') && p.codice_fiscale)
                        .filter(p => { const d = new Date(p.data_pagamento); return d >= start && d <= end; })
                        .map(p => p.codice_fiscale.toUpperCase())
                );
                const tessCFs = new Set(
                    data
                        .filter(p => p.quote_types && p.quote_types.split(',').map(t => t.trim()).includes('tesseramento') && p.codice_fiscale)
                        .filter(p => { const d = new Date(p.data_pagamento); return d >= start && d <= end; })
                        .map(p => p.codice_fiscale.toUpperCase())
                );
                const quotaSocioIds = new Set(
                    data
                        .filter(p => p.quote_types && p.quote_types.split(',').map(t => t.trim()).includes('quota_associativa') && p.socio_id)
                        .filter(p => { const d = new Date(p.data_pagamento); return d >= start && d <= end; })
                        .map(p => p.socio_id)
                );
                const tessSocioIds = new Set(
                    data
                        .filter(p => p.quote_types && p.quote_types.split(',').map(t => t.trim()).includes('tesseramento') && p.socio_id)
                        .filter(p => { const d = new Date(p.data_pagamento); return d >= start && d <= end; })
                        .map(p => p.socio_id)
                );
                setQuotaPaymentCFs(quotaCFs);
                setTessCurrentCFs(tessCFs);
                setQuotaPaymentSocioIds(quotaSocioIds);
                setTessCurrentSocioIds(tessSocioIds);
            } catch (e) {
                console.error('Error fetching quota payments', e);
            }
        };
        fetchQuotaPayments();
    }, [selectedSocietaId, selectedAnno, societaList]); // eslint-disable-line react-hooks/exhaustive-deps

    // Carica i pagamenti recenti se il socio proviene dalla navigazione
    useEffect(() => {
        const socioFromState = location.state?.socio;
        if (!socioFromState || !selectedSocietaId) return;
        const fetchRecent = async () => {
            try {
                const url = socioFromState.id
                    ? `/payments/api?societa_id=${selectedSocietaId}&socio_id=${socioFromState.id}`
                    : `/payments/api?societa_id=${selectedSocietaId}&codice_fiscale=${encodeURIComponent(socioFromState.codice_fiscale || '')}`;
                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    setRecentPayments(data.slice(0, 3));
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchRecent();
    }, [selectedSocietaId]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchProducts = async () => {
        try {
            const response = await fetch(`/products/api?societaId=${selectedSocietaId}`);
            if (response.ok) {
                const data = await response.json();
                setProducts(data);
                setFilteredProducts(data);
                // Se arriviamo dallo scadenziario, pre-aggiungiamo il prodotto del tipo in scadenza
                if (prefilledQuoteType && cart.length === 0) {
                    const match = prefilledProductId
                        ? data.find(p => p.id === prefilledProductId) ?? data.find(p => p.type === prefilledQuoteType)
                        : data.find(p => p.type === prefilledQuoteType);
                    if (match) {
                        const initPrice = parseFloat(match.basePrice || 0).toFixed(2).replace('.', ',');
                        setCart([{ ...match, qty: 1, qtyStr: '1', unitPriceStr: initPrice }]);
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching products", error);
        }
    };

    useEffect(() => {
        if (productSearch) {
            setFilteredProducts(products.filter(p => (p.description || p.name || '').toLowerCase().includes(productSearch.toLowerCase())));
        } else {
            setFilteredProducts(products);
        }
    }, [productSearch, products]);

    const handleSocioSelect = async (socio) => {
        setSelectedSocio(socio);
        setIsRicercaModalOpen(false);
        try {
            const url = socio.id
                ? `/payments/api?societa_id=${selectedSocietaId}&socio_id=${socio.id}`
                : `/payments/api?societa_id=${selectedSocietaId}&codice_fiscale=${encodeURIComponent(socio.codice_fiscale || '')}`;
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setRecentPayments(data.slice(0, 3));
            }
        } catch(e) {
            console.error(e);
        }
    };

    const isSocioIscrittoOTesserato = (socio) => {
        if (!socio) return false;
        // SOCIO: iscritto nel libro soci
        if (socio.data_ammissione) return true;
        const cf = (socio.codice_fiscale || '').toUpperCase();
        // ISCRITTO: ha pagato quota_associativa nell'anno corrente (per CF o per socio_id)
        if (cf && quotaPaymentCFs.has(cf)) return true;
        if (socio.id && quotaPaymentSocioIds.has(socio.id)) return true;
        // TESSERATO: ha pagato tesseramento nell'anno corrente
        if (cf && tessCurrentCFs.has(cf)) return true;
        if (socio.id && tessCurrentSocioIds.has(socio.id)) return true;
        // Controllo iscrizioni embedded (se presenti nell'oggetto socio)
        if (socio.iscrizioni?.some(i => i.anno === selectedAnno)) return true;
        return false;
    };

    const cartHasIscrizione = () =>
        cart.some(item => item.type === 'quota_associativa' || item.type === 'tesseramento');

    const addToCart = (product) => {
        if (product.type === 'subscription' && !isSocioIscrittoOTesserato(selectedSocio) && !cartHasIscrizione()) {
            setShowAbbWarningModal(true);
            return;
        }
        if (cart.length >= 5) {
            showSnackbar('Max 5 prodotti nel carrello', 'error');
            return;
        }
        const existing = cart.find(item => item.id === product.id);
        if (existing) {
            setCart(cart.map(item => item.id === product.id ? {...item, qty: item.qty + 1} : item));
        } else {
            const initPrice = parseFloat(product.basePrice || 0).toFixed(2).replace('.', ',');
            setCart([...cart, { ...product, qty: 1, qtyStr: '1', unitPriceStr: initPrice }]);
        }
    };

    const updateCartQty = (productId, val) => {
        if (/^\d*$/.test(val)) {
            const qty = parseInt(val) || 1;
            setCart(cart.map(item => item.id === productId ? { ...item, qty, qtyStr: val } : item));
        }
    };

    const updateCartUnitPrice = (productId, val) => {
        if (/^\d*[,]?\d*$/.test(val)) {
            setCart(cart.map(item => item.id === productId ? { ...item, unitPriceStr: val } : item));
        }
    };

    const removeFromCart = (productId) => {
        const removed = cart.find(item => item.id === productId);
        const isRemovedIscrizione = removed && (removed.type === 'quota_associativa' || removed.type === 'tesseramento');
        const newCart = cart.filter(item => item.id !== productId);
        if (isRemovedIscrizione && !isSocioIscrittoOTesserato(selectedSocio)) {
            const stillHasIscrizione = newCart.some(item => item.type === 'quota_associativa' || item.type === 'tesseramento');
            if (!stillHasIscrizione) {
                setCart(newCart.filter(item => item.type !== 'subscription'));
                return;
            }
        }
        setCart(newCart);
    };

    const generatePayment = () => {
        if (cart.length === 0) {
            showSnackbar('Aggiungi almeno un prodotto al carrello.', 'error');
            return;
        }
        const subscriptionItem = cart.find(item => item.type === 'subscription');
        if (subscriptionItem) {
            setSubscriptionDuration(subscriptionItem.duration || '');
            setSubscriptionDates(null);
            setIsAbbonamentoDateModalOpen(true);
        } else {
            setIsGeneraModalOpen(true);
        }
    };

    const handleAbbonamentoConfirm = (dates) => {
        setSubscriptionDates(dates);
        setIsAbbonamentoDateModalOpen(false);
        setIsGeneraModalOpen(true);
    };

    const handleConfirmPayment = async (paymentData) => {
        try {
            const body = {
                ...paymentData,
                societa_id: selectedSocietaId
            };
            setLastPaymentType(paymentData.tipo_documento || 'pagamento');
            const response = await fetch('/payments/api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            
            if (response.ok) {
                setIsGeneraModalOpen(false);

                let created = null;
                try { created = await response.json(); } catch { /* ignore */ }

                // Comunicazione al socio in base al tipo di documento:
                //  - proforma  → "Creazione proforma"
                //  - pagamento → "Proforma registrata"
                // In entrambi i casi si rispetta lo stato NON_ATTIVA / CHIEDI / AUTOMATICA.
                try {
                    if (paymentData.tipo_documento === 'proforma') {
                        await handleProformaComunicazione(created, paymentData);
                    } else {
                        await handlePagamentoComunicazione(created);
                    }
                } catch (e) {
                    console.error('Errore gestione comunicazione', e);
                }

                // Se ci sono abbonamenti nel carrello, cerca corsi associati
                const subscriptionItems = cart.filter(item => item.type === 'subscription');
                if (subscriptionItems.length > 0 && selectedSocio?.id) {
                    try {
                        const corsiRes = await fetch(`/activities/api/corsi?societaId=${selectedSocietaId}`);
                        if (corsiRes.ok) {
                            const allCorsi = await corsiRes.json();
                            const abbonamentoIds = new Set(subscriptionItems.map(i => i.id));
                            const matching = allCorsi.filter(c => abbonamentoIds.has(c.abbonamentoId));
                            if (matching.length > 0) {
                                setCorsiPerAbbonamento(matching);
                                setIsCorsoIscrizioneModalOpen(true);
                                return;
                            }
                        }
                    } catch (e) {
                        console.error('Errore fetch corsi per abbonamento', e);
                    }
                }

                setShowSuccessOverlay(true);
                setTimeout(() => navigate('/ordini', { replace: true }), 1200);
            } else {
                showSnackbar('Errore durante la generazione del pagamento', 'error');
            }
        } catch (e) {
            console.error("Errore salvataggio pagamento", e);
            showSnackbar('Errore durante la generazione del pagamento', 'error');
        }
    };

    const handleCorsoModalClose = () => {
        setIsCorsoIscrizioneModalOpen(false);
        setShowSuccessOverlay(true);
        setTimeout(() => navigate('/ordini', { replace: true }), 1200);
    };

    const getItemUnitPrice = (item) => parseFloat((item.unitPriceStr || '0').replace(',', '.')) || 0;
    const cartTotal = cart.reduce((acc, item) => acc + (getItemUnitPrice(item) * (item.qty || 1)), 0);

    return (
        <div className="np-container">
            {showSuccessOverlay && (
                <div style={{
                    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
                    zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    pointerEvents: 'all'
                }}>
                    <div style={{
                        backgroundColor: '#fff', borderRadius: '12px', padding: '40px 50px',
                        textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
                        minWidth: '320px'
                    }}>
                        <div style={{
                            width: '60px', height: '60px', borderRadius: '50%',
                            backgroundColor: 'var(--success-container)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Check size={32} strokeWidth={2.5} color="var(--success)" />
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{lastPaymentType === 'proforma' ? 'Proforma creata' : 'Ordine registrato'}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Reindirizzamento in corso...</div>
                    </div>
                </div>
            )}
            <RicercaSocioModal 
                isOpen={isRicercaModalOpen} 
                onClose={() => setIsRicercaModalOpen(false)} 
                onSelect={handleSocioSelect}
                societaId={selectedSocietaId}
            />

            {/* MODAL AVVISO ABBONAMENTO NON ISCRITTO */}
            {showAbbWarningModal && (
                <div style={{
                    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
                    zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{
                        backgroundColor: '#fff', borderRadius: '12px', padding: '32px 36px',
                        maxWidth: '440px', width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                        display: 'flex', flexDirection: 'column', gap: '16px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                                backgroundColor: 'var(--warning-container)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <AlertTriangle size={24} color="var(--warning)" strokeWidth={2}/>
                            </div>
                            <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                Abbonamento non consentito
                            </div>
                        </div>
                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                            Solo i soci <strong>iscritti</strong> o <strong>tesserati</strong> possono avere un abbonamento attivo.
                            <br/><br/>
                            Il socio selezionato non risulta iscritto né tesserato per l'anno corrente. Verifica la sua posizione nella scheda socio prima di procedere.
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="np-btn np-btn-yellow" onClick={() => setShowAbbWarningModal(false)}>
                                <Check size={16}/> Ho capito
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <AbbonamentoDateModal
                isOpen={isAbbonamentoDateModalOpen}
                onClose={() => setIsAbbonamentoDateModalOpen(false)}
                onConfirm={handleAbbonamentoConfirm}
                duration={subscriptionDuration}
            />

            <GeneraOrdineModal
                isOpen={isGeneraModalOpen}
                onClose={() => setIsGeneraModalOpen(false)}
                onConfirm={handleConfirmPayment}
                totale={cartTotal}
                socio={selectedSocio}
                cart={cart}
                subscriptionDates={subscriptionDates}
            />

            <DettaglioOrdineModal
                isOpen={selectedPaymentDetail !== null}
                onClose={() => setSelectedPaymentDetail(null)}
                ordine={selectedPaymentDetail}
                societa={societaList?.find(s => s.id == selectedSocietaId)}
                products={products}
            />

            <IscrizioneCorsoDopoModal
                isOpen={isCorsoIscrizioneModalOpen}
                onClose={handleCorsoModalClose}
                corsi={corsiPerAbbonamento}
                socio={selectedSocio}
                societaId={selectedSocietaId}
            />

            <ChiediInvioComunicazioneModal
                isOpen={chiediModal !== null}
                titolo={chiediModal?.titolo}
                destinatario={chiediModal?.destinatario}
                oggetto={chiediModal?.oggetto}
                testoHtml={chiediModal?.testoHtml}
                allegatoNome={chiediModal?.allegatoNome}
                sending={chiediModal?.sending}
                onConfirm={handleChiediConfirm}
                onClose={handleChiediClose}
            />

            <div className="np-grid">
                
                {/* LEFT COLUMN */}
                <div className="np-col-left">
                    
                    {/* INTESTATARIO BLOCK */}
                    <div className="np-card">
                        <div className="np-card-header np-header-default">
                            Intestatario ordine
                        </div>
                        <div className="np-card-body">
                            {!selectedSocio ? (
                                <>
                                    <div className="np-alert-red">
                                        <AlertTriangle size={18} strokeWidth={1.5}/>
                                        Seleziona un socio, oppure imposta l'intestatario (non censito) dopo aver fatto click su 'Registra Pagamento'
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                                        <button className="np-btn np-btn-yellow" onClick={() => setIsRicercaModalOpen(true)}>
                                            <FileEdit size={16} strokeWidth={1.5}/> Seleziona intestatario
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <h3 style={{ margin: '0 0 10px 0', fontSize: '20px' }}>{selectedSocio.cognome} {selectedSocio.nome}</h3>
                                            <div style={{ fontSize: '13px', color: '#555', marginBottom: '12px' }}>
                                                Data nascita {selectedSocio.data_nascita ? new Date(selectedSocio.data_nascita).toLocaleDateString('it-IT') : ''} - Codice fiscale {selectedSocio.codice_fiscale}
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <span className="np-badge np-badge-danger">
                                                    {getCertStatus(selectedSocio.scadenza_certificato)}
                                                </span>
                                                {selectedSocio.scadenza_certificato && (
                                                    <span className="np-badge np-badge-danger">
                                                        CERTIFICATO MEDICO {getCertStatus(selectedSocio.scadenza_certificato)} ({new Date(selectedSocio.scadenza_certificato).toLocaleDateString('it-IT')})
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ color: 'var(--primary)' }}>
                                            <User size={64} strokeWidth={1.2}/>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                        <button className="np-btn np-btn-green" onClick={() => window.open(`/soci?apriSocioPath=${selectedSocio.id}`, '_blank')}>
                                            <User size={16} strokeWidth={1.5}/> Scheda
                                        </button>
                                        <button className="np-btn np-btn-yellow" onClick={() => setIsRicercaModalOpen(true)}>
                                            <FileEdit size={16} strokeWidth={1.5}/> Modifica intestatario
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* PRODOTTI DISPONIBILI */}
                    <div className="np-card">
                        <div className="np-card-header np-header-yellow">
                            <List size={18} strokeWidth={2}/> 
                            Prodotti disponibili 
                            <span style={{ fontSize: '12px', fontWeight: 400, opacity: 0.9, marginLeft: '6px' }}>
                                - In evidenza i prodotti pagati in passato dal socio
                            </span>
                        </div>
                        <div className="np-card-body">
                            {!selectedSocio ? (
                                <div className="np-alert-red">
                                    <AlertTriangle size={18} strokeWidth={1.5}/>
                                    Seleziona prima un intestatario per visualizzare i prodotti disponibili
                                </div>
                            ) : (
                            <>
                            <div className="np-search-group">
                                <input 
                                    type="text" 
                                    placeholder="Prodotto" 
                                    className="np-input" 
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                />
                                <button className="np-btn-search">
                                    <Search size={18} strokeWidth={1.5}/>
                                </button>
                            </div>
                            
                            <table className="np-table np-table-selectable">
                                <tbody>
                                    {filteredProducts.map((p, idx) => (
                                        <tr key={idx} onClick={() => addToCart(p)}>
                                            <td style={{ fontSize: '15px' }}>{p.description || p.name}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <span className="np-badge-price">
                                                    {parseFloat(p.basePrice || 0).toFixed(2).replace('.', ',')}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            
                            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div className="np-pagination">
                                    <button className="np-page-btn">&lt;&lt;</button>
                                    <button className="np-page-btn">&lt;</button>
                                    <button className="np-page-btn active">1</button>
                                    <button className="np-page-btn">&gt;</button>
                                    <button className="np-page-btn">&gt;&gt;</button>
                                </div>
                                <span style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600 }}>Tot righe: {filteredProducts.length}</span>
                            </div>
                            </>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="np-col-right">
                    
                    {/* ULTIMI 3 PAGAMENTI */}
                    <div className="np-card">
                        <div className="np-card-header np-header-default">
                            Ultimi 3 ordini
                        </div>
                        <div className="np-card-body">
                            {!selectedSocio || recentPayments.length === 0 ? (
                                <div className="np-alert-red" style={{ padding: '30px 0' }}>
                                    <AlertTriangle size={18} strokeWidth={1.5}/>
                                    Non sono presenti ordini per il socio selezionato
                                </div>
                            ) : (
                                <div>
                                    {recentPayments.map((p, i) => (
                                        <div key={i} className="np-recent-payment-item">
                                            {p.numero_ricevuta ? (
                                                <span style={{ fontWeight: 600 }}>{p.numero_ricevuta}</span>
                                            ) : (
                                                <span style={{ fontWeight: 100, color: '#888' }}>NO RIC</span>
                                            )}
                                            <span style={{ color: '#666' }}>{new Date(p.data_pagamento).toLocaleDateString('it-IT')}</span>
                                            <span style={{ fontWeight: 600 }}>€ {parseFloat(p.importo).toFixed(2).replace('.', ',')}</span>
                                            <button 
                                                className="np-btn np-btn-outline-yellow"
                                                onClick={() => setSelectedPaymentDetail(p)}
                                            >
                                                <Folder size={16} strokeWidth={1.5}/> Dettagli
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* CARRELLO */}
                    <div className="np-card">
                        <div className="np-card-header np-header-green">
                            <CreditCard size={18} strokeWidth={2}/> Carrello prodotti (max. 5)
                            

                        </div>
                        <div className="np-card-body">
                            <div style={{ border: '1px solid var(--surface-1)', borderRadius: '4px', marginBottom: '20px', overflow: 'hidden' }}>
                                <table className="np-table np-table-green">
                                    <thead style={{ backgroundColor: 'var(--surface-1)' }}>
                                        <tr>
                                            <th>Prodotto</th>
                                            <th>Importo unitario</th>
                                            <th>Qtà</th>
                                            <th>Subtotale</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cart.length === 0 ? (
                                            <tr>
                                                <td colSpan="4">
                                                    <div className="np-cart-empty">
                                                        Carrello vuoto
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            cart.map((item, i) => (
                                                <tr key={i}>
                                                    <td style={{ fontWeight: 500, fontSize: '14px', color: '#333', borderRight: '1px solid var(--surface-1)' }}>
                                                        {item.description || item.name} 
                                                        <button onClick={() => removeFromCart(item.id)} style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer', float: 'right' }}>
                                                            <X size={16}/>
                                                        </button>
                                                    </td>
                                                    <td style={{ borderRight: '1px solid var(--surface-1)', padding: '8px 12px' }}>
                                                        <input
                                                            type="text"
                                                            inputMode="decimal"
                                                            value={item.unitPriceStr ?? parseFloat(item.basePrice || 0).toFixed(2).replace('.', ',')}
                                                            onChange={e => updateCartUnitPrice(item.id, e.target.value)}
                                                            className="np-cart-input"
                                                        />
                                                    </td>
                                                    <td style={{ borderRight: '1px solid var(--surface-1)', padding: '8px 12px' }}>
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            value={item.qtyStr ?? item.qty}
                                                            onChange={e => updateCartQty(item.id, e.target.value)}
                                                            className="np-cart-input"
                                                        />
                                                    </td>
                                                    <td style={{ fontWeight: 600 }}>{(getItemUnitPrice(item) * (item.qty || 1)).toFixed(2).replace('.', ',')}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button className="np-btn np-btn-red" onClick={() => setCart([])}>
                                    <X size={16} strokeWidth={2}/> Annulla
                                </button>
                                <button className={`np-btn ${cart.length > 0 ? 'np-btn-green' : 'np-btn-light-green'}`} onClick={generatePayment} disabled={cart.length === 0}>
                                    <Check size={16} strokeWidth={2}/> Procedi
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {snackbar.show && (
                <div className={`np-snackbar np-snackbar-${snackbar.type}`}>
                    {snackbar.type === 'success'
                        ? <Check size={18} strokeWidth={2.5} />
                        : <X size={18} strokeWidth={2.5} />}
                    {snackbar.message}
                </div>
            )}
        </div>
    );
};

export default NuovoOrdine;
