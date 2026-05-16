import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Soci.css';
import SocioModal from './SocioModal';
import EditProfileModal from './EditProfileModal';
import ComunicazioneModal from '../components/ComunicazioneModal';
import AdvancedSearchSidebar from '../components/AdvancedSearchSidebar';
import { useSocieta } from '../data/SocietaContext';
import { useAnno, getAnnoDateRange } from '../data/AnnoContext';
import { computeScadenzaCertificatoStr } from '../utils/certificatoUtils';
import { useAlert } from '../components/AlertModal';
import { Search, Plus, Filter, User, Building2, Mail, CreditCard, Menu, Bell, Settings, MoreVertical, Zap, QrCode, FileSpreadsheet, FileDown, FileUp, Check, X, Calendar, ListOrdered, Star, Tag, ClipboardList, RefreshCw, Euro, LogOut, Edit } from 'lucide-react';

const Soci = ({ onLogout }) => {
    const { selectedSocietaId, societaList } = useSocieta();
    const { selectedAnno } = useAnno();
    const showAlert = useAlert();
    const [soci, setSoci] = useState([]);
    const [quotaPaymentCFs, setQuotaPaymentCFs] = useState(new Set());
    const [pastQuotaPaymentCFs, setPastQuotaPaymentCFs] = useState(new Set());
    const [tessCurrentCFs, setTessCurrentCFs] = useState(new Set());
    const [tessAnyPastCFs, setTessAnyPastCFs] = useState(new Set());
    const [quotaPaymentSocioIds, setQuotaPaymentSocioIds] = useState(new Set());
    const [pastQuotaPaymentSocioIds, setPastQuotaPaymentSocioIds] = useState(new Set());
    const [tessCurrentSocioIds, setTessCurrentSocioIds] = useState(new Set());
    const [tessAnyPastSocioIds, setTessAnyPastSocioIds] = useState(new Set());
    const [showModal, setShowModal] = useState(false);
    const [showEditProfileModal, setShowEditProfileModal] = useState(false);
    const [showComunicazioneModal, setShowComunicazioneModal] = useState(false);
    const [selectedSocio, setSelectedSocio] = useState(null);
    const [comunicazioneSocioId, setComunicazioneSocioId] = useState(null);
    const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [importReport, setImportReport] = useState(null); // { total, current, creati, saltati, errori[], logs[], done, headers, dataRecords }
    const [importLogFilters, setImportLogFilters] = useState({ creati: true, saltati: true, errori: true });
    const importFileRef = useRef(null);
    const importLogRef = useRef(null);

    const location = useLocation();
    const navigate = useNavigate();
    const [hasOpenedFromUrl, setHasOpenedFromUrl] = useState(false);

    useEffect(() => {
        if (soci && soci.length > 0 && !hasOpenedFromUrl) {
            const params = new URLSearchParams(location.search);
            const apriSocioId = params.get('apriSocioPath');
            if (apriSocioId) {
                const socioDaAprire = soci.find(s => s.id.toString() === apriSocioId);
                if (socioDaAprire) {
                    setSelectedSocio(socioDaAprire);
                    setShowModal(true);
                    setHasOpenedFromUrl(true);
                }
            }
        }
    }, [soci, location.search, hasOpenedFromUrl]);
    

    // Fetch pagamenti quota_associativa per la società e filtra per anno selezionato
    useEffect(() => {
        const fetchQuotaPayments = async () => {
            if (!selectedSocietaId || !selectedAnno) return;
            const societa = societaList.find(s => s.id == selectedSocietaId);
            const { start, end } = getAnnoDateRange(selectedAnno, societa);
            try {
                const response = await fetch(`/payments/api?societa_id=${selectedSocietaId}`);
                if (!response.ok) return;
                const data = await response.json();
                const iscrPagamenti = data.filter(p =>
                    p.quote_types && p.quote_types.split(',').map(t => t.trim()).includes('quota_associativa') && (p.codice_fiscale || p.socio_id)
                );
                const currCfs = new Set(
                    iscrPagamenti
                        .filter(p => { if (!p.data_pagamento) return false; const d = new Date(p.data_pagamento); return d >= start && d <= end; })
                        .filter(p => p.codice_fiscale)
                        .map(p => p.codice_fiscale.toUpperCase())
                );
                const pastCfs = new Set(
                    iscrPagamenti
                        .filter(p => { if (!p.data_pagamento) return false; const d = new Date(p.data_pagamento); return d < start; })
                        .filter(p => p.codice_fiscale)
                        .map(p => p.codice_fiscale.toUpperCase())
                );
                const currSocioIds = new Set(
                    iscrPagamenti
                        .filter(p => { if (!p.data_pagamento) return false; const d = new Date(p.data_pagamento); return d >= start && d <= end; })
                        .filter(p => p.socio_id)
                        .map(p => p.socio_id)
                );
                const pastSocioIds = new Set(
                    iscrPagamenti
                        .filter(p => { if (!p.data_pagamento) return false; const d = new Date(p.data_pagamento); return d < start; })
                        .filter(p => p.socio_id)
                        .map(p => p.socio_id)
                );
                setQuotaPaymentCFs(currCfs);
                setPastQuotaPaymentCFs(pastCfs);
                setQuotaPaymentSocioIds(currSocioIds);
                setPastQuotaPaymentSocioIds(pastSocioIds);

                // Tesseramento
                const tessPagamenti = data.filter(p =>
                    p.quote_types && p.quote_types.split(',').map(t => t.trim()).includes('tesseramento') && (p.codice_fiscale || p.socio_id)
                );
                const tessCurrentSet = new Set(
                    tessPagamenti
                        .filter(p => { if (!p.data_pagamento) return false; const d = new Date(p.data_pagamento); return d >= start && d <= end; })
                        .filter(p => p.codice_fiscale)
                        .map(p => p.codice_fiscale.toUpperCase())
                );
                const tessAnyPastSet = new Set(
                    tessPagamenti
                        .filter(p => { if (!p.data_pagamento) return false; const d = new Date(p.data_pagamento); return d < start; })
                        .filter(p => p.codice_fiscale)
                        .map(p => p.codice_fiscale.toUpperCase())
                );
                const tessCurrentSocioSet = new Set(
                    tessPagamenti
                        .filter(p => { if (!p.data_pagamento) return false; const d = new Date(p.data_pagamento); return d >= start && d <= end; })
                        .filter(p => p.socio_id)
                        .map(p => p.socio_id)
                );
                const tessAnyPastSocioSet = new Set(
                    tessPagamenti
                        .filter(p => { if (!p.data_pagamento) return false; const d = new Date(p.data_pagamento); return d < start; })
                        .filter(p => p.socio_id)
                        .map(p => p.socio_id)
                );
                setTessCurrentCFs(tessCurrentSet);
                setTessAnyPastCFs(tessAnyPastSet);
                setTessCurrentSocioIds(tessCurrentSocioSet);
                setTessAnyPastSocioIds(tessAnyPastSocioSet);
            } catch (e) {
                console.error('Error fetching quota payments', e);
            }
        };
        fetchQuotaPayments();
    }, [selectedSocietaId, selectedAnno, societaList]);

    useEffect(() => {
        // Fetch current user info for the menu
        const fetchMe = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const response = await fetch('/auth/api/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setCurrentUser(data);
                }
            } catch (e) {
                console.error("Failed to fetch user", e);
            }
        };
        fetchMe();
    }, []);

    const [filters, setFilters] = useState({
        cognome: '',
        nome: '',
        iscritto: '',
        certMedico: '',
        pagamenti: '',
        lista: ''
    });

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const getCertStatus = (dataPresentazione) => {
        if (!dataPresentazione) return 'MISSING';
        // Calcola scadenza: data presentazione + 1 anno - 1 giorno
        const scadenzaStr = computeScadenzaCertificatoStr(dataPresentazione);
        if (!scadenzaStr) return 'MISSING';
        const d = new Date(scadenzaStr); d.setHours(0, 0, 0, 0);
        const t = new Date(); t.setHours(0, 0, 0, 0);
        if (d < t) return '0'; // Scaduto
        const diffTime = d - t;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) return '1'; // In scadenza
        return '2'; // Valido
    };

    const getTesseratoLabel = (socio) => {
        const cf = (socio.codice_fiscale || '').toUpperCase();
        if (tessCurrentCFs.has(cf) || tessCurrentSocioIds.has(socio.id)) return 'REGOLARE';
        // Se "Quota associativa e Tesseramento Unico" è attivo, ISCRITTO vale come REGOLARE
        const currentSocieta = societaList.find(s => s.id == selectedSocietaId);
        if (currentSocieta?.quota_tesseramento_unico && getIscrizioneLabel(socio) === 'ISCRITTO') return 'REGOLARE';
        if (tessAnyPastCFs.has(cf) || tessAnyPastSocioIds.has(socio.id)) return 'SCADUTO';
        return 'NO';
    };

    const getIscrizioneLabel = (socio) => {
        // SOCIO: ha data ammissione libro soci
        if (socio.data_ammissione) return 'SOCIO';
        const cf = (socio.codice_fiscale || '').toUpperCase();
        // ISCRITTO: ha iscrizione per l'anno corrente o pagamento quota nell'anno corrente
        const hasCurrentIscrizione = (socio.iscrizioni || []).some(i => i.anno === selectedAnno);
        if (hasCurrentIscrizione || quotaPaymentCFs.has(cf) || quotaPaymentSocioIds.has(socio.id)) return 'ISCRITTO';
        // SCADUTO: ha iscrizioni per anni precedenti o pagamenti di anni precedenti
        const hasPastIscrizione = (socio.iscrizioni || []).some(i => i.anno < selectedAnno);
        if (hasPastIscrizione || pastQuotaPaymentCFs.has(cf) || pastQuotaPaymentSocioIds.has(socio.id)) return 'SCADUTO';
        return 'NO';
    };

    const formatDate = (d) => {
        if (!d) return '';
        const dt = new Date(d);
        if (isNaN(dt)) return d;
        return dt.toLocaleDateString('it-IT');
    };

    const exportToExcel = () => {
        const certLabel = (status) => {
            if (status === '2') return 'VALIDO';
            if (status === '1') return 'IN SCADENZA';
            if (status === '0') return 'SCADUTO';
            return 'ASSENTE';
        };

        const columns = [
            'COGNOME', 'NOME', 'DATA_NASCITA', 'SESSO', 'CODICE_FISCALE',
            'COMUNE_NASCITA', 'INDIRIZZO_RESIDENZA', 'COMUNE_RESIDENZA', 'CAP',
            'TELEFONO', 'EMAIL', 'ANNO_NASCITA', 'ISCRITTO', 'DATA_ISCRIZIONE',
            'DATA_ACCETTAZIONE', 'PAGAMENTI NON REGOLARI', 'CERTIFICATO VALIDO',
            'DATA SCADENZA CERTIFICATO', 'NOTE',
        ];

        const escapeCell = (v) => {
            const s = String(v ?? '');
            if (s.includes(';') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
            return s;
        };

        const rows = filteredSoci.map(s => [
            s.cognome || '',
            s.nome || '',
            formatDate(s.data_nascita),
            s.sesso || '',
            s.codice_fiscale || '',
            s.luogo_nascita || '',
            s.indirizzo || '',
            s.comune || '',
            s.cap || '',
            s.telefono || '',
            s.email || '',
            s.data_nascita ? new Date(s.data_nascita).getFullYear() : '',
            getIscrizioneLabel(s),
            formatDate((s.iscrizioni || []).sort((a, b) => (a.anno || 0) - (b.anno || 0))[0]?.createdAt || s.data_ammissione),
            formatDate(s.data_ammissione),
            getTesseratoLabel(s) !== 'REGOLARE' ? 'SI' : 'NO',
            certLabel(getCertStatus(s.scadenza_certificato)),
            formatDate(s.scadenza_certificato),
            s.note || '',
        ]);

        const csvLines = [columns, ...rows].map(row => row.map(escapeCell).join(';')).join('\r\n');
        const bom = '\uFEFF';
        const blob = new Blob([bom + csvLines], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const societaNome = (societaList?.find(s => s.id == selectedSocietaId)?.ragione_sociale ||
            societaList?.find(s => s.id == selectedSocietaId)?.nome || 'soci').replace(/[/\\?*:|"<>]/g, '_');
        link.href = url;
        link.download = `ELENCO_SOCI_${societaNome}_${selectedAnno || ''}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        setShowActionsMenu(false);
    };

    const filteredSoci = soci.filter(socio => {
        if (filters.cognome) {
            const searchVal = filters.cognome.toLowerCase();
            const matchCognome = (socio.cognome || '').toLowerCase().includes(searchVal);
            const matchRagioneSociale = (socio.ragione_sociale || '').toLowerCase().includes(searchVal);
            if (!matchCognome && !matchRagioneSociale) return false;
        }
        if (filters.nome && (!socio.nome || !socio.nome.toLowerCase().includes(filters.nome.toLowerCase()))) return false;
        
        if (filters.iscritto !== '') {
            const label = getIscrizioneLabel(socio);
            if (filters.iscritto === '1' && label !== 'ISCRITTO' && label !== 'SOCIO') return false;
            if (filters.iscritto === '0' && (label === 'ISCRITTO' || label === 'SOCIO')) return false;
        }

        if (filters.certMedico !== '') {
            const status = getCertStatus(socio.scadenza_certificato);
            if (status !== filters.certMedico) return false;
        }
        
        return true;
    });

    useEffect(() => {
        // Reset UI state e ricarica dati al cambio società
        setFilters({ cognome: '', nome: '', iscritto: '', certMedico: '', pagamenti: '', lista: '' });
        setShowModal(false);
        setShowEditProfileModal(false);
        setShowComunicazioneModal(false);
        setSelectedSocio(null);
        setComunicazioneSocioId(null);
        setShowAdvancedSearch(false);
        setHasOpenedFromUrl(false);
        if (selectedSocietaId) {
            fetchSoci();
        } else {
            setSoci([]);
        }
    }, [selectedSocietaId]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchSoci = async () => {
        if (!selectedSocietaId) return;
        try {
            const response = await fetch(`/users/api/soci?societa_id=${selectedSocietaId}`);
            const data = await response.json();
            if (Array.isArray(data)) {
                setSoci(data);
            }
        } catch (error) {
            console.error('Error fetching soci:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSocio = async (formData) => {
        try {
            const isUpdate = !!formData.id;
            const url = isUpdate ? `/users/api/soci/${formData.id}` : '/users/api/soci';
            const method = isUpdate ? 'PUT' : 'POST';

            // Need to set a dummy user_id because the backend requires it for creation
            // In a real app we might create a user account first or handle it differently.
            const payload = {
                ...formData,
                user_id: !isUpdate ? 99999 + Math.floor(Math.random() * 100000) : (formData.user_id || 99999),
                societa_id: selectedSocietaId
            };
            
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setShowModal(false);
                fetchSoci();
            } else {
                const err = await response.json();
                showAlert(err.error || err.message, 'Errore salvataggio');
            }
        } catch (error) {
            console.error(error);
            showAlert('Errore di rete', 'Errore');
        }
    };

    const parseDate = (str) => {
        if (!str) return null;
        // Supporta dd/MM/yyyy e yyyy-MM-dd
        const itMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
        if (itMatch) return `${itMatch[3]}-${itMatch[2].padStart(2,'0')}-${itMatch[1].padStart(2,'0')}`;
        const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
        return null;
    };

    const loadXLSXFromCDN = () => new Promise((resolve, reject) => {
        if (window.XLSX) { resolve(window.XLSX); return; }
        const script = document.createElement('script');
        script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
        script.onload = () => resolve(window.XLSX);
        script.onerror = () => reject(new Error('CDN non raggiungibile'));
        document.head.appendChild(script);
    });

    const handleExportTemplate = () => {
        const headers = [
            'COGNOME', 'NOME', 'SESSO', 'DATA_NASCITA', 'COMUNE_NASCITA',
            'CODICE_FISCALE', 'EMAIL', 'TELEFONO', 'INDIRIZZO_RESIDENZA',
            'COMUNE_RESIDENZA', 'CAP', 'DATA SCADENZA CERTIFICATO',
            'DATA_ISCRIZIONE', 'NOTE',
        ];
        const csv = headers.join(';') + '\n';
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'template_importazione_soci.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setShowActionsMenu(false);
    };

    const handleExportImport = async () => {
        if (!importReport) return;
        let XLSX;
        try {
            XLSX = await loadXLSXFromCDN();
        } catch (e) {
            showAlert('Impossibile caricare il supporto XLSX.', 'Errore esportazione');
            return;
        }
        const { headers, dataRecords, logs } = importReport;
        const visibleLogs = (logs || []).filter(l =>
            (l.type === 'OK'   && importLogFilters.creati)  ||
            (l.type === 'SKIP' && importLogFilters.saltati) ||
            (l.type === 'ERR'  && importLogFilters.errori)
        );
        const rowIdxSet = new Set(visibleLogs.map(l => l.rowIdx));
        const filteredRows = (dataRecords || []).filter((_, idx) => rowIdxSet.has(idx));
        const wsData = [headers || [], ...filteredRows];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Export');
        XLSX.writeFile(wb, 'export_importazione.xlsx');
    };

    const importFromFile = async (file) => {
        if (!selectedSocietaId) { showAlert('Seleziona prima una società.', 'Società mancante', 'warning'); return; }

        const isXLSX = /\.(xlsx|xls)$/i.test(file.name);
        let content;

        if (isXLSX) {
            let XLSX;
            try {
                XLSX = await loadXLSXFromCDN();
            } catch(e) {
                showAlert('Impossibile caricare il supporto XLSX. Usa il formato CSV oppure verifica la connessione internet.', 'Errore caricamento');
                return;
            }
            const buffer = await file.arrayBuffer();
            const wb = XLSX.read(buffer, { type: 'array', raw: false, dateNF: 'dd/mm/yyyy' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            // Converti il foglio in CSV con ; come separatore
            content = XLSX.utils.sheet_to_csv(ws, { FS: ';', blankrows: false });
        } else {
            content = await file.text();
            content = content.replace(/^\uFEFF/, '');
        }

        const firstLine = content.split(/\r?\n/)[0];
        const sep = firstLine.includes(';') ? ';' : ',';

        // Parser CSV che gestisce celle multilinea (a capo dentro virgolette)
        const parseCSVContent = (text, separator) => {
            const records = [];
            let cur = ''; let inQ = false;
            let fields = [];
            for (let i = 0; i < text.length; i++) {
                const ch = text[i];
                if (inQ) {
                    if (ch === '"' && text[i+1] === '"') { cur += '"'; i++; }
                    else if (ch === '"') { inQ = false; }
                    else { cur += ch; }
                } else if (ch === '"') {
                    inQ = true;
                } else if (ch === separator) {
                    fields.push(cur.trim()); cur = '';
                } else if (ch === '\n' || (ch === '\r' && text[i+1] === '\n')) {
                    if (ch === '\r') i++;
                    fields.push(cur.trim()); cur = '';
                    if (fields.some(f => f !== '')) records.push(fields);
                    fields = [];
                } else {
                    cur += ch;
                }
            }
            if (cur.trim() || fields.length) { fields.push(cur.trim()); if (fields.some(f => f !== '')) records.push(fields); }
            return records;
        };

        const allRecords = parseCSVContent(content, sep);
        if (allRecords.length < 2) { showAlert('File vuoto o non valido.', 'File non valido', 'warning'); return; }

        // Trova la riga header: la prima che contiene CODICE_FISCALE o COGNOME
        const headerIdx = allRecords.findIndex(r => {
            const joined = r.join(';').toUpperCase();
            return joined.includes('CODICE_FISCALE') || joined.includes('COGNOME');
        });
        if (headerIdx === -1) { showAlert('Intestazioni colonne non trovate nel file.', 'File non valido', 'warning'); return; }

        const headers = allRecords[headerIdx].map(h => h.toUpperCase().trim());
        const col = (name) => headers.indexOf(name);
        const dataRecords = allRecords.slice(headerIdx + 1);
        const total = dataRecords.length;

        // Fetch CF già presenti per questa specifica società (dati freschi dal server)
        const token = localStorage.getItem('token');
        let existingCFs = new Set();
        try {
            const res = await fetch(`/users/api/soci?societa_id=${selectedSocietaId}`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    data.forEach(s => { if (s.codice_fiscale) existingCFs.add(s.codice_fiscale.toUpperCase()); });
                }
            }
        } catch(e) { /* usa set vuoto se fallisce */ }

        setShowActionsMenu(false);
        setImportLogFilters({ creati: true, saltati: true, errori: true });
        setImportReport({ total, current: 0, creati: 0, saltati: 0, errori: [], logs: [], done: false, headers, dataRecords });

        let creati = 0; let saltati = 0; const errori = []; const logs = [];

        for (let i = 0; i < dataRecords.length; i++) {
            const cells = dataRecords[i];
            const get = (name) => { const idx = col(name); return idx >= 0 ? (cells[idx] || '').trim() : ''; };

            const cf = get('CODICE_FISCALE').toUpperCase();
            if (!cf) {
                saltati++;
                logs.push({ type: 'SKIP', rowIdx: i, message: `Riga ${i+2}: codice fiscale assente` });
            } else if (existingCFs.has(cf)) {
                saltati++;
                logs.push({ type: 'SKIP', rowIdx: i, message: `Riga ${i+2} (${cf}): già presente nella società` });
            } else {
                const cognome = get('COGNOME') || '-';
                const nome = get('NOME') || '-';
                const payload = {
                    societa_id: selectedSocietaId,
                    cognome: get('COGNOME') || '-',
                    nome: get('NOME') || '-',
                    sesso: get('SESSO') || 'M',
                    data_nascita: parseDate(get('DATA_NASCITA')) || '1900-01-01',
                    luogo_nascita: get('COMUNE_NASCITA') || '',
                    codice_fiscale: cf,
                    email: get('EMAIL') || `${cf.toLowerCase()}@import.local`,
                    telefono: get('TELEFONO') || '',
                    indirizzo: get('INDIRIZZO_RESIDENZA') || null,
                    comune: get('COMUNE_RESIDENZA') || null,
                    cap: get('CAP') || null,
                    scadenza_certificato: parseDate(get('DATA SCADENZA CERTIFICATO')) || null,
                    data_ammissione: parseDate(get('DATA_ISCRIZIONE')) || null,
                    note: get('NOTE') || null,
                };
                try {
                    const res = await fetch('/users/api/soci', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify(payload),
                    });
                    if (res.ok) {
                        creati++;
                        existingCFs.add(cf);
                        logs.push({ type: 'OK', rowIdx: i, message: `Riga ${i+2} - ${cognome} ${nome} (${cf}): creato` });
                    } else {
                        const err = await res.json();
                        const msg = err.error || err.message || 'errore sconosciuto';
                        if (msg.toLowerCase().includes('duplicat') || msg.toLowerCase().includes('codice fiscale')) {
                            saltati++;
                            logs.push({ type: 'SKIP', rowIdx: i, message: `Riga ${i+2} (${cf}): duplicato rilevato dal server` });
                        } else {
                            errori.push(`Riga ${i+2} (${cf}): ${msg}`);
                            logs.push({ type: 'ERR', rowIdx: i, message: `Riga ${i+2} (${cf}): ${msg}` });
                        }
                    }
                } catch (e) {
                    errori.push(`Riga ${i+2} (${cf}): errore di rete`);
                    logs.push({ type: 'ERR', rowIdx: i, message: `Riga ${i+2} (${cf}): errore di rete` });
                }
            }

            // Aggiorna progress ogni riga
            const snap = { total, current: i + 1, creati, saltati, errori: [...errori], logs: [...logs], done: false, headers, dataRecords };
            setImportReport(snap);
            // Auto-scroll log
            if (importLogRef.current) importLogRef.current.scrollTop = importLogRef.current.scrollHeight;
        }

        // Completato
        setImportReport({ total, current: total, creati, saltati, errori, logs, done: true, headers, dataRecords });
        if (importLogRef.current) importLogRef.current.scrollTop = importLogRef.current.scrollHeight;
        if (creati > 0) fetchSoci();
        if (importFileRef.current) importFileRef.current.value = '';
    };

    const handleEditSocio = (socio) => {
        setSelectedSocio(socio);
        setShowModal(true);
    };

    const handleOpenComunicazione = (socioId) => {
        setComunicazioneSocioId(socioId);
        setShowComunicazioneModal(true);
    };

    return (
        <div className="soci-full-container">
            {/* AppBar removed, using Layout */}
            
            <div className="main-content">
                {/* Filters Toolbar */}
                <div className="toolbar-card" style={{display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'stretch'}}>
                    <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '12px'}}>
                        
                        {/* Cognome */}
                        <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '120px'}}>
                            <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Cognome</label>
                            <input 
                                className="md-input" 
                                placeholder="Cognome" 
                                style={{width: '100%', padding: '6px 12px'}} 
                                value={filters.cognome}
                                onChange={(e) => handleFilterChange('cognome', e.target.value)}
                            />
                        </div>
                        
                        {/* Nome */}
                        <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '120px'}}>
                            <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Nome</label>
                            <input 
                                className="md-input" 
                                placeholder="Nome" 
                                style={{width: '100%', padding: '6px 12px'}} 
                                value={filters.nome}
                                onChange={(e) => handleFilterChange('nome', e.target.value)}
                            />
                        </div>

                        {/* Iscritto */}
                        <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '100px'}}>
                            <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Iscritto</label>
                            <select 
                                className="md-select" 
                                style={{width: '100%', padding: '6px 12px'}}
                                value={filters.iscritto}
                                onChange={(e) => handleFilterChange('iscritto', e.target.value)}
                            >
                                <option value="">TUTTI</option>
                                <option value="1">SI</option>
                                <option value="0">NO</option>
                            </select>
                        </div>

                        {/* Cert. medico */}
                        <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '120px'}}>
                            <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Cert. medico</label>
                            <select 
                                className="md-select" 
                                style={{width: '100%', padding: '6px 12px'}}
                                value={filters.certMedico}
                                onChange={(e) => handleFilterChange('certMedico', e.target.value)}
                            >
                                <option value="">TUTTI</option>
                                <option value="MISSING">MANCANTE</option>
                                <option value="2">VALIDO</option>
                                <option value="1">IN SCADENZA</option>
                                <option value="0">SCADUTO</option>
                            </select>
                        </div>

                        {/* Pagamenti */}
                        <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '120px'}}>
                            <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Pagamenti</label>
                            <select 
                                className="md-select" 
                                style={{width: '100%', padding: '6px 12px'}}
                                value={filters.pagamenti}
                                onChange={(e) => handleFilterChange('pagamenti', e.target.value)}
                            >
                                <option value="">TUTTI</option>
                                <option value="0">REGOLARI</option>
                                <option value="1">NON REGOLARI</option>
                            </select>
                        </div>

                        {/* Liste */}
                        <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '120px'}}>
                            <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Liste</label>
                            <select 
                                className="md-select" 
                                style={{width: '100%', padding: '6px 12px'}}
                                value={filters.lista}
                                onChange={(e) => handleFilterChange('lista', e.target.value)}
                            >
                                <option value="">TUTTI</option>
                                <option value="4614">Aerobica</option>
                                <option value="4356">THAI BOXE</option>
                                <option value="4257">U13</option>
                            </select>
                        </div>

                         {/* Accesso tornello (Hidden as per request) */}
                         <div style={{display:'none', flexDirection:'column', borderRight: '1px solid black', paddingRight: '15px'}}>
                            <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Accesso tornello</label>
                            <select className="md-select" style={{width: '110px'}}>
                                <option value="">TUTTI</option>
                                <option value="1">ABILITATO</option>
                                <option value="0">NON ABILITATO</option>
                            </select>
                        </div>
                        
                        {/* Ricerca Avanzata Button */}
                         <button 
                            className="btn-contained" 
                            style={{backgroundColor:'#17a2b8', height: '35px', display:'flex', alignItems:'center', gap:'8px', fontSize:'0.9rem', padding: '0 12px'}}
                            onClick={() => setShowAdvancedSearch(true)}
                         >
                            <Search size={14}/> Ricerca avanzata
                        </button>

                         {/* Altre azioni Dropdown */}
                        <div style={{position:'relative'}}>
                             <button 
                                className="btn-contained" 
                                style={{backgroundColor: 'var(--primary-color)', height: '35px', display:'flex', alignItems:'center', gap:'8px', fontSize:'0.9rem', padding: '0 12px'}} 
                                onClick={() => setShowActionsMenu(!showActionsMenu)}
                             >
                                <Zap size={14}/> Altre azioni
                            </button>
                            {showActionsMenu && (
                                <>
                                <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, zIndex: 9}} onClick={() => setShowActionsMenu(false)}></div>
                                <div style={{
                                    position: 'absolute', right: 0, top: '100%', marginTop: '4px',
                                    backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '4px',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 10, minWidth: '240px',
                                    padding: '8px 0', display:'flex', flexDirection:'column'
                                }}>
                                    {/* <div style={{padding: '8px 16px', fontSize:'0.75rem', fontWeight:'bold', color:'#333', backgroundColor:'#f8f9fa'}}>Azioni sui soci filtrati</div> */}
                                    {/* <button className="dropdown-item-custom"><Mail size={16}/> Invia comunicazione</button> */}
                                    {/* <button className="dropdown-item-custom"><QrCode size={16}/> Stampa tessere</button> */}
                                    <button className="dropdown-item-custom" onClick={exportToExcel}><FileDown size={16}/> Esporta Excel</button>
                                    {/* <button className="dropdown-item-custom"><Check size={16}/> Iscrizione diretta</button> */}
                                    {/* <button className="dropdown-item-custom"><X size={16}/> Revoca iscrizione</button> */}
                                    {/* <button className="dropdown-item-custom"><Calendar size={16}/> Accetta come soci</button> */}
                                    {/* <button className="dropdown-item-custom"><ListOrdered size={16}/> Imposta livello</button> */}
                                    {/* <button className="dropdown-item-custom"><Star size={16}/> Imposta valutazione</button> */}
                                    {/* <button className="dropdown-item-custom"><Tag size={16}/> Aggiungi a lista</button> */}
                                    {/* <button className="dropdown-item-custom"><X size={16}/> Rimuovi da lista</button> */}
                                    {/* <button className="dropdown-item-custom"><ClipboardList size={16}/> Associa scadenzario</button> */}
                                    {/* <div style={{height:'1px', backgroundColor:'#e9ecef', margin:'4px 0'}}></div> */}
                                    {/* <div style={{padding: '8px 16px', fontSize:'0.75rem', fontWeight:'bold', color:'#333', backgroundColor:'#f8f9fa'}}>Altre azioni</div> */}
                                    {/* <button className="dropdown-item-custom"><Tag size={16}/> Gestione liste</button> */}
                                    <button className="dropdown-item-custom" onClick={() => importFileRef.current?.click()}><FileUp size={16}/> Importa Excel</button>
                                    <button className="dropdown-item-custom" onClick={handleExportTemplate}><FileDown size={16}/> Esporta template</button>
                                    {/* <button className="dropdown-item-custom"><RefreshCw size={16}/> Rielabora whitelist</button> */}
                                    {/* Accessi hidden */}
                                </div>
                                </>
                            )}
                        </div>

                        {/* Nuovo Socio Button (Green) */}
                        <button 
                            className="btn-contained" 
                            style={{backgroundColor: 'var(--success-color)', height: '35px', display:'flex', alignItems:'center', gap:'8px', fontSize:'0.9rem', padding: '0 12px'}} 
                            onClick={() => { setSelectedSocio(null); setShowModal(true); }}
                        >
                            <Plus size={14}/> Nuovo socio
                        </button>

                    </div>
                </div>

                {/* Data Table */}
                <div className="table-card">
                    <div className="table-responsive">
                        <table className="md-table">
                            <thead>
                                <tr>
                                    <th style={{width: '60px'}}></th>
                                    <th>Nominativo</th>
                                    <th>Dati di nascita</th>
                                    <th>Socio</th>
                                    <th>Tesserato</th>
                                    <th>Certificato Medico</th>
                                    <th>Contatti</th>
                                    <th style={{textAlign:'right'}}>Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSoci.map(socio => (
                                    <tr key={socio.id}>
                                        <td>
                                            <div style={{
                                                width:'40px', height:'40px', borderRadius:'50%', 
                                                backgroundColor: socio.tipo_socio === 'associazione' ? '#f3e8ff' : (socio.sesso === 'F' ? '#fce4ec' : '#e3f2fd'),
                                                color: socio.tipo_socio === 'associazione' ? '#7c3aed' : (socio.sesso === 'F' ? '#e91e63' : '#1976d2'),
                                                display:'flex', alignItems:'center', justifyContent:'center'
                                            }}>
                                                {socio.tipo_socio === 'associazione' ? <Building2 size={20}/> : <User size={20}/>}
                                            </div>
                                        </td>
                                        <td>
                                            <div
                                                style={{fontWeight: 500, cursor: 'pointer', color: 'var(--primary)', textDecoration: 'underline'}}
                                                onClick={() => handleEditSocio(socio)}
                                            >
                                                {socio.tipo_socio === 'associazione'
                                                    ? (socio.ragione_sociale || '-')
                                                    : `${socio.cognome} ${socio.nome}`}
                                            </div>
                                            <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
                                                {socio.tipo_socio === 'associazione'
                                                    ? (socio.tipo_associazione || 'Associazione')
                                                    : `Socio/Tesserato: ${socio.livello}`}
                                            </div>
                                        </td>
                                        <td>
                                            {socio.data_nascita}
                                        </td>
                                        <td>
                                            {(() => {
                                                const label = getIscrizioneLabel(socio);
                                                const chipClass = {
                                                    'SOCIO': 'info',
                                                    'ISCRITTO': 'iscritto',
                                                    'SCADUTO': 'warning',
                                                    'NO': 'non-iscritto'
                                                }[label] || 'non-iscritto';
                                                return <span className={`chip ${chipClass}`}>{label}</span>;
                                            })()}
                                        </td>
                                        <td>
                                            {(() => {
                                                const label = getTesseratoLabel(socio);
                                                const chipClass = {
                                                    'REGOLARE': 'iscritto',
                                                    'SCADUTO': 'warning',
                                                    'NO': 'non-iscritto'
                                                }[label] || 'non-iscritto';
                                                return <span className={`chip ${chipClass}`}>{label}</span>;
                                            })()}
                                        </td>
                                        <td>
                                            {(() => {
                                                const status = getCertStatus(socio.scadenza_certificato);
                                                let color = 'inherit';
                                                const scadenzaStr = computeScadenzaCertificatoStr(socio.scadenza_certificato);
                                                let text = scadenzaStr || socio.scadenza_certificato;

                                                if (status === 'MISSING') {
                                                    color = 'var(--danger-color)';
                                                    text = 'MANCANTE';
                                                } else if (status === '0') {
                                                    color = 'var(--danger-color)';
                                                } else if (status === '1') {
                                                    color = 'var(--warning-color)';
                                                }
                                                
                                                return (
                                                    <span style={{ color: color, fontWeight: status === '2' ? 'normal' : 'bold' }}>
                                                        {text}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td>
                                            <div style={{fontSize: '0.875rem'}}>{socio.telefono}</div>
                                        </td>
                                        <td style={{textAlign:'right'}}>
                                            <button className="btn-icon-small" title="Modifica" onClick={() => handleEditSocio(socio)}><Edit size={18}/></button>
                                            <button 
                                                className="btn-icon-small" 
                                                title="Invia Email"
                                                onClick={() => handleOpenComunicazione(socio.id)}
                                            >
                                                <Mail size={18}/>
                                            </button>
                                            <button className="btn-icon-small" title="Nuovo pagamento" onClick={() => navigate('/nuovo-pagamento', { state: { socio } })}><Euro size={18}/></button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredSoci.length === 0 && (
                                    <tr>
                                        <td colSpan="8" style={{textAlign:'center', padding:'32px', color:'var(--text-secondary)'}}>
                                            Nessun socio trovato
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>



            {showModal && <SocioModal onClose={() => setShowModal(false)} onSave={handleSaveSocio} socioData={selectedSocio} />}
            
            {showComunicazioneModal && (
                <ComunicazioneModal
                    socioId={comunicazioneSocioId}
                    onClose={() => setShowComunicazioneModal(false)}
                    onSave={() => {
                        // Optionally refresh socio list or show success message
                    }}
                />
            )}

            <AdvancedSearchSidebar 
                isOpen={showAdvancedSearch} 
                onClose={() => setShowAdvancedSearch(false)} 
            />
            
            <EditProfileModal 
                isOpen={showEditProfileModal} 
                onClose={() => setShowEditProfileModal(false)} 
            />

            {/* Input file nascosto per importazione */}
            <input
                ref={importFileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.[0]) importFromFile(e.target.files[0]); }}
            />

            {/* Modal avanzamento/riepilogo importazione */}
            {importReport && (
                <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: '60px' }} onClick={importReport.done ? () => setImportReport(null) : undefined}>
                    <div className="modal-card" style={{ maxWidth: '560px', width: '95%', padding: '28px' }} onClick={e => e.stopPropagation()}>
                        {!importReport.done ? (
                            <>
                                <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 600 }}>Importazione in corso…</h3>
                                <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    Riga {importReport.current} di {importReport.total}
                                </p>
                                {/* Progress bar */}
                                <div style={{ height: '8px', borderRadius: '4px', backgroundColor: '#e0e0e0', overflow: 'hidden', marginBottom: '16px' }}>
                                    <div style={{
                                        height: '100%', borderRadius: '4px',
                                        backgroundColor: 'var(--primary-color)',
                                        width: `${importReport.total > 0 ? Math.round((importReport.current / importReport.total) * 100) : 0}%`,
                                        transition: 'width 0.15s ease',
                                    }} />
                                </div>
                                <div style={{ display: 'flex', gap: '24px', fontSize: '0.88rem', marginBottom: '16px' }}>
                                    <span style={{ color: '#2e7d32' }}>✓ Creati: <strong>{importReport.creati}</strong></span>
                                    <span style={{ color: '#888' }}>↷ Saltati: <strong>{importReport.saltati}</strong></span>
                                    <span style={{ color: '#c62828' }}>✗ Errori: <strong>{importReport.errori.length}</strong></span>
                                </div>
                                {/* Log */}
                                <div ref={importLogRef} style={{
                                    fontFamily: 'monospace', fontSize: '0.78rem', lineHeight: '1.6',
                                    backgroundColor: '#1e1e1e', color: '#d4d4d4', borderRadius: '6px',
                                    padding: '10px 12px', height: '180px', overflowY: 'auto',
                                    whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                                }}>
                                    {(importReport.logs || []).map((l, i) => (
                                        <div key={i} style={{
                                            color: l.type === 'OK' ? '#6fcf97' : l.type === 'ERR' ? '#eb5757' : '#b0b0b0'
                                        }}>{l.type === 'OK' ? '[OK]   ' : l.type === 'ERR' ? '[ERR]  ' : '[SKIP] '}{l.message}</div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem', fontWeight: 600 }}>Importazione completata</h3>
                                {/* Progress bar al 100% */}
                                <div style={{ height: '8px', borderRadius: '4px', backgroundColor: '#e0e0e0', overflow: 'hidden', marginBottom: '14px' }}>
                                    <div style={{ height: '100%', borderRadius: '4px', backgroundColor: '#4caf50', width: '100%' }} />
                                </div>
                                {/* Badge cliccabili per filtrare i log */}
                                <p style={{ margin: '0 0 8px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Clicca per filtrare i log e l'esportazione:</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                                    <div
                                        onClick={() => setImportLogFilters(f => ({ ...f, creati: !f.creati }))}
                                        style={{
                                            display: 'flex', justifyContent: 'space-between', padding: '8px 12px',
                                            backgroundColor: importLogFilters.creati ? '#f1f8e9' : '#f5f5f5',
                                            borderRadius: '6px', cursor: 'pointer', userSelect: 'none',
                                            border: `2px solid ${importLogFilters.creati ? '#66bb6a' : '#e0e0e0'}`,
                                            opacity: importLogFilters.creati ? 1 : 0.5,
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        <span style={{ color: '#2e7d32' }}>✓ Soci creati</span>
                                        <strong style={{ color: '#2e7d32' }}>{importReport.creati}</strong>
                                    </div>
                                    <div
                                        onClick={() => setImportLogFilters(f => ({ ...f, saltati: !f.saltati }))}
                                        style={{
                                            display: 'flex', justifyContent: 'space-between', padding: '8px 12px',
                                            backgroundColor: importLogFilters.saltati ? '#f5f5f5' : '#f9f9f9',
                                            borderRadius: '6px', cursor: 'pointer', userSelect: 'none',
                                            border: `2px solid ${importLogFilters.saltati ? '#bdbdbd' : '#e0e0e0'}`,
                                            opacity: importLogFilters.saltati ? 1 : 0.5,
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        <span style={{ color: '#666' }}>↷ Saltati (già esistenti o CF assente)</span>
                                        <strong style={{ color: '#666' }}>{importReport.saltati}</strong>
                                    </div>
                                    <div
                                        onClick={() => setImportLogFilters(f => ({ ...f, errori: !f.errori }))}
                                        style={{
                                            display: 'flex', justifyContent: 'space-between', padding: '8px 12px',
                                            backgroundColor: importLogFilters.errori ? '#fff3f3' : '#f9f9f9',
                                            borderRadius: '6px', cursor: 'pointer', userSelect: 'none',
                                            border: `2px solid ${importLogFilters.errori ? '#ef9a9a' : '#e0e0e0'}`,
                                            opacity: importLogFilters.errori ? 1 : 0.5,
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        <span style={{ color: '#c62828' }}>✗ Errori</span>
                                        <strong style={{ color: '#c62828' }}>{importReport.errori.length}</strong>
                                    </div>
                                </div>
                                {/* Log filtrato */}
                                <div ref={importLogRef} style={{
                                    fontFamily: 'monospace', fontSize: '0.78rem', lineHeight: '1.6',
                                    backgroundColor: '#1e1e1e', color: '#d4d4d4', borderRadius: '6px',
                                    padding: '10px 12px', height: '180px', overflowY: 'auto',
                                    whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginBottom: '14px',
                                }}>
                                    {(importReport.logs || [])
                                        .filter(l =>
                                            (l.type === 'OK'   && importLogFilters.creati)  ||
                                            (l.type === 'SKIP' && importLogFilters.saltati) ||
                                            (l.type === 'ERR'  && importLogFilters.errori)
                                        )
                                        .map((l, i) => (
                                            <div key={i} style={{
                                                color: l.type === 'OK' ? '#6fcf97' : l.type === 'ERR' ? '#eb5757' : '#b0b0b0'
                                            }}>{l.type === 'OK' ? '[OK]   ' : l.type === 'ERR' ? '[ERR]  ' : '[SKIP] '}{l.message}</div>
                                        ))
                                    }
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        className="btn-outlined"
                                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                        onClick={handleExportImport}
                                    >
                                        <FileDown size={15} /> Esporta XLSX
                                    </button>
                                    <button className="btn-contained" style={{ flex: 1 }} onClick={() => setImportReport(null)}>Chiudi</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Soci;
