import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, User, Tag, CreditCard, Calendar, Activity, Monitor, Mail, Coins, Check, AlertTriangle, MessageSquare, Folder, Printer, Banknote, Landmark, DollarSign, Trash2, RefreshCw } from 'lucide-react';
import { useConfirm } from '../components/ConfirmModal';
import DettaglioPagamentoModal from './DettaglioPagamentoModal';
import CodiceFiscale from 'codice-fiscale-js';
import CityAutocomplete from '../components/CityAutocomplete';
import ComunicazioneModal from '../components/ComunicazioneModal';
import { useSocieta } from '../data/SocietaContext';
import { useAnno, getAnnoDateRange } from '../data/AnnoContext';
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
// ---------------------------------------------------------------------------

const SocioModal = ({ onClose, onSave, socioData }) => {
    const { societaList, selectedSocietaId } = useSocieta();
    const { selectedAnno } = useAnno();
    const navigate = useNavigate();
    const confirm = useConfirm();
    // Determine if we are editing an existing scio or creating a new one
    const isEditMode = !!socioData;
    
    // Initial State - populate if editing
    const initialState = {
        // Anagrafica Base
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
        is_active: true
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
                alert("Errore nel caricamento dei moduli");
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
            alert("Seleziona un modulo");
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
                alert(`Modulo "${targetModuleName.replace(/_/g, ' ')}" non trovato nella sezione Modulistica.`);
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
                    alert("La libreria PDF sta caricando, riprova tra un secondo.");
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
            alert("Errore durante la generazione del modulo");
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
                 alert('Errore aggiornamento livello socio: ' + (err.error || err.message));
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
            alert("Errore di rete");
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
                id_badge: socioData.id_badge || ''
            }));
            
            // Set Checkbox state based on date existence
            setHaCertificato(!!socioData.scadenza_certificato);
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
        if (activeTab === 'Comunicazioni' && formData.id) {
            fetchComunicazioni();
        }
    }, [activeTab, formData.id]);

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

    const handleRinnovaPagamento = (p) => {
        navigate('/nuovo-pagamento', {
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
        if (!await confirm('Sei sicuro di voler eliminare questo pagamento?')) return;
        try {
            const response = await fetch(`/payments/api/${id}`, { method: 'DELETE' });
            if (response.ok) {
                setSocioPagamenti(prev => prev.filter(p => p.id !== id));
                if (selectedPaymentDetail?.id === id) setSelectedPaymentDetail(null);
            } else {
                alert('Errore durante l\'eliminazione del pagamento');
            }
        } catch (e) {
            console.error(e);
            alert('Errore di rete');
        }
    };

    const handleAnnullaRicevuta = async (id) => {
        try {
            const response = await fetch(`/payments/api/${id}/annulla`, { method: 'PATCH' });
            if (response.ok) {
                const updated = await response.json();
                setSocioPagamenti(prev => prev.map(p => p.id === updated.id ? updated : p));
                setSelectedPaymentDetail(updated);
            } else {
                alert('Errore durante l\'annullamento della ricevuta');
            }
        } catch (e) {
            console.error(e);
            alert('Errore di rete');
        }
    };

    const handlePrintPayment = (p) => {
        const societa = societaList.find(s => s.id == selectedSocietaId);

        const statoLabel = p.stato_pagamento?.startsWith('3.') ? 'ANNULLATO' : 'VALIDO';

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
        const quoteItems = (p.quote || '').split(', ').filter(Boolean);

        const quoteRows = quoteItems.map(q => `
            <tr>
                <td>${q}</td>
                <td style="text-align:right">${quoteItems.length === 1 ? importoFormatted : ''}</td>
            </tr>
        `).join('');

        const logoUrl = societa?.logo_path ? `/users/${societa.logo_path}` : null;
        const footerText = societa?.footer_text ||
            'Fuori campo iva art.4 dpr 633/72 - Esente imposte art.148 TUIR -<br/>Esente bollo L 30/12/2018 n. 145 art.1 c.646';
        const societaAddress = [societa?.indirizzo, societa?.comune].filter(Boolean).join(' - ');

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
        .items-table th:last-child { text-align: right; }
        .items-table td { border: 1px solid #ccc; padding: 8px 10px; font-size: 12px; }
        .items-table td:last-child { text-align: right; }
        .total-row td { font-weight: bold; border-top: 2px solid #333; }
        .footer-text { font-size: 10px; color: #555; margin-top: 20px; margin-bottom: 20px; }
        .separator { letter-spacing: 2px; color: #999; margin: 20px 0; text-align: center; }
        @media print { body { padding: 0; } }
        @page { margin: 10mm; }
    </style>
</head>
<body>
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
            <td>RICEVUTA</td>
            <td>${p.numero_ricevuta || ''}</td>
            <td>${p.progressivo_stagione || ''}</td>
            <td>${p.data_ricevuta || p.data_pagamento || ''}</td>
            <td>${statoLabel}</td>
        </tr>
        <tr>
            <th colspan="2">INTESTATARIO</th>
            <th colspan="2">CODICE FISCALE / PARTITA IVA INTESTATARIO</th>
            <th>MODALITA' PAGAMENTO</th>
        </tr>
        <tr>
            <td colspan="2">${(p.intestatario || '').toUpperCase()}</td>
            <td colspan="2">${p.codice_fiscale || p.partita_iva || ''}</td>
            <td>${modalitaLabel}</td>
        </tr>
        <tr>
            <th colspan="3">INDIRIZZO</th>
            <th colspan="2">DATI DI CHI HA EFFETTUATO IL PAGAMENTO</th>
        </tr>
        <tr>
            <td colspan="3"></td>
            <td colspan="2">${datiPagatore}</td>
        </tr>
        <tr><th colspan="5">NOTE</th></tr>
        <tr><td colspan="5">${p.note || ''}</td></tr>
    </table>

    <table class="items-table">
        <tr>
            <th>Descrizione</th>
            <th>Subtotale</th>
        </tr>
        ${quoteRows}
        <tr class="total-row">
            <td>TOTALE</td>
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

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
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
                if (cf.code && cf.code !== formData.codice_fiscale) {
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
                     if (checkCF.code !== codice_fiscale) {
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
                    alert(`L'email ${formData.email} è già usata da ${result.nome} ${result.cognome}`);
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
            } else {
                alert('Errore revoca iscrizione');
            }
        } catch (e) {
             console.error("Error revoking iscrizione", e);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isMinorenne) {
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

    const tabs = [
        { id: 'Anagrafica', icon: <User size={18}/>, label: 'Anagrafica' },
        // { id: 'Liste', icon: <Tag size={18}/>, label: 'Liste' },
        { id: 'Pagamenti', icon: <CreditCard size={18}/>, label: 'Pagamenti', count: socioPagamenti.length },
        { id: 'Attività', icon: <Activity size={18}/>, label: 'Attività', count: 0 },
        // { id: 'Deskalo', icon: <Monitor size={18}/>, label: 'Deskalo' },
        { id: 'Comunicazioni', icon: <Mail size={18}/>, label: 'Comunicazioni' },
        // { id: 'Crediti', icon: <Coins size={18}/>, label: 'Crediti' }
    ];

    return (
        <div className="modal-overlay" onClick={onClose} style={{alignItems: 'flex-start', paddingTop: '72px'}}>
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
                                    `${formData.nome || ''} ${formData.cognome || ''}`
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
                                        navigate('/nuovo-pagamento', { state: { socio: socioData } });
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
                                <option value="nuovo_pagamento">Nuovo pagamento</option>
                                
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
                                    <div style={{position: 'relative', display: 'flex', alignItems: 'center'}}>
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
                                <div className="form-group grid-span-3">
                                    <label className="field-label">Data Ammissione (Libro Soci)</label>
                                    <input 
                                        className="md-input" 
                                        type="date" 
                                        name="data_ammissione" 
                                        value={formData.data_ammissione} 
                                        onChange={handleChange} 
                                    />
                                </div>
                                <div className="form-group grid-span-3">
                                    <label className="field-label">Ultima Iscrizione</label>
                                    <input 
                                        className="md-input" 
                                        type="date" 
                                        value={currentIscrizioneDate} 
                                        readOnly 
                                        style={{ backgroundColor: '#f9fafb', color: '#374151' }}
                                    />
                                </div>
                                <div className="form-group grid-span-2">
                                    <label className="field-label" style={{marginBottom: '6px', minHeight: '20px', display: 'flex', alignItems: 'center'}}>Data Tesseramento</label>
                                    <input
                                        className="md-input"
                                        type="date"
                                        value={dataTesseramento}
                                        readOnly
                                        style={{ backgroundColor: '#f9fafb', color: dataTesseramento ? '#374151' : '#9ca3af' }}
                                    />
                                </div>
                                <div className="form-group grid-span-2">
                                    <label className="field-label" style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', minHeight: '20px'}}>
                                        <input 
                                            type="checkbox" 
                                            name="ha_certificato" 
                                            checked={haCertificato} 
                                            onChange={handleChange} 
                                            style={{width: 'auto', margin: 0}}
                                        />
                                        Ha certificato
                                    </label>
                                    <div className="date-custom-icon" style={{position: 'relative', display: 'flex', alignItems: 'center'}}>
                                        <input 
                                            className="md-input" 
                                            type="date" 
                                            name="scadenza_certificato" 
                                            value={formData.scadenza_certificato} 
                                            onChange={handleChange} 
                                            disabled={!haCertificato}
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
                                </div>
                                
                                {/* Row 6 - Note and Extra */}
                                <div className="form-group grid-span-12" style={{gridRow: 'span 2'}}>
                                    <label className="field-label" style={{color: 'var(--success-color)', fontWeight:'bold'}}>Note</label>
                                    <textarea className="md-input" name="note" placeholder="Note" style={{height:'120px', resize:'none'}} value={formData.note} onChange={handleChange}></textarea>
                                </div>
                            </div>
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

                    {activeTab === 'Pagamenti' && (
                        <div>
                            <div style={{marginBottom: '12px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                <h3 style={{margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#111827'}}>Pagamenti</h3>
                                <span style={{fontSize: '0.85rem', color: '#6b7280'}}>
                                    {filteredPagamenti.length}{filteredPagamenti.length !== socioPagamenti.length ? ` / ${socioPagamenti.length}` : ''} pagament{filteredPagamenti.length === 1 ? 'o' : 'i'}
                                </span>
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
                                                    {socioPagamenti.length === 0 ? 'Nessun pagamento trovato' : 'Nessun pagamento corrisponde ai filtri'}
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
                                                            <span style={{
                                                                border: `1px solid ${isEntrata ? '#2ecc71' : '#e74c3c'}`,
                                                                color: isEntrata ? '#2ecc71' : '#e74c3c',
                                                                padding: '2px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold'
                                                            }}>
                                                                {p.numero_ricevuta || `#${p.id}`}
                                                            </span>
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
                                                                <button style={{padding: 0, border:'none', width:'32px', height:'32px', borderRadius:'4px', display:'inline-flex', alignItems:'center', justifyContent:'center', cursor:'pointer', backgroundColor: '#5dade2', color:'white'}} title="Invia email"><Mail size={16} /></button>
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

                    {activeTab !== 'Anagrafica' && activeTab !== 'Comunicazioni' && activeTab !== 'Pagamenti' && (
                        <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100%', color:'#aaa'}}>
                             Contenuto placeholder per {activeTab}
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

            <DettaglioPagamentoModal
                isOpen={selectedPaymentDetail !== null}
                onClose={() => setSelectedPaymentDetail(null)}
                pagamento={selectedPaymentDetail}
                onAnnulla={handleAnnullaRicevuta}
                societa={societaList?.find(s => s.id == selectedSocietaId)}
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
        </div>
    );
};

export default SocioModal;
