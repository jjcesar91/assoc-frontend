import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LifeBuoy, Plus, RefreshCw, ArrowLeft, Send, CheckCircle, Lock, X } from 'lucide-react';
import { useSocieta } from '../data/SocietaContext';
import { usePianoLicenza, MESSAGGIO_PIANO } from '../data/pianoLicenza';
import { useAlert } from '../components/AlertModal';
import { useConfirm } from '../components/ConfirmModal';
import TicketFiltri from '../components/ticket/TicketFiltri';
import TicketThread from '../components/ticket/TicketThread';
import TicketPaginazione from '../components/ticket/TicketPaginazione';
import { formatDateIT, formatDateTimeIT } from '../utils/dateUtils';
import {
    CATEGORIE_TICKET, PRIORITA_TICKET, MAX_OGGETTO, MAX_TESTO, FILTRI_DEFAULT,
    statoTicket, categoriaLabel, prioritaTicket, queryLista,
} from '../utils/ticket';
import '../components/ticket/Ticket.css';
import './Prodotti.css';

const etichetta = { display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' };
const errore = { borderColor: 'var(--danger)', backgroundColor: 'var(--danger-container)' };
const NUOVO_VUOTO = { oggetto: '', categoria: 'tecnico', priorita: 'normale', testo: '' };

// Nuovo ticket: oggetto, categoria, priorità e descrizione (i dati restano se l'invio fallisce)
const NuovoTicketModal = ({ onClose, onCreato, societaId }) => {
    const showAlert = useAlert();
    const [form, setForm] = useState(NUOVO_VUOTO);
    const [errori, setErrori] = useState({});
    const [invio, setInvio] = useState(false);
    const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrori(e => ({ ...e, [k]: undefined })); };

    const invia = async (e) => {
        e.preventDefault();
        const err = {};
        if (!form.oggetto.trim()) err.oggetto = 'Indica l\'oggetto della richiesta.';
        if (!form.testo.trim()) err.testo = 'Descrivi la richiesta.';
        if (Object.keys(err).length) { setErrori(err); return; }
        setInvio(true);
        try {
            const res = await fetch('/users/api/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, societaId }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                if (data.field) setErrori({ [data.field]: data.error });
                else showAlert(data.error || 'Errore nell\'invio del ticket', 'Errore');
                return;
            }
            onCreato(data);
        } catch {
            showAlert('Errore di rete', 'Errore');
        } finally {
            setInvio(false);
        }
    };

    return (
        <div className="modal-overlay">
            <form className="modal-card modal-lg" style={{ width: '95%', padding: 0 }} onSubmit={invia} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border-color)' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><LifeBuoy size={20} /> Nuovo ticket</h3>
                    <button type="button" onClick={onClose} title="Chiudi" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}><X size={22} /></button>
                </div>
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={etichetta} htmlFor="ticket-oggetto">Oggetto</label>
                        <input id="ticket-oggetto" className="md-input" style={{ width: '100%', ...(errori.oggetto ? errore : {}) }} maxLength={MAX_OGGETTO}
                            value={form.oggetto} onChange={e => set('oggetto', e.target.value)} placeholder="Es. Errore nella stampa della ricevuta" />
                        {errori.oggetto && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '4px' }}>{errori.oggetto}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <label style={etichetta} htmlFor="ticket-categoria">Categoria</label>
                            <select id="ticket-categoria" className="md-select" style={{ width: '100%' }} value={form.categoria} onChange={e => set('categoria', e.target.value)}>
                                {CATEGORIE_TICKET.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                        </div>
                        <div style={{ flex: 1, minWidth: '160px' }}>
                            <label style={etichetta} htmlFor="ticket-priorita">Priorità</label>
                            <select id="ticket-priorita" className="md-select" style={{ width: '100%' }} value={form.priorita} onChange={e => set('priorita', e.target.value)}>
                                {PRIORITA_TICKET.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label style={etichetta} htmlFor="ticket-testo">Descrizione</label>
                        <textarea id="ticket-testo" className="md-input" rows={7} maxLength={MAX_TESTO}
                            style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', ...(errori.testo ? errore : {}) }}
                            value={form.testo} onChange={e => set('testo', e.target.value)}
                            placeholder="Cosa stavi facendo, cosa ti aspettavi e cosa è successo (eventuale messaggio di errore)." />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginTop: '4px' }}>
                            <span style={{ color: 'var(--danger)' }}>{errori.testo || ''}</span>
                            <span style={{ color: 'var(--text-tertiary)' }}>{form.testo.length}/{MAX_TESTO}</span>
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '14px 20px', borderTop: '1px solid var(--border-color)' }}>
                    <button type="button" className="btn-outlined" onClick={onClose}>Annulla</button>
                    <button type="submit" className="btn-contained" disabled={invio} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Send size={16} /> {invio ? 'Invio…' : 'Invia ticket'}
                    </button>
                </div>
            </form>
        </div>
    );
};

// Dettaglio: thread, risposta e chiusura da parte del cliente
const DettaglioTicket = ({ ticketId, societaId, onIndietro, onAggiornato }) => {
    const showAlert = useAlert();
    const confirm = useConfirm();
    const [ticket, setTicket] = useState(null);
    const [errore, setErrore] = useState('');
    const [testo, setTesto] = useState('');
    const [invio, setInvio] = useState(false);

    const carica = useCallback(() => fetch(`/users/api/tickets/${ticketId}?societaId=${societaId}`)
        .then(async r => {
            const data = await r.json().catch(() => ({}));
            if (!r.ok) { setErrore(data.error || 'Ticket non disponibile'); return; }
            setTicket(data);
        })
        .catch(() => setErrore('Errore di rete')), [ticketId, societaId]);

    useEffect(() => { carica(); }, [carica]);

    const azione = async (url, body) => {
        setInvio(true);
        try {
            const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, societaId }) });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) { showAlert(data.error || 'Operazione non riuscita', 'Errore'); return false; }
            setTicket(data);
            onAggiornato();
            return true;
        } catch {
            showAlert('Errore di rete', 'Errore');
            return false;
        } finally {
            setInvio(false);
        }
    };

    const rispondi = async () => {
        if (!testo.trim()) return;
        if (await azione(`/users/api/tickets/${ticketId}/messaggi`, { testo })) setTesto('');
    };

    const chiudi = async () => {
        const ok = await confirm('Confermi che il problema è risolto? Il ticket verrà chiuso e non potrai più rispondere.', 'Chiudi il ticket', { confirmLabel: 'Chiudi il ticket', confirmColor: 'var(--success)' });
        if (ok) await azione(`/users/api/tickets/${ticketId}/chiudi`, {});
    };

    if (errore) return (
        <div className="table-card" style={{ padding: '24px' }}>
            <button type="button" className="btn-outlined" onClick={onIndietro} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><ArrowLeft size={16} /> Torna ai ticket</button>
            <p style={{ color: 'var(--danger)' }}>{errore}</p>
        </div>
    );
    if (!ticket) return <div className="table-card" style={{ padding: '24px', color: 'var(--text-secondary)' }}>Caricamento…</div>;

    const stato = statoTicket(ticket.stato);
    const chiuso = ticket.stato === 'chiuso';
    return (
        <div className="table-card" style={{ padding: '20px 24px' }}>
            <div className="ticket-dettaglio-head">
                <button type="button" className="btn-outlined" onClick={onIndietro} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><ArrowLeft size={16} /> Ticket</button>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>#{ticket.id} · {ticket.oggetto}</h3>
                <span className={`badge ${stato.badge}`} data-testid="ticket-stato">{stato.labelCliente}</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                {categoriaLabel(ticket.categoria)} · priorità {prioritaTicket(ticket.priorita).label.toLowerCase()} · aperto il {formatDateTimeIT(ticket.createdAt)} da {ticket.autore_email}
            </div>

            <TicketThread messaggi={ticket.messaggi} perParte="cliente" />

            {chiuso ? (
                <div style={{ marginTop: '12px', padding: '12px 16px', borderRadius: '8px', background: 'var(--info-container)', color: 'var(--on-info-container)', fontSize: '0.9rem' }}>
                    Il ticket è chiuso. Se ti serve ancora aiuto apri un nuovo ticket.
                </div>
            ) : (
                <div className="ticket-risposta">
                    <label style={etichetta} htmlFor="ticket-risposta">Rispondi</label>
                    <textarea id="ticket-risposta" className="md-input" maxLength={MAX_TESTO} value={testo} onChange={e => setTesto(e.target.value)}
                        placeholder="Scrivi la tua risposta al supporto…" />
                    <div className="ticket-risposta-azioni">
                        <span className="ticket-contatore">{testo.length}/{MAX_TESTO}</span>
                        <button type="button" className="btn-outlined" onClick={chiudi} disabled={invio} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <CheckCircle size={16} /> Problema risolto, chiudi
                        </button>
                        <button type="button" className="btn-contained" onClick={rispondi} disabled={invio || !testo.trim()} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <Send size={16} /> {invio ? 'Invio…' : 'Invia risposta'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Assistenza: ticket della società selezionata (non disponibile nel piano Free)
const Assistenza = () => {
    const { selectedSocietaId } = useSocieta();
    const piano = usePianoLicenza(selectedSocietaId);
    const [searchParams, setSearchParams] = useSearchParams();
    const ticketAperto = searchParams.get('ticket');
    const [filtri, setFiltri] = useState(FILTRI_DEFAULT);
    const [lista, setLista] = useState(null); // { items, total, per_pagina, conteggi }
    const [erroreLista, setErroreLista] = useState('');
    const [nuovo, setNuovo] = useState(false);
    const bloccata = piano.bloccata('assistenza');

    const carica = useCallback(() => {
        if (!selectedSocietaId || bloccata) return Promise.resolve();
        return fetch(`/users/api/tickets?${queryLista(filtri, { societaId: selectedSocietaId })}`)
            .then(async r => {
                const data = await r.json().catch(() => ({}));
                if (!r.ok) { setErroreLista(data.error || 'Ticket non disponibili'); setLista({ items: [], total: 0 }); return; }
                setErroreLista('');
                setLista(data);
            })
            .catch(() => setErroreLista('Errore di rete'));
    }, [filtri, selectedSocietaId, bloccata]);

    useEffect(() => { carica(); }, [carica]);

    const apri = (id) => setSearchParams(id ? { ticket: String(id) } : {});

    if (bloccata) return (
        <div className="prodotti-full-container">
            <div className="main-content">
                <div className="table-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }} data-testid="assistenza-bloccata">
                    <Lock size={32} style={{ marginBottom: '8px' }} />
                    <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)' }}>{MESSAGGIO_PIANO(piano.info)}</h3>
                    <p style={{ margin: 0 }}>L'assistenza tramite ticket è disponibile dai piani Pro e Advanced.</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="prodotti-full-container">
            <div className="main-content">
                {ticketAperto ? (
                    <DettaglioTicket key={ticketAperto} ticketId={ticketAperto} societaId={selectedSocietaId} onIndietro={() => apri(null)} onAggiornato={carica} />
                ) : (
                    <>
                        <TicketFiltri
                            filtri={filtri}
                            onChange={setFiltri}
                            conteggi={lista?.conteggi}
                            azioni={(
                                <>
                                    <button type="button" className="btn-outlined" onClick={carica} title="Aggiorna" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><RefreshCw size={16} /></button>
                                    <button type="button" className="btn-contained" onClick={() => setNuovo(true)} disabled={!selectedSocietaId} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                        <Plus size={18} /> Nuovo ticket
                                    </button>
                                </>
                            )}
                        />
                        <ListaTicket lista={lista} errore={erroreLista} filtri={filtri} onFiltri={setFiltri} onApri={apri} />
                    </>
                )}
            </div>
            {nuovo && (
                <NuovoTicketModal
                    societaId={selectedSocietaId}
                    onClose={() => setNuovo(false)}
                    onCreato={(t) => { setNuovo(false); carica(); apri(t.id); }}
                />
            )}
        </div>
    );
};

const ListaTicket = ({ lista, errore, filtri, onFiltri, onApri }) => {
    const pagine = lista ? Math.max(1, Math.ceil((lista.total || 0) / (lista.per_pagina || 25))) : 1;
    return (
        <div className="table-card">
            <div className="table-responsive">
                <table className="md-table" data-testid="lista-ticket">
                    <thead>
                        <tr>
                            <th style={{ width: '70px' }}>N.</th>
                            <th>Oggetto</th>
                            <th>Categoria</th>
                            <th>Stato</th>
                            <th>Creato il</th>
                            <th>Ultimo messaggio</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lista === null ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>Caricamento…</td></tr>
                        ) : errore ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--danger)' }}>{errore}</td></tr>
                        ) : lista.items.length === 0 ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                                {filtri.stato ? 'Nessun ticket in questo stato' : 'Nessun ticket: per chiedere aiuto apri un nuovo ticket.'}
                            </td></tr>
                        ) : lista.items.map(t => {
                            const stato = statoTicket(t.stato);
                            return (
                                <tr key={t.id} onClick={() => onApri(t.id)} style={{ cursor: 'pointer' }} className={t.non_letto ? 'ticket-row-nonletto' : ''}>
                                    <td style={{ color: 'var(--text-secondary)' }}>#{t.id}</td>
                                    <td style={{ fontWeight: t.non_letto ? 600 : 500 }}>
                                        {t.non_letto && <span className="ticket-nuovo" title="Nuova risposta dal supporto" />}
                                        {t.oggetto}
                                    </td>
                                    <td style={{ fontSize: '0.875rem' }}>{categoriaLabel(t.categoria)}</td>
                                    <td><span className={`badge ${stato.badge}`}>{stato.labelCliente}</span></td>
                                    <td style={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{formatDateIT(t.createdAt)}</td>
                                    <td style={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                                        {formatDateTimeIT(t.ultimo_messaggio_at)}
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.ultimo_messaggio_da === 'supporto' ? 'dal supporto' : 'da voi'}</div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {lista && !errore && <TicketPaginazione lista={lista} pagine={pagine} filtri={filtri} onFiltri={onFiltri} />}
        </div>
    );
};

export default Assistenza;
