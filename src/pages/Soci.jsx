import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { Search, Plus, Filter, User, Building2, Mail, CreditCard, Menu, Bell, Settings, MoreVertical, Zap, QrCode, FileSpreadsheet, FileDown, FileUp, Check, X, Calendar, ListOrdered, Star, Tag, ClipboardList, RefreshCw, Euro, LogOut, Edit, ChevronDown, ChevronUp } from 'lucide-react';

const TAG_PALETTE = [
    { bg: 'var(--info-container)', text: 'var(--primary)' }, { bg: 'var(--primary-container)', text: 'var(--primary)' },
    { bg: 'var(--success-container)', text: 'var(--on-success-container)' }, { bg: 'var(--warning-container)', text: 'var(--on-warning-container)' },
    { bg: 'var(--primary-container)', text: 'var(--primary)' }, { bg: '#ccfbf1', text: '#134e4a' },
    { bg: 'var(--warning-container)', text: 'var(--on-warning-container)' }, { bg: 'var(--primary-container)', text: 'var(--primary)' },
    { bg: 'var(--success-container)', text: 'var(--on-success-container)' }, { bg: 'var(--danger-container)', text: 'var(--on-danger-container)' },
    { bg: 'var(--warning-container)', text: 'var(--warning)' }, { bg: 'var(--success-container)', text: 'var(--success)' },
];
const getTagStyle = (tag) => {
    let h = 0;
    for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) & 0x7fffffff;
    return TAG_PALETTE[h % TAG_PALETTE.length];
};
const parseEtichette = (val) => {
    if (!val) return [];
    try { const p = JSON.parse(val); return Array.isArray(p) ? p : [String(val)]; }
    catch { return val.split(',').map(s => s.trim()).filter(Boolean); }
};

// ---------------------------------------------------------------------------
// Calcolo scadenze Iscrizione / Tesseramento (rispecchia SocioModal/Scadenziario)
// ---------------------------------------------------------------------------
// Anno contabile (anno associativo) a cui appartiene una certa data.
const annoContabileDiData = (dateInput, societa) => {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d)) return null;
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const tipo = societa?.tipo_anno_associativo || 'solare';
    if (tipo === 'associativo') return month < 9 ? year - 1 : year;
    if (tipo === 'personalizzato' && societa?.data_inizio_anno_associativo) {
        const parts = String(societa.data_inizio_anno_associativo).split('-');
        if (parts.length === 2) {
            const cDay = parseInt(parts[0], 10);
            const cMonth = parseInt(parts[1], 10);
            if (month < cMonth || (month === cMonth && day < cDay)) return year - 1;
        }
        return year;
    }
    return year;
};

// Scadenza di un pagamento Iscrizione (quota associativa): fine anno contabile del pagamento.
const scadenzaPagamentoIscrizione = (p, societa) => {
    if (!p.data_pagamento) return null;
    const anno = annoContabileDiData(p.data_pagamento, societa);
    if (anno == null) return null;
    return getAnnoDateRange(anno, societa).end;
};

// Scadenza di un pagamento Tesseramento: 365 giorni (anno_solare) oppure fine anno contabile.
const scadenzaPagamentoTesseramento = (p, societa) => {
    if (!p.data_pagamento) return null;
    if (p.periodicity_tesseramento === 'anno_solare') {
        const scad = new Date(p.data_pagamento);
        scad.setFullYear(scad.getFullYear() + 1);
        scad.setDate(scad.getDate() - 1);
        return scad;
    }
    // anno_associativo o periodicità non specificata: fine anno contabile del pagamento
    const anno = annoContabileDiData(p.data_pagamento, societa);
    if (anno == null) return null;
    return getAnnoDateRange(anno, societa).end;
};

// Da una scadenza (timestamp) allo stato: REGOLARE / IN SCADENZA (entro 30 gg) / SCADUTO / NO.
const statoDaScadenza = (scadTs) => {
    if (scadTs == null) return 'NO';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const s = new Date(scadTs); s.setHours(0, 0, 0, 0);
    if (s < today) return 'SCADUTO';
    const limit = new Date(today); limit.setDate(limit.getDate() + 30);
    if (s <= limit) return 'IN SCADENZA';
    return 'REGOLARE';
};

// Chip di stato (Iscrizione/Tesseramento)
const STATO_CHIP_CLASS = {
    'REGOLARE': 'iscritto',
    'IN SCADENZA': 'warning',
    'SCADUTO': 'non-iscritto',
    'NO': 'assente',
};

const Soci = ({ onLogout }) => {
    const { selectedSocietaId, societaList } = useSocieta();
    const { selectedAnno, currentRefYear } = useAnno();
    const showAlert = useAlert();
    const [soci, setSoci] = useState([]);
    // Pagamenti della società (grezzi): le scadenze vengono precalcolate una sola volta (vedi scadenzaMaps)
    const [payments, setPayments] = useState([]);
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
    const [importLogFilters, setImportLogFilters] = useState({ creati: true, aggiornati: true, saltati: true, errori: true });
    const importFileRef = useRef(null);
    const importOdooFileRef = useRef(null);
    const importLogRef = useRef(null);

    const location = useLocation();
    const navigate = useNavigate();
    const [hasOpenedFromUrl, setHasOpenedFromUrl] = useState(false);

    const canReadPayments = (() => {
        const role = (localStorage.getItem('user_role') || 'user').toLowerCase();
        if (role === 'superuser') {
            return true;
        }

        try {
            const features = JSON.parse(localStorage.getItem('user_features'));
            if (features === null || features === undefined) {
                return true;
            }
            return Array.isArray(features) && features.includes('pagamenti');
        } catch {
            return true;
        }
    })();

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
    

    // Fetch dei pagamenti della società: le scadenze
    // Iscrizione/Tesseramento vengono poi precalcolate in scadenzaMaps.
    const fetchPayments = async () => {
        if (!selectedSocietaId || !canReadPayments) {
            setPayments([]);
            return;
        }
        try {
            const response = await fetch(`/payments/api?societa_id=${selectedSocietaId}`);
            if (!response.ok) { setPayments([]); return; }
            const data = await response.json();
            setPayments(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Error fetching payments', e);
            setPayments([]);
        }
    };

    useEffect(() => {
        fetchPayments();
    }, [selectedSocietaId, canReadPayments]);

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
        iscrizione: '',
        tesseramento: '',
        certMedico: '',
        pagamenti: '',
        etichetta: ''
    });
    const [showMoreFilters, setShowMoreFilters] = useState(false);

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    // Elenco unico delle etichette presenti tra i soci, per popolare il filtro
    const etichetteOptions = [...new Set(soci.flatMap(s => parseEtichette(s.etichette)))].sort((a, b) => a.localeCompare(b, 'it'));

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

    const currentSocieta = useMemo(
        () => societaList.find(s => s.id == selectedSocietaId) || null,
        [societaList, selectedSocietaId]
    );

    // Precalcolo delle scadenze: una sola passata sui pagamenti -> lookup O(1) per socio.
    // Per ogni socio (per socio_id e per codice fiscale) si tiene la scadenza più lontana
    // (il pagamento più favorevole) per Iscrizione e per Tesseramento.
    const scadenzaMaps = useMemo(() => {
        const iscrBySocioId = new Map(), iscrByCf = new Map();
        const tessBySocioId = new Map(), tessByCf = new Map();
        const put = (mapId, mapCf, p, scad) => {
            if (!scad) return;
            const ts = scad.getTime();
            if (isNaN(ts)) return;
            if (p.socio_id != null) {
                const prev = mapId.get(p.socio_id);
                if (prev == null || ts > prev) mapId.set(p.socio_id, ts);
            }
            if (p.codice_fiscale) {
                const cf = p.codice_fiscale.toUpperCase();
                const prev = mapCf.get(cf);
                if (prev == null || ts > prev) mapCf.set(cf, ts);
            }
        };
        for (const p of payments) {
            // Ignora i pagamenti annullati/storni (stato "3. ...")
            if (typeof p.stato_pagamento === 'string' && p.stato_pagamento.startsWith('3.')) continue;
            if (!p.codice_fiscale && p.socio_id == null) continue;
            if (!p.quote_types) continue;
            const types = p.quote_types.split(',').map(t => t.trim().toLowerCase());
            if (types.includes('quota_associativa')) put(iscrBySocioId, iscrByCf, p, scadenzaPagamentoIscrizione(p, currentSocieta));
            if (types.includes('tesseramento')) put(tessBySocioId, tessByCf, p, scadenzaPagamentoTesseramento(p, currentSocieta));
        }
        return { iscrBySocioId, iscrByCf, tessBySocioId, tessByCf };
    }, [payments, currentSocieta]);

    // Scadenza più favorevole (timestamp) per un socio, cercando per socio_id e per codice fiscale.
    const bestScadTs = (bySocioId, byCf, socio) => {
        let best = null;
        if (socio.id != null) { const v = bySocioId.get(socio.id); if (v != null) best = v; }
        const cf = (socio.codice_fiscale || '').toUpperCase();
        if (cf) { const v = byCf.get(cf); if (v != null && (best == null || v > best)) best = v; }
        return best;
    };

    const getIscrizioneStatus = (socio) => {
        const iscrizioni = socio.iscrizioni || [];
        // Flag "Iscrizione senza ricevuta" per l'anno contabile corrente => sempre REGOLARE
        if (iscrizioni.some(i => i.anno === currentRefYear)) return 'REGOLARE';
        let best = bestScadTs(scadenzaMaps.iscrBySocioId, scadenzaMaps.iscrByCf, socio);
        // Iscrizioni senza ricevuta di altri anni: valgono come quota (scadenza = fine anno contabile)
        for (const i of iscrizioni) {
            if (i.anno == null) continue;
            const ts = getAnnoDateRange(i.anno, currentSocieta).end.getTime();
            if (best == null || ts > best) best = ts;
        }
        return statoDaScadenza(best);
    };

    const getTesseramentoStatus = (socio) => {
        // Opzione "Quota associativa e Tesseramento Unico": il tesseramento eredita lo stato dell'iscrizione
        if (currentSocieta?.quota_tesseramento_unico) return getIscrizioneStatus(socio);
        const best = bestScadTs(scadenzaMaps.tessBySocioId, scadenzaMaps.tessByCf, socio);
        return statoDaScadenza(best);
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
            getIscrizioneStatus(s),
            formatDate((s.iscrizioni || []).sort((a, b) => (a.anno || 0) - (b.anno || 0))[0]?.createdAt || s.data_ammissione),
            formatDate(s.data_ammissione),
            getTesseramentoStatus(s) !== 'REGOLARE' ? 'SI' : 'NO',
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
            const status = getIscrizioneStatus(socio);
            const isIscritto = status === 'REGOLARE' || status === 'IN SCADENZA';
            if (filters.iscritto === '1' && !isIscritto) return false;
            if (filters.iscritto === '0' && isIscritto) return false;
        }

        if (filters.iscrizione !== '') {
            if (getIscrizioneStatus(socio) !== filters.iscrizione) return false;
        }

        if (filters.tesseramento !== '') {
            if (getTesseramentoStatus(socio) !== filters.tesseramento) return false;
        }

        if (filters.certMedico !== '') {
            const status = getCertStatus(socio.scadenza_certificato);
            if (status !== filters.certMedico) return false;
        }

        if (filters.etichetta !== '') {
            if (!parseEtichette(socio.etichette).includes(filters.etichetta)) return false;
        }

        return true;
    });

    useEffect(() => {
        // Reset UI state e ricarica dati al cambio società
        setFilters({ cognome: '', nome: '', iscritto: '', iscrizione: '', tesseramento: '', certMedico: '', pagamenti: '', etichetta: '' });
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
                // Soft refresh: ricarica i dati della pagina senza reload del browser
                fetchSoci();
                fetchPayments();
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

    // Parser CSV robusto: gestisce virgolette e celle multilinea, con separatore configurabile.
    const parseDelimited = (text, separator) => {
        const records = [];
        let cur = ''; let inQ = false; let fields = [];
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

    // Legge un file (CSV o XLSX) in una matrice di righe/celle.
    // - Supporta i fogli XLSX/XLS
    // - Rimuove l'eventuale BOM UTF-8 iniziale
    // - Rileva automaticamente il separatore CSV (',' oppure ';')
    const readFileToRecords = async (file) => {
        const isXLSX = /\.(xlsx|xls)$/i.test(file.name);
        if (isXLSX) {
            const XLSX = await loadXLSXFromCDN();
            const buffer = await file.arrayBuffer();
            const wb = XLSX.read(buffer, { type: 'array', raw: false, dateNF: 'dd/mm/yyyy' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });
            return aoa
                .map(row => (row || []).map(c => (c === null || c === undefined) ? '' : String(c).trim()))
                .filter(r => r.some(f => f !== ''));
        }
        let text = await file.text();
        text = text.replace(/^\uFEFF/, '');
        const firstLine = text.split(/\r?\n/)[0] || '';
        const sep = (firstLine.split(';').length > firstLine.split(',').length) ? ';' : ',';
        return parseDelimited(text, sep);
    };

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

    // Ricava le righe (intestazioni originali + righe filtrate secondo i badge attivi) da esportare dal riepilogo import.
    const buildExportRows = () => {
        if (!importReport) return null;
        const { headers, dataRecords, logs } = importReport;
        const visibleLogs = (logs || []).filter(l =>
            (l.type === 'OK'     && importLogFilters.creati)     ||
            (l.type === 'UPDATE' && importLogFilters.aggiornati) ||
            (l.type === 'SKIP'   && importLogFilters.saltati)    ||
            (l.type === 'ERR'    && importLogFilters.errori)
        );
        const rowIdxSet = new Set(visibleLogs.map(l => l.rowIdx));
        const filteredRows = (dataRecords || []).filter((_, idx) => rowIdxSet.has(idx));
        return { headers: headers || [], filteredRows };
    };

    // format: 'xlsx' -> reimportabile con "Importa Excel" | 'csv' -> reimportabile con "Importa CSV Odoo"
    const handleExportImport = async (format = 'xlsx') => {
        const data = buildExportRows();
        if (!data) return;
        const { headers, filteredRows } = data;

        if (format === 'csv') {
            // Mantiene le intestazioni originali Odoo con separatore virgola, così "Importa CSV Odoo" lo rilegge.
            const escapeCell = (v) => {
                const s = String(v ?? '');
                return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
            };
            const csv = [headers, ...filteredRows].map(r => (r || []).map(escapeCell).join(',')).join('\r\n');
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'export_importazione_odoo.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return;
        }

        let XLSX;
        try {
            XLSX = await loadXLSXFromCDN();
        } catch (e) {
            showAlert('Impossibile caricare il supporto XLSX.', 'Errore esportazione');
            return;
        }
        const ws = XLSX.utils.aoa_to_sheet([headers, ...filteredRows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Export');
        XLSX.writeFile(wb, 'export_importazione.xlsx');
    };

    const importFromFile = async (file) => {
        if (!selectedSocietaId) { showAlert('Seleziona prima una società.', 'Società mancante', 'warning'); return; }

        let allRecords;
        try {
            allRecords = await readFileToRecords(file);
        } catch (e) {
            showAlert('Impossibile leggere il file. Se è un XLSX verifica la connessione internet, altrimenti usa un CSV.', 'Errore caricamento');
            return;
        }
        if (allRecords.length < 2) { showAlert('File vuoto o non valido.', 'File non valido', 'warning'); return; }

        // File in formato Odoo (contiene la colonna "È un'azienda")? -> usa la logica di importazione Odoo,
        // così un file esportato dal riepilogo Odoo può essere reimportato anche da "Importa Excel".
        if (allRecords.some(r => r.some(c => c.replace(/^\uFEFF/, '').trim() === "È un'azienda"))) {
            await runOdooImport(allRecords);
            if (importFileRef.current) importFileRef.current.value = '';
            return;
        }

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
        // Map<CF_uppercase, socio> per confrontare i dati ed eventualmente aggiornare
        let existingCFsMap = new Map();
        try {
            const res = await fetch(`/users/api/soci?societa_id=${selectedSocietaId}`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    data.forEach(s => { if (s.codice_fiscale) existingCFsMap.set(s.codice_fiscale.toUpperCase(), s); });
                }
            }
        } catch(e) { /* usa map vuota se fallisce */ }

        setShowActionsMenu(false);
        setImportLogFilters({ creati: true, aggiornati: true, saltati: true, errori: true });
        setImportReport({ total, current: 0, creati: 0, aggiornati: 0, saltati: 0, errori: [], logs: [], done: false, headers, dataRecords, source: 'excel' });

        let creati = 0; let aggiornati = 0; let saltati = 0; const errori = []; const logs = [];

        for (let i = 0; i < dataRecords.length; i++) {
            const cells = dataRecords[i];
            const get = (name) => { const idx = col(name); return idx >= 0 ? (cells[idx] || '').trim() : ''; };

            const cf = get('CODICE_FISCALE').toUpperCase();

            const buildPayload = () => ({
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
            });

            // Normalizza valori per il confronto: null/undefined/'' → '', date tronca al giorno
            const normStr = (v) => (v === null || v === undefined) ? '' : String(v).trim();
            const normDate = (v) => { if (!v) return ''; return String(v).trim().substring(0, 10); };

            if (!cf) {
                saltati++;
                logs.push({ type: 'SKIP', rowIdx: i, message: `Riga ${i+2}: codice fiscale assente` });
            } else if (existingCFsMap.has(cf)) {
                const existing = existingCFsMap.get(cf);
                const payload = buildPayload();
                const cognome = payload.cognome;
                const nome = payload.nome;

                const isDifferent =
                    normStr(payload.cognome) !== normStr(existing.cognome) ||
                    normStr(payload.nome) !== normStr(existing.nome) ||
                    normStr(payload.sesso) !== normStr(existing.sesso) ||
                    normDate(payload.data_nascita) !== normDate(existing.data_nascita) ||
                    normStr(payload.luogo_nascita) !== normStr(existing.luogo_nascita) ||
                    normStr(payload.email) !== normStr(existing.email) ||
                    normStr(payload.telefono) !== normStr(existing.telefono) ||
                    normStr(payload.indirizzo) !== normStr(existing.indirizzo) ||
                    normStr(payload.comune) !== normStr(existing.comune) ||
                    normStr(payload.cap) !== normStr(existing.cap) ||
                    normDate(payload.scadenza_certificato) !== normDate(existing.scadenza_certificato) ||
                    normDate(payload.data_ammissione) !== normDate(existing.data_ammissione) ||
                    normStr(payload.note) !== normStr(existing.note);

                if (isDifferent) {
                    try {
                        const res = await fetch(`/users/api/soci/${existing.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify(payload),
                        });
                        if (res.ok) {
                            aggiornati++;
                            const updated = await res.json();
                            existingCFsMap.set(cf, updated);
                            logs.push({ type: 'UPDATE', rowIdx: i, message: `Riga ${i+2} - ${cognome} ${nome} (${cf}): aggiornato` });
                        } else {
                            const err = await res.json();
                            const msg = err.error || err.message || 'errore sconosciuto';
                            errori.push(`Riga ${i+2} (${cf}): ${msg}`);
                            logs.push({ type: 'ERR', rowIdx: i, message: `Riga ${i+2} (${cf}): ${msg}` });
                        }
                    } catch (e) {
                        errori.push(`Riga ${i+2} (${cf}): errore di rete`);
                        logs.push({ type: 'ERR', rowIdx: i, message: `Riga ${i+2} (${cf}): errore di rete` });
                    }
                } else {
                    saltati++;
                    logs.push({ type: 'SKIP', rowIdx: i, message: `Riga ${i+2} (${cf}): già presente nella società` });
                }
            } else {
                const cognome = get('COGNOME') || '-';
                const nome = get('NOME') || '-';
                const payload = buildPayload();
                try {
                    const res = await fetch('/users/api/soci', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify(payload),
                    });
                    if (res.ok) {
                        creati++;
                        const created = await res.json();
                        existingCFsMap.set(cf, created);
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
            const snap = { total, current: i + 1, creati, aggiornati, saltati, errori: [...errori], logs: [...logs], done: false, headers, dataRecords };
            setImportReport(snap);
            // Auto-scroll log
            if (importLogRef.current) importLogRef.current.scrollTop = importLogRef.current.scrollHeight;
        }

        // Completato
        setImportReport({ total, current: total, creati, aggiornati, saltati, errori, logs, done: true, headers, dataRecords, source: 'excel' });
        if (importLogRef.current) importLogRef.current.scrollTop = importLogRef.current.scrollHeight;
        if (creati > 0 || aggiornati > 0) fetchSoci();
        if (importFileRef.current) importFileRef.current.value = '';
    };

    const importOdooFromFile = async (file) => {
        if (!selectedSocietaId) { showAlert('Seleziona una società prima di importare.', 'Nessuna società selezionata', 'warning'); return; }
        let allRecords;
        try {
            allRecords = await readFileToRecords(file);
        } catch (e) {
            showAlert('Impossibile leggere il file. Se è un XLSX verifica la connessione internet, altrimenti usa un CSV.', 'Errore caricamento');
            return;
        }
        await runOdooImport(allRecords);
        if (importOdooFileRef.current) importOdooFileRef.current.value = '';
    };

    const runOdooImport = async (allRecords) => {
        if (!selectedSocietaId) { showAlert('Seleziona una società prima di importare.', 'Nessuna società selezionata', 'warning'); return; }
        if (!allRecords || allRecords.length < 2) { showAlert('File vuoto o non valido.', 'File non valido', 'warning'); return; }

        const headers = allRecords[0].map(h => h.replace(/^\uFEFF/, '').trim());
        // Indici di TUTTE le colonne con lo stesso nome (gestisce header duplicati, es. doppia colonna "Codice Fiscale")
        const colsFor = (name) => headers.reduce((acc, h, idx) => { if (h === name) acc.push(idx); return acc; }, []);
        const rows = allRecords.slice(1);

        // Restituisce il primo valore NON vuoto tra le colonne con lo stesso nome
        const get = (cells, name) => {
            for (const idx of colsFor(name)) {
                const v = (cells[idx] || '').trim();
                if (v) return v;
            }
            return '';
        };
        const stripPhone = (p) => p.replace(/^'+/, '').trim();
        // Booleano tollerante: Odoo esporta "True"/"False", ma Excel può salvare "TRUE"/"VERO"/"1"
        const isTrue = (v) => ['true', 'vero', '1', 'sì', 'si', 'x'].includes(String(v || '').trim().toLowerCase());
        const parseISODate = (s) => { if (!s) return null; return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null; };
        const parseDecimal = (s) => { const n = parseFloat(s); return isNaN(n) ? null : n; };
        const parseInteger = (s) => { const n = parseInt(s, 10); return isNaN(n) ? null : n; };

        // Pre-processo sequenziale: raccoglie tutte le etichette per associazione
        // incluse le righe vuote successive con solo la colonna "Etichette" valorizzata
        const etichetteByNome = {};
        let lastAssocNome = null;
        for (const cells of rows) {
            const isAz = isTrue(get(cells, "È un'azienda"));
            const hasLinked = get(cells, 'Azienda collegata') !== '';
            const etichetta = get(cells, 'Etichette');
            const nomeVis = (get(cells, 'Nome visualizzato') || get(cells, 'Nome')).trim();
            if (isAz) {
                lastAssocNome = nomeVis;
                if (!etichetteByNome[nomeVis]) etichetteByNome[nomeVis] = [];
                if (etichetta) etichetteByNome[nomeVis].push(etichetta);
            } else if (!hasLinked && !nomeVis && etichetta && lastAssocNome) {
                // riga-etichetta aggiuntiva (vuota tranne colonna Etichette)
                etichetteByNome[lastAssocNome].push(etichetta);
            }
        }

        // Separa aziende da contatti persona
        const aziende = rows.filter(r => isTrue(get(r, "È un'azienda")));
        // Contatti: righe con "Azienda collegata" valorizzato
        const contattiRows = rows.filter(r => get(r, 'Azienda collegata') !== '');

        // Lookup presidente per azienda (by "Azienda collegata" = "Nome visualizzato" dell'associazione)
        const presidentiMap = {};
        // Lookup tutti i contatti per azienda (by "Nome visualizzato")
        const contattiByAzienda = {};
        for (const c of contattiRows) {
            const azienda = get(c, 'Azienda collegata');
            if (!azienda) continue;
            if (!contattiByAzienda[azienda]) contattiByAzienda[azienda] = [];
            contattiByAzienda[azienda].push(c);
            const posizione = get(c, 'Posizione lavorativa').toLowerCase();
            if (posizione.includes('presid') && !presidentiMap[azienda]) {
                presidentiMap[azienda] = c;
            }
        }

        const total = aziende.length;
        if (total === 0) { showAlert('Nessuna riga azienda trovata nel file (colonna "È un\'azienda" = True).', 'Nessuna associazione', 'warning'); return; }

        const token = localStorage.getItem('token');
        let existingNames = new Set();
        let existingCFs = new Set();
        try {
            const res = await fetch(`/users/api/soci?societa_id=${selectedSocietaId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    data.forEach(s => {
                        if (s.codice_fiscale) existingCFs.add(s.codice_fiscale.toUpperCase());
                        if (s.ragione_sociale) existingNames.add(s.ragione_sociale.toLowerCase());
                    });
                }
            }
        } catch(e) { /* usa set vuoti se fallisce */ }

        setShowActionsMenu(false);
        setImportLogFilters({ creati: true, saltati: true, errori: true });
        setImportReport({ total, current: 0, creati: 0, saltati: 0, errori: [], logs: [], done: false, headers, dataRecords: aziende, source: 'odoo' });

        let creati = 0; let saltati = 0; const errori = []; const logs = [];

        for (let i = 0; i < aziende.length; i++) {
            const cells = aziende[i];
            const g = (name) => get(cells, name);

            const ragione_sociale = g('Nome');
            const cf = g('Codice Fiscale').toUpperCase();

            if (!ragione_sociale) {
                saltati++;
                logs.push({ type: 'SKIP', rowIdx: i, message: `Riga ${i+2}: nome azienda assente` });
                setImportReport(prev => ({ ...prev, current: i+1, saltati, errori: [...errori], logs: [...logs] }));
                if (importLogRef.current) importLogRef.current.scrollTop = importLogRef.current.scrollHeight;
                continue;
            }

            const isDup = (cf && existingCFs.has(cf)) || existingNames.has(ragione_sociale.toLowerCase());
            if (isDup) {
                saltati++;
                logs.push({ type: 'SKIP', rowIdx: i, message: `Riga ${i+2} (${ragione_sociale}): già presente nella società` });
                setImportReport(prev => ({ ...prev, current: i+1, saltati, errori: [...errori], logs: [...logs] }));
                if (importLogRef.current) importLogRef.current.scrollTop = importLogRef.current.scrollHeight;
                continue;
            }

            // Chiave per lookup contatti: "Nome visualizzato" dell'associazione
            const nomeVisualizzato = g('Nome visualizzato') || ragione_sociale;

            // Presidente
            let nome_rappresentante = ''; let cognome_rappresentante = '';
            const presRow = presidentiMap[nomeVisualizzato] || presidentiMap[ragione_sociale];
            if (presRow) {
                const fullName = get(presRow, 'Nome').trim();
                const parts = fullName.split(' ').filter(Boolean);
                if (parts.length > 1) {
                    cognome_rappresentante = parts.pop();
                    nome_rappresentante = parts.join(' ');
                } else {
                    cognome_rappresentante = fullName;
                }
            }

            // Telefono
            const tel1 = stripPhone(g('Telefono'));
            const tel2 = stripPhone(g('Dispositivo mobile'));
            const telefono = tel1 || tel2;
            const recapito_2 = tel1 && tel2 ? tel2 : '';

            // PEC
            const pec = g('E-mail PEC') || g('Pec') || '';

            const payload = {
                societa_id: selectedSocietaId,
                tipo_socio: 'associazione',
                ragione_sociale,
                codice_fiscale: cf || null,
                partita_iva: g('Partita IVA') || null,
                codice_sdi: g('Codice destinatario') || null,
                pec: pec || null,
                email: g('E-mail') || null,
                telefono: telefono || null,
                recapito_2: recapito_2 || null,
                indirizzo: g('Indirizzo') || null,
                indirizzo_2: g('Indirizzo 2') || null,
                comune: g('Città') || null,
                cap: g('CAP') || null,
                nome_rappresentante: nome_rappresentante || null,
                cognome_rappresentante: cognome_rappresentante || null,
                tipo_associazione: g('Tipologia associazione') || null,
                anno_associativo: g('Anno associativo') || null,
                codice_affiliazione: g('Codice affiliazione') || null,
                scadenza_affiliazione: parseISODate(g('Scadenza affiliazione')),
                costo_affiliazione: parseDecimal(g('Costo affiliazione')),
                costo_tessera_base: parseDecimal(g('Costo tessera base')),
                costo_tessera_associativa: parseDecimal(g('Costo tessera Associativa')),
                costo_tessera_completa: parseDecimal(g('Costo tessera Completa')),
                durata_consiglio_direttivo: parseInteger(g('Durata consiglio direttivo')),
                scadenza_consiglio_direttivo: parseISODate(g('Scadenza consiglio direttivo')),
                etichette: (() => { const tags = etichetteByNome[nomeVisualizzato]; return (tags && tags.length > 0) ? JSON.stringify(tags) : null; })(),
                runts: isTrue(g('Runts')),
                somministrazione: isTrue(g('Somministrazione')),
                note: g('Note') || null,
            };

            try {
                const res = await fetch('/users/api/soci', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(payload),
                });
                if (res.ok) {
                    const newSocio = await res.json();
                    creati++;
                    if (cf) existingCFs.add(cf);
                    existingNames.add(ragione_sociale.toLowerCase());
                    logs.push({ type: 'OK', rowIdx: i, message: `Riga ${i+2} - ${ragione_sociale}: creata` });
                    // Crea contatti associati
                    const righeContatti = contattiByAzienda[nomeVisualizzato] || contattiByAzienda[ragione_sociale] || [];
                    for (const cr of righeContatti) {
                        const cNome = get(cr, 'Nome').trim();
                        if (!cNome) continue;
                        const cPayload = {
                            nome: cNome,
                            posizione_lavorativa: get(cr, 'Posizione lavorativa') || null,
                            telefono: stripPhone(get(cr, 'Telefono')) || null,
                            dispositivo_mobile: stripPhone(get(cr, 'Dispositivo mobile')) || null,
                            email: get(cr, 'E-mail') || null,
                        };
                        try {
                            await fetch(`/users/api/soci/${newSocio.id}/contatti`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                body: JSON.stringify(cPayload),
                            });
                        } catch(e) { /* contatto fallito, non blocca */ }
                    }
                } else {
                    const err = await res.json();
                    const msg = err.error || err.message || 'errore sconosciuto';
                    if (msg.toLowerCase().includes('duplicat')) {
                        saltati++;
                        logs.push({ type: 'SKIP', rowIdx: i, message: `Riga ${i+2} (${ragione_sociale}): duplicato rilevato dal server` });
                    } else {
                        errori.push(`Riga ${i+2} (${ragione_sociale}): ${msg}`);
                        logs.push({ type: 'ERR', rowIdx: i, message: `Riga ${i+2} (${ragione_sociale}): ${msg}` });
                    }
                }
            } catch(e) {
                errori.push(`Riga ${i+2} (${ragione_sociale}): errore di rete`);
                logs.push({ type: 'ERR', rowIdx: i, message: `Riga ${i+2} (${ragione_sociale}): errore di rete` });
            }

            setImportReport(prev => ({ ...prev, current: i+1, creati, saltati, errori: [...errori], logs: [...logs] }));
            if (importLogRef.current) importLogRef.current.scrollTop = importLogRef.current.scrollHeight;
        }

        setImportReport({ total, current: total, creati, saltati, errori, logs, done: true, headers, dataRecords: aziende, source: 'odoo' });
        if (importLogRef.current) importLogRef.current.scrollTop = importLogRef.current.scrollHeight;
        if (creati > 0) fetchSoci();
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

                        {/* Toggle filtri a scomparsa */}
                        <button
                            type="button"
                            className="btn-outlined"
                            style={{height: '35px', display:'flex', alignItems:'center', gap:'6px', fontSize:'0.9rem', padding: '0 12px'}}
                            onClick={() => setShowMoreFilters(v => !v)}
                            aria-expanded={showMoreFilters}
                        >
                            <Filter size={14}/> Filtri {showMoreFilters ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                        </button>

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
                            style={{backgroundColor:'var(--primary)', height: '35px', display:'flex', alignItems:'center', gap:'8px', fontSize:'0.9rem', padding: '0 12px', marginLeft: 'auto'}}
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
                                    {/* <div style={{padding: '8px 16px', fontSize:'0.75rem', fontWeight:'bold', color:'#333', backgroundColor:'var(--surface-1)'}}>Azioni sui soci filtrati</div> */}
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
                                    {/* <div style={{height:'1px', backgroundColor:'var(--border-color)', margin:'4px 0'}}></div> */}
                                    {/* <div style={{padding: '8px 16px', fontSize:'0.75rem', fontWeight:'bold', color:'#333', backgroundColor:'var(--surface-1)'}}>Altre azioni</div> */}
                                    {/* <button className="dropdown-item-custom"><Tag size={16}/> Gestione liste</button> */}
                                    <button className="dropdown-item-custom" onClick={() => importFileRef.current?.click()}><FileUp size={16}/> Importa Excel</button>
                                    <button className="dropdown-item-custom" onClick={() => importOdooFileRef.current?.click()}><FileUp size={16}/> Importa CSV Odoo</button>
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

                    {/* Filtri a scomparsa */}
                    {showMoreFilters && (
                        <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px'}}>

                            {/* Iscritto */}
                            <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '120px'}}>
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

                            {/* Iscrizione */}
                            <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '120px'}}>
                                <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Iscrizione</label>
                                <select
                                    className="md-select"
                                    style={{width: '100%', padding: '6px 12px'}}
                                    value={filters.iscrizione}
                                    onChange={(e) => handleFilterChange('iscrizione', e.target.value)}
                                >
                                    <option value="">TUTTI</option>
                                    <option value="REGOLARE">REGOLARE</option>
                                    <option value="IN SCADENZA">IN SCADENZA</option>
                                    <option value="SCADUTO">SCADUTO</option>
                                    <option value="NO">NO</option>
                                </select>
                            </div>

                            {/* Tesseramento */}
                            <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '120px'}}>
                                <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Tesseramento</label>
                                <select
                                    className="md-select"
                                    style={{width: '100%', padding: '6px 12px'}}
                                    value={filters.tesseramento}
                                    onChange={(e) => handleFilterChange('tesseramento', e.target.value)}
                                >
                                    <option value="">TUTTI</option>
                                    <option value="REGOLARE">REGOLARE</option>
                                    <option value="IN SCADENZA">IN SCADENZA</option>
                                    <option value="SCADUTO">SCADUTO</option>
                                    <option value="NO">NO</option>
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


                            {/* Etichette */}
                            <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '120px'}}>
                                <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Etichette</label>
                                <select
                                    className="md-select"
                                    style={{width: '100%', padding: '6px 12px'}}
                                    value={filters.etichetta}
                                    onChange={(e) => handleFilterChange('etichetta', e.target.value)}
                                >
                                    <option value="">TUTTE</option>
                                    {etichetteOptions.map(et => (
                                        <option key={et} value={et}>{et}</option>
                                    ))}
                                </select>
                            </div>

                        </div>
                    )}
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
                                    <th>Iscrizione</th>
                                    <th>Tesseramento</th>
                                    <th>Certificato Medico</th>
                                    <th>Contatti</th>
                                    <th style={{width: '1%', whiteSpace: 'nowrap'}}>Etichette</th>
                                    <th style={{textAlign:'right'}}>Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSoci.map(socio => (
                                    <tr key={socio.id}>
                                        <td>
                                            <div style={{
                                                width:'40px', height:'40px', borderRadius:'50%', 
                                                backgroundColor: socio.tipo_socio === 'associazione' ? 'var(--primary-container)' : (socio.sesso === 'F' ? 'var(--primary-container)' : 'var(--info-container)'),
                                                color: socio.tipo_socio === 'associazione' ? 'var(--primary-hover)' : (socio.sesso === 'F' ? 'var(--primary)' : 'var(--primary)'),
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
                                            {socio.tipo_socio === 'associazione' && (
                                                <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
                                                    {socio.tipo_associazione || 'Associazione'}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            {socio.data_nascita}
                                        </td>
                                        <td>
                                            {(() => {
                                                const label = getIscrizioneStatus(socio);
                                                const chipClass = STATO_CHIP_CLASS[label] || 'assente';
                                                return <span className={`chip ${chipClass}`}>{label}</span>;
                                            })()}
                                        </td>
                                        <td>
                                            {(() => {
                                                const label = getTesseramentoStatus(socio);
                                                const chipClass = STATO_CHIP_CLASS[label] || 'assente';
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
                                        <td style={{ width: '1%', whiteSpace: 'nowrap' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '3px' }}>
                                                {parseEtichette(socio.etichette).map((tag, i) => {
                                                    const ts = getTagStyle(tag);
                                                    return (
                                                        <span key={i} className="etichetta-chip" style={{ '--chip-bg': ts.bg, '--chip-color': ts.text }}>
                                                            {tag}
                                                        </span>
                                                    );
                                                })}
                                            </div>
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
                                            <button className="btn-icon-small" title="Nuovo pagamento" onClick={() => navigate('/nuovo-ordine', { state: { socio } })}><Euro size={18}/></button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredSoci.length === 0 && (
                                    <tr>
                                        <td colSpan="9" style={{textAlign:'center', padding:'32px', color:'var(--text-secondary)'}}>
                                            Nessun socio trovato
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>



            {showModal && <SocioModal onClose={() => setShowModal(false)} onSave={handleSaveSocio} socioData={selectedSocio} allEtichette={etichetteOptions} />}
            
            {showComunicazioneModal && (
                <ComunicazioneModal
                    socioId={comunicazioneSocioId}
                    societa={currentSocieta}
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
            <input
                ref={importOdooFileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.[0]) importOdooFromFile(e.target.files[0]); }}
            />

            {/* Modal avanzamento/riepilogo importazione */}
            {importReport && (
                <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: '60px' }}>
                    <div className="modal-card" style={{ maxWidth: '560px', width: '95%', padding: '28px' }} onClick={e => e.stopPropagation()}>
                        {!importReport.done ? (
                            <>
                                <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 600 }}>Importazione in corso…</h3>
                                <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    Riga {importReport.current} di {importReport.total}
                                </p>
                                {/* Progress bar */}
                                <div style={{ height: '8px', borderRadius: '4px', backgroundColor: 'var(--border-color)', overflow: 'hidden', marginBottom: '16px' }}>
                                    <div style={{
                                        height: '100%', borderRadius: '4px',
                                        backgroundColor: 'var(--primary-color)',
                                        width: `${importReport.total > 0 ? Math.round((importReport.current / importReport.total) * 100) : 0}%`,
                                        transition: 'width 0.15s ease',
                                    }} />
                                </div>
                                <div style={{ display: 'flex', gap: '24px', fontSize: '0.88rem', marginBottom: '16px' }}>
                                    <span style={{ color: 'var(--success)' }}>✓ Creati: <strong>{importReport.creati}</strong></span>
                                    <span style={{ color: 'var(--warning)' }}>↻ Aggiornati: <strong>{importReport.aggiornati ?? 0}</strong></span>
                                    <span style={{ color: '#888' }}>↷ Saltati: <strong>{importReport.saltati}</strong></span>
                                    <span style={{ color: 'var(--danger)' }}>✗ Errori: <strong>{importReport.errori.length}</strong></span>
                                </div>
                                {/* Log */}
                                <div ref={importLogRef} style={{
                                    fontFamily: 'monospace', fontSize: '0.78rem', lineHeight: '1.6',
                                    backgroundColor: 'var(--text-primary)', color: 'var(--border-color)', borderRadius: '6px',
                                    padding: '10px 12px', height: '180px', overflowY: 'auto',
                                    whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                                }}>
                                    {(importReport.logs || []).map((l, i) => (
                                        <div key={i} style={{
                                            color: l.type === 'OK' ? 'var(--success)' : l.type === 'UPDATE' ? 'var(--warning)' : l.type === 'ERR' ? 'var(--danger)' : 'var(--text-tertiary)'
                                        }}>{l.type === 'OK' ? '[OK]   ' : l.type === 'UPDATE' ? '[UPD]  ' : l.type === 'ERR' ? '[ERR]  ' : '[SKIP] '}{l.message}</div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem', fontWeight: 600 }}>Importazione completata</h3>
                                {/* Progress bar al 100% */}
                                <div style={{ height: '8px', borderRadius: '4px', backgroundColor: 'var(--border-color)', overflow: 'hidden', marginBottom: '14px' }}>
                                    <div style={{ height: '100%', borderRadius: '4px', backgroundColor: 'var(--success)', width: '100%' }} />
                                </div>
                                {/* Badge cliccabili per filtrare i log */}
                                <p style={{ margin: '0 0 8px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Clicca per filtrare i log e l'esportazione:</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                                    <div
                                        onClick={() => setImportLogFilters(f => ({ ...f, creati: !f.creati }))}
                                        style={{
                                            display: 'flex', justifyContent: 'space-between', padding: '8px 12px',
                                            backgroundColor: importLogFilters.creati ? 'var(--success-container)' : 'var(--surface-1)',
                                            borderRadius: '6px', cursor: 'pointer', userSelect: 'none',
                                            border: `2px solid ${importLogFilters.creati ? 'var(--success)' : 'var(--border-color)'}`,
                                            opacity: importLogFilters.creati ? 1 : 0.5,
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        <span style={{ color: 'var(--success)' }}>✓ Soci creati</span>
                                        <strong style={{ color: 'var(--success)' }}>{importReport.creati}</strong>
                                    </div>
                                    <div
                                        onClick={() => setImportLogFilters(f => ({ ...f, aggiornati: !f.aggiornati }))}
                                        style={{
                                            display: 'flex', justifyContent: 'space-between', padding: '8px 12px',
                                            backgroundColor: importLogFilters.aggiornati ? 'var(--warning-container)' : 'var(--surface-1)',
                                            borderRadius: '6px', cursor: 'pointer', userSelect: 'none',
                                            border: `2px solid ${importLogFilters.aggiornati ? 'var(--warning)' : 'var(--border-color)'}`,
                                            opacity: importLogFilters.aggiornati ? 1 : 0.5,
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        <span style={{ color: 'var(--warning)' }}>↻ Soci aggiornati</span>
                                        <strong style={{ color: 'var(--warning)' }}>{importReport.aggiornati ?? 0}</strong>
                                    </div>
                                    <div
                                        onClick={() => setImportLogFilters(f => ({ ...f, saltati: !f.saltati }))}
                                        style={{
                                            display: 'flex', justifyContent: 'space-between', padding: '8px 12px',
                                            backgroundColor: importLogFilters.saltati ? 'var(--surface-1)' : 'var(--surface-1)',
                                            borderRadius: '6px', cursor: 'pointer', userSelect: 'none',
                                            border: `2px solid ${importLogFilters.saltati ? 'var(--border-color)' : 'var(--border-color)'}`,
                                            opacity: importLogFilters.saltati ? 1 : 0.5,
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        <span style={{ color: '#666' }}>↷ Saltati (dati identici o CF assente)</span>
                                        <strong style={{ color: '#666' }}>{importReport.saltati}</strong>
                                    </div>
                                    <div
                                        onClick={() => setImportLogFilters(f => ({ ...f, errori: !f.errori }))}
                                        style={{
                                            display: 'flex', justifyContent: 'space-between', padding: '8px 12px',
                                            backgroundColor: importLogFilters.errori ? 'var(--danger-container)' : 'var(--surface-1)',
                                            borderRadius: '6px', cursor: 'pointer', userSelect: 'none',
                                            border: `2px solid ${importLogFilters.errori ? 'var(--danger-container)' : 'var(--border-color)'}`,
                                            opacity: importLogFilters.errori ? 1 : 0.5,
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        <span style={{ color: 'var(--danger)' }}>✗ Errori</span>
                                        <strong style={{ color: 'var(--danger)' }}>{importReport.errori.length}</strong>
                                    </div>
                                </div>
                                {/* Log filtrato */}
                                <div ref={importLogRef} style={{
                                    fontFamily: 'monospace', fontSize: '0.78rem', lineHeight: '1.6',
                                    backgroundColor: 'var(--text-primary)', color: 'var(--border-color)', borderRadius: '6px',
                                    padding: '10px 12px', height: '180px', overflowY: 'auto',
                                    whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginBottom: '14px',
                                }}>
                                    {(importReport.logs || [])
                                        .filter(l =>
                                            (l.type === 'OK'     && importLogFilters.creati)     ||
                                            (l.type === 'UPDATE' && importLogFilters.aggiornati) ||
                                            (l.type === 'SKIP'   && importLogFilters.saltati)    ||
                                            (l.type === 'ERR'    && importLogFilters.errori)
                                        )
                                        .map((l, i) => (
                                            <div key={i} style={{
                                                color: l.type === 'OK' ? 'var(--success)' : l.type === 'UPDATE' ? 'var(--warning)' : l.type === 'ERR' ? 'var(--danger)' : 'var(--text-tertiary)'
                                            }}>{l.type === 'OK' ? '[OK]   ' : l.type === 'UPDATE' ? '[UPD]  ' : l.type === 'ERR' ? '[ERR]  ' : '[SKIP] '}{l.message}</div>
                                        ))
                                    }
                                </div>
                                <p style={{ margin: '0 0 6px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                    Esporta le righe filtrate (es. solo gli errori) per correggerle e reimportarle. Scegli il formato:
                                </p>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                    <button
                                        className="btn-outlined"
                                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                        onClick={() => handleExportImport('xlsx')}
                                        title="File .xlsx reimportabile con « Importa Excel »"
                                    >
                                        <FileDown size={15} /> Esporta XLSX
                                    </button>
                                    {importReport.source === 'odoo' && (
                                        <button
                                            className="btn-outlined"
                                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                            onClick={() => handleExportImport('csv')}
                                            title="File .csv reimportabile con « Importa CSV Odoo »"
                                        >
                                            <FileDown size={15} /> Esporta CSV (Odoo)
                                        </button>
                                    )}
                                </div>
                                <button className="btn-contained" style={{ width: '100%' }} onClick={() => setImportReport(null)}>Chiudi</button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Soci;
