import React, { useState, useEffect, useCallback } from 'react';
import { X, CalendarDays, Users, UserPlus, Trash2, AlertTriangle, ClipboardList, CheckCircle, Clock, Printer, Plus } from 'lucide-react';
import { useConfirm } from '../components/ConfirmModal';
import { useAlert } from '../components/AlertModal';
import { useSocieta } from '../data/SocietaContext';
import RicercaSocioModal from './RicercaSocioModal';
import { computeScadenzaCertificatoStr } from '../utils/certificatoUtils';
import { getOrari, computeOraFine } from '../utils/corsoUtils';
import './CorsoModal.css';

const GIORNI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

// App giorno (0=LUN..6=DOM) → JS getDay() (0=DOM,1=LUN..6=SAB)
const appGiornoToJsDay = (g) => (g === 6 ? 0 : g + 1);

const GIORNI_IT = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

const toLocalDateStr = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const generateCourseDays = (giorno, createdAt) => {
    const jsTarget = appGiornoToJsDay(giorno);
    const start = new Date(createdAt);
    start.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cursor = new Date(start);
    // advance to first occurrence of target weekday
    while (cursor.getDay() !== jsTarget) cursor.setDate(cursor.getDate() + 1);
    const days = [];
    while (cursor <= today) {
        days.push(toLocalDateStr(cursor));
        cursor.setDate(cursor.getDate() + 7);
    }
    return days.reverse();
};

// Unione (senza duplicati) delle date di lezione di tutti i giorni del corso, dalla più recente
const generateAllCourseDays = (corso) => {
    const all = getOrari(corso).flatMap(o => generateCourseDays(o.giorno, corso.createdAt));
    return [...new Set(all)].sort().reverse();
};

const formatDayLabel = (dateStr) => {
    // Parse as local date to avoid UTC offset shifts
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const dayName = GIORNI_IT[date.getDay()];
    return `${dayName} ${date.toLocaleDateString('it-IT')}`;
};

const defaultForm = {
    descrizione: '',
    attivitaId: '',
    strutturaId: '',
    areaId: '',
    staffId: '',
    abbonamentoId: '',
    orari: [{ giorno: '0', oraInizio: '08:00', durataMinuti: 50 }],
    maxSoci: 10,
    note: '',
};

const emptyOrario = () => ({ giorno: '0', oraInizio: '08:00', durataMinuti: 50 });

// Orari del corso nel formato del form (valori stringa per i controlli)
const toFormOrari = (corso) => {
    const orari = getOrari(corso).map(o => ({
        giorno: String(o.giorno ?? 0),
        oraInizio: o.oraInizio || '08:00',
        durataMinuti: o.durataMinuti ?? 50,
    }));
    return orari.length > 0 ? orari : [emptyOrario()];
};

// ── Iscritti helpers ──────────────────────────────────────────
const todayDate = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const diffDays = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr); d.setHours(0,0,0,0);
    return Math.floor((d - todayDate()) / 86400000);
};
const getStatus = (dateStr, giorniAvviso) => {
    const days = diffDays(dateStr);
    if (days === null || days < 0) return 'expired';
    if (days <= (giorniAvviso || 30)) return 'warning';
    return 'ok';
};
const StatusBadge = ({ status, label }) => {
    if (status === 'ok') return null;
    return (
        <span className={`cm-badge ${status === 'expired' ? 'cm-badge-expired' : 'cm-badge-warning'}`}>
            <AlertTriangle size={10} />
            {label}
        </span>
    );
};

const CorsoModal = ({ isOpen, onClose, onSave, corso, attivita, strutture, staff, abbonamenti = [], societaId, initialTab = 'impostazioni' }) => {
    // ── Tab ──────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState(initialTab);
    const confirm = useConfirm();
    const showAlert = useAlert();
    const { societaList } = useSocieta();

    useEffect(() => {
        if (isOpen) setActiveTab(initialTab);
    }, [isOpen, initialTab]);

    // ── Impostazioni form ────────────────────────────────────────
    const [form, setForm] = useState(defaultForm);
    const [aree, setAree] = useState([]);
    const [formError, setFormError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setForm({
                descrizione: corso?.descrizione || '',
                attivitaId: corso?.attivitaId || '',
                strutturaId: corso?.strutturaId || '',
                areaId: corso?.areaId || '',
                staffId: corso?.staffId || '',
                abbonamentoId: corso?.abbonamentoId || '',
                orari: toFormOrari(corso),
                maxSoci: corso?.maxSoci ?? 10,
                note: corso?.note || '',
            });
        }
    }, [isOpen, corso]);

    useEffect(() => {
        if (form.strutturaId) {
            fetch(`/activities/api/strutture/${form.strutturaId}/aree`)
                .then(r => r.ok ? r.json() : [])
                .then(data => setAree(data))
                .catch(() => setAree([]));
        } else {
            setAree([]);
        }
    }, [form.strutturaId]);

    const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
    const handleStrutturaChange = (val) => setForm(prev => ({ ...prev, strutturaId: val, areaId: '' }));

    // ── Giorni/orari multipli ────────────────────────────────────
    const setOrario = (idx, key, val) => setForm(prev => ({
        ...prev,
        orari: prev.orari.map((o, i) => (i === idx ? { ...o, [key]: val } : o)),
    }));
    const addOrario = () => setForm(prev => ({
        ...prev,
        // il nuovo giorno eredita orario e durata dall'ultima riga
        orari: [...prev.orari, { ...emptyOrario(), ...prev.orari[prev.orari.length - 1], giorno: '0' }],
    }));
    const removeOrario = (idx) => setForm(prev => ({
        ...prev,
        orari: prev.orari.length > 1 ? prev.orari.filter((_, i) => i !== idx) : prev.orari,
    }));

    const handleSubmit = () => {
        if (form.orari.some(o => !o.oraInizio)) {
            setFormError('Indicare l\'ora di inizio per ogni giorno.');
            return;
        }
        if (!form.abbonamentoId) {
            setFormError('Selezionare un abbonamento obbligatorio.');
            return;
        }
        const chiavi = form.orari.map(o => `${o.giorno}-${o.oraInizio}`);
        if (new Set(chiavi).size !== chiavi.length) {
            setFormError('Sono presenti due righe con lo stesso giorno e la stessa ora di inizio.');
            return;
        }
        setFormError('');
        const orari = form.orari.map(o => ({
            giorno: parseInt(o.giorno, 10),
            oraInizio: o.oraInizio,
            durataMinuti: parseInt(o.durataMinuti, 10) || 50,
        }));
        const payload = {
            ...form,
            orari,
            maxSoci: parseInt(form.maxSoci, 10),
            attivitaId: form.attivitaId || null,
            strutturaId: form.strutturaId || null,
            areaId: form.areaId || null,
            staffId: form.staffId || null,
            abbonamentoId: parseInt(form.abbonamentoId, 10),
        };
        if (corso?.id) payload.id = corso.id;
        onSave(payload);
    };

    // ── Iscritti ─────────────────────────────────────────────────
    const [iscrizioni, setIscrizioni] = useState([]);
    const [sociMap, setSociMap] = useState({});
    const [paymentsMap, setPaymentsMap] = useState({});
    const [abbonamentoProd, setAbbonamentoProd] = useState(null);
    const [loadingIscritti, setLoadingIscritti] = useState(false);
    const [showRicerca, setShowRicerca] = useState(false);

    // ── Presenze ──────────────────────────────────────────────────
    const [selectedDay, setSelectedDay] = useState('');
    const [presenzaSalvata, setPresenzaSalvata] = useState(null);
    const [presentiIds, setPresentiIds] = useState(new Set());
    const [loadingPresenza, setLoadingPresenza] = useState(false);
    const courseDays = (corso?.id && corso?.createdAt)
        ? generateAllCourseDays(corso)
        : [];

    const fetchIscritti = useCallback(async () => {
        if (!corso?.id) return;
        setLoadingIscritti(true);
        try {
            const res = await fetch(`/activities/api/corsi/${corso.id}/iscritti`);
            const data = res.ok ? await res.json() : [];
            setIscrizioni(data);
            if (data.length > 0) {
                const [allSociRes, paymentsResults] = await Promise.all([
                    fetch(`/users/api/soci?societa_id=${societaId}`),
                    Promise.all(data.map(i =>
                        fetch(`/payments/api?societa_id=${societaId}&socio_id=${i.socioId}`)
                            .then(r => r.ok ? r.json() : [])
                            .then(payments => ({ socioId: i.socioId, payments }))
                    )),
                ]);
                if (allSociRes.ok) {
                    const soci = await allSociRes.json();
                    const map = {};
                    soci.forEach(s => { map[s.id] = s; });
                    setSociMap(map);
                }
                const pmap = {};
                paymentsResults.forEach(({ socioId, payments }) => { pmap[socioId] = payments; });
                setPaymentsMap(pmap);
            }
        } finally {
            setLoadingIscritti(false);
        }
    }, [corso?.id, societaId]);

    useEffect(() => {
        if (!corso?.abbonamentoId) return;
        fetch(`/products/api/${corso.abbonamentoId}`)
            .then(r => r.ok ? r.json() : null)
            .then(p => setAbbonamentoProd(p))
            .catch(() => {});
    }, [corso?.abbonamentoId]);

    useEffect(() => {
        if (isOpen && (activeTab === 'iscritti' || activeTab === 'presenze')) fetchIscritti();
        if (!isOpen) {
            setIscrizioni([]);
            setSociMap({});
            setPaymentsMap({});
            setSelectedDay('');
            setPresenzaSalvata(null);
            setPresentiIds(new Set());
        }
    }, [isOpen, activeTab, fetchIscritti]);

    const fetchPresenza = useCallback(async (dataStr) => {
        if (!corso?.id || !dataStr) return;
        setLoadingPresenza(true);
        try {
            const r = await fetch(`/activities/api/corsi/${corso.id}/presenze/${dataStr}`);
            if (r.ok) {
                const p = await r.json();
                setPresenzaSalvata(p);
                setPresentiIds(new Set(p?.presentiIds || []));
            } else {
                setPresenzaSalvata(null);
                setPresentiIds(new Set());
            }
        } catch {
            setPresenzaSalvata(null);
            setPresentiIds(new Set());
        } finally {
            setLoadingPresenza(false);
        }
    }, [corso?.id]);

    useEffect(() => {
        if (activeTab === 'presenze' && courseDays.length > 0 && !selectedDay) {
            setSelectedDay(courseDays[0]);
        }
    }, [activeTab, courseDays, selectedDay]);

    useEffect(() => {
        if (selectedDay) fetchPresenza(selectedDay);
    }, [selectedDay, fetchPresenza]);

    const handleSavePresenza = async () => {
        if (presenzaSalvata) {
            if (!await confirm('Le presenze per questo giorno sono già state salvate. Confermi la sovrascrittura?')) return;
        }
        let savedByName = '';
        try {
            const token = localStorage.getItem('token');
            const r = await fetch('/auth/api/me', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
            if (r.ok) {
                const u = await r.json();
                savedByName = [u.nome, u.cognome].filter(Boolean).join(' ') || u.email || '';
            }
        } catch { /* ignore */ }
        await fetch(`/activities/api/corsi/${corso.id}/presenze/${selectedDay}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ presentiIds: [...presentiIds], savedByName }),
        });
        fetchPresenza(selectedDay);
    };

    // ── Stampa presenze ───────────────────────────────────────────
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [printMonth, setPrintMonth] = useState('');
    const [printVuoto, setPrintVuoto] = useState(false);

    const handlePrint = async () => {
        if (!printMonth || !corso?.id) return;
        setShowPrintModal(false);

        const [year, month] = printMonth.split('-').map(Number);
        const orariCorso = getOrari(corso);
        // Tutte le date del mese in cui il corso si tiene, su tutti i suoi giorni
        const days = [...new Set(orariCorso.flatMap(o => {
            const jsTarget = appGiornoToJsDay(o.giorno);
            const cursor = new Date(year, month - 1, 1);
            while (cursor.getDay() !== jsTarget) cursor.setDate(cursor.getDate() + 1);
            const dates = [];
            while (cursor.getMonth() === month - 1) {
                dates.push(toLocalDateStr(cursor));
                cursor.setDate(cursor.getDate() + 7);
            }
            return dates;
        }))].sort();

        // Fetch presences for each day (skip if stampa vuoto)
        let presenceMap = {};
        if (!printVuoto) {
            const results = await Promise.all(
                days.map(d =>
                    fetch(`/activities/api/corsi/${corso.id}/presenze/${d}`)
                        .then(r => r.ok ? r.json() : null)
                        .catch(() => null)
                )
            );
            days.forEach((d, i) => {
                if (results[i]) presenceMap[d] = new Set(results[i].presentiIds || []);
            });
        }

        const societa = societaList?.find(s => s.id == societaId);
        const denomination = societa?.denominazione || '';
        const address = [societa?.indirizzo, societa?.comune].filter(Boolean).join(' - ');
        const logoUrl = societa?.logo_path
            ? (societa.logo_path.startsWith('http') ? societa.logo_path : `/users/${societa.logo_path.replace(/^\//, '')}`)
            : null;

        const staffObj = corso.staff || staff?.find(s => s.id === corso.staffId);
        const staffName = staffObj ? `${staffObj.cognome} ${staffObj.nome}`.toUpperCase() : '';
        const attivitaObj = corso.attivita || attivita?.find(a => a.id === corso.attivitaId);
        const attivitaName = attivitaObj?.descrizione || '';
        const strutturaObj = corso.struttura || strutture?.find(s => s.id === corso.strutturaId);
        const strutturaName = strutturaObj?.descrizione || '';
        const areaObj = corso.area;
        const areaName = areaObj?.descrizione || '';
        const luogoStr = [strutturaName, areaName].filter(Boolean).join(' - ');

        const GIORNI_SHORT = ['DOM', 'LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB'];
        const orarioStr = orariCorso
            .map(o => `${GIORNI_SHORT[appGiornoToJsDay(o.giorno)]} (${o.oraInizio || ''}-${computeOraFine(o.oraInizio, o.durataMinuti)})`)
            .join(' &nbsp; ');
        const periodoStr = `${month}/${year}`;

        // Sort iscrizioni same as UI (expired first, then cognome)
        const sortedIscrizioni = [...iscrizioni].sort((a, b) => {
            const rank = (i) => {
                const socio = sociMap[i.socioId];
                const payments = paymentsMap[i.socioId] || [];
                const certStatus = getStatus(computeScadenzaCertificatoStr(socio?.scadenza_certificato), giorniAvviso);
                const abbPay = payments
                    .filter(p => p.product_id === corso.abbonamentoId && p.data_scadenza_abbonamento)
                    .sort((x, y) => new Date(y.data_scadenza_abbonamento) - new Date(x.data_scadenza_abbonamento))[0];
                const abbStatus = getStatus(abbPay?.data_scadenza_abbonamento, giorniAvviso);
                if (certStatus === 'expired' || abbStatus === 'expired') return 0;
                if (certStatus === 'warning' || abbStatus === 'warning') return 1;
                return 2;
            };
            const ra = rank(a), rb = rank(b);
            if (ra !== rb) return ra - rb;
            return (sociMap[a.socioId]?.cognome || '').localeCompare(sociMap[b.socioId]?.cognome || '', 'it');
        });

        const getBase64Image = (url) => new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.src = url;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width; canvas.height = img.height;
                canvas.getContext('2d').drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = reject;
        });

        const generatePrint = (logoBase64 = null) => {
            const colW = Math.max(18, Math.floor(340 / Math.max(days.length, 1)));
            const dayHeaders = days.map(d => {
                const [, , dd] = d.split('-');
                return `<th class="day-col">${parseInt(dd, 10)}</th>`;
            }).join('');

            const rows = sortedIscrizioni.map(i => {
                const socio = sociMap[i.socioId];
                const payments = paymentsMap[i.socioId] || [];
                const certScad = computeScadenzaCertificatoStr(socio?.scadenza_certificato);
                const certStr = certScad ? new Date(certScad).toLocaleDateString('it-IT') : '—';
                const abbPay = payments
                    .filter(p => p.product_id === corso.abbonamentoId && p.data_scadenza_abbonamento)
                    .sort((a, b) => new Date(b.data_scadenza_abbonamento) - new Date(a.data_scadenza_abbonamento))[0];
                const abbStr = abbPay?.data_scadenza_abbonamento
                    ? new Date(abbPay.data_scadenza_abbonamento).toLocaleDateString('it-IT') : '—';
                const birthYear = socio?.data_nascita ? new Date(socio.data_nascita).getFullYear() : '';
                const birthFull = socio?.data_nascita ? new Date(socio.data_nascita).toLocaleDateString('it-IT') : '';
                const socioLabel = socio
                    ? `${socio.cognome} ${socio.nome} (${birthYear}) - CERT (${certStr}) - ABB (${abbStr})`
                    : `#${i.socioId}`;
                const cells = days.map(d => {
                    const mark = !printVuoto && presenceMap[d]?.has(i.socioId) ? 'X' : '';
                    return `<td class="day-col">${mark}</td>`;
                }).join('');
                return `<tr><td class="socio-col">${socioLabel}</td>${cells}</tr>`;
            }).join('');

            const html = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><title>Presenze ${periodoStr}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 9pt; color: #000; background: #fff; }
  .page { padding: 15mm 12mm 10mm 12mm; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 12px; }
  .header-logo { flex: 0 0 100px; display: flex; align-items: center; }
  .header-logo img { max-height: 80px; max-width: 100px; object-fit: contain; }
  .header-right { flex: 1; text-align: right; }
  .header-right .org-name { font-size: 13pt; font-weight: bold; }
  .header-right .org-addr { font-size: 9pt; margin-top: 3px; }
  .title { font-size: 14pt; font-weight: bold; margin-bottom: 4px; }
  .subtitle { font-size: 9pt; margin-bottom: 2px; }
  .info-row { font-size: 9pt; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 8pt; }
  th { background: var(--border-color); border: 1px solid #000; padding: 4px 3px; text-align: left; font-weight: bold; white-space: nowrap; }
  td { border: 1px solid #000; padding: 3px; vertical-align: middle; }
  .socio-col { min-width: 200px; }
  .day-col { width: ${colW}px; text-align: center; white-space: nowrap; }
  tr:nth-child(even) { background: var(--surface-1); }
  @media print { @page { size: A4 landscape; margin: 10mm; } body { font-size: 8pt; } }
</style></head><body><div class="page">
  <div class="header">
    <div class="header-logo">${logoBase64 ? `<img src="${logoBase64}" alt="Logo" />` : ''}</div>
    <div class="header-right">
      <div class="org-name">${denomination}</div>
      <div class="org-addr">${address}</div>
    </div>
  </div>
  <div class="title">${staffName}</div>
  <div class="subtitle">${attivitaName}${corso.descrizione ? ' - ' + corso.descrizione : ''} &nbsp;&nbsp; PERIODO: ${periodoStr}</div>
  <div class="info-row">${orarioStr}${luogoStr ? '&nbsp;&nbsp;&nbsp;LUOGO: ' + luogoStr : ''}</div>
  <table>
    <thead><tr><th class="socio-col">SOCIO</th>${dayHeaders}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
</div></body></html>`;

            const win = window.open('', '_blank');
            if (!win) { showAlert('Popup bloccato dal browser. Consenti i popup per questa pagina.', 'Popup bloccato', 'warning'); return; }
            win.document.write(html);
            win.document.close();
            setTimeout(() => win.print(), 600);
        };

        if (logoUrl) {
            getBase64Image(logoUrl).then(b64 => generatePrint(b64)).catch(() => generatePrint());
        } else {
            generatePrint();
        }
    };

    const handleAddSocio = async (socio) => {
        await fetch(`/activities/api/corsi/${corso.id}/iscritti`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ socioId: socio.id }),
        });
        fetchIscritti();
    };

    const handleRemoveIscritto = async (socioId) => {
        if (!await confirm('Rimuovere questo socio dal corso?')) return;
        await fetch(`/activities/api/corsi/${corso.id}/iscritti/${socioId}`, { method: 'DELETE' });
        fetchIscritti();
    };

    // ─────────────────────────────────────────────────────────────
    if (!isOpen) return null;

    const giorniAvviso = abbonamentoProd?.giorniAvvisoScadenza ?? 30;
    const isExisting = !!corso?.id;

    return (
        <>
        <div className="cm-overlay">
            <div className="cm-modal">

                {/* ── Header ── */}
                <div className="cm-header">
                    <CalendarDays size={20} />
                    <h2>Scheda corso</h2>
                    <button className="cm-header-close" onClick={onClose} title="Chiudi">
                        <X size={20} />
                    </button>
                </div>

                {/* ── Tab bar ── */}
                <div className="cm-tabs">
                    <button
                        className={`cm-tab-btn${activeTab === 'impostazioni' ? ' active' : ''}`}
                        onClick={() => setActiveTab('impostazioni')}
                    >
                        <CalendarDays size={14} />
                        Impostazioni
                    </button>
                    <button
                        className={`cm-tab-btn${activeTab === 'iscritti' ? ' active' : ''}`}
                        onClick={() => isExisting && setActiveTab('iscritti')}
                        disabled={!isExisting}
                        title={!isExisting ? 'Salva prima il corso per gestire gli iscritti' : undefined}
                    >
                        <Users size={14} />
                        Iscritti
                        {isExisting && (
                            <span className="cm-tab-badge">{iscrizioni.length}</span>
                        )}
                    </button>
                    <button
                        className={`cm-tab-btn${activeTab === 'presenze' ? ' active' : ''}`}
                        onClick={() => isExisting && setActiveTab('presenze')}
                        disabled={!isExisting}
                        title={!isExisting ? 'Salva prima il corso per registrare le presenze' : undefined}
                    >
                        <ClipboardList size={14} />
                        Presenze
                    </button>
                </div>

                {/* ── Tab Impostazioni ── */}
                {activeTab === 'impostazioni' && (
                    <div className="cm-body">

                        <div className="cm-form-row">
                            <div className="cm-form-field cm-col-2">
                                <label>Descrizione</label>
                                <input
                                    className="md-input"
                                    type="text"
                                    placeholder="Descrizione"
                                    value={form.descrizione}
                                    onChange={e => set('descrizione', e.target.value)}
                                />
                            </div>
                            <div className="cm-form-field cm-col-2">
                                <label>Tipo attività</label>
                                <select className="md-select" value={form.attivitaId} onChange={e => set('attivitaId', e.target.value)}>
                                    <option value=""></option>
                                    {attivita.map(a => (
                                        <option key={a.id} value={a.id}>{a.descrizione}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="cm-form-row">
                            <div className="cm-form-field cm-col-1">
                                <label>Struttura</label>
                                <select className="md-select" value={form.strutturaId} onChange={e => handleStrutturaChange(e.target.value)}>
                                    <option value=""></option>
                                    {strutture.map(s => (
                                        <option key={s.id} value={s.id}>{s.descrizione}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="cm-form-field cm-col-1">
                                <label>Area</label>
                                <select className="md-select" value={form.areaId} onChange={e => set('areaId', e.target.value)} disabled={!form.strutturaId}>
                                    <option value=""></option>
                                    {aree.map(a => (
                                        <option key={a.id} value={a.id}>{a.descrizione}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="cm-form-field cm-col-2">
                                <label>Tecnico</label>
                                <select className="md-select" value={form.staffId} onChange={e => set('staffId', e.target.value)}>
                                    <option value=""></option>
                                    {staff.map(s => (
                                        <option key={s.id} value={s.id}>{s.cognome} {s.nome}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {form.orari.map((orario, idx) => (
                            <div className="cm-form-row cm-orario-row" key={idx}>
                                <div className="cm-form-field cm-col-1">
                                    <label>{idx === 0 ? 'Giorno' : ''}</label>
                                    <select
                                        className="md-select"
                                        value={orario.giorno}
                                        onChange={e => setOrario(idx, 'giorno', e.target.value)}
                                    >
                                        {GIORNI.map((g, i) => (
                                            <option key={i} value={i}>{g}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="cm-form-field cm-col-1">
                                    <label>{idx === 0 ? 'Ora inizio' : ''}</label>
                                    <input
                                        className="md-input"
                                        type="time"
                                        value={orario.oraInizio}
                                        onChange={e => setOrario(idx, 'oraInizio', e.target.value)}
                                    />
                                </div>
                                <div className="cm-form-field cm-col-1">
                                    <label>{idx === 0 ? 'Durata (min)' : ''}</label>
                                    <input
                                        className="md-input"
                                        type="number"
                                        min={1}
                                        value={orario.durataMinuti}
                                        onChange={e => setOrario(idx, 'durataMinuti', e.target.value)}
                                    />
                                </div>
                                <div className="cm-form-field cm-col-1 cm-orario-remove-field">
                                    <label>{idx === 0 ? ' ' : ''}</label>
                                    <button
                                        type="button"
                                        className="cm-orario-remove-btn"
                                        onClick={() => removeOrario(idx)}
                                        disabled={form.orari.length === 1}
                                        title={form.orari.length === 1 ? 'Il corso deve avere almeno un giorno' : 'Rimuovi giorno'}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        <div className="cm-form-row">
                            <button type="button" className="cm-orario-add-btn" onClick={addOrario}>
                                <Plus size={14} /> Aggiungi giorno
                            </button>
                            {formError && form.abbonamentoId && (
                                <span className="cm-error-text">{formError}</span>
                            )}
                        </div>

                        <div className="cm-form-row">
                            <div className="cm-form-field cm-col-1">
                                <label>Max soci</label>
                                <input
                                    className="md-input"
                                    type="number"
                                    min={1}
                                    value={form.maxSoci}
                                    onChange={e => set('maxSoci', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="cm-form-row">
                            <div className="cm-form-field cm-col-2">
                                <label>Abbonamento <span className="required">*</span></label>
                                <select
                                    className={`md-select${formError && !form.abbonamentoId ? ' cm-select-error' : ''}`}
                                    value={form.abbonamentoId}
                                    onChange={e => { setFormError(''); set('abbonamentoId', e.target.value); }}
                                >
                                    <option value="">Seleziona abbonamento...</option>
                                    {abbonamenti.map(a => (
                                        <option key={a.id} value={a.id}>{a.description}</option>
                                    ))}
                                </select>
                                {formError && !form.abbonamentoId && (
                                    <span className="cm-error-text">{formError}</span>
                                )}
                            </div>
                        </div>

                        <div className="cm-form-row">
                            <div className="cm-form-field" style={{ flex: 1 }}>
                                <label>Note</label>
                                <textarea
                                    className="md-input"
                                    rows={3}
                                    style={{ resize: 'vertical' }}
                                    value={form.note}
                                    onChange={e => set('note', e.target.value)}
                                />
                            </div>
                        </div>

                    </div>
                )}

                {/* ── Tab Iscritti ── */}
                {activeTab === 'iscritti' && (
                    <div className="cm-body">

                        <div className="cm-iscritti-toolbar">
                            <span className="cm-iscritti-count">
                                {iscrizioni.length} / {corso?.maxSoci ?? '∞'} iscritti
                            </span>
                            <button
                                className="btn-success"
                                onClick={() => setShowRicerca(true)}
                                disabled={iscrizioni.length >= (corso?.maxSoci ?? Infinity)}
                            >
                                <UserPlus size={15} /> Aggiungi socio
                            </button>
                        </div>

                        {loadingIscritti ? (
                            <div className="cm-iscritti-loading">Caricamento...</div>
                        ) : iscrizioni.length === 0 ? (
                            <div className="cm-iscritti-empty">Nessun iscritto</div>
                        ) : (
                            <table className="cm-table">
                                <thead>
                                    <tr>
                                        <th>Socio</th>
                                        <th className="center">Cert. medico</th>
                                        <th className="center">Ult. pagamento</th>
                                        <th className="center">Iscritto dal</th>
                                        <th style={{ width: 36 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...iscrizioni].sort((a, b) => {
                                        const rank = (i) => {
                                            const socio = sociMap[i.socioId];
                                            const payments = paymentsMap[i.socioId] || [];
                                            const certStatus = getStatus(computeScadenzaCertificatoStr(socio?.scadenza_certificato), giorniAvviso);
                                            const abbPay = payments
                                                .filter(p => p.product_id === corso.abbonamentoId && p.data_scadenza_abbonamento)
                                                .sort((x, y) => new Date(y.data_scadenza_abbonamento) - new Date(x.data_scadenza_abbonamento))[0];
                                            const abbStatus = getStatus(abbPay?.data_scadenza_abbonamento, giorniAvviso);
                                            if (certStatus === 'expired' || abbStatus === 'expired') return 0;
                                            if (certStatus === 'warning' || abbStatus === 'warning') return 1;
                                            return 2;
                                        };
                                        const ra = rank(a), rb = rank(b);
                                        if (ra !== rb) return ra - rb;
                                        const cognA = (sociMap[a.socioId]?.cognome || '').toLowerCase();
                                        const cognB = (sociMap[b.socioId]?.cognome || '').toLowerCase();
                                        return cognA.localeCompare(cognB, 'it');
                                    }).map(i => {
                                        const socio = sociMap[i.socioId];
                                        const payments = paymentsMap[i.socioId] || [];
                                        const certStatus = getStatus(computeScadenzaCertificatoStr(socio?.scadenza_certificato), giorniAvviso);
                                        const abbPay = payments
                                            .filter(p => p.product_id === corso.abbonamentoId && p.data_scadenza_abbonamento)
                                            .sort((a, b) => new Date(b.data_scadenza_abbonamento) - new Date(a.data_scadenza_abbonamento))[0];
                                        const abbStatus = getStatus(abbPay?.data_scadenza_abbonamento, giorniAvviso);
                                        const rowClass = (certStatus === 'expired' || abbStatus === 'expired')
                                            ? 'row-expired'
                                            : (certStatus === 'warning' || abbStatus === 'warning') ? 'row-warning' : '';
                                        return (
                                            <tr key={i.socioId} className={rowClass}>
                                                <td>
                                                    {socio
                                                        ? <a href={`/soci?apriSocioPath=${i.socioId}`} target="_blank" rel="noreferrer" className="cm-socio-name" style={{ color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }}>{socio.cognome} {socio.nome}</a>
                                                        : <span className="cm-socio-id">#{i.socioId}</span>
                                                    }
                                                </td>
                                                <td className="center">
                                                    {socio?.scadenza_certificato
                                                        ? <>{new Date(computeScadenzaCertificatoStr(socio.scadenza_certificato) || socio.scadenza_certificato).toLocaleDateString('it-IT')}<StatusBadge status={certStatus} label={certStatus === 'expired' ? 'SCADUTO' : 'IN SCADENZA'} /></>
                                                        : <span className="cm-date-missing">—</span>
                                                    }
                                                </td>
                                                <td className="center">
                                                    {abbPay ? (() => {
                                                        const dateStr = abbPay.data_pagamento
                                                            ? new Date(abbPay.data_pagamento).toLocaleDateString('it-IT')
                                                            : '—';
                                                        let nota = null;
                                                        if (abbPay.data_scadenza_abbonamento) {
                                                            const scad = new Date(abbPay.data_scadenza_abbonamento);
                                                            scad.setHours(0, 0, 0, 0);
                                                            const oggi = new Date();
                                                            oggi.setHours(0, 0, 0, 0);
                                                            const diff = Math.round((scad - oggi) / 86400000);
                                                            if (diff < 0) {
                                                                nota = <small style={{ color: 'var(--danger)', display: 'block' }}>scad. da {Math.abs(diff)} gg</small>;
                                                            } else if (diff === 0) {
                                                                nota = <small style={{ color: 'var(--warning)', display: 'block' }}>scade oggi</small>;
                                                            } else {
                                                                nota = <small style={{ color: 'var(--success)', display: 'block' }}>{diff} gg alla scad.</small>;
                                                            }
                                                        }
                                                        return <>{dateStr}{nota}</>;
                                                    })() : <span className="cm-abb-missing"><AlertTriangle size={13} /> Non trovato</span>}
                                                </td>
                                                <td className="center" style={{ color: 'var(--text-secondary)', fontSize: '0.83rem' }}>
                                                    {i.dataIscrizione ? new Date(i.dataIscrizione).toLocaleDateString('it-IT') : '—'}
                                                </td>
                                                <td className="center">
                                                    <button
                                                        className="cm-btn-remove"
                                                        title="Rimuovi"
                                                        onClick={() => handleRemoveIscritto(i.socioId)}
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}

                    </div>
                )}

                {/* ── Tab Presenze ── */}
                {activeTab === 'presenze' && (
                    <div className="cm-body">

                        <div className="cm-presenze-toolbar">
                            <div className="cm-form-field" style={{ maxWidth: 300 }}>
                                <label>Seleziona giorno di corso</label>
                                <select
                                    className="md-select"
                                    value={selectedDay}
                                    onChange={e => setSelectedDay(e.target.value)}
                                >
                                    <option value="">-- seleziona --</option>
                                    {courseDays.map(d => (
                                        <option key={d} value={d}>{formatDayLabel(d)}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                className="cm-btn-print"
                                onClick={() => {
                                    const today = new Date();
                                    setPrintMonth(`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`);
                                    setPrintVuoto(false);
                                    setShowPrintModal(true);
                                }}
                                title="Stampa foglio presenze"
                            >
                                <Printer size={15} /> Stampa
                            </button>
                        </div>

                        {selectedDay && (
                            <>
                                {loadingPresenza ? (
                                    <div className="cm-iscritti-loading">Caricamento...</div>
                                ) : (
                                    <>
                                        <div className={`cm-presenza-status ${presenzaSalvata ? 'cm-presenza-saved' : 'cm-presenza-unsaved'}`}>
                                            {presenzaSalvata ? (
                                                <>
                                                    <CheckCircle size={15} />
                                                    Presenze salvate il{' '}
                                                    <strong>{new Date(presenzaSalvata.savedAt).toLocaleString('it-IT')}</strong>
                                                    {presenzaSalvata.savedByName && <> da <strong>{presenzaSalvata.savedByName}</strong></>}
                                                    <span className="cm-presenza-counter">
                                                        {presentiIds.size} presenti su {iscrizioni.length}
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <Clock size={15} />
                                                    Presenze non ancora salvate
                                                </>
                                            )}
                                        </div>

                                        {loadingIscritti ? (
                                            <div className="cm-iscritti-loading">Caricamento iscritti...</div>
                                        ) : iscrizioni.length === 0 ? (
                                            <div className="cm-iscritti-empty">Nessun iscritto al corso</div>
                                        ) : (
                                            <table className="cm-table cm-presenze-table">
                                                <thead>
                                                    <tr>
                                                        <th>Socio</th>
                                                        <th style={{ width: 90, textAlign: 'center' }}>Presente</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {[...iscrizioni].sort((a, b) => {
                                                        const rank = (i) => {
                                                            const socio = sociMap[i.socioId];
                                                            const payments = paymentsMap[i.socioId] || [];
                                                            const certStatus = getStatus(computeScadenzaCertificatoStr(socio?.scadenza_certificato), giorniAvviso);
                                                            const abbPay = payments
                                                                .filter(p => p.product_id === corso.abbonamentoId && p.data_scadenza_abbonamento)
                                                                .sort((x, y) => new Date(y.data_scadenza_abbonamento) - new Date(x.data_scadenza_abbonamento))[0];
                                                            const abbStatus = getStatus(abbPay?.data_scadenza_abbonamento, giorniAvviso);
                                                            if (certStatus === 'expired' || abbStatus === 'expired') return 0;
                                                            if (certStatus === 'warning' || abbStatus === 'warning') return 1;
                                                            return 2;
                                                        };
                                                        const ra = rank(a), rb = rank(b);
                                                        if (ra !== rb) return ra - rb;
                                                        const cognA = (sociMap[a.socioId]?.cognome || '').toLowerCase();
                                                        const cognB = (sociMap[b.socioId]?.cognome || '').toLowerCase();
                                                        return cognA.localeCompare(cognB, 'it');
                                                    }).map(i => {
                                                        const socio = sociMap[i.socioId];
                                                        const payments = paymentsMap[i.socioId] || [];
                                                        const certStatus = getStatus(computeScadenzaCertificatoStr(socio?.scadenza_certificato), giorniAvviso);
                                                        const abbPay = payments
                                                            .filter(p => p.product_id === corso.abbonamentoId && p.data_scadenza_abbonamento)
                                                            .sort((a, b) => new Date(b.data_scadenza_abbonamento) - new Date(a.data_scadenza_abbonamento))[0];
                                                        const abbStatus = getStatus(abbPay?.data_scadenza_abbonamento, giorniAvviso);
                                                        const isExpired = certStatus === 'expired' || abbStatus === 'expired';
                                                        const isWarning = !isExpired && (certStatus === 'warning' || abbStatus === 'warning');
                                                        const textColor = isExpired ? 'var(--danger)' : isWarning ? 'var(--warning)' : 'var(--text-primary)';
                                                        const isPresente = presentiIds.has(i.socioId);
                                                        return (
                                                            <tr key={i.socioId}>
                                                                <td style={{ color: textColor, fontWeight: 500 }}>
                                                                    {socio
                                                                        ? `${socio.cognome} ${socio.nome}`
                                                                        : `#${i.socioId}`}
                                                                </td>
                                                                <td style={{ textAlign: 'center' }}>
                                                                    <label className="cm-switch">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isPresente}
                                                                            onChange={e => {
                                                                                setPresentiIds(prev => {
                                                                                    const next = new Set(prev);
                                                                                    if (e.target.checked) next.add(i.socioId);
                                                                                    else next.delete(i.socioId);
                                                                                    return next;
                                                                                });
                                                                            }}
                                                                        />
                                                                        <span className="cm-switch-slider" />
                                                                    </label>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        )}
                                    </>
                                )}
                            </>
                        )}

                    </div>
                )}

                {/* ── Footer ── */}
                <div className="cm-footer">
                    <button className="btn-danger" onClick={onClose}>
                        <X size={15} /> {activeTab === 'impostazioni' ? 'Annulla' : 'Chiudi'}
                    </button>
                    {activeTab === 'impostazioni' && (
                        <button className="btn-success" onClick={handleSubmit}>
                            ✓ Salva impostazioni
                        </button>
                    )}
                    {activeTab === 'presenze' && selectedDay && !loadingPresenza && iscrizioni.length > 0 && (
                        <button className="btn-success" onClick={handleSavePresenza}>
                            ✓ Salva presenze
                        </button>
                    )}
                </div>

            </div>
        </div>

        {showPrintModal && (
            <div className="cm-overlay" style={{ zIndex: 1300 }}>
                <div className="cm-modal" style={{ width: 420, maxHeight: 'unset' }}>
                    <div className="cm-header">
                        <Printer size={18} />
                        <h2>Stampa foglio presenze</h2>
                        <button className="cm-header-close" onClick={() => setShowPrintModal(false)}><X size={18} /></button>
                    </div>
                    <div className="cm-body" style={{ padding: '24px 28px' }}>
                        <div className="cm-form-field" style={{ marginBottom: 20 }}>
                            <label>Mese da stampare</label>
                            <input
                                className="md-input"
                                type="month"
                                value={printMonth}
                                onChange={e => setPrintMonth(e.target.value)}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.9rem' }}>
                            <input
                                type="checkbox"
                                checked={printVuoto}
                                onChange={e => setPrintVuoto(e.target.checked)}
                                style={{ width: 16, height: 16 }}
                            />
                            Stampa griglia vuota (senza le presenze registrate)
                        </label>
                    </div>
                    <div className="cm-footer">
                        <button className="btn-danger" onClick={() => setShowPrintModal(false)}>
                            <X size={14} /> Annulla
                        </button>
                        <button className="btn-success" onClick={handlePrint} disabled={!printMonth}>
                            <Printer size={14} /> Stampa
                        </button>
                    </div>
                </div>
            </div>
        )}

        <RicercaSocioModal
            isOpen={showRicerca}
            onClose={() => setShowRicerca(false)}
            onSelect={handleAddSocio}
            societaId={societaId}
            abbonamentoId={corso?.abbonamentoId}
            abbonamentoNome={abbonamenti.find(a => a.id === corso?.abbonamentoId)?.description || ''}
            enrolledIds={iscrizioni.map(i => i.socioId)}
        />
        </>
    );
};

export default CorsoModal;

