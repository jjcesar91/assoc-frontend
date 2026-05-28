import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LogOut, CreditCard, BookOpen, MessageSquare,
    Clock, CheckCircle, AlertTriangle, ChevronRight,
    CalendarDays, Bell, User, Activity, MapPin, UserCheck, Timer,
    X, Mail, Smartphone
} from 'lucide-react';
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
        SCADUTO: { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5', icon: <AlertTriangle size={11} /> },
        'IN SCADENZA': { bg: '#fef3c7', color: '#92400e', border: '#fcd34d', icon: <Clock size={11} /> },
        VALIDO: { bg: '#dcfce7', color: '#166534', border: '#86efac', icon: <CheckCircle size={11} /> },
        REGOLARE: { bg: '#dcfce7', color: '#166534', border: '#86efac', icon: <CheckCircle size={11} /> },
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

    const colore = c.attivita?.colore || '#10b981';
    const attivitaNome = c.attivita?.descrizione || 'Corso';
    const giornoLabel = c.giorno != null ? GIORNI_SETTIMANA[c.giorno] : null;
    const oraFine = computeOraFine(c.oraInizio, c.durataMinuti);
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
                    {giornoLabel && (
                        <span
                            className="sd-corso-giorno-badge"
                            style={{ background: `${colore}18`, color: colore, borderColor: `${colore}40` }}
                        >
                            {giornoLabel}
                        </span>
                    )}
                </div>
                <div className="sd-corso-details">
                    {c.oraInizio && (
                        <div className="sd-corso-detail">
                            <Clock size={13} />
                            <span>
                                {c.oraInizio}{oraFine ? ` – ${oraFine}` : ''}
                                {c.durataMinuti ? ` (${c.durataMinuti} min)` : ''}
                            </span>
                        </div>
                    )}
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
export default function SocioDashboard({ onLogout }) {
    const navigate = useNavigate();

    // Decode token to get socio_ref_id
    const token = localStorage.getItem('token');
    let socioId = null;
    let userName = '';
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        socioId = payload.socio_ref_id;
        userName = [payload.nome, payload.cognome].filter(Boolean).join(' ') || payload.username || 'Socio';
    } catch { /* noop */ }

    const [socio, setSocio] = useState(null);
    const [abbonamenti, setAbbonamenti] = useState([]);
    const [corsi, setCorsi] = useState([]);
    const [comunicazioni, setComunicazioni] = useState([]);
    const [loading, setLoading] = useState({ abbonamenti: true, corsi: true, comunicazioni: true });
    const [selectedComunicazione, setSelectedComunicazione] = useState(null);

    // Fetch socio profile
    useEffect(() => {
        if (!socioId) return;
        fetch(`/users/api/soci/${socioId}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setSocio(data); })
            .catch(() => {});
    }, [socioId]);

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

    return (
        <div className="sd-root">
            {/* ── Header ──────────────────────────────────────────── */}
            <header className="sd-header">
                <div className="sd-header-inner">
                    <div className="sd-header-brand">
                        <div className="sd-header-logo">
                            <Activity size={20} color="#10b981" />
                        </div>
                        <span className="sd-header-title">Area Soci</span>
                    </div>

                    <div className="sd-header-user">
                        <div className="sd-avatar">
                            <User size={16} />
                        </div>
                        <span className="sd-username">
                            {socio ? `${socio.nome} ${socio.cognome}` : userName}
                        </span>
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
                        Ciao, {socio ? socio.nome : userName}!
                    </h1>
                    <p className="sd-welcome-sub">
                        Qui puoi consultare i tuoi abbonamenti, corsi e comunicazioni.
                    </p>
                </div>
            </div>

            {/* ── Main content ─────────────────────────────────────── */}
            <main className="sd-main">

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
