import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LogOut, CreditCard, BookOpen, MessageSquare,
    Clock, CheckCircle, AlertTriangle, ChevronRight,
    CalendarDays, Bell, User, Activity, MapPin, UserCheck, Timer,
    X, Mail, Smartphone, ArrowLeftCircle, Home, ShoppingCart, Receipt
} from 'lucide-react';
import { getOrari } from '../utils/corsoUtils';
import SocioNegozio from './SocioNegozio';
import SocioRicevute from './SocioRicevute';
import './SocioDashboard.css';

// ── helpers ────────────────────────────────────────────────────────────────
const GIORNI_SETTIMANA = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

const computeOraFine = (oraInizio, durataMinuti) => {
    if (!oraInizio || !durataMinuti) return null;
    const [h, m] = oraInizio.split(':').map(Number);
    const total = h * 60 + m + durataMinuti;
    return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const formatDateIT = (str) => {
    if (!str) return '—';
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('it-IT');
};

const computeStatoAbbonamento = (dateStr, giorniAvviso) => {
    if (!dateStr) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(dateStr);
    const limit = new Date(today); limit.setDate(limit.getDate() + (giorniAvviso || 30));
    if (d < today) return 'SCADUTO';
    if (d <= limit) return 'IN SCADENZA';
    return 'REGOLARE';
};

const StatusBadge = ({ status }) => {
    if (!status) return null;
    const map = {
        SCADUTO: { bg: 'var(--danger-container)', color: 'var(--on-danger-container)', border: 'var(--danger-container)', icon: <AlertTriangle size={11} /> },
        'IN SCADENZA': { bg: 'var(--warning-container)', color: 'var(--on-warning-container)', border: 'var(--warning)', icon: <Clock size={11} /> },
        VALIDO: { bg: 'var(--success-container)', color: 'var(--on-success-container)', border: 'var(--success-container)', icon: <CheckCircle size={11} /> },
        REGOLARE: { bg: 'var(--success-container)', color: 'var(--on-success-container)', border: 'var(--success-container)', icon: <CheckCircle size={11} /> },
    };
    const s = map[status] || map.VALIDO;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '3px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700,
            backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}`,
        }}>
            {s.icon}{status}
        </span>
    );
};

// ── CorsoCard ─────────────────────────────────────────────────────────────
const CorsoCard = ({ iscrizione }) => {
    const c = iscrizione.corso;
    if (!c) return null;

    const colore = c.attivita?.colore || 'var(--success)';
    const attivitaNome = c.attivita?.descrizione || 'Corso';
    const orari = getOrari(c);
    const istruttore = c.staff
        ? [c.staff.nome, c.staff.cognome].filter(Boolean).join(' ')
        : null;
    const luogo = [c.struttura?.descrizione, c.area?.descrizione].filter(Boolean).join(' · ');
    const notaVisibile = c.note || iscrizione.note;

    return (
        <div className="sd-corso-card">
            <div className="sd-corso-color-bar" style={{ background: colore }} />
            <div className="sd-corso-content">
                <div className="sd-corso-top">
                    <span className="sd-corso-nome">{attivitaNome}</span>
                    {[...new Set(orari.map(o => o.giorno))].map(g => (
                        <span
                            key={g}
                            className="sd-corso-giorno-badge"
                            style={{ background: `${colore}18`, color: colore, borderColor: `${colore}40` }}
                        >
                            {GIORNI_SETTIMANA[g]}
                        </span>
                    ))}
                </div>
                <div className="sd-corso-details">
                    {orari.filter(o => o.oraInizio).map((o, i) => {
                        const oraFine = computeOraFine(o.oraInizio, o.durataMinuti);
                        return (
                            <div className="sd-corso-detail" key={i}>
                                <Clock size={13} />
                                <span>
                                    {GIORNI_SETTIMANA[o.giorno]} {o.oraInizio}{oraFine ? ` – ${oraFine}` : ''}
                                    {o.durataMinuti ? ` (${o.durataMinuti} min)` : ''}
                                </span>
                            </div>
                        );
                    })}
                    {luogo && (
                        <div className="sd-corso-detail">
                            <MapPin size={13} />
                            <span>{luogo}</span>
                        </div>
                    )}
                    {istruttore && (
                        <div className="sd-corso-detail">
                            <UserCheck size={13} />
                            <span>{istruttore}</span>
                        </div>
                    )}
                    {iscrizione.dataIscrizione && (
                        <div className="sd-corso-detail">
                            <CalendarDays size={13} />
                            <span>Iscritto dal {formatDateIT(iscrizione.dataIscrizione)}</span>
                        </div>
                    )}
                </div>
                {notaVisibile && (
                    <div className="sd-corso-note">{notaVisibile}</div>
                )}
            </div>
        </div>
    );
};

// ── sub-components ─────────────────────────────────────────────────────────
const SectionCard = ({ icon, title, count, children, loading, emptyMsg }) => (
    <div className="sd-section-card">
        <div className="sd-section-header">
            <div className="sd-section-title">
                <span className="sd-section-icon">{icon}</span>
                <h2>{title}</h2>
                {count > 0 && <span className="sd-count-badge">{count}</span>}
            </div>
        </div>
        <div className="sd-section-body">
            {loading ? (
                <div className="sd-loading">
                    <div className="sd-spinner" />
                    <span>Caricamento…</span>
                </div>
            ) : count === 0 ? (
                <div className="sd-empty">{emptyMsg}</div>
            ) : (
                children
            )}
        </div>
    </div>
);

// ── helpers comunicazioni ────────────────────────────────────────────────
const stripHtml = (html) =>
    html ? html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';

// ── ComunicazioneDetailModal ──────────────────────────────────────────────
const ComunicazioneDetailModal = ({ comunicazione, onClose }) => {
    if (!comunicazione) return null;
    const isEmail = comunicazione.tipo === 'EMAIL';
    const data = new Date(comunicazione.data_invio || comunicazione.createdAt);
    return (
        <div className="sd-modal-overlay">
            <div className="sd-modal" onClick={e => e.stopPropagation()}>
                <div className="sd-modal-header">
                    <div className="sd-modal-title">
                        <span className="sd-modal-type-icon" data-type={comunicazione.tipo?.toLowerCase()}>
                            {isEmail ? <Mail size={16} /> : <Smartphone size={16} />}
                        </span>
                        <span>{isEmail ? 'Email' : 'SMS'}</span>
                        {comunicazione.oggetto && (
                            <span className="sd-modal-oggetto">{comunicazione.oggetto}</span>
                        )}
                    </div>
                    <button className="sd-modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <div className="sd-modal-meta">
                    <span className="sd-modal-meta-item">
                        <CalendarDays size={13} />
                        {data.toLocaleDateString('it-IT')} alle {data.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {comunicazione.mittente_nome && (
                        <span className="sd-modal-meta-item">
                            <User size={13} />
                            {comunicazione.mittente_nome}
                        </span>
                    )}
                </div>
                <div
                    className="sd-modal-body"
                    dangerouslySetInnerHTML={{ __html: comunicazione.testo || '' }}
                />
            </div>
        </div>
    );
};

// ── main component ─────────────────────────────────────────────────────────
const decodeTokenPayload = () => {
    try {
        const t = localStorage.getItem('token');
        return JSON.parse(atob(t.split('.')[1])) || {};
    } catch { return {}; }
};

export default function SocioDashboard({ onLogout }) {
    const navigate = useNavigate();

    // Payload del token in stato: cambia quando il socio passa a un'altra società.
    const [tokenPayload, setTokenPayload] = useState(decodeTokenPayload);
    const token = localStorage.getItem('token');
    const socioId = tokenPayload.socio_ref_id ?? null;
    const userName = [tokenPayload.nome, tokenPayload.cognome].filter(Boolean).join(' ') || tokenPayload.email || 'Socio';
    // Società in cui questa email accede come socio (per la tendina di cambio società).
    const societaIds = Array.isArray(tokenPayload.societaIds) ? tokenPayload.societaIds : [];
    const activeSocietaId = tokenPayload.societaId ?? null;

    const [socio, setSocio] = useState(null);
    const [abbonamenti, setAbbonamenti] = useState([]);
    const [corsi, setCorsi] = useState([]);
    const [comunicazioni, setComunicazioni] = useState([]);
    const [loading, setLoading] = useState({ abbonamenti: true, corsi: true, comunicazioni: true });
    const [selectedComunicazione, setSelectedComunicazione] = useState(null);
    const [societaList, setSocietaList] = useState([]);
    const [switching, setSwitching] = useState(false);
    // Sezione visualizzata: riepilogo, negozio online, elenco delle proprie ricevute.
    const [tab, setTab] = useState('home');
    // Anagrafica completa della società attiva: serve al negozio per i template
    // delle comunicazioni (com_proforma_*) e per il nome dell'associazione.
    const [societaAttiva, setSocietaAttiva] = useState(null);
    // Incrementato dopo la creazione di una ricevuta, per ricaricare «Le mie ricevute».
    const [ricevuteRefresh, setRicevuteRefresh] = useState(0);

    // Carica le denominazioni delle società consentite (per la tendina).
    useEffect(() => {
        if (societaIds.length <= 1) return;
        fetch('/users/api/societa', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
            .then(r => r.ok ? r.json() : [])
            .then(list => setSocietaList(Array.isArray(list) ? list : []))
            .catch(() => {});
    }, [societaIds.length]);

    // Cambio società: riemette il token per la riga socio della società scelta,
    // poi ricarica la dashboard per il nuovo socio_ref_id.
    const handleSwitchSocieta = async (newId) => {
        const parsed = parseInt(newId, 10);
        if (!Number.isInteger(parsed) || parsed === activeSocietaId || switching) return;
        setSwitching(true);
        try {
            const res = await fetch('/auth/api/switch-societa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify({ societaId: parsed }),
            });
            const data = await res.json();
            if (res.ok && data.accessToken) {
                localStorage.setItem('token', data.accessToken);
                if (data.refreshToken) localStorage.setItem('refresh_token', data.refreshToken);
                // Reset dei dati dipendenti dal socio prima del ricaricamento.
                setSocio(null);
                setAbbonamenti([]);
                setCorsi([]);
                setComunicazioni([]);
                setSocietaAttiva(null);
                setTab('home');
                setLoading({ abbonamenti: true, corsi: true, comunicazioni: true });
                setTokenPayload(decodeTokenPayload());
                window.dispatchEvent(new Event('session-updated'));
            }
        } catch { /* noop */ } finally {
            setSwitching(false);
        }
    };

    // Fetch socio profile
    useEffect(() => {
        if (!socioId) return;
        fetch(`/users/api/soci/${socioId}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setSocio(data); })
            .catch(() => {});
    }, [socioId]);

    // Anagrafica della società attiva (denominazione + configurazione comunicazioni)
    useEffect(() => {
        if (!socio?.societa_id) return;
        fetch(`/users/api/societa/${socio.societa_id}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setSocietaAttiva(data); })
            .catch(() => {});
    }, [socio?.societa_id]);

    // Fetch abbonamenti (payments con tipo subscription) + prodotti per giorniAvvisoScadenza
    useEffect(() => {
        if (!socioId) { setLoading(p => ({ ...p, abbonamenti: false })); return; }
        if (!socio?.societa_id) return; // attendi caricamento socio
        Promise.all([
            fetch(`/payments/api?socio_id=${socioId}&societa_id=${socio.societa_id}`).then(r => r.ok ? r.json() : []),
            fetch(`/products/api?societaId=${socio.societa_id}`).then(r => r.ok ? r.json() : []),
        ])
            .then(([payments, products]) => {
                const subs = Array.isArray(payments)
                    ? payments.filter(p =>
                        !p.stato_pagamento?.startsWith('3.') &&
                        parseFloat(p.importo) >= 0 &&
                        (p.quote_types || '').split(',').map(t => t.trim()).includes('subscription')
                      )
                    : [];

                const prodMap = {};
                (Array.isArray(products) ? products : []).forEach(pr => { prodMap[pr.id] = pr; });

                const byProduct = {};
                for (const p of subs) {
                    let productId = null;
                    if (Array.isArray(p.payment_items)) {
                        const subItem = p.payment_items.find(i => i.quote_types === 'subscription');
                        productId = subItem?.product_id ?? p.product_id;
                    } else {
                        productId = p.product_id;
                    }
                    if (!productId) continue;
                    if (!byProduct[productId]) byProduct[productId] = [];
                    byProduct[productId].push(p);
                }

                const grouped = Object.entries(byProduct).map(([pidStr, payList]) => {
                    const pid = parseInt(pidStr, 10);
                    const prod = prodMap[pid];
                    const sorted = [...payList].sort((a, b) => {
                        const da = a.data_scadenza_abbonamento ? new Date(a.data_scadenza_abbonamento) : new Date(0);
                        const db = b.data_scadenza_abbonamento ? new Date(b.data_scadenza_abbonamento) : new Date(0);
                        return db - da;
                    });
                    const latest = sorted[0];
                    const stato = computeStatoAbbonamento(latest.data_scadenza_abbonamento, prod?.giorniAvvisoScadenza);
                    return {
                        productId: pid,
                        productName: prod?.description || prod?.nome || latest.quote || 'Abbonamento',
                        dataPagamento: latest.data_pagamento,
                        dataScadenza: latest.data_scadenza_abbonamento,
                        importo: latest.importo,
                        stato,
                    };
                }).sort((a, b) => {
                    const order = { SCADUTO: 0, 'IN SCADENZA': 1, REGOLARE: 2 };
                    return (order[a.stato] ?? 3) - (order[b.stato] ?? 3);
                });

                setAbbonamenti(grouped);
            })
            .catch(() => setAbbonamenti([]))
            .finally(() => setLoading(p => ({ ...p, abbonamenti: false })));
    }, [socioId, socio?.societa_id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Fetch corsi
    useEffect(() => {
        if (!socioId) { setLoading(p => ({ ...p, corsi: false })); return; }
        // Need societaId - get from socio data; retry when socio is loaded
        if (!socio?.societa_id) return;
        fetch(`/activities/api/corsi/socio/${socioId}?societaId=${socio.societa_id}`)
            .then(r => r.ok ? r.json() : [])
            .then(data => setCorsi(Array.isArray(data) ? data : []))
            .catch(() => setCorsi([]))
            .finally(() => setLoading(p => ({ ...p, corsi: false })));
    }, [socioId, socio]);

    // When socio loads but corsi still loading, update
    useEffect(() => {
        if (socio && loading.corsi && !socio.societa_id) {
            setLoading(p => ({ ...p, corsi: false }));
        }
    }, [socio]); // eslint-disable-line

    // Fetch comunicazioni
    useEffect(() => {
        if (!socioId) { setLoading(p => ({ ...p, comunicazioni: false })); return; }
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        fetch(`/users/api/soci/${socioId}/comunicazioni`, { headers })
            .then(r => r.ok ? r.json() : [])
            .then(data => setComunicazioni(Array.isArray(data) ? data : []))
            .catch(() => setComunicazioni([]))
            .finally(() => setLoading(p => ({ ...p, comunicazioni: false })));
    }, [socioId]);

    const handleLogout = () => {
        if (onLogout) onLogout();
        else {
            localStorage.removeItem('token');
            localStorage.removeItem('user_role');
            navigate('/login');
        }
    };

    // Impersonazione: se un admin ha effettuato l'accesso "come socio", offriamo il
    // ritorno all'account originale ripristinando il token salvato.
    const isImpersonating = !!localStorage.getItem('impersonate_admin_token');
    const handleStopImpersonate = () => {
        const adminToken = localStorage.getItem('impersonate_admin_token');
        const adminRefreshToken = localStorage.getItem('impersonate_admin_refresh_token') || '';
        const adminRole = localStorage.getItem('impersonate_admin_role') || 'admin';
        const adminFeatures = localStorage.getItem('impersonate_admin_features') || 'null';
        if (!adminToken) return;
        localStorage.setItem('token', adminToken);
        if (adminRefreshToken) {
            localStorage.setItem('refresh_token', adminRefreshToken);
        } else {
            localStorage.removeItem('refresh_token');
        }
        localStorage.setItem('user_role', adminRole);
        localStorage.setItem('user_features', adminFeatures);
        localStorage.removeItem('impersonate_admin_token');
        localStorage.removeItem('impersonate_admin_refresh_token');
        localStorage.removeItem('impersonate_admin_role');
        localStorage.removeItem('impersonate_admin_features');
        window.location.href = '/amministrazione/utenti';
    };

    // Nome da mostrare: gestisce persona fisica, associazione e dati mancanti
    // (evita l'etichetta "null null" quando nome/cognome non sono valorizzati).
    const socioFullName = socio
        ? ([socio.nome, socio.cognome].filter(Boolean).join(' ') || socio.ragione_sociale || socio.email || userName)
        : userName;
    const socioFirstName = socio
        ? (socio.nome || socio.ragione_sociale || socio.email || userName)
        : userName;

    return (
        <div className="sd-root">
            {/* ── Header ──────────────────────────────────────────── */}
            <header className="sd-header">
                <div className="sd-header-inner">
                    <div className="sd-header-brand">
                        <div className="sd-header-logo">
                            <Activity size={20} color="var(--success)" />
                        </div>
                        <span className="sd-header-title">Area Soci</span>
                    </div>

                    <div className="sd-header-user">
                        {societaIds.length > 1 && (
                            <select
                                className="sd-societa-select"
                                value={activeSocietaId ?? ''}
                                onChange={(e) => handleSwitchSocieta(e.target.value)}
                                disabled={switching}
                                title="Cambia società"
                            >
                                {[...societaList]
                                    .filter(s => societaIds.includes(s.id))
                                    .sort((a, b) => (a.denominazione || '').localeCompare(b.denominazione || '', 'it', { sensitivity: 'base' }))
                                    .map(s => (
                                        <option key={s.id} value={s.id}>{s.denominazione}</option>
                                    ))}
                            </select>
                        )}
                        <div
                            className="sd-avatar"
                            style={socio?.sesso ? {
                                background: socio.sesso === 'F' ? 'var(--femminile-container)' : 'var(--maschile-container)',
                                color: socio.sesso === 'F' ? 'var(--on-femminile-container)' : 'var(--on-maschile-container)',
                            } : undefined}
                        >
                            <User size={16} />
                        </div>
                        <span className="sd-username">
                            {socioFullName}
                        </span>
                        {isImpersonating && (
                            <button
                                className="sd-return-btn"
                                onClick={handleStopImpersonate}
                                title="Torna al tuo account"
                            >
                                <ArrowLeftCircle size={16} />
                                <span>Torna al tuo account</span>
                            </button>
                        )}
                        <button className="sd-logout-btn" onClick={handleLogout} title="Esci">
                            <LogOut size={16} />
                            <span>Esci</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* ── Hero welcome strip ───────────────────────────────── */}
            <div className="sd-welcome">
                <div className="sd-welcome-inner">
                    <h1 className="sd-welcome-title">
                        Ciao, {socioFirstName}!
                    </h1>
                    <p className="sd-welcome-sub">
                        Qui puoi consultare i tuoi abbonamenti e corsi, acquistare online e seguire le tue ricevute.
                    </p>
                </div>
            </div>

            {/* ── Navigazione fra le sezioni ───────────────────────── */}
            <nav className="sd-tabs" role="tablist">
                <div className="sd-tabs-inner">
                    {[
                        { key: 'home', label: 'Home', icon: <Home size={16} /> },
                        { key: 'negozio', label: 'Negozio', icon: <ShoppingCart size={16} /> },
                        { key: 'ricevute', label: 'Le mie ricevute', icon: <Receipt size={16} /> },
                    ].map(t => (
                        <button
                            key={t.key}
                            role="tab"
                            aria-selected={tab === t.key}
                            className={`sd-tab${tab === t.key ? ' sd-tab--active' : ''}`}
                            onClick={() => setTab(t.key)}
                        >
                            {t.icon}<span>{t.label}</span>
                        </button>
                    ))}
                </div>
            </nav>

            {/* ── Main content ─────────────────────────────────────── */}
            <main className="sd-main">

                {tab === 'negozio' && (
                    <SocioNegozio
                        socio={socio}
                        societa={societaAttiva}
                        onRicevutaCreata={() => setRicevuteRefresh(n => n + 1)}
                    />
                )}

                {tab === 'ricevute' && (
                    <SocioRicevute socio={socio} refreshKey={ricevuteRefresh} />
                )}

                {tab === 'home' && (<>

                {/* ── Abbonamenti ──────────────────────────────────── */}
                <SectionCard
                    icon={<CreditCard size={20} />}
                    title="Abbonamenti"
                    count={abbonamenti.length}
                    loading={loading.abbonamenti}
                    emptyMsg="Nessun abbonamento attivo al momento."
                >
                    <div className="sd-list">
                        {abbonamenti.map(abb => (
                            <div key={abb.productId} className="sd-list-item">
                                <div className="sd-list-item-main">
                                    <div className="sd-list-item-title">{abb.productName}</div>
                                    <div className="sd-list-item-meta">
                                        <CalendarDays size={13} />
                                        {abb.dataPagamento ? `Pagato il ${formatDateIT(abb.dataPagamento)}` : ''}
                                        {abb.dataScadenza ? ` · Scade il ${formatDateIT(abb.dataScadenza)}` : ''}
                                    </div>
                                </div>
                                <div className="sd-list-item-right">
                                    {abb.stato && <StatusBadge status={abb.stato} />}
                                    {abb.importo != null && (
                                        <span className="sd-amount">€ {parseFloat(abb.importo).toFixed(2)}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionCard>

                {/* ── Corsi ────────────────────────────────────────── */}
                <SectionCard
                    icon={<BookOpen size={20} />}
                    title="Corsi"
                    count={corsi.length}
                    loading={loading.corsi}
                    emptyMsg="Non sei iscritto a nessun corso al momento."
                >
                    <div className="sd-corsi-list">
                        {corsi.map(iscrizione => (
                            <CorsoCard
                                key={iscrizione.id || iscrizione.corsoId}
                                iscrizione={iscrizione}
                            />
                        ))}
                    </div>
                </SectionCard>

                {/* ── Comunicazioni ────────────────────────────────── */}
                <SectionCard
                    icon={<MessageSquare size={20} />}
                    title="Comunicazioni"
                    count={comunicazioni.length}
                    loading={loading.comunicazioni}
                    emptyMsg="Nessuna comunicazione ricevuta."
                >
                    <div className="sd-list">
                        {comunicazioni.slice().reverse().map(c => {
                            const isEmail = c.tipo === 'EMAIL';
                            const tipoKey = c.tipo?.toLowerCase() || 'default';
                            const dateStr = c.createdAt
                                ? new Date(c.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
                                : '';
                            const preview = stripHtml(c.testo);
                            return (
                                <div
                                    key={c.id}
                                    className={`sd-comm-item sd-comm-item--clickable sd-comm-item--${tipoKey}`}
                                    onClick={() => setSelectedComunicazione(c)}
                                >
                                    <div className="sd-comm-icon-wrap">
                                        {isEmail ? <Mail size={15} /> : <Smartphone size={15} />}
                                    </div>
                                    <div className="sd-comm-body">
                                        <div className="sd-comm-header-row">
                                            <span className="sd-comm-oggetto">
                                                {c.oggetto || (isEmail ? 'Comunicazione email' : 'Messaggio SMS')}
                                            </span>
                                            <span className={`sd-comm-tipo sd-comm-tipo--${tipoKey}`}>
                                                {c.tipo || '—'}
                                            </span>
                                            {dateStr && (
                                                <span className="sd-comm-date">{dateStr}</span>
                                            )}
                                        </div>
                                        {preview && (
                                            <div className="sd-comm-testo">{preview}</div>
                                        )}
                                    </div>
                                    <ChevronRight size={15} className="sd-comm-chevron" />
                                </div>
                            );
                        })}
                    </div>
                </SectionCard>

                </>)}

            </main>

            {selectedComunicazione && (
                <ComunicazioneDetailModal
                    comunicazione={selectedComunicazione}
                    onClose={() => setSelectedComunicazione(null)}
                />
            )}
        </div>
    );
}
