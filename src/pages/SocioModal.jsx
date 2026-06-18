import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, User, Users, Tag, CreditCard, Calendar, Activity, Monitor, Mail, Coins, Check, AlertTriangle, MessageSquare, Folder, Printer, Banknote, Landmark, DollarSign, Trash2, RefreshCw, Eye, EyeOff, BookOpen, PlusCircle, ChevronRight, Globe, Copy, KeyRound, ShieldCheck, ShieldOff, ClipboardList, Download, Paperclip } from 'lucide-react';
import { useConfirm } from '../components/ConfirmModal';
import { useAlert } from '../components/AlertModal';
import DettaglioOrdineModal from './DettaglioOrdineModal';
import { getStatoOrdine, getStatoOrdineBadgeStyle } from '../utils/ordineUtils';
import CodiceFiscale from 'codice-fiscale-js';
import CityAutocomplete from '../components/CityAutocomplete';
import ComunicazioneModal from '../components/ComunicazioneModal';
import { useSocieta } from '../data/SocietaContext';
import { useAnno, getAnnoDateRange } from '../data/AnnoContext';
import { computeScadenzaCertificatoStr } from '../utils/certificatoUtils';
import './SocioModal.css';
import './NuovoPagamento.css';

// ---------------------------------------------------------------------------
// Scadenziario utils (rispecchia Scadenziario.jsx)
// ---------------------------------------------------------------------------
function computeScadenzaForPayment(p, societa) {
    if (!p.data_pagamento) return null;
    const type = (p.quote_types || '').trim().toLowerCase();

    if (type === 'tesseramento') {
        const periodicity = p.periodicity_tesseramento;
        if (!periodicity) return null;
        const d = new Date(p.data_pagamento);
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
    }

    if (type === 'subscription' && p.data_scadenza_abbonamento) {
        return new Date(p.data_scadenza_abbonamento);
    }

    return null;
}

function computeStatoPagamentoScadenza(scadenzaDate) {
    if (!scadenzaDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const limit = new Date(today);
    limit.setDate(limit.getDate() + 30);
    if (scadenzaDate < today) return 'SCADUTO';
    if (scadenzaDate <= limit) return 'IN SCADENZA';
    return 'VALIDO';
}

function computeStatoAbbonamento(scadenzaDate, giorniAvvisoScadenza) {
    if (!scadenzaDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const limit = new Date(today);
    limit.setDate(limit.getDate() + (giorniAvvisoScadenza || 30));
    if (scadenzaDate < today) return 'SCADUTO';
    if (scadenzaDate <= limit) return 'IN SCADENZA';
    return 'REGOLARE';
}
// ---------------------------------------------------------------------------

const GIORNI_SETTIMANA = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

const formatDateIT = (dateStr) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('it-IT');
};

const ScadenzaBadge = ({ stato }) => {
    if (!stato) return null;
    const styles = {
        SCADUTO: { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
        'IN SCADENZA': { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
        VALIDO: { bg: '#dcfce7', color: '#166534', border: '#86efac' },
        REGOLARE: { bg: '#dcfce7', color: '#166534', border: '#86efac' },
    };
    const s = styles[stato] || styles.VALIDO;
    return (
        <span style={{
            padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700,
            backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}`,
            whiteSpace: 'nowrap',
        }}>
            {stato}
        </span>
    );
};
// ---------------------------------------------------------------------------

const SocioModal = ({ onClose, onSave, socioData }) => {
    const { societaList, selectedSocietaId } = useSocieta();
    const { selectedAnno } = useAnno();
    const navigate = useNavigate();
    const confirm = useConfirm();
    const showAlert = useAlert();
    // Determine if we are editing an existing scio or creating a new one
    const isEditMode = !!socioData;
    
    // Initial State - populate if editing
    const initialState = {
        // Tipo socio
        tipo_socio: 'persona_fisica',

        // Anagrafica Base (persona fisica)
        id: '',
        cognome: '',
        nome: '',
        sesso: '',
        data_nascita: '',
        
        // Row 2
        luogo_nascita: '',
        codice_fiscale: '',
        email: '',
        telefono: '',
        
        // Indirizzo
        indirizzo: '',
        indirizzo_2: '',
        comune: '',
        cap: '',

        // Genitore / Contatti Extra
        cf_genitore: '',
        cognome_genitore: '',
        nome_genitore: '',
        recapito_2: '',
        recapito_3: '',

        // Dati Societari
        scadenza_certificato: '',
        data_ammissione: '', // Nuovo campo data iscrizione socio
        livello: 'ND',
        valutazione: 'N.D.',
        tessera_societa: '',
        tessera_federazione: '',
        tessera_eps: '',
        
        // Altro
        note: '',
        
        // Bottom Fields
        data_scadenza_tesseramento: '',
        id_badge: '',
        
        // Backend Default
        is_active: true,

        // Campi associazione
        ragione_sociale: '',
        partita_iva: '',
        codice_sdi: '',
        pec: '',
        tipo_associazione: '',
        cognome_rappresentante: '',
        nome_rappresentante: '',

        // Campi extra associazione
        anno_associativo: '',
        codice_affiliazione: '',
        scadenza_affiliazione: '',
        costo_affiliazione: '',
        costo_tessera_base: '',
        costo_tessera_associativa: '',
        costo_tessera_completa: '',
        durata_consiglio_direttivo: '',
        scadenza_consiglio_direttivo: '',
        etichette: '',
        runts: false,
        somministrazione: false,
        sito_web: '',
    };

    const [formData, setFormData] = useState(initialState);
    const [activeTab, setActiveTab] = useState('Anagrafica');
    const [warningMessage, setWarningMessage] = useState(null);
    const [highlightCF, setHighlightCF] = useState(false);
    const [emailError, setEmailError] = useState(null);
    const [genitoreErrors, setGenitoreErrors] = useState({});
    const [snackbar, setSnackbar] = useState({ show: false, message: '', type: 'success' });

    const showSnackbar = (message, type = 'success') => {
        setSnackbar({ show: true, message, type });
        setTimeout(() => setSnackbar(s => ({ ...s, show: false })), 3500);
    };
    const [haCertificato, setHaCertificato] = useState(false);
    const [showComunicazioneModal, setShowComunicazioneModal] = useState(false);
    const [comunicazioni, setComunicazioni] = useState([]);

    // Pagamenti State
    const [socioPagamenti, setSocioPagamenti] = useState([]);
    const [pagamentiLoading, setPagamentiLoading] = useState(false);
    const [selectedPaymentDetail, setSelectedPaymentDetail] = useState(null);
    // Filtri tab Pagamenti
    const [pagFiltroDescrizione, setPagFiltroDescrizione] = useState('');
    const [pagFiltroAnno, setPagFiltroAnno] = useState('TUTTI');
    const [pagFiltroRicevuta, setPagFiltroRicevuta] = useState('');
    
    // Iscrizione State
    const [showIscrizioneModal, setShowIscrizioneModal] = useState(false);
    const [iscrizioneDate, setIscrizioneDate] = useState(new Date().toISOString().split('T')[0]);
    const [iscrizioneStatus, setIscrizioneStatus] = useState(null); // 'ISCRITTO' | 'NON ISCRITTO'
    const [currentIscrizioneDate, setCurrentIscrizioneDate] = useState(''); // Date string for display
    const [socioIscrizioniDates, setSocioIscrizioniDates] = useState([]); // all data_iscrizione from iscrizione table
    const [currentRefYear, setCurrentRefYear] = useState(null);

    // Data Tesseramento calcolata dai pagamenti dell'anno selezionato
    const [dataTesseramento, setDataTesseramento] = useState('');

    // Accetta come Socio State
    const [showAccettaSocioModal, setShowAccettaSocioModal] = useState(false);
    const [accettaSocioDate, setAccettaSocioDate] = useState(new Date().toISOString().split('T')[0]);

    // Print State
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [printDate, setPrintDate] = useState(new Date().toISOString().split('T')[0]);
    const [targetModuleName, setTargetModuleName] = useState(null);
    const [isCustomPrint, setIsCustomPrint] = useState(false);
    const [availableModules, setAvailableModules] = useState([]);

    // Attività (Corsi) State
    const [socioCorsi, setSocioCorsi] = useState([]);
    const [corsiLoading, setCorsiLoading] = useState(false);
    const [corsoDettaglio, setCorsoDettaglio] = useState(null);
    const [showAggiungiCorsoModal, setShowAggiungiCorsoModal] = useState(false);
    const [tuttiCorsi, setTuttiCorsi] = useState([]);
    const [prodottiSocieta, setProdottiSocieta] = useState([]);
    const [aggiungiCorsoLoading, setAggiungiCorsoLoading] = useState(false);

    // Contatti Associazione State
    const [contatti, setContatti] = useState([]);
    const [contattiLoading, setContattiLoading] = useState(false);
    const [showAddContattoForm, setShowAddContattoForm] = useState(false);
    const [newContatto, setNewContatto] = useState({ nome: '', posizione_lavorativa: '', telefono: '', dispositivo_mobile: '', email: '' });
    const [editingContatto, setEditingContatto] = useState(null);

    // Accesso Frontend State
    const [frontendAccess, setFrontendAccess] = useState({
        enabled: false,
        email: '',
        password_plain: '',
        user_id: null,
    });
    const [frontendAccessLoading, setFrontendAccessLoading] = useState(false);
    const [showFrontendPassword, setShowFrontendPassword] = useState(false);

    // Storico State
    const [storico, setStorico] = useState([]);
    const [storicoLoading, setStoricoLoading] = useState(false);
    const [showNotaForm, setShowNotaForm] = useState(false);
    const [notaTesto, setNotaTesto] = useState('');
    const [notaFile, setNotaFile] = useState(null);
    const [notaLoading, setNotaLoading] = useState(false);

    // Load html2pdf
    useEffect(() => {
        const script = document.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
        script.async = true;
        document.body.appendChild(script);
        return () => {
             if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        }
    }, []);

    const handlePrintRequest = async (moduleName) => {
        setPrintDate(new Date().toISOString().split('T')[0]);
        
        if (moduleName === 'altri_moduli') {
            setIsCustomPrint(true);
            setTargetModuleName('');
            try {
                const response = await fetch('/documents/api/moduli');
                if (response.ok) {
                    const data = await response.json();
                    setAvailableModules(data);
                    if (data.length > 0) {
                        setTargetModuleName(data[0].descrizione);
                    }
                }
            } catch (e) {
                console.error(e);
                showAlert("Errore nel caricamento dei moduli", 'Errore');
                return;
            }
        } else {
            setIsCustomPrint(false);
            setTargetModuleName(moduleName);
        }
        setShowPrintModal(true);
    };

    const executePrint = async () => {
        if (!targetModuleName) {
            showAlert("Seleziona un modulo", 'Campo mancante', 'warning');
            return;
        }

        try {
            let modulo = null;

            if (isCustomPrint && availableModules.length > 0) {
                 modulo = availableModules.find(m => m.descrizione === targetModuleName);
            }

            if (!modulo) {
                // Fetch all modules to find the right one (fallback for standard actions)
                const response = await fetch('/documents/api/moduli');
                if (!response.ok) throw new Error('Failed to fetch modules');
                const moduli = await response.json();
                
                // Loose match by description (case insensitive)
                modulo = moduli.find(m => m.descrizione.toLowerCase() === targetModuleName.toLowerCase().replace(/_/g, ' '));
            }
            
            if (!modulo) {
                showAlert(`Modulo "${targetModuleName.replace(/_/g, ' ')}" non trovato nella sezione Modulistica.`, 'Modulo non trovato', 'warning');
                return;
            }

            // Prepare Data
            let societa = null;
            if (selectedSocietaId && societaList) {
                societa = societaList.find(s => s.id == selectedSocietaId);
            }
            
            let logoUrl = '';
            if (societa && societa.logo_path) {
                if (societa.logo_path.startsWith('http') || societa.logo_path.startsWith('blob:') || societa.logo_path.startsWith('data:')) {
                    logoUrl = societa.logo_path;
                } else {
                    logoUrl = `/users/${societa.logo_path.startsWith('/') ? societa.logo_path.slice(1) : societa.logo_path}`;
                }
            }
            
            const denomination = societa ? societa.denominazione : 'Nome Società';
            const address = societa ? `${societa.indirizzo || ''} ${societa.cap || ''} ${societa.comune || ''} ${societa.provincia ? '('+societa.provincia+')' : ''}` : '';
            const cfInfo = societa ? `CF: ${societa.codice_fiscale || ''} ${societa.partita_iva ? ' - P.IVA: ' + societa.partita_iva : ''}` : '';
            const today = new Date(printDate).toLocaleDateString('it-IT');

            // Helper to convert image to base64
            const getBase64Image = (url) => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = 'Anonymous';
                    img.src = url;
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        resolve(canvas.toDataURL('image/png'));
                    };
                    img.onerror = reject;
                });
            };

            const generatePDF = (logoBase64 = null) => {
                const element = document.createElement('div');
                element.style.width = '100%'; 
                element.style.maxWidth = '800px';
                
                // Format birth date for display
                let birthDateDisplay = '';
                if (formData.data_nascita) {
                    const d = new Date(formData.data_nascita);
                    if (!isNaN(d.getTime())) {
                        birthDateDisplay = d.toLocaleDateString('it-IT');
                    } else {
                        birthDateDisplay = formData.data_nascita;
                    }
                }

                element.innerHTML = `
                <div style="padding: 20px; font-family: 'Helvetica', 'Arial', sans-serif; color: #000; background: white;">
                    
                    <!-- HEADER -->
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; margin-bottom: 20px; padding-bottom: 15px;">
                        <div style="flex: 0 0 150px; height: 100px; display: flex; align-items: center; justify-content: flex-start;">
                            ${logoBase64 ? `<img src="${logoBase64}" style="max-height: 100px; max-width: 150px; object-fit: contain;" />` : ''}
                        </div>
                        <div style="flex: 1; text-align: right; padding-left: 20px;">
                            <h3 style="margin: 0; font-size: 16pt; font-weight: bold; line-height: 1.2;">${denomination}</h3>
                            <div style="font-size: 10pt; margin-top: 5px; line-height: 1.3;">${address}</div>
                            <div style="font-size: 10pt; margin-top: 2px;">${cfInfo}</div>
                        </div>
                    </div>

                    <!-- TITLE -->
                    <h1 style="text-align: center; font-size: 20pt; font-weight: bold; margin: 0 0 30px 0; text-transform: uppercase;">${modulo.descrizione}</h1>

                    <!-- MEMBER TABLE -->
                    <style>
                        .pdf-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 10pt; }
                        .pdf-table td { border: 1px solid #000; padding: 8px; vertical-align: top; }
                        .pdf-label { font-size: 8pt; text-transform: uppercase; color: #000; margin-bottom: 4px; font-weight: bold; }
                        .pdf-value { min-height: 18px; font-weight: 500; }
                    </style>
                    <table class="pdf-table">
                        <tr>
                            <td style="width: 25%;">
                                <div class="pdf-label">COGNOME</div>
                                <div class="pdf-value">${formData.cognome || ''}</div>
                            </td>
                            <td style="width: 25%;">
                                <div class="pdf-label">NOME</div>
                                <div class="pdf-value">${formData.nome || ''}</div>
                            </td>
                            <td style="width: 25%;">
                                <div class="pdf-label">DATA DI NASCITA</div>
                                <div class="pdf-value">${birthDateDisplay}</div>
                            </td>
                            <td style="width: 25%;">
                                <div class="pdf-label">LUOGO DI NASCITA</div>
                                <div class="pdf-value">${formData.luogo_nascita || ''}</div>
                            </td>
                        </tr>
                        <tr>
                             <td colspan="2">
                                <div class="pdf-label">CODICE FISCALE</div>
                                <div class="pdf-value">${formData.codice_fiscale || ''}</div>
                            </td>
                             <td>
                                <div class="pdf-label">TELEFONO</div>
                                <div class="pdf-value">${formData.telefono || ''}</div>
                            </td>
                            <td>
                                <div class="pdf-label">EMAIL</div>
                                <div class="pdf-value">${formData.email || ''}</div>
                            </td>
                        </tr>
                        <tr>
                            <td colspan="4">
                                <div class="pdf-label">INDIRIZZO RESIDENZA</div>
                                <div class="pdf-value">${formData.indirizzo || ''} ${formData.cap || ''} ${formData.comune || ''}</div>
                            </td>
                        </tr>
                    </table>

                    <!-- BODY CONTENT -->
                    <div style="font-size: 11pt; line-height: 1.6; text-align: justify; margin-bottom: 60px;">
                        ${modulo.htmlContent || modulo.testo || ''}
                    </div>

                    <!-- SIGNATURES -->
                    <table style="width: 100%; margin-top: 50px; border: none;">
                        <tr>
                            <td style="width: 40%; vertical-align: bottom; font-size: 12pt;">
                                ${today}
                            </td>
                            <td style="width: 20%;"></td>
                            <td style="width: 40%; text-align: center; vertical-align: bottom;">
                                <div style="font-size: 12pt; margin-bottom: 40px; text-align: left;">Firma</div>
                                <div style="border-bottom: 1px solid #000; height: 1px;"></div>
                            </td>
                        </tr>
                    </table>
                </div>
                `;

                const opt = {
                    margin: 0.5,
                    filename: `${modulo.descrizione.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${formData.cognome}_${formData.nome}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true },
                    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
                    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
                };

                if (window.html2pdf) {
                    setTimeout(() => {
                        window.html2pdf().set(opt).from(element).save();
                        setShowPrintModal(false);
                    }, 500);
                } else {
                    showAlert("La libreria PDF sta caricando, riprova tra un secondo.", 'Attenzione', 'warning');
                }
            };

            if (logoUrl) {
                getBase64Image(logoUrl)
                    .then(base64 => generatePDF(base64))
                    .catch(e => {
                        console.error("Logo error", e);
                        generatePDF();
                    });
            } else {
                generatePDF();
            }

        } catch (e) {
            console.error("Print Error:", e);
            showAlert("Errore durante la generazione del modulo", 'Errore');
        }
    };

    // Calculate Fiscal Year
    useEffect(() => {
        if (selectedSocietaId && societaList) {
            const societa = societaList.find(s => s.id == selectedSocietaId);
            if (societa) {
                const now = new Date();
                const year = now.getFullYear();
                const month = now.getMonth() + 1;
                const day = now.getDate();
                
                let calculatedYear = year;
                if (societa.tipo_anno_associativo === 'associativo') {
                    if (month < 9) calculatedYear = year - 1;
                } else if (societa.tipo_anno_associativo === 'personalizzato' && societa.data_inizio_anno_associativo) {
                    const parts = societa.data_inizio_anno_associativo.split('-');
                    if (parts.length === 2) {
                        const cDay = parseInt(parts[0], 10);
                        const cMonth = parseInt(parts[1], 10);
                        if (month < cMonth || (month === cMonth && day < cDay)) {
                            calculatedYear = year - 1;
                        }
                    }
                }
                setCurrentRefYear(calculatedYear);
            }
        }
    }, [selectedSocietaId, societaList]);

    // Fetch Subscription Status & Data Iscrizione
    useEffect(() => {
        if (!formData.id || !selectedAnno) return;

        const selectedSocieta = societaList?.find(s => s.id == selectedSocietaId);
        const { start, end } = getAnnoDateRange(selectedAnno, selectedSocieta);

        // Stato iscrizione per l'anno selezionato (non cambia)
        const pagamentoIscrizioneAnno = socioPagamenti.find(p => {
            const quotes = (p.quote || '').toLowerCase();
            if (!quotes.includes('iscrizione')) return false;
            const dataPag = p.data_pagamento ? new Date(p.data_pagamento) : null;
            return dataPag && dataPag >= start && dataPag <= end;
        });

        // Ultima data pagamento quota associativa/iscrizione su tutti gli anni
        const pagamentiIscrizione = socioPagamenti.filter(p => {
            const types = (p.quote_types || '').toLowerCase();
            const quotes = (p.quote || '').toLowerCase();
            return types.includes('quota_associativa') || quotes.includes('iscrizione');
        });
        const datesPagamenti = pagamentiIscrizione.map(p => p.data_pagamento).filter(Boolean).sort();
        const latestPaymentDate = datesPagamenti.length ? datesPagamenti[datesPagamenti.length - 1] : null;

        if (pagamentoIscrizioneAnno) {
            setIscrizioneStatus('ISCRITTO');
        }

        // Recupera iscrizioni senza ricevuta per stato anno e data_iscrizione
        fetch(`/users/api/soci/${formData.id}/iscrizione`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const active = data.find(i => i.anno === selectedAnno);
                    if (!pagamentoIscrizioneAnno) {
                        setIscrizioneStatus(active ? 'ISCRITTO' : 'NON ISCRITTO');
                    }

                    // Salva tutte le date iscrizione per uso nel calcolo data_ammissione
                    const datesIscrizioni = data.map(i => i.data_iscrizione).filter(Boolean).sort();
                    setSocioIscrizioniDates(datesIscrizioni);
                    const latestIscrizioneDate = datesIscrizioni.length ? datesIscrizioni[datesIscrizioni.length - 1] : null;

                    // La più recente tra pagamenti e iscrizioni senza ricevuta
                    const candidates = [latestPaymentDate, latestIscrizioneDate].filter(Boolean).sort();
                    const ultimaData = candidates.length ? candidates[candidates.length - 1] : '';
                    setCurrentIscrizioneDate(ultimaData);
                }
            })
            .catch(e => console.error(e));

    }, [formData.id, selectedAnno, socioPagamenti]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleIscrizioneSubmit = async () => {
        try {
            const response = await fetch(`/users/api/soci/${formData.id}/iscrizione`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data_iscrizione: iscrizioneDate,
                    tipo: 'senza_ricevuta'
                })
            });
            if (response.ok) {
                const data = await response.json(); // returns { iscrizione, status, anno }
                // Confirm matches displayed year
                if (data.anno === selectedAnno) {
                     setIscrizioneStatus('ISCRITTO');
                     setCurrentIscrizioneDate(data.iscrizione.data_iscrizione);
                }
                setShowIscrizioneModal(false);
                logToStorico('iscrizione',
                    `Iscrizione senza ricevuta registrata per l'anno ${data.anno}`,
                    { anno: data.anno, data_iscrizione: data.iscrizione.data_iscrizione }
                );
            }
        } catch (e) {
            console.error("Error creating iscrizione", e);
        }
    };

    const handleAccettaSocioSubmit = async () => {
        try {
            // Update Livello to 'Socio' and set Data Ammissione
            const updateRes = await fetch(`/users/api/soci/${formData.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    livello: 'Socio',
                    data_ammissione: accettaSocioDate // Save the date from the modal
                }) 
            });
            
            if (!updateRes.ok) {
                 const err = await updateRes.json();
                 showAlert(err.error || err.message, 'Errore aggiornamento livello socio');
                 return;
            }

            // Update local form data
            setFormData(prev => ({ 
                ...prev, 
                livello: 'Socio',
                data_ammissione: accettaSocioDate
            }));
            
            setShowAccettaSocioModal(false);
            
            // Note: We do NOT create an Iscrizione (as per request), just update the socio status.
        } catch (e) {
            console.error("Error accepting socio", e);
            showAlert("Errore di rete", 'Errore');
        }
    };

    // Effect to clear highlight
    useEffect(() => {
        if (highlightCF) {
            const timer = setTimeout(() => setHighlightCF(false), 2000); // 2 seconds pulse
            return () => clearTimeout(timer);
        }
    }, [highlightCF]);

    // Validate Email Live
    useEffect(() => {
        const email = formData.email;
        if (!email) {
            setEmailError(null);
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setEmailError('Formato email non valido');
        } else {
            setEmailError(null);
        }
    }, [formData.email]);

    // Populate data when socioData prop changes
    useEffect(() => {
        if (socioData) {
            setFormData(prev => ({
                ...prev,
                ...socioData,
                // Tipo socio
                tipo_socio: socioData.tipo_socio || 'persona_fisica',
                // Ensure nulls are strings for inputs
                cognome: socioData.cognome || '',
                nome: socioData.nome || '',
                sesso: socioData.sesso || '',
                data_nascita: socioData.data_nascita || '',
                luogo_nascita: socioData.luogo_nascita || '',
                codice_fiscale: socioData.codice_fiscale || '',
                email: socioData.user?.email || socioData.email || '',
                telefono: socioData.telefono || '',
                indirizzo: socioData.indirizzo || '',
                indirizzo_2: socioData.indirizzo_2 || '',
                comune: socioData.comune || '',
                cap: socioData.cap || '',
                cf_genitore: socioData.cf_genitore || '',
                cognome_genitore: socioData.cognome_genitore || '',
                nome_genitore: socioData.nome_genitore || '',
                recapito_2: socioData.recapito_2 || '',
                recapito_3: socioData.recapito_3 || '',
                scadenza_certificato: socioData.scadenza_certificato || '',
                data_ammissione: socioData.data_ammissione || '',
                livello: socioData.livello || 'ND',
                valutazione: socioData.valutazione || 'N.D.',
                tessera_societa: socioData.tessera_societa || '',
                tessera_federazione: socioData.tessera_federazione || '',
                tessera_eps: socioData.tessera_eps || '',
                note: socioData.note || '',
                data_scadenza_tesseramento: socioData.data_scadenza_tesseramento || '',
                id_badge: socioData.id_badge || '',
                // Campi associazione
                ragione_sociale: socioData.ragione_sociale || '',
                partita_iva: socioData.partita_iva || '',
                codice_sdi: socioData.codice_sdi || '',
                pec: socioData.pec || '',
                tipo_associazione: socioData.tipo_associazione || '',
                cognome_rappresentante: socioData.cognome_rappresentante || '',
                nome_rappresentante: socioData.nome_rappresentante || '',

                // Campi extra associazione
                anno_associativo: socioData.anno_associativo || '',
                codice_affiliazione: socioData.codice_affiliazione || '',
                scadenza_affiliazione: socioData.scadenza_affiliazione || '',
                costo_affiliazione: socioData.costo_affiliazione ?? '',
                costo_tessera_base: socioData.costo_tessera_base ?? '',
                costo_tessera_associativa: socioData.costo_tessera_associativa ?? '',
                costo_tessera_completa: socioData.costo_tessera_completa ?? '',
                durata_consiglio_direttivo: socioData.durata_consiglio_direttivo ?? '',
                scadenza_consiglio_direttivo: socioData.scadenza_consiglio_direttivo || '',
                etichette: socioData.etichette || '',
                runts: !!socioData.runts,
                somministrazione: !!socioData.somministrazione,
                sito_web: socioData.sito_web || '',
            }));
            
            // Set Checkbox state based on date existence
            setHaCertificato(!!socioData.scadenza_certificato);

            // Popola stato accesso frontend
            setFrontendAccess({
                enabled: !!socioData.frontend_enabled,
                email: socioData.user?.email || socioData.email || '',
                password_plain: socioData.frontend_password_plain || '',
                user_id: socioData.frontend_user_id || null,
            });
        }
    }, [socioData]);

    // Calculate if socio is minor
    const isMinorenne = React.useMemo(() => {
        if (!formData.data_nascita) return false;
        
        let birthDate;
        // Robust parsing to align with existing logic
        if (typeof formData.data_nascita === 'string' && formData.data_nascita.includes('-')) {
            const parts = formData.data_nascita.split('-');
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1; // Month is 0-indexed in Date
            const d = parseInt(parts[2], 10);
            birthDate = new Date(y, m, d);
        } else {
            birthDate = new Date(formData.data_nascita);
        }

        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age < 18;
    }, [formData.data_nascita]);

    const fetchComunicazioni = async () => {
        if (!formData.id) return;
        try {
            const response = await fetch(`/users/api/soci/${formData.id}/comunicazioni`);
            if (response.ok) {
                const data = await response.json();
                setComunicazioni(data);
            }
        } catch (error) {
            console.error('Error fetching comunicazioni:', error);
        }
    };

    useEffect(() => {
        if ((activeTab === 'Comunicazioni' || activeTab === 'Storico') && formData.id) {
            fetchComunicazioni();
        }
    }, [activeTab, formData.id]);

    useEffect(() => {
        if (activeTab === 'Storico' && formData.id) {
            fetchStorico();
        }
    }, [activeTab, formData.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchContatti = async () => {
        if (!formData.id) return;
        setContattiLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/users/api/soci/${formData.id}/contatti`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setContatti(await res.json());
        } catch (e) { console.error(e); }
        finally { setContattiLoading(false); }
    };

    useEffect(() => {
        if (activeTab === 'Contatti' && formData.id) {
            fetchContatti();
        }
    }, [activeTab, formData.id]);

    const fetchStorico = async () => {
        if (!formData.id) return;
        setStoricoLoading(true);
        try {
            const res = await fetch(`/users/api/soci/${formData.id}/storico`);
            if (res.ok) setStorico(await res.json());
        } catch (e) { console.error(e); }
        finally { setStoricoLoading(false); }
    };

    const logToStorico = async (tipo, azione, dettagli = null) => {
        if (!formData.id) return;
        try {
            const token = localStorage.getItem('token');
            await fetch(`/users/api/soci/${formData.id}/storico`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ tipo, azione, dettagli }),
            });
            if (activeTab === 'Storico') fetchStorico();
        } catch (e) { console.error('Storico log error', e); }
    };

    const fetchSocioPagamenti = async () => {
        if (!formData.id || !selectedSocietaId) return;
        setPagamentiLoading(true);
        try {
            const response = await fetch(`/payments/api?societa_id=${selectedSocietaId}&socio_id=${formData.id}`);
            if (response.ok) {
                const data = await response.json();
                setSocioPagamenti(data);
            }
        } catch (error) {
            console.error('Error fetching pagamenti socio:', error);
        } finally {
            setPagamentiLoading(false);
        }
    };

    const fetchSocioCorsi = async () => {
        if (!formData.id || !selectedSocietaId) return;
        setCorsiLoading(true);
        try {
            const res = await fetch(`/activities/api/corsi/socio/${formData.id}?societaId=${selectedSocietaId}`);
            if (res.ok) setSocioCorsi(await res.json());
        } catch (e) {
            console.error('Error fetching corsi socio:', e);
        } finally {
            setCorsiLoading(false);
        }
    };

    const fetchTuttiCorsiEProdotti = async () => {
        if (!selectedSocietaId) return;
        setAggiungiCorsoLoading(true);
        try {
            const [corsiRes, prodRes] = await Promise.all([
                fetch(`/activities/api/corsi?societaId=${selectedSocietaId}`),
                fetch(`/products/api?societaId=${selectedSocietaId}`),
            ]);
            if (corsiRes.ok) setTuttiCorsi(await corsiRes.json());
            if (prodRes.ok) setProdottiSocieta(await prodRes.json());
        } catch (e) {
            console.error('Error fetching corsi/prodotti:', e);
        } finally {
            setAggiungiCorsoLoading(false);
        }
    };

    // Helper: restituisce l'anno di inizio stagione relativo a una data pagamento
    const getRefYearForDate = (dateStr) => {
        if (!dateStr) return null;
        const societa = societaList?.find(s => s.id == selectedSocietaId);
        const tipo = societa?.tipo_anno_associativo || 'solare';
        const date = new Date(dateStr);
        const year = date.getFullYear();
        if (tipo === 'solare') return year;
        if (tipo === 'associativo') {
            return (date.getMonth() + 1) < 9 ? year - 1 : year;
        }
        if (tipo === 'personalizzato' && societa?.data_inizio_anno_associativo) {
            const parts = societa.data_inizio_anno_associativo.split('-');
            if (parts.length === 2) {
                const cDay = parseInt(parts[0], 10);
                const cMonth = parseInt(parts[1], 10);
                const m = date.getMonth() + 1;
                const d = date.getDate();
                if (m < cMonth || (m === cMonth && d < cDay)) return year - 1;
            }
        }
        return year;
    };

    const formatAnnoLabel = (anno) => {
        const societa = societaList?.find(s => s.id == selectedSocietaId);
        const tipo = societa?.tipo_anno_associativo || 'solare';
        return tipo === 'solare' ? String(anno) : `${anno}/${anno + 1}`;
    };

    // Opzioni anno/tipo derivate dai dati + pagamenti filtrati
    const pagAnniDisponibili = [...new Set(
        socioPagamenti.map(p => getRefYearForDate(p.data_pagamento)).filter(Boolean)
    )].sort((a, b) => b - a);

    const filteredPagamenti = socioPagamenti.filter(p => {
        if (pagFiltroDescrizione) {
            const q = pagFiltroDescrizione.toLowerCase();
            if (!(p.quote || '').toLowerCase().includes(q)) return false;
        }
        if (pagFiltroAnno !== 'TUTTI') {
            const refYear = getRefYearForDate(p.data_pagamento);
            if (refYear !== parseInt(pagFiltroAnno, 10)) return false;
        }
        if (pagFiltroRicevuta && !(p.numero_ricevuta || '').includes(pagFiltroRicevuta)) return false;
        return true;
    });

    // Calcola scadenze per ogni pagamento attivo del socio
    const socioModalSocieta = useMemo(
        () => societaList?.find(s => s.id == selectedSocietaId) || null,
        [societaList, selectedSocietaId]
    );

    const scadenzaMap = useMemo(() => {
        if (!socioModalSocieta) return {};
        const map = {};
        for (const p of socioPagamenti) {
            if (p.stato_pagamento?.startsWith('3.')) continue; // annullati
            const date = computeScadenzaForPayment(p, socioModalSocieta);
            if (date) {
                map[p.id] = {
                    scadenzaDate: date,
                    scadenzaStr: date.toISOString().split('T')[0],
                    stato: computeStatoPagamentoScadenza(date),
                    tipoKey: (p.quote_types || '').trim().toLowerCase(),
                };
            }
        }
        return map;
    }, [socioPagamenti, socioModalSocieta]);

    const scadenzeAlertCount = useMemo(
        () => Object.values(scadenzaMap).filter(s => s.stato === 'SCADUTO' || s.stato === 'IN SCADENZA').length,
        [scadenzaMap]
    );

    // Abbonamenti: prodotti di tipo subscription con almeno un pagamento, con stato aggiornato
    const abbonamenti = useMemo(() => {
        const subPagamenti = socioPagamenti.filter(p => {
            if (p.stato_pagamento?.startsWith('3.')) return false;
            if (parseFloat(p.importo) < 0) return false;
            const types = (p.quote_types || '').split(',').map(t => t.trim());
            return types.includes('subscription');
        });

        const byProduct = {};
        for (const p of subPagamenti) {
            let productId = null;
            if (Array.isArray(p.payment_items)) {
                const subItem = p.payment_items.find(i => i.quote_types === 'subscription');
                productId = subItem?.product_id ?? p.product_id;
            } else {
                productId = p.product_id;
            }
            const key = productId ?? '__unknown__';
            if (!byProduct[key]) byProduct[key] = [];
            byProduct[key].push(p);
        }

        return Object.entries(byProduct).map(([productIdStr, payments]) => {
            const productId = productIdStr === '__unknown__' ? null : parseInt(productIdStr, 10);
            const product = productId != null ? prodottiSocieta.find(pr => pr.id === productId) : null;
            const sorted = [...payments].sort((a, b) => {
                const da = a.data_scadenza_abbonamento ? new Date(a.data_scadenza_abbonamento) : new Date(0);
                const db = b.data_scadenza_abbonamento ? new Date(b.data_scadenza_abbonamento) : new Date(0);
                return db - da;
            });
            const latest = sorted[0];
            const scadenzaDate = latest.data_scadenza_abbonamento ? new Date(latest.data_scadenza_abbonamento) : null;
            const stato = computeStatoAbbonamento(scadenzaDate, product?.giorniAvvisoScadenza);
            return {
                productId,
                product,
                productName: product?.description || product?.nome || (productId != null ? `Prodotto #${productId}` : 'Abbonamento'),
                giorniAvviso: product?.giorniAvvisoScadenza,
                latestPayment: latest,
                scadenzaDate,
                stato,
                allPayments: sorted,
            };
        }).sort((a, b) => {
            const order = { SCADUTO: 0, 'IN SCADENZA': 1, REGOLARE: 2 };
            return (order[a.stato] ?? 3) - (order[b.stato] ?? 3);
        });
    }, [socioPagamenti, prodottiSocieta]);

    const handleRinnovaPagamento = (p) => {
        navigate('/nuovo-ordine', {
            state: {
                socio: {
                    id: formData.id || p.socio_id || null,
                    cognome: formData.cognome || '',
                    nome: formData.nome || '',
                    codice_fiscale: formData.codice_fiscale || p.codice_fiscale || '',
                },
                prefilledQuoteType: (p.quote_types || '').trim().toLowerCase(),
                prefilledProductId: p.product_id || null,
            }
        });
        onClose();
    };

    const handleDeleteSocioPagamento = async (id) => {
        if (!await confirm('Sei sicuro di voler eliminare questo ordine?')) return;
        try {
            const pagamento = socioPagamenti.find(p => p.id === id);
            const response = await fetch(`/payments/api/${id}`, { method: 'DELETE' });
            if (response.ok) {
                setSocioPagamenti(prev => prev.filter(p => p.id !== id));
                if (selectedPaymentDetail?.id === id) setSelectedPaymentDetail(null);
                const isProforma = pagamento?.tipo_documento === 'proforma';
                logToStorico('ordine',
                    isProforma
                        ? `Proforma eliminata${pagamento?.importo ? ` (€${parseFloat(pagamento.importo).toFixed(2)})` : ''}`
                        : `Ordine #${pagamento?.numero_ricevuta || id} eliminato${pagamento?.importo ? ` (€${parseFloat(pagamento.importo).toFixed(2)})` : ''}`,
                    { ordine_id: id, tipo_documento: pagamento?.tipo_documento }
                );
            } else {
                showAlert('Errore durante l\'eliminazione dell\'ordine', 'Errore');
            }
        } catch (e) {
            console.error(e);
            showAlert('Errore di rete', 'Errore');
        }
    };

    const handleAnnullaRicevuta = async (id) => {
        try {
            const response = await fetch(`/payments/api/${id}/annulla`, { method: 'PATCH' });
            if (response.ok) {
                const updated = await response.json();
                setSocioPagamenti(prev => prev.map(p => p.id === updated.id ? updated : p));
                setSelectedPaymentDetail(updated);
                logToStorico('ordine',
                    `Ricevuta #${updated.numero_ricevuta} annullata${updated.importo ? ` (€${parseFloat(updated.importo).toFixed(2)})` : ''}`,
                    { ordine_id: id, numero_ricevuta: updated.numero_ricevuta, importo: updated.importo }
                );
            } else {
                showAlert('Errore durante l\'annullamento della ricevuta', 'Errore');
            }
        } catch (e) {
            console.error(e);
            showAlert('Errore di rete', 'Errore');
        }
    };

    const handlePrintPayment = (p) => {
        const societa = societaList.find(s => s.id == selectedSocietaId);

        const statoLabel = p.stato_pagamento?.startsWith('3.') ? 'ANNULLATO' : 'VALIDO';
        const isProforma = p.tipo_documento === 'proforma';

        const modalitaMap = {
            'Contanti': 'CONTANTI',
            'POS': 'CARTA/BANCOMAT',
            'Bonifico': 'BONIFICO',
            'Assegno': 'ASSEGNO',
            'Online': 'ONLINE',
            'Carta/Bancomat': 'CARTA/BANCOMAT',
        };
        const modalitaLabel = modalitaMap[p.modalita_pagamento] || (p.modalita_pagamento?.toUpperCase() || '');

        const importoFormatted = Math.abs(parseFloat(p.importo)).toFixed(2).replace('.', ',');

        // Parse payment_items: estrae descrizione, qty, costo unitario, subtotale
        // NOTA: il backend rimuove il campo 'quote' dagli item prima di salvare → usa product lookup + top-level p.quote
        const stripQuoteSuffix = s => (s || '').replace(/\s*\(x\d+\)\s*€[\d,.]+(\s*\[.*?\]|\s*\(Scadenza[^)]*\))?/, '').trim();
        let lineItems;
        const piRaw = p.payment_items;
        const piArr = Array.isArray(piRaw) ? piRaw
            : (typeof piRaw === 'string' ? (() => { try { return JSON.parse(piRaw); } catch { return null; } })() : null);
        // Top-level p.quote è "Desc1 (x1) €50,00 + Desc2 (x2) €60,00" → usato come fallback per nome
        const topParts = (p.quote || '').split(/\s+\+\s+/).map(s => s.trim()).filter(Boolean);
        if (Array.isArray(piArr) && piArr.length > 0) {
            lineItems = piArr.map((pi, idx) => {
                const topPart = topParts[idx] || '';
                const qtyMatch = topPart.match(/\(x(\d+)\)/);
                const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
                const subtotale = Math.abs(parseFloat(pi.importo || 0));
                const unitPrice = qty > 0 ? subtotale / qty : subtotale;
                const fromProduct = (pi.product_id && prodottiSocieta.length)
                    ? (prodottiSocieta.find(pr => Number(pr.id) === Number(pi.product_id))?.description || null)
                    : null;
                const descrizione = fromProduct || stripQuoteSuffix(topPart) || `Voce ${idx + 1}`;
                return { descrizione, qty, unitPrice, subtotale };
            });
        } else {
            const totalAmount = Math.abs(parseFloat(p.importo || 0));
            if (topParts.length === 0) {
                lineItems = [{ descrizione: '', qty: 1, unitPrice: totalAmount, subtotale: totalAmount }];
            } else if (topParts.length === 1) {
                lineItems = [{ descrizione: stripQuoteSuffix(topParts[0]), qty: 1, unitPrice: totalAmount, subtotale: totalAmount }];
            } else {
                lineItems = topParts.map(q => ({ descrizione: stripQuoteSuffix(q), qty: null, unitPrice: null, subtotale: null }));
            }
        }
        const quoteRows = lineItems.map(li => `
            <tr>
                <td>${li.descrizione}</td>
                <td style="text-align:center">${li.qty !== null ? li.qty : '—'}</td>
                <td style="text-align:right">${li.unitPrice !== null ? li.unitPrice.toFixed(2).replace('.', ',') : '—'}</td>
                <td style="text-align:right">${li.subtotale !== null ? li.subtotale.toFixed(2).replace('.', ',') : '—'}</td>
            </tr>
        `).join('');

        const logoUrl = societa?.logo_path ? `/users/${societa.logo_path}` : null;
        const footerText = societa?.footer_text ||
            'Fuori campo iva art.4 dpr 633/72 - Esente imposte art.148 TUIR -<br/>Esente bollo L 30/12/2018 n. 145 art.1 c.646';
        const societaAddress = [societa?.indirizzo, societa?.comune].filter(Boolean).join(' - ');

        const indirizzoSocio = [formData.indirizzo, formData.cap, formData.comune].filter(Boolean).join(' - ');
        const codiceFiscaleSocio = formData.codice_fiscale || '';
        let datiPagatore = p.codice_fiscale_genitore || '';
        if (formData.data_nascita && (formData.nome_genitore || formData.cognome_genitore || formData.cf_genitore)) {
            const dataRif = new Date(p.data_pagamento || p.data_ricevuta || new Date());
            const nascita = new Date(formData.data_nascita);
            let eta = dataRif.getFullYear() - nascita.getFullYear();
            const mDiff = dataRif.getMonth() - nascita.getMonth();
            if (mDiff < 0 || (mDiff === 0 && dataRif.getDate() < nascita.getDate())) eta--;
            if (eta < 18) {
                const nomeGenitore = [formData.cognome_genitore, formData.nome_genitore].filter(Boolean).join(' ');
                const cfGenitore = formData.cf_genitore || p.codice_fiscale_genitore || '';
                datiPagatore = [nomeGenitore, cfGenitore].filter(Boolean).join(' - ');
            }
        }

        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Ricevuta ${p.numero_ricevuta || p.id}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; font-size: 12px; }
        .header { display: flex; align-items: center; justify-content: flex-end; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #333; }
        .header-logo { margin-right: 20px; }
        .header-logo img { max-height: 70px; }
        .header-info { text-align: right; }
        .header-info h2 { margin: 0 0 4px 0; font-size: 16px; }
        .header-info div { font-size: 12px; color: #444; }
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
        .info-table th { background: #f9f9f9; border: 1px solid #ccc; padding: 5px 8px; font-weight: bold; font-size: 10px; color: #555; text-align: left; }
        .info-table td { border: 1px solid #ccc; padding: 6px 8px; font-weight: bold; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .items-table th { border: 1px solid #ccc; padding: 8px 10px; background: #f5f5f5; text-align: left; font-size: 12px; }
        .items-table th:nth-child(2) { text-align: center; width: 50px; }
        .items-table th:nth-child(3), .items-table th:last-child { text-align: right; }
        .items-table td { border: 1px solid #ccc; padding: 8px 10px; font-size: 12px; }
        .items-table td:nth-child(2) { text-align: center; }
        .items-table td:nth-child(3), .items-table td:last-child { text-align: right; }
        .total-row td { font-weight: bold; border-top: 2px solid #333; }
        .footer-text { font-size: 10px; color: #555; margin-top: 20px; margin-bottom: 20px; }
        .separator { letter-spacing: 2px; color: #999; margin: 20px 0; text-align: center; }
        .proforma-watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 130px; font-weight: 900; color: rgba(180, 0, 0, 0.13); pointer-events: none; z-index: 9999; white-space: nowrap; letter-spacing: 8px; user-select: none; }
        @media print { body { padding: 0; } .proforma-watermark { position: fixed; color: rgba(180, 0, 0, 0.13); } }
        @page { margin: 10mm; }
    </style>
</head>
<body>
    ${isProforma ? '<div class="proforma-watermark">PROFORMA</div>' : ''}
    <div class="header">
        ${logoUrl ? `<div class="header-logo"><img src="${logoUrl}" alt="Logo" /></div>` : ''}
        <div class="header-info">
            <h2>${societa?.denominazione || ''}</h2>
            <div>${societaAddress}</div>
            <div>CF: ${societa?.codice_fiscale || ''}</div>
        </div>
    </div>

    <table class="info-table">
        <tr>
            <th>TIPO DOCUMENTO</th>
            <th>NUMERO DOCUMENTO</th>
            <th>PROGRESSIVO STAGIONE</th>
            <th>DATA DOCUMENTO</th>
            <th>STATO DOCUMENTO</th>
        </tr>
        <tr>
            <td>${isProforma ? 'PROFORMA' : 'RICEVUTA'}</td>
            <td>${isProforma ? '' : (p.numero_ricevuta || '')}</td>
            <td>${isProforma ? '' : (p.progressivo_stagione || '')}</td>
            <td>${(p.data_ricevuta || p.data_pagamento) ? new Date(p.data_ricevuta || p.data_pagamento).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}</td>
            <td>${statoLabel}</td>
        </tr>
        <tr>
            <th colspan="2">INTESTATARIO</th>
            <th colspan="2">CODICE FISCALE / PARTITA IVA INTESTATARIO</th>
            <th>MODALITA' PAGAMENTO</th>
        </tr>
        <tr>
            <td colspan="2">${(p.intestatario || '').toUpperCase()}</td>
            <td colspan="2">${p.codice_fiscale || codiceFiscaleSocio || p.partita_iva || ''}</td>
            <td>${modalitaLabel}</td>
        </tr>
        <tr>
            <th colspan="3">INDIRIZZO</th>
            <th colspan="2">DATI DI CHI HA EFFETTUATO IL PAGAMENTO</th>
        </tr>
        <tr>
            <td colspan="3">${indirizzoSocio}</td>
            <td colspan="2">${datiPagatore}</td>
        </tr>
        <tr><th colspan="5">NOTE</th></tr>
        <tr><td colspan="5">${p.note || ''}</td></tr>
    </table>

    <table class="items-table">
        <tr>
            <th>Descrizione</th>
            <th>Qtà</th>
            <th>Costo unitario</th>
            <th>Subtotale</th>
        </tr>
        ${quoteRows}
        <tr class="total-row">
            <td colspan="3">TOTALE</td>
            <td>${importoFormatted}</td>
        </tr>
    </table>

    <div class="footer-text">${footerText}</div>
    <div class="separator">_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _</div>
    <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
        }
    };

    useEffect(() => {
        if (formData.id) {
            fetchSocioPagamenti();
        }
    }, [formData.id]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (formData.id) {
            fetchSocioCorsi();
        }
    }, [formData.id]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (selectedSocietaId && prodottiSocieta.length === 0) {
            fetch(`/products/api?societaId=${selectedSocietaId}`)
                .then(r => r.ok ? r.json() : [])
                .then(data => setProdottiSocieta(data))
                .catch(() => {});
        }
    }, [selectedSocietaId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Calcola Data Ammissione come la più vecchia tra: data DB, pagamenti quota, date iscrizione da tabella
    useEffect(() => {
        const iscrizionePagamenti = socioPagamenti.filter(p => {
            const types = (p.quote_types || '').toLowerCase();
            const quote = (p.quote || '').toLowerCase();
            return types.includes('quota_associativa') || quote.includes('iscrizione');
        });

        const datesPagamenti = iscrizionePagamenti
            .map(p => p.data_pagamento)
            .filter(Boolean)
            .sort();
        const oldestPaymentDate = datesPagamenti[0] || null;

        // La più vecchia tra le date iscrizione dalla tabella Iscrizione
        const oldestIscrizioneDate = socioIscrizioniDates.length ? socioIscrizioniDates[0] : null;

        const dbDate = socioData?.data_ammissione || '';

        const candidates = [oldestPaymentDate, oldestIscrizioneDate, dbDate].filter(Boolean).sort();
        const bestDate = candidates[0] || '';

        if (bestDate) {
            setFormData(prev => ({ ...prev, data_ammissione: bestDate }));
        }
    }, [socioPagamenti, socioIscrizioniDates]); // eslint-disable-line react-hooks/exhaustive-deps

    // Calcola Data Tesseramento per l'anno selezionato
    useEffect(() => {
        if (!selectedAnno) {
            setDataTesseramento('');
            return;
        }
        const selectedSocieta = societaList?.find(s => s.id == selectedSocietaId);
        const { start, end } = getAnnoDateRange(selectedAnno, selectedSocieta);
        const quotaTessUnico = !!selectedSocieta?.quota_tesseramento_unico;

        const pagamentoTess = socioPagamenti.find(p => {
            const types = (p.quote_types || '').split(',').map(t => t.trim().toLowerCase());
            if (!types.includes('tesseramento')) return false;
            const d = p.data_pagamento ? new Date(p.data_pagamento) : null;
            return d && d >= start && d <= end;
        });

        if (pagamentoTess) {
            setDataTesseramento(pagamentoTess.data_pagamento ? pagamentoTess.data_pagamento.split('T')[0] : '');
            return;
        }

        if (quotaTessUnico) {
            const pagamentoIscr = socioPagamenti.find(p => {
                const types = (p.quote_types || '').split(',').map(t => t.trim().toLowerCase());
                if (!types.includes('quota_associativa')) return false;
                const d = p.data_pagamento ? new Date(p.data_pagamento) : null;
                return d && d >= start && d <= end;
            });
            if (pagamentoIscr) {
                setDataTesseramento(pagamentoIscr.data_pagamento ? pagamentoIscr.data_pagamento.split('T')[0] : '');
                return;
            }
        }

        setDataTesseramento('');
    }, [socioPagamenti, selectedAnno, societaList, selectedSocietaId]); // eslint-disable-line react-hooks/exhaustive-deps

    const renderPaymentIcon = (modalita) => {
        if (!modalita) return <Banknote size={20} />;
        const m = modalita.toLowerCase();
        if (m.includes('contanti')) return <Banknote size={20} strokeWidth={1.5} />;
        if (m.includes('pos')) return <CreditCard size={20} strokeWidth={1.5} />;
        if (m.includes('bonifico')) return <Landmark size={20} strokeWidth={1.5} />;
        if (m.includes('assegno')) return <DollarSign size={20} strokeWidth={1.5} />;
        return <Banknote size={20} strokeWidth={1.5} />;
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        // Handle Certificate Flag
        if (name === 'ha_certificato') {
            setHaCertificato(checked);
            if (!checked) {
                // Clear date if unchecked
                setFormData(prev => ({ ...prev, scadenza_certificato: '' }));
            }
            return;
        }

        const UPPERCASE_FIELDS = ['codice_fiscale', 'cf_genitore', 'nome', 'cognome', 'luogo_nascita', 'indirizzo', 'comune', 'nome_genitore', 'cognome_genitore'];
        const finalValue = UPPERCASE_FIELDS.includes(name)
            ? value.toUpperCase()
            : (type === 'checkbox' ? checked : value);
        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };

    const handleNumericOnlyChange = (e) => {
        const { name, value } = e.target;
        const filtered = value.replace(/\D/g, '').slice(0, 11);
        setFormData(prev => ({ ...prev, [name]: filtered }));
    };

    // Case 1: Compute Codice Fiscale from fields
    useEffect(() => {
        const { nome, cognome, sesso, data_nascita, luogo_nascita } = formData;
        
        // This effect should strictly run when these specific fields change
        // We only auto-calculate if we have enough info to attempt a calculation
        if (nome && cognome && sesso && data_nascita && luogo_nascita) {
            try {
                // Robust Date Parsing (avoid Timezone offsets from new Date(string))
                // Expecting YYYY-MM-DD from input type="date"
                let day, month, year;
                if (typeof data_nascita === 'string' && data_nascita.includes('-')) {
                    const parts = data_nascita.split('-');
                    year = parseInt(parts[0], 10);
                    month = parseInt(parts[1], 10);
                    day = parseInt(parts[2], 10);
                } else {
                    const dateVal = new Date(data_nascita);
                    if (isNaN(dateVal.getTime())) return;
                    day = dateVal.getDate();
                    month = dateVal.getMonth() + 1;
                    year = dateVal.getFullYear();
                }

                const cf = new CodiceFiscale({
                    name: nome.trim(),
                    surname: cognome.trim(),
                    gender: sesso,
                    day,
                    month,
                    year,
                    birthplace: luogo_nascita.trim()
                });
                
                // Update only if different to avoid infinite loops
                if (cf.code && cf.code !== formData.codice_fiscale.toUpperCase()) {
                    console.log("Auto-updating CF to:", cf.code);
                    setFormData(prev => ({ ...prev, codice_fiscale: cf.code }));
                    // Clear warning if we successfully auto-generated a valid one based on current data
                    setWarningMessage(null); 
                    setHighlightCF(true);
                }
            } catch (e) {
                // Invalid data for calculation (e.g. City not found in library DB), ignore but log
                console.warn("Skipping CF auto-calc:", e.message);
            }
        }
    }, [formData.nome, formData.cognome, formData.sesso, formData.data_nascita, formData.luogo_nascita]);

    // Case 2: Validate/Fill fields from Codice Fiscale
    useEffect(() => {
        const { codice_fiscale, nome, cognome, sesso, data_nascita, luogo_nascita } = formData;
        
        // Requirement: "Sono valorizzati ALMENO Nome e Cognome"
        if (!nome || !cognome) return; 
        
        // Fix: If explicitly empty or too short, show error instead of returning silently.
        // But we usually don't want to spam error if the user is just starting to type (e.g. length < 16 but > 0)
        // However, the request asks for "Validazione" when modified.
        // If I delete a char, length becomes 15. The previous code had "if (length !== 16) return;" so it skipped the try/catch logic completely.
        
        if (!codice_fiscale) {
            setWarningMessage(null); // Just empty, no error yet
            return;
        }

        try {
            const cf = new CodiceFiscale(codice_fiscale);
            
            // Extract info from CF
            // Library exposes 'birthday' (Date), 'birthplace' (Object with .nome) and 'gender'
            const cfDate = cf.birthday || cf.birthDate;
            const cfGender = cf.gender;
            
            // Determine Place Name safely
            let cfPlaceName = null;
            if (cf.birthplace) {
                if (typeof cf.birthplace === 'object' && cf.birthplace.nome) cfPlaceName = cf.birthplace.nome;
                else if (typeof cf.birthplace === 'string') cfPlaceName = cf.birthplace;
            } else if (cf.birthPlace) { // Fallback for older versions/typos
                if (typeof cf.birthPlace === 'object' && cf.birthPlace.name) cfPlaceName = cf.birthPlace.name;
                else if (typeof cf.birthPlace === 'string') cfPlaceName = cf.birthPlace;
            }

            const updates = {};
            const conflicts = [];

            // 1. Check/Fill Gender
            if (cfGender) {
                if (!sesso) {
                    updates.sesso = cfGender;
                } else if (sesso !== cfGender) {
                    conflicts.push(`Il campo Sesso (${sesso}) non corrisponde a quello nel CF (${cfGender})`);
                }
            }

            // 2. Check/Fill Date
            if (cfDate) {
                const y = cfDate.getFullYear();
                const m = String(cfDate.getMonth() + 1).padStart(2, '0');
                const d = String(cfDate.getDate()).padStart(2, '0');
                const cfDateStr = `${y}-${m}-${d}`;

                if (!data_nascita) {
                    updates.data_nascita = cfDateStr;
                } else if (data_nascita !== cfDateStr) {
                    conflicts.push(`La Data di Nascita (${data_nascita}) non corrisponde a quella nel CF (${cfDateStr})`);
                }
            }

            // 3. Check/Fill Place
            if (cfPlaceName) {
                const currentPlace = (luogo_nascita || '').trim().toUpperCase();
                const derivedPlace = cfPlaceName.toUpperCase();
                
                if (!luogo_nascita) {
                    updates.luogo_nascita = cfPlaceName; 
                } else if (currentPlace !== derivedPlace) {
                    // Check if one contains the other (lenient match)
                    if (!currentPlace.includes(derivedPlace) && !derivedPlace.includes(currentPlace)) {
                        conflicts.push(`Il Luogo di Nascita (${luogo_nascita}) non corrisponde a quello nel CF (${cfPlaceName})`);
                    }
                }
            }

            // 4. Check Consistency of Name/Surname with CF Code
            // We cannot strictly "deduce" name from CF, but we can verify if the CF code matches what we expect from Name/Surname + calculated demographics
            // If we have all fields, Case 1 would overwrite this.
            // But if we have partial fields (e.g. valid Sesso/Data/Luogo but wrong Name for that CF), we detect it here.
            
            // To do this properly without re-implementing logic, we can try to generate a CF with the current metadata + keys
            // If the user provided CF doesn't match the one generated using the User's Name/Surname + Deduced Data, 
            // it implies the Name/Surname are inconsistent with the CF (assuming Sesso/Data/Luogo match because we just checked/filled them).
            
            if (nome && cognome && (sesso || updates.sesso) && (data_nascita || updates.data_nascita) && (luogo_nascita || updates.luogo_nascita)) {
                try {
                     const checkDate = new Date(data_nascita || updates.data_nascita);
                     const checkCF = new CodiceFiscale({
                        name: nome,
                        surname: cognome,
                        gender: sesso || updates.sesso,
                        day: checkDate.getDate(),
                        month: checkDate.getMonth() + 1,
                        year: checkDate.getFullYear(),
                        birthplace: luogo_nascita || updates.luogo_nascita
                     });
                     
                     // If the CF we calculate from the data (existing + derived) is different from the input CF
                     if (checkCF.code !== codice_fiscale.toUpperCase()) {
                         // The issue could be just Name or Surname, since we validated the others
                         // Or it could be the Check character
                         // We just issue a general inconsistency warning regarding identity
                         conflicts.push(`Il CF inserito non è coerente con Nome e Cognome specificati`);
                     }
                } catch(e) {
                    // ignore calculation errors
                }
            }

            if (conflicts.length > 0) {
                setWarningMessage(conflicts.join('; '));
            } else {
                setWarningMessage(null);
                if (Object.keys(updates).length > 0) {
                    setFormData(prev => ({ ...prev, ...updates }));
                }
            }

        } catch (e) {
            console.error("CF Validation Error:", e);
            let msg = e.message || 'Errore generico';
            
            // Translate common library errors
            if (msg.includes('check digit')) msg = 'Carattere di controllo errato';
            else if (msg.includes('length')) msg = 'Lunghezza non valida (deve essere 16 caratteri)';
            else if (msg.includes('Invalid characters')) msg = 'Caratteri non validi';
            else if (msg.includes('Provided input is not a valid Codice Fiscale') || msg.includes('Formato non valido')) {
                // Manual check for better error detail when library is generic
                if (codice_fiscale.length !== 16) {
                    msg = `Lunghezza errata (${codice_fiscale.length}/16)`;
                } else if (!/^[A-Z0-9]+$/i.test(codice_fiscale)) {
                    msg = 'Contiene caratteri non validi (ammessi solo lettere e numeri)';
                } else {
                     // Try to calculate expected CF to see if it's a mismatch
                     if (nome && cognome && sesso && data_nascita && luogo_nascita) {
                        try {
                            // Extract date parts
                            let d, m, y;
                            if (typeof data_nascita === 'string' && data_nascita.includes('-')) {
                                const parts = data_nascita.split('-');
                                y = parseInt(parts[0], 10);
                                m = parseInt(parts[1], 10);
                                d = parseInt(parts[2], 10);
                            } else {
                                const dt = new Date(data_nascita);
                                d = dt.getDate(); m = dt.getMonth() + 1; y = dt.getFullYear();
                            }

                            const expectedCF = new CodiceFiscale({
                                name: nome.trim(),
                                surname: cognome.trim(),
                                gender: sesso,
                                day: d, month: m, year: y,
                                birthplace: luogo_nascita.trim()
                            });

                            if (expectedCF.code !== codice_fiscale) {
                                // Analyze diff
                                const inputCF = codice_fiscale.toUpperCase();
                                const exp = expectedCF.code;
                                
                                // Check Surname (first 3)
                                if (inputCF.substring(0,3) !== exp.substring(0,3)) msg = 'Il CF non corrisponde al Cognome';
                                // Check Name (next 3)
                                else if (inputCF.substring(3,6) !== exp.substring(3,6)) msg = 'Il CF non corrisponde al Nome';
                                // Check Year/Month/Day/Gender (next 5)
                                else if (inputCF.substring(6,11) !== exp.substring(6,11)) msg = 'Il CF non corrisponde ai dati di nascita/sesso';
                                // Check Place (next 4)
                                else if (inputCF.substring(11,15) !== exp.substring(11,15)) msg = 'Il CF non corrisponde al Luogo di nascita';
                                // Check Checksum (last char)
                                else if (inputCF.substring(15) !== exp.substring(15)) msg = 'Carattere di controllo errato';
                                else msg = 'Formato e Consistenza non validi';
                            }
                        } catch (calcErr) {
                           msg = 'Formato non valido (e dati anagrafici insufficienti per ricalcolo)';  
                        }
                     } else {
                         msg = 'Formato struttura errato';
                     }
                }
            }
            else if (msg.includes('constructor')) msg = 'Errore interno (libreria non caricata)';
            
            setWarningMessage(`Codice Fiscale non valido: ${msg}`);
        }

    }, [formData.codice_fiscale, formData.nome, formData.cognome, formData.sesso, formData.data_nascita, formData.luogo_nascita]); 
    // ^ Added dependencies so it re-runs validation if fields change but CF doesn't (to show conflict)
    // However, if fields change, Case 1 runs and updates CF.
    // If Case 1 runs, it sets CF to "Correct" one. Then Case 2 runs. "Correct" CF matches. No conflict. 
    // Does this defeat the purpose of showing "Conflict"?
    // "Se erano già valorizzati, mostra un messaggio di errore...".
    // If I change Date => Case 1 updates CF => Case 2 sees match.
    // Conflict only happens if Case 1 FAILS to run (missing fields) OR if the user manually overrides CF to be wrong.
    
    // Wait, the Requirement says: 
    // "Sono valorizzati ALMENO Nome e Cognome e viene modificato il codice fiscale"
    // So Case 2 is primarily when CF changes.
    // The addition of other dependencies here allows "On Open" validation if CF is already there.

    const handleEmailBlur = async () => {
        if (!formData.email) return;

        try {
            const response = await fetch('/users/api/soci/check-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: formData.email,
                    excludeId: formData.id || null
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.exists) {
                    showAlert(`L'email ${formData.email} è già usata da ${result.nome} ${result.cognome}`, 'Email già in uso', 'warning');
                }
            }
        } catch (e) {
            console.error("Email check failed", e);
        }
    };

    const handleRevocaIscrizione = async () => {
        if (!currentRefYear || !formData.id) return;
        if (!await confirm(`Sei sicuro di voler revocare l'iscrizione per l'anno ${currentRefYear}?`)) return;

        try {
            const response = await fetch(`/users/api/soci/${formData.id}/iscrizione`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ anno: currentRefYear })
            });
            
            if (response.ok) {
                setIscrizioneStatus('NON ISCRITTO');
                setCurrentIscrizioneDate('');
                logToStorico('iscrizione',
                    `Iscrizione revocata per l'anno ${currentRefYear}`,
                    { anno: currentRefYear }
                );
            } else {
                showAlert('Errore revoca iscrizione', 'Errore');
            }
        } catch (e) {
             console.error("Error revoking iscrizione", e);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.tipo_socio !== 'associazione' && isMinorenne) {
            const errors = {
                cf_genitore: !formData.cf_genitore?.trim(),
                nome_genitore: !formData.nome_genitore?.trim(),
                cognome_genitore: !formData.cognome_genitore?.trim(),
                recapito_2: !formData.recapito_2?.trim(),
            };
            if (Object.values(errors).some(Boolean)) {
                setGenitoreErrors(errors);
                setActiveTab('Anagrafica');
                showSnackbar('Compila tutti i campi obbligatori del tutore/genitore', 'error');
                return;
            }
        }
        setGenitoreErrors({});
        onSave(formData);
    };

    // ── Attività helpers ──────────────────────────────────────────────────────
    const getScadenzaAbbonamentoPerCorso = (abbonamentoId) => {
        if (!abbonamentoId) return null;
        const payments = socioPagamenti.filter(p => {
            const hasProduct = p.product_id === abbonamentoId ||
                (Array.isArray(p.payment_items) && p.payment_items.some(i => i.product_id === abbonamentoId));
            return hasProduct && p.data_scadenza_abbonamento;
        });
        if (payments.length === 0) return null;
        payments.sort((a, b) => new Date(b.data_pagamento) - new Date(a.data_pagamento));
        return payments[0].data_scadenza_abbonamento;
    };

    const passepartoutScadenza = useMemo(() => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const ppIds = new Set(prodottiSocieta.filter(p => p.passepartout && p.type === 'subscription').map(p => p.id));
        if (ppIds.size === 0) return null;
        let best = null;
        socioPagamenti.forEach(p => {
            const isPP = ppIds.has(p.product_id) ||
                (Array.isArray(p.payment_items) && p.payment_items.some(i => ppIds.has(i.product_id)));
            if (!isPP || !p.data_scadenza_abbonamento) return;
            const scad = new Date(p.data_scadenza_abbonamento); scad.setHours(0, 0, 0, 0);
            if (scad < today) return;
            if (!best || scad > new Date(best)) best = p.data_scadenza_abbonamento;
        });
        return best;
    }, [prodottiSocieta, socioPagamenti]);

    const storicoTimeline = useMemo(() => {
        const items = [];

        // DB storico (note e accessi frontend)
        storico.forEach(s => {
            items.push({
                id: `storico-${s.id}`,
                tipo: s.tipo,
                azione: s.azione,
                owner: s.owner_label || 'Sistema',
                data: new Date(s.data_evento),
                allegato: s.allegato_path ? { storiciId: s.id, nome: s.allegato_nome || 'allegato' } : null,
                source: 'db',
            });
        });

        // Ordini e abbonamenti dai pagamenti
        socioPagamenti.forEach(p => {
            const types = (p.quote_types || '').split(',').map(t => t.trim().toLowerCase());
            const isAbb = types.includes('subscription');
            const importoAbs = Math.abs(parseFloat(p.importo || 0)).toFixed(2).replace('.', ',');
            const statoLabel = p.stato_pagamento?.startsWith('3.') ? ' [ANNULLATO]' : '';
            items.push({
                id: `pag-${p.id}`,
                tipo: isAbb ? 'abbonamento' : 'ordine',
                azione: isAbb
                    ? `Abbonamento: ${p.quote || 'Abbonamento'} — €${importoAbs}${statoLabel}`
                    : `Ordine: ${p.quote || 'Pagamento'} — €${importoAbs}${statoLabel}`,
                owner: 'Sistema',
                data: p.data_pagamento ? new Date(p.data_pagamento) : new Date(p.createdAt),
                allegato: null,
                source: 'pagamento',
            });
        });

        // Comunicazioni
        comunicazioni.forEach(c => {
            const desc = c.tipo === 'EMAIL'
                ? `Email inviata: "${c.oggetto || '(senza oggetto)'}"`
                : `Comunicazione (${c.tipo}): ${(c.testo || '').slice(0, 80)}${(c.testo || '').length > 80 ? '…' : ''}`;
            items.push({
                id: `com-${c.id}`,
                tipo: 'comunicazione',
                azione: desc,
                owner: c.mittente_nome || 'Sistema',
                data: c.data_invio ? new Date(c.data_invio) : new Date(c.createdAt),
                allegato: null,
                source: 'comunicazione',
            });
        });

        // Iscrizioni attività (corsi)
        socioCorsi.forEach(iscrizione => {
            const corso = iscrizione.corso;
            const attivita = corso?.attivita?.descrizione || 'Corso';
            const orario = corso ? `${GIORNI_SETTIMANA[corso.giorno] || ''} ${corso.oraInizio || ''}`.trim() : '';
            items.push({
                id: `corso-${iscrizione.id}`,
                tipo: 'iscrizione_attivita',
                azione: `Iscrizione attività: ${attivita}${orario ? ` (${orario})` : ''}`,
                owner: 'Sistema',
                data: iscrizione.createdAt ? new Date(iscrizione.createdAt) : new Date(),
                allegato: null,
                source: 'corso',
            });
        });

        return items.sort((a, b) => b.data - a.data);
    }, [storico, socioPagamenti, comunicazioni, socioCorsi]); // eslint-disable-line react-hooks/exhaustive-deps

    const storicoTipoConfig = {
        ordine: { color: '#2563eb', bg: '#eff6ff', label: 'Ordine', icon: <CreditCard size={14}/> },
        abbonamento: { color: '#7c3aed', bg: '#f5f3ff', label: 'Abbonamento', icon: <BookOpen size={14}/> },
        iscrizione: { color: '#0d9488', bg: '#f0fdfa', label: 'Iscrizione', icon: <ClipboardList size={14}/> },
        iscrizione_attivita: { color: '#059669', bg: '#ecfdf5', label: 'Attività', icon: <Activity size={14}/> },
        comunicazione: { color: '#ea580c', bg: '#fff7ed', label: 'Comunicazione', icon: <Mail size={14}/> },
        accesso_frontend: { color: '#0891b2', bg: '#ecfeff', label: 'Accesso', icon: <Globe size={14}/> },
        nota: { color: '#d97706', bg: '#fffbeb', label: 'Nota', icon: <MessageSquare size={14}/> },
    };

    const handleSalvaNota = async () => {
        if (!notaTesto.trim()) { showSnackbar('Inserisci il testo della nota', 'error'); return; }
        setNotaLoading(true);
        try {
            const token = localStorage.getItem('token');
            const formDataUpload = new FormData();
            formDataUpload.append('testo', notaTesto.trim());
            if (notaFile) formDataUpload.append('allegato', notaFile);
            const res = await fetch(`/users/api/soci/${formData.id}/storico/nota`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formDataUpload,
            });
            if (res.ok) {
                setShowNotaForm(false);
                setNotaTesto('');
                setNotaFile(null);
                await fetchStorico();
                showSnackbar('Nota aggiunta allo storico');
            } else {
                const err = await res.json();
                showSnackbar(err.error || 'Errore durante il salvataggio', 'error');
            }
        } catch {
            showSnackbar('Errore di rete', 'error');
        } finally {
            setNotaLoading(false);
        }
    };

    const isCorsoAccessibile = (abbonamentoId) => {
        if (passepartoutScadenza) return true;
        if (!abbonamentoId) return false;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        return socioPagamenti.some(p => {
            const hasProduct = p.product_id === abbonamentoId ||
                (Array.isArray(p.payment_items) && p.payment_items.some(i => i.product_id === abbonamentoId));
            if (!hasProduct || !p.data_scadenza_abbonamento) return false;
            return new Date(p.data_scadenza_abbonamento) >= today;
        });
    };
    // ─────────────────────────────────────────────────────────────────────────

    const isAssociazione = formData.tipo_socio === 'associazione';
    const tabs = [
        { id: 'Anagrafica', icon: <User size={18}/>, label: 'Anagrafica' },
        { id: 'Storico', icon: <ClipboardList size={18}/>, label: 'Storico' },
        { id: 'Ordini', icon: <CreditCard size={18}/>, label: 'Ordini', count: socioPagamenti.length },
        ...(!isAssociazione ? [
            { id: 'Abbonamenti', icon: <BookOpen size={18}/>, label: 'Abbonamenti', count: abbonamenti.length },
            { id: 'Attività', icon: <Activity size={18}/>, label: 'Attività', count: socioCorsi.length },
        ] : []),
        { id: 'Comunicazioni', icon: <Mail size={18}/>, label: 'Comunicazioni' },
        ...(isAssociazione ? [
            { id: 'DatiAssociazione', icon: <Folder size={18}/>, label: 'Associazione' },
            { id: 'Contatti', icon: <Users size={18}/>, label: 'Contatti', count: contatti.length || undefined },
        ] : []),
        ...(isEditMode ? [{ id: 'AccessoFrontend', icon: <Globe size={18}/>, label: 'Accesso Frontend' }] : []),
    ];

    return (
        <div className="modal-overlay" style={{alignItems: 'flex-start', paddingTop: '72px'}}>
            <div className="modal-card socio-modal" style={{maxWidth: '1200px', width: '95%', maxHeight: 'calc(100vh - 88px)', display: 'flex', flexDirection: 'column'}} onClick={e => e.stopPropagation()}>
                
                {/* Top Header with Name and Actions */}
                <div style={{
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '16px 24px', 
                    borderBottom: '1px solid #e5e7eb',
                    backgroundColor: '#fff'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                        <div>
                             <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>
                                {isEditMode ? (
                                    formData.tipo_socio === 'associazione'
                                        ? (formData.ragione_sociale || 'Associazione')
                                        : `${formData.nome || ''} ${formData.cognome || ''}`
                                ) : (
                                    'Nuovo Socio'
                                )}
                            </h2>
                            {isEditMode && iscrizioneStatus && (
                                <span style={{
                                    fontSize: '0.75rem', 
                                    fontWeight: 'bold', 
                                    padding: '2px 8px', 
                                    borderRadius: '4px',
                                    backgroundColor: iscrizioneStatus === 'ISCRITTO' ? '#dcfce7' : '#fee2e2',
                                    color: iscrizioneStatus === 'ISCRITTO' ? '#166534' : '#991b1b',
                                    border: `1px solid ${iscrizioneStatus === 'ISCRITTO' ? '#22c55e' : '#ef4444'}`,
                                    marginTop: '4px',
                                    display: 'inline-block'
                                }}>
                                    {iscrizioneStatus} {currentRefYear ? `(${currentRefYear})` : ''}
                                </span>
                            )}
                        </div>

                        {isEditMode && (
                            <select 
                                className="md-select" 
                                style={{ width: 'auto', minWidth: '120px', padding: '6px 12px', margin: 0 }}
                                defaultValue=""
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === 'comunicazione') {
                                        setShowComunicazioneModal(true);
                                    } else if (val === 'nuovo_pagamento') {
                                        navigate('/nuovo-ordine', { state: { socio: socioData } });
                                    } else if (val === 'iscrizione_senza_ricevuta') {
                                        setShowIscrizioneModal(true);
                                    } else if (val === 'revoca_iscrizione') {
                                        handleRevocaIscrizione();
                                    } else if (val === 'accetta_socio') {
                                        setShowAccettaSocioModal(true);
                                    } else if (val === 'modulo_iscrizione') {
                                        handlePrintRequest('MODULO ISCRIZIONE');
                                    } else if (val === 'informativa_privacy') {
                                        handlePrintRequest('INFORMATIVA PRIVACY');
                                    } else if (val === 'altri_moduli') {
                                        handlePrintRequest('altri_moduli');
                                    } else {
                                        console.log('Action selected:', val);
                                    }
                                    // Reset
                                    e.target.value = "";
                                }}
                            >
                                <option value="" disabled>Azioni</option>
                                
                                <option value="comunicazione">Invia comunicazione</option>
                                <option value="iscrizione_senza_ricevuta">Iscrizione senza ricevuta</option>
                                <option value="revoca_iscrizione">Revoca iscrizione</option>
                                <option value="accetta_socio">Accetta come socio</option>
                                <option value="nuovo_pagamento">Nuovo ordine</option>
                                
                                <optgroup label="Modulistica">
                                    <option value="modulo_iscrizione">MODULO ISCRIZIONE</option>
                                    <option value="informativa_privacy">INFORMATIVA PRIVACY</option>
                                    <option value="altri_moduli">Altri moduli</option>
                                </optgroup>
                            </select>
                        )}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button 
                            onClick={onClose}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#6b7280',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '4px'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <X size={24}/>
                        </button>
                    </div>
                </div>

                {/* Tabs Header */}
                <div className="modal-tabs-header">
                    {isEditMode ? (
                        tabs.map(tab => (
                            <button 
                                key={tab.id} 
                                className={`modal-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.icon}
                                <span style={{marginLeft: '8px'}}>{tab.label}</span>
                                {tab.count !== undefined && <span className="tab-badge">{tab.count}</span>}
                            </button>
                        ))
                    ) : (
                        <div style={{padding: '10px 16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: '#4b5563'}}>
                            <User size={18}/>
                            <span>Dati Anagrafici</span>
                        </div>
                    )}
                    {/* Close button moved to top header */}
                </div>
                
                {warningMessage && (
                    <div style={{
                        backgroundColor: '#fee2e2', 
                        border: '1px solid #ef4444', 
                        color: '#b91c1c', 
                        padding: '12px', 
                        margin: '16px 24px 0', 
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        fontSize: '14px'
                    }}>
                        <AlertTriangle size={20} />
                        <span>{warningMessage}</span>
                    </div>
                )}

                {/* Content Area */}
                <div className="modal-content-area" style={{flex: 1, overflowY: 'auto', padding: '24px', backgroundColor: '#fff'}}>
                    
                    {activeTab === 'Anagrafica' && (
                        <form id="socioForm" onSubmit={handleSubmit}>

                            {/* Toggle Persona Fisica / Associazione */}
                            {isEditMode ? (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '24px', padding: '7px 16px', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>
                                        {formData.tipo_socio === 'associazione' ? 'Associazione' : 'Persona Fisica'}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>(non modificabile)</span>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '24px', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', width: 'fit-content' }}>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, tipo_socio: 'persona_fisica' }))}
                                        style={{
                                            padding: '8px 20px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontWeight: 600,
                                            fontSize: '0.875rem',
                                            backgroundColor: formData.tipo_socio !== 'associazione' ? '#2563eb' : '#f9fafb',
                                            color: formData.tipo_socio !== 'associazione' ? '#fff' : '#6b7280',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        Persona Fisica
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, tipo_socio: 'associazione' }))}
                                        style={{
                                            padding: '8px 20px',
                                            border: 'none',
                                            borderLeft: '1px solid #e5e7eb',
                                            cursor: 'pointer',
                                            fontWeight: 600,
                                            fontSize: '0.875rem',
                                            backgroundColor: formData.tipo_socio === 'associazione' ? '#2563eb' : '#f9fafb',
                                            color: formData.tipo_socio === 'associazione' ? '#fff' : '#6b7280',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        Associazione
                                    </button>
                                </div>
                            )}

                            {/* FORM ASSOCIAZIONE */}
                            {formData.tipo_socio === 'associazione' ? (
                                <div className="md-form-grid-custom">

                                    {/* Denominazione */}
                                    <div className="form-group grid-span-12">
                                        <label className="field-label">Denominazione *</label>
                                        <input className="md-input" name="ragione_sociale" value={formData.ragione_sociale} onChange={handleChange} required />
                                    </div>

                                    {/* CF | P.IVA | SDI | PEC */}
                                    <div className="form-group grid-span-3">
                                        <label className="field-label">Codice fiscale *</label>
                                        <input
                                            className="md-input"
                                            name="codice_fiscale"
                                            value={formData.codice_fiscale}
                                            onChange={handleNumericOnlyChange}
                                            inputMode="numeric"
                                            maxLength={11}
                                            required
                                        />
                                    </div>
                                    <div className="form-group grid-span-3">
                                        <label className="field-label">Partita IVA</label>
                                        <input
                                            className="md-input"
                                            name="partita_iva"
                                            value={formData.partita_iva}
                                            onChange={handleNumericOnlyChange}
                                            inputMode="numeric"
                                            maxLength={11}
                                        />
                                    </div>
                                    <div className="form-group grid-span-3">
                                        <label className="field-label">Codice SDI (es. 000000)</label>
                                        <input className="md-input" name="codice_sdi" value={formData.codice_sdi} onChange={handleChange} placeholder="000000" />
                                    </div>
                                    <div className="form-group grid-span-3">
                                        <label className="field-label">PEC</label>
                                        <input className="md-input" type="email" name="pec" value={formData.pec} onChange={handleChange} />
                                    </div>

                                    {/* Email | Telefono */}
                                    <div className="form-group grid-span-6">
                                        <label className="field-label">Email</label>
                                        <input
                                            className="md-input"
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            onBlur={handleEmailBlur}
                                            style={emailError ? { borderColor: '#ef4444' } : {}}
                                        />
                                        {emailError && <span style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{emailError}</span>}
                                    </div>
                                    <div className="form-group grid-span-6">
                                        <label className="field-label">Telefono</label>
                                        <input className="md-input" name="telefono" value={formData.telefono} onChange={handleChange} />
                                    </div>

                                    {/* Indirizzo | Comune | Cap */}
                                    <div className="form-group grid-span-7">
                                        <label className="field-label">Indirizzo</label>
                                        <input className="md-input" name="indirizzo" placeholder="VIA..." value={formData.indirizzo} onChange={handleChange} />
                                    </div>
                                    <div className="form-group grid-span-3">
                                        <label className="field-label">Comune</label>
                                        <CityAutocomplete name="comune" value={formData.comune} onChange={handleChange} style={{ width: '100%' }} />
                                    </div>
                                    <div className="form-group grid-span-2">
                                        <label className="field-label">Cap</label>
                                        <input className="md-input" name="cap" value={formData.cap} onChange={handleChange} />
                                    </div>
                                    <div className="form-group grid-span-12">
                                        <label className="field-label">Indirizzo 2</label>
                                        <input className="md-input" name="indirizzo_2" placeholder="Indirizzo aggiuntivo..." value={formData.indirizzo_2} onChange={handleChange} />
                                    </div>

                                    {/* Tipo Associazione */}
                                    <div className="form-group grid-span-12">
                                        <label className="field-label">Tipo Associazione</label>
                                        <select className="md-select" name="tipo_associazione" value={formData.tipo_associazione} onChange={handleChange}>
                                            <option value="">Seleziona...</option>
                                            <option value="ASD">Associazione Sportiva Dilettantistica (ASD)</option>
                                            <option value="APS">Associazione di Promozione Sociale (APS)</option>
                                            <option value="ODV">Organizzazione di Volontariato (ODV)</option>
                                            <option value="ETS">Ente del Terzo Settore (ETS)</option>
                                            <option value="Fondazione">Fondazione</option>
                                            <option value="Circoli">Circoli</option>
                                            <option value="Associazione">Associazione</option>
                                        </select>
                                    </div>

                                    {/* Rappresentante legale */}
                                    <div className="form-group grid-span-6">
                                        <label className="field-label">Cognome Rappr. legale</label>
                                        <input className="md-input" name="cognome_rappresentante" value={formData.cognome_rappresentante} onChange={handleChange} />
                                    </div>
                                    <div className="form-group grid-span-6">
                                        <label className="field-label">Nome Rappr. legale</label>
                                        <input className="md-input" name="nome_rappresentante" value={formData.nome_rappresentante} onChange={handleChange} />
                                    </div>

                                    {/* Note */}
                                    <div className="form-group grid-span-12">
                                        <label className="field-label" style={{ color: 'var(--success-color)', fontWeight: 'bold' }}>Note</label>
                                        <textarea className="md-input" name="note" placeholder="Note" style={{ height: '120px', resize: 'none' }} value={formData.note} onChange={handleChange}></textarea>
                                    </div>
                                </div>
                            ) : (
                            <div className="md-form-grid-custom">
                                
                                {/* Row 1 */}
                                <div className="form-group grid-span-3">
                                    <label className="field-label">Nome *</label>
                                    <input className="md-input" name="nome" value={formData.nome} onChange={handleChange} required />
                                </div>
                                <div className="form-group grid-span-3">
                                    <label className="field-label">Cognome *</label>
                                    <input className="md-input" name="cognome" value={formData.cognome} onChange={handleChange} required />
                                </div>
                                <div className="form-group grid-span-2">
                                    <label className="field-label">Sesso *</label>
                                    <select className="md-select" name="sesso" value={formData.sesso} onChange={handleChange} required>
                                        <option value="">Seleziona</option>
                                        <option value="M">MASCHIO</option>
                                        <option value="F">FEMMINA</option>
                                    </select>
                                </div>
                                <div className="form-group grid-span-4">
                                    <label className="field-label">Data nascita *</label>
                                    <div className="date-custom-icon" style={{position: 'relative', display: 'flex', alignItems: 'center'}}>
                                        <input 
                                            className="md-input" 
                                            type="date" 
                                            name="data_nascita" 
                                            value={formData.data_nascita} 
                                            onChange={handleChange} 
                                            required 
                                            style={{width: '100%', paddingRight: '35px'}}
                                        />
                                        <Calendar 
                                            size={18} 
                                            style={{position: 'absolute', right: '10px', color: '#6b7280', cursor: 'pointer', zIndex: 5}} 
                                            onClick={(e) => e.currentTarget.previousElementSibling.showPicker?.()} 
                                        />
                                    </div>
                                </div>

                                {/* Row 2 */}
                                <div className="form-group grid-span-2">
                                    <label className="field-label">Luogo di nascita *</label>
                                    <CityAutocomplete 
                                        name="luogo_nascita" 
                                        value={formData.luogo_nascita} 
                                        onChange={handleChange} 
                                        style={{width: '100%'}} 
                                        required
                                    />
                                </div>
                                <div className="form-group grid-span-2">
                                    <label className="field-label">Codice Fiscale *</label>
                                    <input 
                                        className="md-input" 
                                        name="codice_fiscale" 
                                        value={formData.codice_fiscale} 
                                        onChange={handleChange} 
                                        required 
                                        style={{
                                            transition: 'all 0.5s ease',
                                            borderColor: highlightCF ? '#22c55e' : undefined,
                                            backgroundColor: highlightCF ? '#dcfce7' : undefined,
                                            boxShadow: highlightCF ? '0 0 0 2px rgba(34, 197, 94, 0.2)' : undefined
                                        }}
                                    />
                                </div>
                                <div className="form-group grid-span-3">
                                    <label className="field-label">Email *</label>
                                    <input 
                                        className="md-input" 
                                        type="email" 
                                        name="email" 
                                        value={formData.email} 
                                        onChange={handleChange} 
                                        onBlur={handleEmailBlur} 
                                        required 
                                        style={emailError ? { borderColor: '#ef4444' } : {}}
                                    />
                                    {emailError && <span style={{color: '#ef4444', fontSize: '11px', marginTop: '2px'}}>{emailError}</span>}
                                </div>
                                <div className="form-group grid-span-5">
                                    <label className="field-label">Telefono *</label>
                                    <input className="md-input" name="telefono" value={formData.telefono} onChange={handleChange} required />
                                </div>

                                {/* Row 3 - Indirizzo */}
                                <div className="form-group grid-span-7">
                                    <label className="field-label">Indirizzo</label>
                                    <input className="md-input" name="indirizzo" placeholder="VIA..." value={formData.indirizzo} onChange={handleChange} />
                                </div>
                                <div className="form-group grid-span-3">
                                    <label className="field-label">Comune</label>
                                    <CityAutocomplete 
                                        name="comune" 
                                        value={formData.comune} 
                                        onChange={handleChange} 
                                        style={{width: '100%'}} 
                                    />
                                </div>
                                <div className="form-group grid-span-2">
                                    <label className="field-label">Cap</label>
                                    <input className="md-input" name="cap" value={formData.cap} onChange={handleChange} />
                                </div>

                                {/* Row 4 - Parents (Visible only if Minor) */}
                                {isMinorenne && (
                                    <>
                                        <div className="grid-span-12" style={{ marginTop: '16px', marginBottom: '8px', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px', color: '#4b5563', fontWeight: '500' }}>
                                            Dati Tutore / Genitore
                                        </div>
                                        <div className="form-group grid-span-4">
                                            <label className="field-label">Codice fiscale genitore <span style={{color:'#ef4444'}}>*</span></label>
                                            <input className="md-input" name="cf_genitore" placeholder="Codice fiscale" value={formData.cf_genitore} onChange={(e) => { handleChange(e); setGenitoreErrors(prev => ({...prev, cf_genitore: false})); }} style={genitoreErrors.cf_genitore ? {border: '1.5px solid #ef4444'} : {}} />
                                        </div>
                                        <div className="form-group grid-span-4">
                                            <label className="field-label">Nome genitore <span style={{color:'#ef4444'}}>*</span></label>
                                            <input className="md-input" name="nome_genitore" placeholder="Nome genitore" value={formData.nome_genitore} onChange={(e) => { handleChange(e); setGenitoreErrors(prev => ({...prev, nome_genitore: false})); }} style={genitoreErrors.nome_genitore ? {border: '1.5px solid #ef4444'} : {}} />
                                        </div>
                                        <div className="form-group grid-span-4">
                                            <label className="field-label">Cognome genitore <span style={{color:'#ef4444'}}>*</span></label>
                                            <input className="md-input" name="cognome_genitore" placeholder="Cognome genitore" value={formData.cognome_genitore} onChange={(e) => { handleChange(e); setGenitoreErrors(prev => ({...prev, cognome_genitore: false})); }} style={genitoreErrors.cognome_genitore ? {border: '1.5px solid #ef4444'} : {}} />
                                        </div>
                                        <div className="form-group grid-span-6">
                                            <label className="field-label">Recapito 1 genitore <span style={{color:'#ef4444'}}>*</span></label>
                                            <input className="md-input" name="recapito_2" placeholder="Recapito 1" value={formData.recapito_2} onChange={(e) => { handleChange(e); setGenitoreErrors(prev => ({...prev, recapito_2: false})); }} style={genitoreErrors.recapito_2 ? {border: '1.5px solid #ef4444'} : {}} />
                                        </div>
                                        <div className="form-group grid-span-6">
                                            <label className="field-label">Recapito 2 genitore</label>
                                            <input className="md-input" name="recapito_3" placeholder="Recapito 2" value={formData.recapito_3} onChange={handleChange} />
                                        </div>
                                    </>
                                )}

                                {/* Row 5 - Tessere */}
                                <div className="form-group grid-span-3" style={{display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: '20px'}}>
                                    <label className="field-label">Data Ammissione (Libro Soci)</label>
                                    <input 
                                        className="md-input" 
                                        type="date" 
                                        name="data_ammissione" 
                                        value={formData.data_ammissione} 
                                        onChange={handleChange} 
                                    />
                                </div>
                                <div className="form-group grid-span-3" style={{display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: '20px'}}>
                                    <label className="field-label">Ultima Iscrizione</label>
                                    <input 
                                        className="md-input" 
                                        type="date" 
                                        value={currentIscrizioneDate} 
                                        readOnly 
                                        style={{ backgroundColor: '#f9fafb', color: '#374151' }}
                                    />
                                </div>
                                <div className="form-group grid-span-2" style={{display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: '20px'}}>
                                    <label className="field-label">Data Tesseramento</label>
                                    <input
                                        className="md-input"
                                        type="date"
                                        value={dataTesseramento}
                                        readOnly
                                        style={{ backgroundColor: '#f9fafb', color: dataTesseramento ? '#374151' : '#9ca3af' }}
                                    />
                                </div>
                                <div className="form-group grid-span-4" style={{display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'}}>
                                    <label className="field-label" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                        <input 
                                            type="checkbox" 
                                            name="ha_certificato" 
                                            checked={haCertificato} 
                                            onChange={handleChange} 
                                            style={{width: 'auto', margin: 0}}
                                        />
                                        Ha certificato
                                    </label>
                                    <div style={{display: 'flex', gap: '8px', alignItems: 'flex-start'}}>
                                        <div className="date-custom-icon" style={{position: 'relative', display: 'flex', alignItems: 'center', flex: 1}}>
                                            <input 
                                                className="md-input" 
                                                type="date" 
                                                name="scadenza_certificato" 
                                                value={formData.scadenza_certificato} 
                                                onChange={handleChange} 
                                                disabled={!haCertificato}
                                                title="Data presentazione certificato"
                                                style={{
                                                    width: '100%', 
                                                    paddingRight: '35px',
                                                    backgroundColor: !haCertificato ? '#f3f4f6' : undefined,
                                                    color: !haCertificato ? '#9ca3af' : undefined
                                                }}
                                            />
                                            <Calendar 
                                                size={18} 
                                                style={{
                                                    position: 'absolute', 
                                                    right: '10px', 
                                                    color: haCertificato ? '#6b7280' : '#d1d5db',
                                                    cursor: haCertificato ? 'pointer' : 'default',
                                                    zIndex: 5
                                                }}
                                                onClick={(e) => haCertificato && e.currentTarget.previousElementSibling.showPicker?.()} 
                                            />
                                        </div>
                                        <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
                                            <input
                                                className="md-input"
                                                type="date"
                                                value={computeScadenzaCertificatoStr(formData.scadenza_certificato)}
                                                readOnly
                                                title="Scadenza certificato (calcolata automaticamente)"
                                                style={{
                                                    backgroundColor: '#f3f4f6',
                                                    color: formData.scadenza_certificato ? '#374151' : '#9ca3af',
                                                    cursor: 'default'
                                                }}
                                            />
                                            <span style={{fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, marginTop: '4px'}}>Scadenza</span>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Row 6 - Note and Extra */}
                                <div className="form-group grid-span-12" style={{gridRow: 'span 2'}}>
                                    <label className="field-label" style={{color: 'var(--success-color)', fontWeight:'bold'}}>Note</label>
                                    <textarea className="md-input" name="note" placeholder="Note" style={{height:'120px', resize:'none'}} value={formData.note} onChange={handleChange}></textarea>
                                </div>
                            </div>
                            )}
                        </form>
                    )}
                    
                    {activeTab === 'Comunicazioni' && (
                        isEditMode ? (
                            <div style={{padding: '24px'}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
                                    <h3 style={{margin: 0, fontSize: '1.2rem', fontWeight: 600, color: '#111827'}}>Comunicazioni</h3>
                                    <button 
                                        className="btn-save-full" 
                                        style={{width: 'auto', padding: '8px 16px', backgroundColor: '#10b981'}}
                                        onClick={() => setShowComunicazioneModal(true)}
                                    >
                                        <Mail size={18} style={{marginRight: '8px'}}/>
                                        Nuova Comunicazione
                                    </button>
                                </div>
                                
                                <div style={{
                                    backgroundColor: '#fff', 
                                    border: '1px solid #e5e7eb', 
                                    borderRadius: '8px', 
                                    overflow: 'hidden'
                                }}>
                                    {comunicazioni.length > 0 ? (
                                        <div style={{display: 'flex', flexDirection: 'column'}}>
                                            <div style={{
                                                display: 'grid', 
                                                gridTemplateColumns: '150px 80px 80px 1fr 120px', 
                                                padding: '12px 16px', 
                                                background: '#f9fafb', 
                                                borderBottom: '1px solid #e5e7eb', 
                                                fontWeight: 600, 
                                                fontSize: '0.85rem', 
                                                color: '#6b7280',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.025em'
                                            }}>
                                                <div>Data</div>
                                                <div>Tipo</div>
                                                <div>Stato</div>
                                                <div>Oggetto / Contenuto</div>
                                                <div>Mittente</div>
                                            </div>
                                            <div style={{maxHeight: '400px', overflowY: 'auto'}}>
                                            {comunicazioni.map((com) => (
                                                <div key={com.id} style={{
                                                    display: 'grid', 
                                                    gridTemplateColumns: '150px 80px 80px 1fr 120px', 
                                                    padding: '16px 16px', 
                                                    borderBottom: '1px solid #f3f4f6', 
                                                    fontSize: '0.9rem', 
                                                    alignItems: 'center',
                                                    backgroundColor: 'white'
                                                }}>
                                                    <div style={{
                                                        color: '#111827', 
                                                        fontSize: '0.85rem',
                                                        display: 'flex',
                                                        flexDirection: 'column'
                                                    }}>
                                                        <span>{new Date(com.data_invio || com.createdAt).toLocaleDateString()}</span>
                                                        <span style={{color: '#9ca3af', fontSize: '0.75rem'}}>{new Date(com.data_invio || com.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                    </div>
                                                    <div>
                                                        <span style={{
                                                            padding: '2px 8px', 
                                                            borderRadius: '9999px', 
                                                            fontSize: '0.7rem', 
                                                            fontWeight: 600,
                                                            backgroundColor: com.tipo === 'EMAIL' ? '#eff6ff' : '#fdf2f8',
                                                            color: com.tipo === 'EMAIL' ? '#2563eb' : '#db2777',
                                                            display: 'inline-block',
                                                            border: `1px solid ${com.tipo === 'EMAIL' ? '#dbeafe' : '#fce7f3'}`
                                                        }}>
                                                            {com.tipo}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            color: com.isInviato ? '#059669' : '#d97706',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 500
                                                        }}>
                                                            {com.isInviato ? <Check size={14} strokeWidth={2.5} /> : <Activity size={14} />} {com.isInviato ? 'Inviato' : 'In attesa'}
                                                        </span>
                                                    </div>
                                                    <div style={{
                                                        whiteSpace: 'nowrap', 
                                                        overflow: 'hidden', 
                                                        textOverflow: 'ellipsis', 
                                                        paddingRight: '16px',
                                                        color: '#374151',
                                                        display: 'flex',
                                                        alignItems: 'center'
                                                    }}>
                                                        {com.tipo === 'EMAIL' && com.oggetto ? (
                                                            <div style={{maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600, color: '#111827', marginRight: '6px'}} title={com.oggetto}>{com.oggetto}</div>
                                                        ) : null}
                                                        <div style={{
                                                            color: '#6b7280', 
                                                            fontSize: '0.85rem',
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            flex: 1
                                                        }} title={com.testo ? com.testo.replace(/<[^>]+>/g, '') : ''}>
                                                            {com.tipo === 'EMAIL' && com.oggetto ? '- ' : ''}
                                                            {com.testo ? com.testo.replace(/<[^>]+>/g, '') : ''}
                                                        </div>
                                                    </div>
                                                    <div style={{fontSize: '0.85rem', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                                        {com.mittente_nome || 'Sistema'}
                                                    </div>
                                                </div>
                                            ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{padding: '60px 20px', textAlign: 'center', color: '#9ca3af', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                                            <div style={{backgroundColor: '#f3f4f6', padding: '16px', borderRadius: '50%', marginBottom: '16px'}}>
                                                <Mail size={32} />
                                            </div>
                                            <p style={{margin: 0, fontWeight: 500}}>Nessuna comunicazione inviata</p>
                                            <p style={{margin: '8px 0 0 0', fontSize: '0.9rem', maxWidth: '300px'}}>Utilizza il pulsante "Nuova Comunicazione" per inviare email o SMS a questo socio.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div style={{padding: '24px', textAlign: 'center', color: '#6b7280'}}>
                                Devi prima salvare il socio per inviare comunicazioni.
                            </div>
                        )
                    )}

                    {/* ── Tab Storico ──────────────────────────────────── */}
                    {activeTab === 'Storico' && (
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px 16px', borderBottom: '1px solid #f3f4f6' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <ClipboardList size={20} color="#6b7280" />
                                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#111827' }}>Storico attività</h3>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#9ca3af' }}>Log completo di ordini, abbonamenti, comunicazioni e accessi del socio</p>
                                </div>
                                <button
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '7px', border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.83rem', color: '#374151' }}
                                    onClick={() => { setShowNotaForm(true); setNotaTesto(''); setNotaFile(null); }}
                                >
                                    <PlusCircle size={15} /> Aggiungi nota
                                </button>
                            </div>

                            {/* Form nuova nota */}
                            {showNotaForm && (
                                <div style={{ padding: '16px 28px 0' }}>
                                    <div style={{ border: '1px solid #e0e0e0', borderRadius: '6px', padding: '16px', backgroundColor: '#fafafa' }}>
                                        <div className="form-group" style={{ marginBottom: '12px' }}>
                                            <label className="field-label">Testo nota *</label>
                                            <textarea
                                                rows={3}
                                                value={notaTesto}
                                                onChange={e => setNotaTesto(e.target.value)}
                                                placeholder="Inserisci una nota..."
                                                className="md-input"
                                                style={{ resize: 'vertical', fontFamily: 'inherit' }}
                                            />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: '14px' }}>
                                            <label className="field-label">Allegato</label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#374151', cursor: 'pointer', padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: '4px', background: '#fff', fontWeight: 500 }}>
                                                    <Paperclip size={14} color="#6b7280" />
                                                    {notaFile ? notaFile.name : 'Scegli file…'}
                                                    <input type="file" style={{ display: 'none' }} onChange={e => setNotaFile(e.target.files[0] || null)} />
                                                </label>
                                                {notaFile && (
                                                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }} onClick={() => setNotaFile(null)}>
                                                        <X size={13} /> Rimuovi
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button className="btn-outlined" style={{ height: '32px', fontSize: '0.82rem', padding: '0 14px' }}
                                                onClick={() => { setShowNotaForm(false); setNotaTesto(''); setNotaFile(null); }}>
                                                Annulla
                                            </button>
                                            <button
                                                className="btn-contained"
                                                disabled={notaLoading || !notaTesto.trim()}
                                                style={{ height: '32px', fontSize: '0.82rem', padding: '0 14px', opacity: notaLoading || !notaTesto.trim() ? 0.5 : 1, cursor: notaLoading || !notaTesto.trim() ? 'not-allowed' : 'pointer' }}
                                                onClick={handleSalvaNota}
                                            >
                                                {notaLoading ? 'Salvataggio…' : 'Salva nota'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Timeline */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 28px' }}>
                                {storicoLoading ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Caricamento…</div>
                                ) : storicoTimeline.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ backgroundColor: '#f3f4f6', padding: '16px', borderRadius: '50%' }}>
                                            <ClipboardList size={32} />
                                        </div>
                                        <p style={{ margin: 0, fontWeight: 500 }}>Nessuna attività registrata</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                                        {storicoTimeline.map((item, idx) => {
                                            const cfg = storicoTipoConfig[item.tipo] || { color: '#6b7280', bg: '#f9fafb', label: item.tipo, icon: <ClipboardList size={14}/> };
                                            return (
                                                <div key={item.id} style={{ display: 'flex', gap: '12px', paddingBottom: idx < storicoTimeline.length - 1 ? '0' : '0' }}>
                                                    {/* Timeline line + dot */}
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '28px', flexShrink: 0 }}>
                                                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: cfg.bg, border: `2px solid ${cfg.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: cfg.color }}>
                                                            {cfg.icon}
                                                        </div>
                                                        {idx < storicoTimeline.length - 1 && (
                                                            <div style={{ width: '2px', flex: 1, backgroundColor: '#e5e7eb', minHeight: '20px', margin: '2px 0' }} />
                                                        )}
                                                    </div>

                                                    {/* Content */}
                                                    <div style={{ flex: 1, paddingBottom: '16px', minWidth: 0 }}>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 7px', borderRadius: '10px', backgroundColor: cfg.bg, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                                                                    {cfg.label}
                                                                </span>
                                                            </div>
                                                            <span style={{ fontSize: '0.75rem', color: '#9ca3af', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                                                {item.data.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                                {' '}
                                                                {item.data.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        <p style={{ margin: '4px 0 4px', fontSize: '0.88rem', color: '#111827', wordBreak: 'break-word', lineHeight: 1.5 }}>
                                                            {item.azione}
                                                        </p>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                                            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                                                <span style={{ fontWeight: 600 }}>
                                                                    {item.owner === 'Sistema' ? '🤖' : '👤'} {item.owner}
                                                                </span>
                                                            </span>
                                                            {item.allegato && (
                                                                <a
                                                                    href={`/users/api/soci/${formData.id}/storico/${item.allegato.storiciId}/allegato`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}
                                                                >
                                                                    <Download size={12} /> {item.allegato.nome}
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'Ordini' && (
                        <div>
                            <div style={{marginBottom: '12px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                <h3 style={{margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#111827'}}>Ordini</h3>
                                <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                                    <span style={{fontSize: '0.85rem', color: '#6b7280'}}>
                                        {filteredPagamenti.length}{filteredPagamenti.length !== socioPagamenti.length ? ` / ${socioPagamenti.length}` : ''} ordin{filteredPagamenti.length === 1 ? 'e' : 'i'}
                                    </span>
                                    {isEditMode && formData.id && (
                                        <button
                                            style={{display:'flex', alignItems:'center', gap:'6px', padding:'5px 13px', fontSize:'0.85rem', fontWeight:600, background:'var(--accent, #2563eb)', color:'#fff', border:'none', borderRadius:'6px', cursor:'pointer'}}
                                            onClick={() => navigate('/nuovo-ordine', { state: { socio: { id: formData.id, nome: formData.nome, cognome: formData.cognome, codice_fiscale: formData.codice_fiscale, cf_genitore: formData.cf_genitore, partita_iva: formData.partita_iva, data_nascita: formData.data_nascita, nome_genitore: formData.nome_genitore, cognome_genitore: formData.cognome_genitore } } })}
                                        >
                                            <CreditCard size={15} /> Nuovo ordine
                                        </button>
                                    )}
                                </div>
                            </div>
                            {/* Banner scadenze */}
                            {scadenzeAlertCount > 0 && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    backgroundColor: '#fff8e1', border: '1px solid #f59e0b',
                                    borderRadius: '6px', padding: '9px 14px', marginBottom: '12px',
                                    fontSize: '0.82rem', color: '#78350f'
                                }}>
                                    <AlertTriangle size={15} style={{color: '#f59e0b', flexShrink: 0}} />
                                    <span>
                                        <strong>{scadenzeAlertCount}</strong> quota{scadenzeAlertCount > 1 ? '/e' : ''} con scadenza imminente o scaduta —
                                        usa <strong>Rinnova</strong> sulla riga corrispondente per registrare il rinnovo.
                                    </span>
                                </div>
                            )}
                            {/* Filtri live */}
                            <div style={{display:'flex', flexWrap:'wrap', gap:'8px', marginBottom:'12px', alignItems:'flex-end'}}>
                                <div style={{display:'flex', flexDirection:'column', flex:'2 1 160px', minWidth:'140px'}}>
                                    <label style={{fontSize:'0.78rem', marginBottom:'3px', color:'#6b7280'}}>Descrizione</label>
                                    <input
                                        className="md-input"
                                        placeholder="Cerca in quote..."
                                        style={{padding:'5px 10px', fontSize:'0.85rem'}}
                                        value={pagFiltroDescrizione}
                                        onChange={e => setPagFiltroDescrizione(e.target.value)}
                                    />
                                </div>
                                <div style={{display:'flex', flexDirection:'column', flex:'1 1 120px', minWidth:'110px'}}>
                                    <label style={{fontSize:'0.78rem', marginBottom:'3px', color:'#6b7280'}}>Anno / Stagione</label>
                                    <select
                                        className="md-select"
                                        style={{padding:'5px 10px', fontSize:'0.85rem'}}
                                        value={pagFiltroAnno}
                                        onChange={e => setPagFiltroAnno(e.target.value)}
                                    >
                                        <option value="TUTTI">Tutti</option>
                                        {pagAnniDisponibili.map(anno => (
                                            <option key={anno} value={anno}>{formatAnnoLabel(anno)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{display:'flex', flexDirection:'column', flex:'1 1 120px', minWidth:'110px'}}>
                                    <label style={{fontSize:'0.78rem', marginBottom:'3px', color:'#6b7280'}}>N. Ricevuta</label>
                                    <input
                                        className="md-input"
                                        placeholder="Es. 42"
                                        style={{padding:'5px 10px', fontSize:'0.85rem'}}
                                        value={pagFiltroRicevuta}
                                        onChange={e => { if (/^\d*$/.test(e.target.value)) setPagFiltroRicevuta(e.target.value); }}
                                        inputMode="numeric"
                                    />
                                </div>
                                {(pagFiltroDescrizione || pagFiltroAnno !== 'TUTTI' || pagFiltroRicevuta) && (
                                    <button
                                        style={{alignSelf:'flex-end', padding:'5px 12px', fontSize:'0.8rem', border:'1px solid #d1d5db', borderRadius:'4px', background:'#f9fafb', cursor:'pointer', color:'#6b7280'}}
                                        onClick={() => { setPagFiltroDescrizione(''); setPagFiltroAnno('TUTTI'); setPagFiltroRicevuta(''); }}
                                    >Azzera</button>
                                )}
                            </div>
                            <div className="table-responsive">
                                <table className="md-table" style={{ borderCollapse: 'separate', borderSpacing: '0 4px', backgroundColor: 'transparent', width: '100%' }}>
                                    <thead>
                                        <tr style={{backgroundColor: '#f1c40f', color: '#fff'}}>
                                            <th style={{padding: '12px', borderTopLeftRadius: '6px', borderBottomLeftRadius: '6px', color:'#000'}}>Intestatario - Data - Operatore</th>
                                            <th style={{padding: '12px', color:'#000'}}>Identificativi documento</th>
                                            <th style={{padding: '12px', color:'#000'}}>Quote</th>
                                            <th style={{padding: '12px', textAlign:'right', color:'#000'}}>Importo</th>
                                            <th style={{padding: '12px', textAlign:'right', borderTopRightRadius: '6px', borderBottomRightRadius: '6px', color:'#000'}}>Azioni</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pagamentiLoading ? (
                                            <tr>
                                                <td colSpan="5" style={{textAlign:'center', padding:'32px', color:'var(--text-secondary)'}}>
                                                    Caricamento...
                                                </td>
                                            </tr>
                                        ) : filteredPagamenti.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" style={{textAlign:'center', padding:'32px', color:'var(--text-secondary)'}}>
                                                    {socioPagamenti.length === 0 ? 'Nessun ordine trovato' : 'Nessun ordine corrisponde ai filtri'}
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredPagamenti.map(p => {
                                                const amount = parseFloat(p.importo);
                                                const isEntrata = amount >= 0;
                                                const scad = scadenzaMap[p.id];
                                                const hasScadAlert = scad && (scad.stato === 'SCADUTO' || scad.stato === 'IN SCADENZA');
                                                // Bordo e sfondo: la scadenza ha priorità rispetto al segno dell'importo
                                                const borderColor = scad
                                                    ? scad.stato === 'SCADUTO' ? '#e74c3c'
                                                    : scad.stato === 'IN SCADENZA' ? '#f39c12'
                                                    : '#2ecc71'
                                                    : isEntrata ? '#2ecc71' : '#e74c3c';
                                                const rowBg = scad?.stato === 'SCADUTO' ? '#fceceb'
                                                    : scad?.stato === 'IN SCADENZA' ? '#fef9e7'
                                                    : isEntrata ? '#fff' : '#fceceb';
                                                return (
                                                    <tr key={p.id} style={{
                                                        backgroundColor: rowBg,
                                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                                        borderLeft: `5px solid ${borderColor}`
                                                    }}>
                                                        <td style={{padding: '12px', borderTopLeftRadius: '4px', borderBottomLeftRadius: '4px'}}>
                                                            <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                                                                <div style={{width:'36px', height:'36px', borderRadius:'50%', backgroundColor: isEntrata ? '#e8f8f5' : '#fdedec', color: isEntrata ? '#2ecc71' : '#e74c3c', display:'flex', alignItems:'center', justifyContent:'center'}}>
                                                                    {renderPaymentIcon(p.modalita_pagamento)}
                                                                </div>
                                                                <div>
                                                                    <div style={{fontWeight:'600', color: 'var(--text-primary)'}}>{p.intestatario}</div>
                                                                    <div style={{fontSize:'0.8rem', color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:'4px'}}>
                                                                        {p.data_pagamento} <User size={12}/> {p.utente_nome || 'ADMIN'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style={{padding: '12px'}}>
                                                            <div style={{display:'flex', flexDirection:'column', gap:'4px'}}>
                                                                <span style={getStatoOrdineBadgeStyle(getStatoOrdine(p))}>
                                                                    {(() => { const s = getStatoOrdine(p); return s === 'proforma' ? '—' : (p.numero_ricevuta || `#${p.id}`); })()}
                                                                </span>
                                                                <span style={getStatoOrdineBadgeStyle(getStatoOrdine(p))}>
                                                                    {getStatoOrdine(p)?.toUpperCase()}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td style={{padding: '12px'}}>
                                                            <div style={{display:'flex', flexDirection:'column', gap:'4px'}}>
                                                                {(p.quote || '').split(', ').map((q, i) => (
                                                                    <span key={i} style={{
                                                                        border: '1px solid #ccc', borderRadius: '12px', padding: '3px 10px', fontSize: '0.8rem', background: '#fff', display: 'inline-block'
                                                                    }}>
                                                                        {q}
                                                                    </span>
                                                                ))}
                                                                {scad && (
                                                                    <div style={{display:'flex', alignItems:'center', gap:'5px', marginTop:'2px', flexWrap:'wrap'}}>
                                                                        <span style={{
                                                                            fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 7px', borderRadius: '10px',
                                                                            backgroundColor: scad.stato === 'SCADUTO' ? '#e74c3c' : scad.stato === 'IN SCADENZA' ? '#f39c12' : '#2ecc71',
                                                                            color: 'white', whiteSpace: 'nowrap'
                                                                        }}>
                                                                            {scad.stato}
                                                                        </span>
                                                                        <span style={{fontSize:'0.72rem', color:'#6b7280', whiteSpace:'nowrap'}}>
                                                                            scad. {new Date(scad.scadenzaStr).toLocaleDateString('it-IT', {day:'2-digit', month:'2-digit', year:'numeric'})}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td style={{padding: '12px', textAlign:'right'}}>
                                                            <span style={{
                                                                backgroundColor: isEntrata ? '#2ecc71' : '#f1948a',
                                                                color: 'white', padding: '4px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '1rem', minWidth: '80px', display: 'inline-block', textAlign: 'right'
                                                            }}>
                                                                {Math.abs(amount).toFixed(2).replace('.', ',')}
                                                            </span>
                                                        </td>
                                                        <td style={{padding: '12px', textAlign:'right', borderTopRightRadius: '4px', borderBottomRightRadius: '4px'}}>
                                                            <div style={{display:'flex', justifyContent:'flex-end', alignItems:'center', gap:'5px', flexWrap:'nowrap'}}>
                                                                {isEntrata && (p.quote_types || '').trim().toLowerCase() === 'subscription' && (
                                                                    <button
                                                                        title="Rinnova abbonamento"
                                                                        onClick={() => handleRinnovaPagamento(p)}
                                                                        style={{
                                                                            padding: 0, border: 'none', width: '32px', height: '32px', borderRadius: '4px',
                                                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                                            cursor: 'pointer',
                                                                            backgroundColor: scad?.stato === 'SCADUTO' ? '#e74c3c' : scad?.stato === 'IN SCADENZA' ? '#f39c12' : '#6b7280',
                                                                            color: 'white'
                                                                        }}
                                                                    >
                                                                        <RefreshCw size={16} />
                                                                    </button>
                                                                )}
                                                                <button
                                                                    style={{padding: 0, border:'none', width:'32px', height:'32px', borderRadius:'4px', display:'inline-flex', alignItems:'center', justifyContent:'center', cursor:'pointer', backgroundColor: '#f1c40f', color:'white'}}
                                                                    title="Dettaglio"
                                                                    onClick={() => setSelectedPaymentDetail(p)}
                                                                >
                                                                    <Folder size={16} />
                                                                </button>
                                                                <button style={{padding: 0, border:'none', width:'32px', height:'32px', borderRadius:'4px', display:'inline-flex', alignItems:'center', justifyContent:'center', cursor:'pointer', backgroundColor: '#1abc9c', color:'white'}} title="Stampa" onClick={() => handlePrintPayment(p)}><Printer size={16} /></button>
                                                                <button style={{padding: 0, border:'none', width:'32px', height:'32px', borderRadius:'4px', display:'inline-flex', alignItems:'center', justifyContent:'center', cursor:'pointer', backgroundColor: '#5dade2', color:'white'}} title="Invia email" onClick={() => setShowComunicazioneModal(true)}><Mail size={16} /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {filteredPagamenti.length > 0 && (
                                <div style={{display:'flex', justifyContent:'flex-end', alignItems:'center', paddingTop:'12px', gap:'10px'}}>
                                    <span style={{fontSize:'0.85rem', color:'#6b7280'}}>Totale entrate:</span>
                                    <span style={{backgroundColor:'#2ecc71', color:'white', padding:'5px 15px', borderRadius:'4px', fontWeight:'bold'}}>
                                        € {filteredPagamenti.filter(p => parseFloat(p.importo) >= 0).reduce((acc, p) => acc + parseFloat(p.importo), 0).toFixed(2).replace('.', ',')}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'Abbonamenti' && (
                        <div style={{padding: '24px'}}>
                            <div style={{marginBottom: '16px'}}>
                                <h3 style={{margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#111827'}}>Abbonamenti</h3>
                            </div>
                            {abbonamenti.length === 0 ? (
                                <div style={{textAlign: 'center', padding: '48px', color: '#6b7280', fontSize: '0.95rem'}}>
                                    Nessun abbonamento trovato
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="md-table" style={{borderCollapse: 'separate', borderSpacing: '0 6px', backgroundColor: 'transparent', width: '100%'}}>
                                        <thead>
                                            <tr style={{backgroundColor: '#f1c40f', color: '#000'}}>
                                                <th style={{padding: '10px 14px', borderTopLeftRadius: '6px', borderBottomLeftRadius: '6px'}}>Abbonamento</th>
                                                <th style={{padding: '10px 14px'}}>Ult. pagamento</th>
                                                <th style={{padding: '10px 14px'}}>Scadenza</th>
                                                <th style={{padding: '10px 14px', borderTopRightRadius: '6px', borderBottomRightRadius: '6px'}}>Stato</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {abbonamenti.map(abb => {
                                                const borderColor = abb.stato === 'SCADUTO' ? '#e74c3c'
                                                    : abb.stato === 'IN SCADENZA' ? '#f39c12'
                                                    : '#2ecc71';
                                                const rowBg = abb.stato === 'SCADUTO' ? '#fceceb'
                                                    : abb.stato === 'IN SCADENZA' ? '#fef9e7'
                                                    : '#fff';
                                                const statoBg = abb.stato === 'SCADUTO' ? '#e74c3c'
                                                    : abb.stato === 'IN SCADENZA' ? '#f39c12'
                                                    : '#2ecc71';
                                                return (
                                                    <tr key={abb.productId ?? '__unknown__'} style={{
                                                        backgroundColor: rowBg,
                                                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                                                        borderLeft: `5px solid ${borderColor}`,
                                                    }}>
                                                        <td style={{padding: '12px 14px', fontWeight: 600, color: '#111827', borderTopLeftRadius: '4px', borderBottomLeftRadius: '4px'}}>
                                                            {abb.productName}
                                                        </td>
                                                        <td style={{padding: '12px 14px', fontSize: '0.88rem', color: '#374151'}}>
                                                            {formatDateIT(abb.latestPayment.data_pagamento)}
                                                        </td>
                                                        <td style={{padding: '12px 14px', fontSize: '0.88rem', color: '#374151'}}>
                                                            {abb.scadenzaDate
                                                                ? abb.scadenzaDate.toLocaleDateString('it-IT', {day: '2-digit', month: '2-digit', year: 'numeric'})
                                                                : '-'}
                                                        </td>
                                                        <td style={{padding: '12px 14px', borderTopRightRadius: '4px', borderBottomRightRadius: '4px'}}>
                                                            {abb.stato ? (
                                                                <span style={{
                                                                    display: 'inline-block',
                                                                    padding: '3px 10px',
                                                                    borderRadius: '10px',
                                                                    fontSize: '0.78rem',
                                                                    fontWeight: 700,
                                                                    color: 'white',
                                                                    backgroundColor: statoBg,
                                                                }}>
                                                                    {abb.stato}
                                                                </span>
                                                            ) : '-'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'Attività' && (
                        <div style={{padding: '24px'}}>
                            {/* Header */}
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
                                <h3 style={{margin:0, fontSize:'1.1rem', fontWeight:600, color:'#111827'}}>Corsi frequentati</h3>
                                <button
                                    className="btn-save-full"
                                    style={{width:'auto', padding:'8px 16px', backgroundColor:'#10b981', display:'flex', alignItems:'center', gap:'8px'}}
                                    onClick={() => { fetchTuttiCorsiEProdotti(); setShowAggiungiCorsoModal(true); }}
                                >
                                    <PlusCircle size={18}/>
                                    Aggiungi Corso
                                </button>
                            </div>

                            {corsiLoading ? (
                                <div style={{textAlign:'center', padding:'40px', color:'#9ca3af'}}>Caricamento...</div>
                            ) : socioCorsi.length === 0 ? (
                                <div style={{textAlign:'center', padding:'60px 20px', color:'#9ca3af', display:'flex', flexDirection:'column', alignItems:'center', gap:'12px'}}>
                                    <div style={{backgroundColor:'#f3f4f6', padding:'16px', borderRadius:'50%'}}>
                                        <BookOpen size={32}/>
                                    </div>
                                    <p style={{margin:0, fontWeight:500}}>Nessun corso associato</p>
                                    <p style={{margin:0, fontSize:'0.9rem'}}>Usa "Aggiungi Corso" per iscrivere il socio a un corso.</p>
                                </div>
                            ) : (
                                <div style={{backgroundColor:'#fff', border:'1px solid #e5e7eb', borderRadius:'8px', overflow:'hidden'}}>
                                    {/* Table header */}
                                    <div style={{display:'grid', gridTemplateColumns:'2fr 1.5fr 1.5fr 1.5fr 1.5fr 120px', padding:'10px 16px', background:'#f9fafb', borderBottom:'1px solid #e5e7eb', fontWeight:600, fontSize:'0.8rem', color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.025em'}}>
                                        <div>Attività / Corso</div>
                                        <div>Orario</div>
                                        <div>Struttura / Sala</div>
                                        <div>Istruttore</div>
                                        <div>Scad. Abbonamento</div>
                                        <div style={{textAlign:'center'}}>Azioni</div>
                                    </div>
                                    {socioCorsi.map(iscrizione => {
                                        const corso = iscrizione.corso;
                                        if (!corso) return null;
                                        const scadenzaStr = getScadenzaAbbonamentoPerCorso(corso.abbonamentoId);
                                        const scadDate = scadenzaStr ? new Date(scadenzaStr + 'T00:00:00') : null;
                                        const stato = computeStatoPagamentoScadenza(scadDate);
                                        const colore = corso.attivita?.colore;
                                        const coloriBg = {
                                            'ROSSO':'#e53935','VERDE':'#43a047','BLU':'#1e88e5','VERDE CHIARO':'#66bb6a',
                                            'CELESTE':'#26c6da','ARANCIONE':'#fb8c00','VIOLA':'#8e24aa','GIALLO':'#fdd835',
                                            'GRIGIO':'#78909c','ROSA':'#e91e63',
                                        };
                                        const colBg = coloriBg[colore] || '#9e9e9e';
                                        return (
                                            <div key={iscrizione.id} style={{display:'grid', gridTemplateColumns:'2fr 1.5fr 1.5fr 1.5fr 1.5fr 120px', padding:'14px 16px', borderBottom:'1px solid #f3f4f6', alignItems:'center', fontSize:'0.9rem'}}>
                                                <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                                                    {colore && (
                                                        <span style={{width:'10px', height:'10px', borderRadius:'50%', backgroundColor:colBg, flexShrink:0, display:'inline-block'}}/>
                                                    )}
                                                    <div>
                                                        <div style={{fontWeight:600, color:'#111827'}}>{corso.attivita?.descrizione || '-'}</div>
                                                        {corso.descrizione && <div style={{fontSize:'0.8rem', color:'#6b7280'}}>{corso.descrizione}</div>}
                                                    </div>
                                                </div>
                                                <div style={{color:'#374151'}}>
                                                    <div>{GIORNI_SETTIMANA[corso.giorno] || '-'}</div>
                                                    <div style={{fontSize:'0.8rem', color:'#6b7280'}}>{corso.oraInizio} · {corso.durataMinuti} min</div>
                                                </div>
                                                <div style={{color:'#374151'}}>
                                                    <div>{corso.struttura?.descrizione || '-'}</div>
                                                    {corso.area && <div style={{fontSize:'0.8rem', color:'#6b7280'}}>{corso.area.descrizione}</div>}
                                                </div>
                                                <div style={{color:'#374151'}}>
                                                    {corso.staff ? `${corso.staff.nome} ${corso.staff.cognome}` : '-'}
                                                </div>
                                                <div style={{display:'flex', flexDirection:'column', gap:'4px'}}>
                                                    <span style={{color:'#374151', fontSize:'0.85rem'}}>{scadenzaStr ? formatDateIT(scadenzaStr) : '-'}</span>
                                                    <ScadenzaBadge stato={stato}/>
                                                </div>
                                                <div style={{display:'flex', gap:'6px', justifyContent:'center'}}>
                                                    <button
                                                        title="Dettaglio corso"
                                                        style={{padding:0, border:'none', width:'30px', height:'30px', borderRadius:'4px', display:'inline-flex', alignItems:'center', justifyContent:'center', cursor:'pointer', backgroundColor:'#3b82f6', color:'white'}}
                                                        onClick={() => setCorsoDettaglio(corso)}
                                                    >
                                                        <Eye size={14}/>
                                                    </button>
                                                    <button
                                                        title="Disiscrivi"
                                                        style={{padding:0, border:'none', width:'30px', height:'30px', borderRadius:'4px', display:'inline-flex', alignItems:'center', justifyContent:'center', cursor:'pointer', backgroundColor:'#ef4444', color:'white'}}
                                                        onClick={async () => {
                                                            const ok = await confirm({ title:'Disiscrivi dal corso', message:`Vuoi rimuovere il socio dal corso "${corso.attivita?.descrizione || ''}"?`, confirmText:'Disiscrivi', cancelText:'Annulla' });
                                                            if (!ok) return;
                                                            try {
                                                                const res = await fetch(`/activities/api/corsi/${corso.id}/iscritti/${formData.id}`, { method:'DELETE' });
                                                                if (res.ok) {
                                                                    setSocioCorsi(prev => prev.filter(i => i.id !== iscrizione.id));
                                                                    showSnackbar('Socio disiscritto dal corso');
                                                                    logToStorico('iscrizione_attivita',
                                                                        `Disiscritto dal corso "${corso.attivita?.descrizione || corso.descrizione || 'corso'}"`,
                                                                        { corso_id: corso.id, attivita: corso.attivita?.descrizione }
                                                                    );
                                                                } else {
                                                                    showSnackbar('Errore durante la disiscrizione', 'error');
                                                                }
                                                            } catch {
                                                                showSnackbar('Errore di rete', 'error');
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 size={14}/>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab !== 'Anagrafica' && activeTab !== 'Comunicazioni' && activeTab !== 'Ordini' && activeTab !== 'Attività' && activeTab !== 'AccessoFrontend' && activeTab !== 'Abbonamenti' && activeTab !== 'DatiAssociazione' && activeTab !== 'Contatti' && activeTab !== 'Storico' && (
                        <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100%', color:'#aaa'}}>
                             Contenuto placeholder per {activeTab}
                        </div>
                    )}

                    {/* ── Tab Dati Associazione ────────────────────────── */}
                    {activeTab === 'DatiAssociazione' && (
                        <div className="md-form-grid-custom">

                            {/* Sezione: Affiliazione */}
                            <div className="form-group grid-span-12" style={{ marginBottom: '4px' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Affiliazione</span>
                            </div>

                            <div className="form-group grid-span-3">
                                <label className="field-label">Anno associativo</label>
                                <input
                                    className="md-input"
                                    name="anno_associativo"
                                    value={formData.anno_associativo}
                                    onChange={handleChange}
                                    placeholder="es. 01/09-31/08"
                                />
                            </div>
                            <div className="form-group grid-span-3">
                                <label className="field-label">Codice affiliazione</label>
                                <input
                                    className="md-input"
                                    name="codice_affiliazione"
                                    value={formData.codice_affiliazione}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="form-group grid-span-3">
                                <label className="field-label">Scadenza affiliazione</label>
                                <input
                                    className="md-input"
                                    type="date"
                                    name="scadenza_affiliazione"
                                    value={formData.scadenza_affiliazione}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="form-group grid-span-3">
                                <label className="field-label">Costo affiliazione (€)</label>
                                <input
                                    className="md-input"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    name="costo_affiliazione"
                                    value={formData.costo_affiliazione}
                                    onChange={handleChange}
                                />
                            </div>

                            {/* Sezione: Costi tessere */}
                            <div className="form-group grid-span-12" style={{ marginBottom: '4px', marginTop: '8px' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Costi tessere</span>
                            </div>

                            <div className="form-group grid-span-4">
                                <label className="field-label">Costo tessera base (€)</label>
                                <input
                                    className="md-input"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    name="costo_tessera_base"
                                    value={formData.costo_tessera_base}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="form-group grid-span-4">
                                <label className="field-label">Costo tessera associativa (€)</label>
                                <input
                                    className="md-input"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    name="costo_tessera_associativa"
                                    value={formData.costo_tessera_associativa}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="form-group grid-span-4">
                                <label className="field-label">Costo tessera completa (€)</label>
                                <input
                                    className="md-input"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    name="costo_tessera_completa"
                                    value={formData.costo_tessera_completa}
                                    onChange={handleChange}
                                />
                            </div>

                            {/* Sezione: Consiglio direttivo */}
                            <div className="form-group grid-span-12" style={{ marginBottom: '4px', marginTop: '8px' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Consiglio direttivo</span>
                            </div>

                            <div className="form-group grid-span-4">
                                <label className="field-label">Durata consiglio direttivo (anni)</label>
                                <input
                                    className="md-input"
                                    type="number"
                                    min="0"
                                    step="1"
                                    name="durata_consiglio_direttivo"
                                    value={formData.durata_consiglio_direttivo}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="form-group grid-span-4">
                                <label className="field-label">Scadenza consiglio direttivo</label>
                                <input
                                    className="md-input"
                                    type="date"
                                    name="scadenza_consiglio_direttivo"
                                    value={formData.scadenza_consiglio_direttivo}
                                    onChange={handleChange}
                                />
                            </div>

                            {/* Sezione: Informazioni aggiuntive */}
                            <div className="form-group grid-span-12" style={{ marginBottom: '4px', marginTop: '8px' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Informazioni aggiuntive</span>
                            </div>

                            <div className="form-group grid-span-6">
                                <label className="field-label">Sito web</label>
                                <input
                                    className="md-input"
                                    type="url"
                                    name="sito_web"
                                    value={formData.sito_web}
                                    onChange={handleChange}
                                    placeholder="https://"
                                />
                            </div>
                            <div className="form-group grid-span-6">
                                <label className="field-label">Etichette</label>
                                <input
                                    className="md-input"
                                    name="etichette"
                                    value={formData.etichette}
                                    onChange={handleChange}
                                    placeholder="es. Tecnici Sportivi, Gestionale"
                                />
                            </div>

                            <div className="form-group grid-span-6">
                                <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        name="runts"
                                        checked={!!formData.runts}
                                        onChange={handleChange}
                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                    />
                                    Iscritta al RUNTS
                                </label>
                                <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '2px' }}>Registro Unico del Terzo Settore</span>
                            </div>
                            <div className="form-group grid-span-6">
                                <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        name="somministrazione"
                                        checked={!!formData.somministrazione}
                                        onChange={handleChange}
                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                    />
                                    Somministrazione
                                </label>
                            </div>

                        </div>
                    )}

                    {/* ── Tab Contatti Associazione ────────────────────── */}
                    {activeTab === 'Contatti' && (
                        <div style={{ padding: '20px 28px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <span style={{ fontWeight: 600, fontSize: '1rem' }}>Contatti associati</span>
                                <button className="btn-contained" style={{ backgroundColor: 'var(--primary-color)', height: '32px', fontSize: '0.85rem', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    onClick={() => { setShowAddContattoForm(true); setEditingContatto(null); setNewContatto({ nome: '', posizione_lavorativa: '', telefono: '', dispositivo_mobile: '', email: '' }); }}>
                                    <PlusCircle size={14}/> Aggiungi
                                </button>
                            </div>

                            {showAddContattoForm && (
                                <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '16px', marginBottom: '16px', backgroundColor: '#fafafa' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', marginBottom: '12px' }}>
                                        <div className="form-group">
                                            <label className="field-label">Nome *</label>
                                            <input className="md-input" value={newContatto.nome} onChange={e => setNewContatto(p => ({ ...p, nome: e.target.value }))} />
                                        </div>
                                        <div className="form-group">
                                            <label className="field-label">Posizione lavorativa</label>
                                            <input className="md-input" value={newContatto.posizione_lavorativa} onChange={e => setNewContatto(p => ({ ...p, posizione_lavorativa: e.target.value }))} />
                                        </div>
                                        <div className="form-group">
                                            <label className="field-label">Telefono</label>
                                            <input className="md-input" value={newContatto.telefono} onChange={e => setNewContatto(p => ({ ...p, telefono: e.target.value }))} />
                                        </div>
                                        <div className="form-group">
                                            <label className="field-label">Dispositivo mobile</label>
                                            <input className="md-input" value={newContatto.dispositivo_mobile} onChange={e => setNewContatto(p => ({ ...p, dispositivo_mobile: e.target.value }))} />
                                        </div>
                                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                            <label className="field-label">E-mail</label>
                                            <input className="md-input" value={newContatto.email} onChange={e => setNewContatto(p => ({ ...p, email: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                        <button className="btn-outlined" style={{ height: '32px', fontSize: '0.85rem', padding: '0 12px' }} onClick={() => { setShowAddContattoForm(false); setEditingContatto(null); }}>Annulla</button>
                                        <button className="btn-contained" style={{ backgroundColor: 'var(--primary-color)', height: '32px', fontSize: '0.85rem', padding: '0 12px' }}
                                            onClick={async () => {
                                                if (!newContatto.nome.trim()) return;
                                                const token = localStorage.getItem('token');
                                                const url = editingContatto
                                                    ? `/users/api/soci/${formData.id}/contatti/${editingContatto.id}`
                                                    : `/users/api/soci/${formData.id}/contatti`;
                                                const method = editingContatto ? 'PUT' : 'POST';
                                                const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(newContatto) });
                                                if (res.ok) { fetchContatti(); setShowAddContattoForm(false); setEditingContatto(null); }
                                            }}>
                                            {editingContatto ? 'Salva modifiche' : 'Aggiungi contatto'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {contattiLoading ? (
                                <div style={{ color: '#aaa', fontSize: '0.9rem' }}>Caricamento…</div>
                            ) : contatti.length === 0 ? (
                                <div style={{ color: '#aaa', fontSize: '0.9rem', textAlign: 'center', padding: '32px 0' }}>Nessun contatto associato</div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                                            <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 600, color: '#555' }}>Nome</th>
                                            <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 600, color: '#555' }}>Ruolo</th>
                                            <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 600, color: '#555' }}>Telefono</th>
                                            <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 600, color: '#555' }}>Cellulare</th>
                                            <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 600, color: '#555' }}>E-mail</th>
                                            <th style={{ width: '60px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {contatti.map(c => (
                                            <tr key={c.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                                <td style={{ padding: '8px' }}>{c.nome}</td>
                                                <td style={{ padding: '8px', color: '#666' }}>{c.posizione_lavorativa || '—'}</td>
                                                <td style={{ padding: '8px', color: '#666' }}>{c.telefono || '—'}</td>
                                                <td style={{ padding: '8px', color: '#666' }}>{c.dispositivo_mobile || '—'}</td>
                                                <td style={{ padding: '8px', color: '#666' }}>{c.email || '—'}</td>
                                                <td style={{ padding: '8px', display: 'flex', gap: '6px' }}>
                                                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-color)', padding: '2px 4px' }}
                                                        onClick={() => { setEditingContatto(c); setNewContatto({ nome: c.nome, posizione_lavorativa: c.posizione_lavorativa || '', telefono: c.telefono || '', dispositivo_mobile: c.dispositivo_mobile || '', email: c.email || '' }); setShowAddContattoForm(true); }}>
                                                        <RefreshCw size={14}/>
                                                    </button>
                                                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53935', padding: '2px 4px' }}
                                                        onClick={async () => {
                                                            const token = localStorage.getItem('token');
                                                            const res = await fetch(`/users/api/soci/${formData.id}/contatti/${c.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                                                            if (res.ok) fetchContatti();
                                                        }}>
                                                        <Trash2 size={14}/>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {/* ── Tab Accesso Frontend ─────────────────────────── */}
                    {activeTab === 'AccessoFrontend' && (
                        <div style={{ padding: '28px 32px', maxWidth: '560px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                <Globe size={20} color="#10b981" />
                                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#111827' }}>
                                    Accesso Area Soci
                                </h3>
                            </div>
                            <p style={{ margin: '0 0 24px 0', fontSize: '0.875rem', color: '#6b7280' }}>
                                Abilita l'accesso al portale online per questo socio. Una volta abilitato, potrà accedere con email e password per visualizzare abbonamenti, corsi e comunicazioni.
                            </p>

                            {/* Status card */}
                            <div style={{
                                border: `1px solid ${frontendAccess.enabled ? '#6ee7b7' : '#d1d5db'}`,
                                borderRadius: '10px',
                                background: frontendAccess.enabled ? '#f0fdf4' : '#f9fafb',
                                padding: '20px 24px',
                                marginBottom: '20px',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        {frontendAccess.enabled
                                            ? <ShieldCheck size={22} color="#10b981" />
                                            : <ShieldOff size={22} color="#9ca3af" />
                                        }
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: frontendAccess.enabled ? '#065f46' : '#374151' }}>
                                                {frontendAccess.enabled ? 'Accesso abilitato' : 'Accesso non abilitato'}
                                            </div>
                                            <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '2px' }}>
                                                {frontendAccess.enabled ? 'Il socio può accedere al portale online.' : 'Il socio non ha ancora un accesso al portale.'}
                                            </div>
                                        </div>
                                    </div>
                                    {frontendAccess.enabled ? (
                                        <button
                                            style={{
                                                background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5',
                                                borderRadius: '6px', padding: '7px 14px', cursor: 'pointer',
                                                fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px',
                                                opacity: frontendAccessLoading ? 0.7 : 1,
                                            }}
                                            disabled={frontendAccessLoading}
                                            onClick={async () => {
                                                if (!window.confirm('Sei sicuro di voler revocare l\'accesso frontend a questo socio?')) return;
                                                setFrontendAccessLoading(true);
                                                try {
                                                    const token = localStorage.getItem('token');
                                                    const res = await fetch(`/auth/api/socio-access/${formData.id}`, {
                                                        method: 'DELETE',
                                                        headers: { 'Authorization': `Bearer ${token}` },
                                                    });
                                                    if (res.ok) {
                                                        // Remove frontend fields from socio record
                                                        await fetch(`/users/api/soci/${formData.id}`, {
                                                            method: 'PUT',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ frontend_enabled: false, frontend_password_plain: null, frontend_user_id: null }),
                                                        });
                                                        setFrontendAccess({ enabled: false, email: formData.email, password_plain: '', user_id: null });
                                                        logToStorico('accesso_frontend', `Accesso frontend revocato (email: ${formData.email})`);
                                                        showSnackbar('Accesso frontend revocato', 'success');
                                                    } else {
                                                        const err = await res.json();
                                                        showSnackbar(err.error || 'Errore durante la revoca', 'error');
                                                    }
                                                } catch {
                                                    showSnackbar('Errore di rete', 'error');
                                                } finally {
                                                    setFrontendAccessLoading(false);
                                                }
                                            }}
                                        >
                                            <ShieldOff size={14} /> Revoca accesso
                                        </button>
                                    ) : (
                                        <button
                                            style={{
                                                background: '#10b981', color: '#fff', border: 'none',
                                                borderRadius: '6px', padding: '7px 16px', cursor: 'pointer',
                                                fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px',
                                                opacity: frontendAccessLoading ? 0.7 : 1,
                                            }}
                                            disabled={frontendAccessLoading}
                                            onClick={async () => {
                                                if (!formData.email) {
                                                    showSnackbar('Il socio deve avere un\'email valida per abilitare l\'accesso frontend.', 'error');
                                                    return;
                                                }
                                                setFrontendAccessLoading(true);
                                                try {
                                                    const token = localStorage.getItem('token');
                                                    const res = await fetch('/auth/api/socio-access', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                                        body: JSON.stringify({
                                                            socio_ref_id: formData.id,
                                                            email: formData.email,
                                                            nome: formData.nome,
                                                            cognome: formData.cognome,
                                                            societaId: selectedSocietaId,
                                                        }),
                                                    });
                                                    const data = await res.json();
                                                    if (res.ok) {
                                                        // Save to socio record (sync anche se already_existed)
                                                        await fetch(`/users/api/soci/${formData.id}`, {
                                                            method: 'PUT',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({
                                                                frontend_enabled: true,
                                                                ...(data.password_plain !== null && { frontend_password_plain: data.password_plain }),
                                                                frontend_user_id: data.user_id,
                                                            }),
                                                        });
                                                        setFrontendAccess({ enabled: true, email: formData.email, password_plain: data.password_plain, user_id: data.user_id });
                                                        if (!data.already_existed) logToStorico('accesso_frontend', `Accesso frontend abilitato (email: ${formData.email})`);
                                                        showSnackbar(data.already_existed ? 'Accesso già presente — stato sincronizzato' : 'Accesso frontend abilitato con successo', 'success');
                                                    } else {
                                                        showSnackbar(data.error || 'Errore durante l\'abilitazione', 'error');
                                                    }
                                                } catch {
                                                    showSnackbar('Errore di rete', 'error');
                                                } finally {
                                                    setFrontendAccessLoading(false);
                                                }
                                            }}
                                        >
                                            <ShieldCheck size={14} /> Abilita accesso
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Credentials display */}
                            {frontendAccess.enabled && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px 18px' }}>
                                        <div style={{ fontSize: '0.73rem', fontWeight: 700, color: '#6b7280', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>Email di accesso</div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '0.95rem', color: '#111827', fontWeight: 500 }}>{frontendAccess.email}</span>
                                            <button
                                                title="Copia"
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px' }}
                                                onClick={() => { navigator.clipboard.writeText(frontendAccess.email); showSnackbar('Email copiata'); }}
                                            >
                                                <Copy size={15} />
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px 18px' }}>
                                        <div style={{ fontSize: '0.73rem', fontWeight: 700, color: '#6b7280', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>Password generata</div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                            <span style={{ fontSize: '0.95rem', color: '#111827', fontWeight: 500, letterSpacing: showFrontendPassword ? 'normal' : '0.15em', fontFamily: 'monospace' }}>
                                                {showFrontendPassword ? (frontendAccess.password_plain || '—') : '••••••••••'}
                                            </span>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button
                                                    title={showFrontendPassword ? 'Nascondi' : 'Mostra'}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px' }}
                                                    onClick={() => setShowFrontendPassword(v => !v)}
                                                >
                                                    {showFrontendPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                                </button>
                                                <button
                                                    title="Copia password"
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px' }}
                                                    onClick={() => { navigator.clipboard.writeText(frontendAccess.password_plain); showSnackbar('Password copiata'); }}
                                                >
                                                    <Copy size={15} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Reset password */}
                                    <button
                                        style={{
                                            background: 'none', border: '1px solid #d1d5db', borderRadius: '7px',
                                            padding: '9px 16px', cursor: 'pointer', fontSize: '0.83rem', fontWeight: 600,
                                            color: '#374151', display: 'flex', alignItems: 'center', gap: '7px',
                                            opacity: frontendAccessLoading ? 0.7 : 1, alignSelf: 'flex-start',
                                        }}
                                        disabled={frontendAccessLoading}
                                        onClick={async () => {
                                            if (!window.confirm('Generare una nuova password per questo socio?')) return;
                                            setFrontendAccessLoading(true);
                                            try {
                                                const token = localStorage.getItem('token');
                                                const res = await fetch(`/auth/api/socio-access/${formData.id}/reset-password`, {
                                                    method: 'POST',
                                                    headers: { 'Authorization': `Bearer ${token}` },
                                                });
                                                const data = await res.json();
                                                if (res.ok) {
                                                    await fetch(`/users/api/soci/${formData.id}`, {
                                                        method: 'PUT',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ frontend_password_plain: data.password_plain }),
                                                    });
                                                    setFrontendAccess(prev => ({ ...prev, password_plain: data.password_plain }));
                                                    setShowFrontendPassword(true);
                                                    logToStorico('accesso_frontend', `Password accesso frontend rigenerata`);
                                                    showSnackbar('Nuova password generata', 'success');
                                                } else {
                                                    showSnackbar(data.error || 'Errore durante il reset', 'error');
                                                }
                                            } catch {
                                                showSnackbar('Errore di rete', 'error');
                                            } finally {
                                                setFrontendAccessLoading(false);
                                            }
                                        }}
                                    >
                                        <KeyRound size={14} /> Rigenera password
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="modal-footer-custom">
                    <button className="btn-save-full" onClick={handleSubmit}>
                        <Check size={20} />
                        Aggiorna informazioni socio
                    </button>
                </div>
            </div>

            {showComunicazioneModal && (
                 <ComunicazioneModal 
                    onClose={() => setShowComunicazioneModal(false)}
                    socioId={formData.id}
                    onSave={() => {
                        fetchComunicazioni();
                    }}
                 />
            )}

            <DettaglioOrdineModal
                isOpen={selectedPaymentDetail !== null}
                onClose={() => setSelectedPaymentDetail(null)}
                ordine={selectedPaymentDetail}
                onAnnulla={handleAnnullaRicevuta}
                onConvertProforma={(updated) => {
                    setSocioPagamenti(prev => prev.map(p => p.id === updated.id ? updated : p));
                    setSelectedPaymentDetail(updated);
                    logToStorico('ordine',
                        `Proforma convertita in pagamento — ricevuta #${updated.numero_ricevuta}${updated.importo ? ` (€${parseFloat(updated.importo).toFixed(2)})` : ''}`,
                        { ordine_id: updated.id, numero_ricevuta: updated.numero_ricevuta, importo: updated.importo }
                    );
                }}
                societa={societaList?.find(s => s.id == selectedSocietaId)}
                products={prodottiSocieta}
            />

            {showIscrizioneModal && (
                <div className="modal-overlay" style={{zIndex: 2000}}>
                    <div className="modal-card" style={{maxWidth: '400px', width: '90%', padding: '24px'}}>
                        <h3 style={{marginTop: 0}}>Iscrizione senza ricevuta</h3>
                        <p style={{color: '#6b7280', fontSize: '0.9rem'}}>
                            Registra l'iscrizione per l'anno {currentRefYear} senza generare movimenti contabili.
                        </p>
                        
                        <div className="form-group" style={{marginTop: '16px'}}>
                            <label className="field-label">Data Iscrizione</label>
                            <input 
                                className="md-input" 
                                type="date" 
                                value={iscrizioneDate} 
                                onChange={(e) => setIscrizioneDate(e.target.value)}
                            />
                        </div>

                        <div style={{display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end'}}>
                            <button 
                                className="btn-secondary" 
                                onClick={() => setShowIscrizioneModal(false)}
                                style={{padding: '8px 16px'}}
                            >
                                Annulla
                            </button>
                            <button 
                                className="btn-primary" 
                                onClick={handleIscrizioneSubmit}
                                style={{padding: '8px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'}}
                            >
                                Conferma Iscrizione
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showAccettaSocioModal && (
                <div className="modal-overlay" style={{zIndex: 2000}}>
                    <div className="modal-card" style={{maxWidth: '400px', width: '90%', padding: '24px'}}>
                        <h3 style={{marginTop: 0}}>Accetta come Socio</h3>
                        <p style={{color: '#6b7280', fontSize: '0.9rem'}}>
                            Imposta lo stato del socio come "Socio" e registra la data di ammissione nel libro soci.
                        </p>
                        
                        <div className="form-group" style={{marginTop: '16px'}}>
                            <label className="field-label">Data Ammissione</label>
                            <input 
                                className="md-input" 
                                type="date" 
                                value={accettaSocioDate} 
                                onChange={(e) => setAccettaSocioDate(e.target.value)}
                            />
                        </div>

                        <div style={{display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end'}}>
                            <button 
                                className="btn-secondary" 
                                onClick={() => setShowAccettaSocioModal(false)}
                                style={{padding: '8px 16px'}}
                            >
                                Annulla
                            </button>
                            <button 
                                className="btn-primary" 
                                onClick={handleAccettaSocioSubmit}
                                style={{padding: '8px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'}}
                            >
                                Conferma
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showPrintModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000
                }}>
                    <div style={{
                        backgroundColor: 'white', borderRadius: '8px', padding: '24px', width: '90%', maxWidth: '400px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#333' }}>
                                {isCustomPrint ? 'Stampa Modulo' : `Stampa ${targetModuleName}`}
                            </h3>
                            <button onClick={() => setShowPrintModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div style={{ marginBottom: '20px' }}>
                            {isCustomPrint && (
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#333' }}>Seleziona Modulo</label>
                                    <select 
                                        className="md-select" 
                                        style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', color: '#333' }}
                                        value={targetModuleName || ''}
                                        onChange={(e) => setTargetModuleName(e.target.value)}
                                    >
                                        {availableModules.map(m => (
                                            <option key={m.id} value={m.descrizione}>{m.descrizione}</option>
                                        ))}
                                        {availableModules.length === 0 && <option value="" disabled>Nessun modulo disponibile</option>}
                                    </select>
                                </div>
                            )}

                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#333' }}>Data del documento</label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input 
                                    type="date" 
                                    className="md-input"
                                    value={printDate} 
                                    onChange={(e) => setPrintDate(e.target.value)}
                                    style={{ width: '100%', padding: '10px 35px 10px 10px', borderRadius: '4px', border: '1px solid #ddd', color: '#333' }}
                                />
                                <Calendar 
                                    size={18} 
                                    style={{ position: 'absolute', right: '10px', color: '#6b7280', cursor: 'pointer', zIndex: 5 }} 
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                             <button
                                onClick={() => setShowPrintModal(false)}
                                style={{
                                    padding: '10px 20px', borderRadius: '4px', border: '1px solid #ddd', backgroundColor: 'white', color: '#333', cursor: 'pointer'
                                }}
                            >
                                Annulla
                            </button>
                            <button
                                onClick={executePrint}
                                style={{
                                    padding: '10px 20px', borderRadius: '4px', border: 'none', backgroundColor: '#007bff', color: 'white', cursor: 'pointer'
                                }}
                            >
                                Conferma e Stampa
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {snackbar.show && (
                <div className={`np-snackbar np-snackbar-${snackbar.type}`}>
                    {snackbar.type === 'success'
                        ? <Check size={18} strokeWidth={2.5} />
                        : <X size={18} strokeWidth={2.5} />}
                    {snackbar.message}
                </div>
            )}

            {/* ── Modal Dettaglio Corso ─────────────────────────────── */}
            {corsoDettaglio && (
                <div className="modal-overlay" style={{zIndex: 2100}}>
                    <div className="modal-card" style={{maxWidth:'600px', width:'95%', padding:0, overflow:'hidden'}} onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', borderBottom:'1px solid #e5e7eb', backgroundColor:'#fff'}}>
                            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                <BookOpen size={20} style={{color:'#10b981'}}/>
                                <h3 style={{margin:0, fontSize:'1.1rem', fontWeight:600, color:'#111827'}}>Dettaglio Corso</h3>
                            </div>
                            <button style={{background:'none', border:'none', cursor:'pointer', color:'#6b7280'}} onClick={() => setCorsoDettaglio(null)}>
                                <X size={20}/>
                            </button>
                        </div>
                        {/* Body */}
                        <div style={{padding:'20px', display:'flex', flexDirection:'column', gap:'16px', backgroundColor:'#f9fafb'}}>
                            {/* Attività + descrizione */}
                            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
                                <div style={{backgroundColor:'#fff', border:'1px solid #e5e7eb', borderRadius:'6px', padding:'12px'}}>
                                    <div style={{fontSize:'0.75rem', fontWeight:600, color:'#10b981', textTransform:'uppercase', marginBottom:'4px'}}>Attività</div>
                                    <div style={{fontWeight:600, color:'#111827'}}>{corsoDettaglio.attivita?.descrizione || '-'}</div>
                                </div>
                                <div style={{backgroundColor:'#fff', border:'1px solid #e5e7eb', borderRadius:'6px', padding:'12px'}}>
                                    <div style={{fontSize:'0.75rem', fontWeight:600, color:'#10b981', textTransform:'uppercase', marginBottom:'4px'}}>Descrizione</div>
                                    <div style={{color:'#374151'}}>{corsoDettaglio.descrizione || '-'}</div>
                                </div>
                            </div>
                            {/* Giorno + ora + durata */}
                            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px'}}>
                                <div style={{backgroundColor:'#fff', border:'1px solid #e5e7eb', borderRadius:'6px', padding:'12px'}}>
                                    <div style={{fontSize:'0.75rem', fontWeight:600, color:'#10b981', textTransform:'uppercase', marginBottom:'4px'}}>Giorno</div>
                                    <div style={{color:'#374151'}}>{GIORNI_SETTIMANA[corsoDettaglio.giorno] || '-'}</div>
                                </div>
                                <div style={{backgroundColor:'#fff', border:'1px solid #e5e7eb', borderRadius:'6px', padding:'12px'}}>
                                    <div style={{fontSize:'0.75rem', fontWeight:600, color:'#10b981', textTransform:'uppercase', marginBottom:'4px'}}>Ora inizio</div>
                                    <div style={{color:'#374151'}}>{corsoDettaglio.oraInizio || '-'}</div>
                                </div>
                                <div style={{backgroundColor:'#fff', border:'1px solid #e5e7eb', borderRadius:'6px', padding:'12px'}}>
                                    <div style={{fontSize:'0.75rem', fontWeight:600, color:'#10b981', textTransform:'uppercase', marginBottom:'4px'}}>Durata</div>
                                    <div style={{color:'#374151'}}>{corsoDettaglio.durataMinuti ? `${corsoDettaglio.durataMinuti} min` : '-'}</div>
                                </div>
                            </div>
                            {/* Struttura + Sala */}
                            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
                                <div style={{backgroundColor:'#fff', border:'1px solid #e5e7eb', borderRadius:'6px', padding:'12px'}}>
                                    <div style={{fontSize:'0.75rem', fontWeight:600, color:'#10b981', textTransform:'uppercase', marginBottom:'4px'}}>Struttura</div>
                                    <div style={{color:'#374151'}}>{corsoDettaglio.struttura?.descrizione || '-'}</div>
                                </div>
                                <div style={{backgroundColor:'#fff', border:'1px solid #e5e7eb', borderRadius:'6px', padding:'12px'}}>
                                    <div style={{fontSize:'0.75rem', fontWeight:600, color:'#10b981', textTransform:'uppercase', marginBottom:'4px'}}>Sala / Area</div>
                                    <div style={{color:'#374151'}}>{corsoDettaglio.area?.descrizione || '-'}</div>
                                </div>
                            </div>
                            {/* Istruttore + Max soci */}
                            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
                                <div style={{backgroundColor:'#fff', border:'1px solid #e5e7eb', borderRadius:'6px', padding:'12px'}}>
                                    <div style={{fontSize:'0.75rem', fontWeight:600, color:'#10b981', textTransform:'uppercase', marginBottom:'4px'}}>Istruttore</div>
                                    <div style={{color:'#374151'}}>
                                        {corsoDettaglio.staff ? `${corsoDettaglio.staff.nome} ${corsoDettaglio.staff.cognome}` : '-'}
                                    </div>
                                </div>
                                <div style={{backgroundColor:'#fff', border:'1px solid #e5e7eb', borderRadius:'6px', padding:'12px'}}>
                                    <div style={{fontSize:'0.75rem', fontWeight:600, color:'#10b981', textTransform:'uppercase', marginBottom:'4px'}}>Max partecipanti</div>
                                    <div style={{color:'#374151'}}>{corsoDettaglio.maxSoci ?? '-'}</div>
                                </div>
                            </div>
                            {/* Note */}
                            {corsoDettaglio.note && (
                                <div style={{backgroundColor:'#fff', border:'1px solid #e5e7eb', borderRadius:'6px', padding:'12px'}}>
                                    <div style={{fontSize:'0.75rem', fontWeight:600, color:'#10b981', textTransform:'uppercase', marginBottom:'4px'}}>Note</div>
                                    <div style={{color:'#374151', whiteSpace:'pre-wrap'}}>{corsoDettaglio.note}</div>
                                </div>
                            )}
                            {/* Scadenza abbonamento del socio per questo corso */}
                            <div style={{backgroundColor:'#fff', border:'1px solid #e5e7eb', borderRadius:'6px', padding:'12px'}}>
                                <div style={{fontSize:'0.75rem', fontWeight:600, color:'#10b981', textTransform:'uppercase', marginBottom:'4px'}}>Scadenza abbonamento (socio)</div>
                                <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                                    <span style={{color:'#374151'}}>
                                        {getScadenzaAbbonamentoPerCorso(corsoDettaglio.abbonamentoId)
                                            ? formatDateIT(getScadenzaAbbonamentoPerCorso(corsoDettaglio.abbonamentoId))
                                            : 'Nessun pagamento trovato'}
                                    </span>
                                    <ScadenzaBadge stato={computeStatoPagamentoScadenza(
                                        getScadenzaAbbonamentoPerCorso(corsoDettaglio.abbonamentoId)
                                            ? new Date(getScadenzaAbbonamentoPerCorso(corsoDettaglio.abbonamentoId) + 'T00:00:00')
                                            : null
                                    )}/>
                                </div>
                            </div>
                        </div>
                        {/* Footer */}
                        <div style={{padding:'12px 20px', borderTop:'1px solid #e5e7eb', backgroundColor:'#fff', display:'flex', justifyContent:'flex-end'}}>
                            <button
                                style={{padding:'8px 20px', backgroundColor:'#6b7280', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:600}}
                                onClick={() => setCorsoDettaglio(null)}
                            >
                                Chiudi
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal Aggiungi Corso ──────────────────────────────── */}
            {showAggiungiCorsoModal && (
                <div className="modal-overlay" style={{zIndex: 2100}}>
                    <div className="modal-card" style={{maxWidth:'700px', width:'95%', padding:0, overflow:'hidden', display:'flex', flexDirection:'column', maxHeight:'80vh'}} onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', borderBottom:'1px solid #e5e7eb', backgroundColor:'#fff', flexShrink:0}}>
                            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                <PlusCircle size={20} style={{color:'#10b981'}}/>
                                <h3 style={{margin:0, fontSize:'1.1rem', fontWeight:600, color:'#111827'}}>Aggiungi Corso</h3>
                            </div>
                            <button style={{background:'none', border:'none', cursor:'pointer', color:'#6b7280'}} onClick={() => setShowAggiungiCorsoModal(false)}>
                                <X size={20}/>
                            </button>
                        </div>

                        {/* Info passepartout */}
                        {passepartoutScadenza && (
                            <div style={{margin:'12px 20px 0', padding:'10px 14px', backgroundColor:'#dcfce7', border:'1px solid #86efac', borderRadius:'6px', fontSize:'0.85rem', color:'#166534', display:'flex', alignItems:'center', gap:'8px', flexShrink:0}}>
                                <Check size={16}/>
                                <span>Abbonamento jolly valido fino al <strong>{formatDateIT(passepartoutScadenza)}</strong> — accesso a tutti i corsi.</span>
                            </div>
                        )}

                        {/* Body */}
                        <div style={{overflowY:'auto', flex:1, padding:'16px 20px'}}>
                            {aggiungiCorsoLoading ? (
                                <div style={{textAlign:'center', padding:'40px', color:'#9ca3af'}}>Caricamento corsi...</div>
                            ) : (() => {
                                const iscrittiIds = new Set(socioCorsi.map(i => i.corsoId ?? i.corso?.id));
                                const disponibili = tuttiCorsi.filter(c => !iscrittiIds.has(c.id));
                                if (disponibili.length === 0) {
                                    return (
                                        <div style={{textAlign:'center', padding:'40px', color:'#9ca3af'}}>
                                            Nessun corso disponibile da aggiungere.
                                        </div>
                                    );
                                }
                                return disponibili.map(corso => {
                                    const accessibile = isCorsoAccessibile(corso.abbonamentoId);
                                    const colore = corso.attivita?.colore;
                                    const coloriBg = {
                                        'ROSSO':'#e53935','VERDE':'#43a047','BLU':'#1e88e5','VERDE CHIARO':'#66bb6a',
                                        'CELESTE':'#26c6da','ARANCIONE':'#fb8c00','VIOLA':'#8e24aa','GIALLO':'#fdd835',
                                        'GRIGIO':'#78909c','ROSA':'#e91e63',
                                    };
                                    const colBg = coloriBg[colore] || '#9e9e9e';
                                    return (
                                        <div key={corso.id} style={{
                                            display:'flex', alignItems:'center', gap:'12px',
                                            padding:'12px 14px', borderRadius:'6px', border:'1px solid #e5e7eb',
                                            marginBottom:'8px', backgroundColor: accessibile ? '#fff' : '#f9fafb',
                                            opacity: accessibile ? 1 : 0.55,
                                        }}>
                                            {colore && (
                                                <span style={{width:'12px', height:'12px', borderRadius:'50%', backgroundColor:colBg, flexShrink:0}}/>
                                            )}
                                            <div style={{flex:1, minWidth:0}}>
                                                <div style={{fontWeight:600, color:'#111827', fontSize:'0.9rem'}}>{corso.attivita?.descrizione || 'Corso'}</div>
                                                <div style={{fontSize:'0.8rem', color:'#6b7280'}}>
                                                    {GIORNI_SETTIMANA[corso.giorno]} · {corso.oraInizio} · {corso.durataMinuti} min
                                                    {corso.struttura ? ` · ${corso.struttura.descrizione}` : ''}
                                                    {corso.area ? ` / ${corso.area.descrizione}` : ''}
                                                </div>
                                                {!accessibile && (
                                                    <div style={{fontSize:'0.75rem', color:'#ef4444', marginTop:'2px', display:'flex', alignItems:'center', gap:'4px'}}>
                                                        <AlertTriangle size={12}/>
                                                        Abbonamento richiesto non valido o assente
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                disabled={!accessibile}
                                                style={{
                                                    padding:'6px 14px', borderRadius:'6px', border:'none', fontWeight:600, fontSize:'0.85rem', cursor: accessibile ? 'pointer' : 'not-allowed',
                                                    backgroundColor: accessibile ? '#10b981' : '#d1d5db',
                                                    color: accessibile ? 'white' : '#9ca3af',
                                                    flexShrink:0,
                                                }}
                                                onClick={async () => {
                                                    try {
                                                        const res = await fetch(`/activities/api/corsi/${corso.id}/iscritti`, {
                                                            method:'POST',
                                                            headers:{'Content-Type':'application/json'},
                                                            body: JSON.stringify({ socioId: formData.id }),
                                                        });
                                                        if (res.ok) {
                                                            await fetchSocioCorsi();
                                                            setShowAggiungiCorsoModal(false);
                                                            showSnackbar('Socio iscritto al corso con successo');
                                                            logToStorico('iscrizione_attivita',
                                                                `Iscritto al corso "${corso.attivita?.descrizione || corso.descrizione || 'corso'}"`,
                                                                { corso_id: corso.id, attivita: corso.attivita?.descrizione }
                                                            );
                                                        } else {
                                                            const err = await res.json();
                                                            showSnackbar(err.error || 'Errore durante l\'iscrizione', 'error');
                                                        }
                                                    } catch {
                                                        showSnackbar('Errore di rete', 'error');
                                                    }
                                                }}
                                            >
                                                Iscrivi
                                            </button>
                                        </div>
                                    );
                                });
                            })()}
                        </div>

                        {/* Footer */}
                        <div style={{padding:'12px 20px', borderTop:'1px solid #e5e7eb', backgroundColor:'#fff', flexShrink:0, display:'flex', justifyContent:'flex-end'}}>
                            <button
                                style={{padding:'8px 20px', backgroundColor:'#6b7280', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:600}}
                                onClick={() => setShowAggiungiCorsoModal(false)}
                            >
                                Chiudi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SocioModal;
