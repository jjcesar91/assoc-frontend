import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw, ArrowLeft, Send, Lock } from 'lucide-react';
import { useAlert } from '../components/AlertModal';
import TicketFiltri from '../components/ticket/TicketFiltri';
import TicketThread from '../components/ticket/TicketThread';
import TicketPaginazione from '../components/ticket/TicketPaginazione';
import { formatDateIT, formatDateTimeIT } from '../utils/dateUtils';
import {
    STATI_TICKET, CATEGORIE_TICKET, PRIORITA_TICKET, MAX_TESTO, FILTRI_DEFAULT,
    statoTicket, categoriaLabel, prioritaTicket, queryLista,
} from '../utils/ticket';
import '../components/ticket/Ticket.css';
import './Prodotti.css';

const etichetta = { display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' };

// Dettaglio per il supporto: stato/priorità/categoria modificabili, risposta o nota interna
const DettaglioSupporto = ({ ticketId, onIndietro, onAggiornato }) => {
    const showAlert = useAlert();
    const [ticket, setTicket] = useState(null);
    const [errore, setErrore] = useState('');
    const [testo, setTesto] = useState('');
    const [notaInterna, setNotaInterna] = useState(false);
    const [statoDopo, setStatoDopo] = useState('in_attesa_cliente');
    const [invio, setInvio] = useState(false);

    useEffect(() => {
        fetch(`/users/api/tickets/backoffice/${ticketId}`)
            .then(async r => {
                const data = await r.json().catch(() => ({}));
                if (!r.ok) { setErrore(data.error || 'Ticket non disponibile'); return; }
                setTicket(data);
                onAggiornato();
            })
            .catch(() => setErrore('Errore di rete'));
    }, [ticketId]); // eslint-disable-line react-hooks/exhaustive-deps

    const invia = async (method, url, body) => {
        setInvio(true);
        try {
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
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
        const ok = await invia('POST', `/users/api/tickets/backoffice/${ticketId}/messaggi`, {
            testo,
            nota_interna: notaInterna,
            // Nota interna: lo stato resta invariato salvo scelta esplicita
            stato: notaInterna && statoDopo === '' ? null : statoDopo,
        });
        if (ok) setTesto('');
    };

    const aggiorna = (campo, valore) => invia('PATCH', `/users/api/tickets/backoffice/${ticketId}`, { [campo]: valore });

    if (errore) return (
        <div className="table-card" style={{ padding: '24px' }}>
            <button type="button" className="btn-outlined" onClick={onIndietro} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><ArrowLeft size={16} /> Torna ai ticket</button>
            <p style={{ color: 'var(--danger)' }}>{errore}</p>
        </div>
    );
    if (!ticket) return <div className="table-card" style={{ padding: '24px', color: 'var(--text-secondary)' }}>Caricamento…</div>;

    return (
        <div className="table-card" style={{ padding: '20px 24px' }}>
            <div className="ticket-dettaglio-head">
                <button type="button" className="btn-outlined" onClick={onIndietro} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><ArrowLeft size={16} /> Ticket</button>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>#{ticket.id} · {ticket.oggetto}</h3>
                <span className={`badge ${statoTicket(ticket.stato).badge}`} data-testid="ticket-stato">{statoTicket(ticket.stato).label}</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                <strong>{ticket.societa?.denominazione || `Società #${ticket.societa_id}`}</strong> · {ticket.autore_email} · aperto il {formatDateTimeIT(ticket.createdAt)}
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <div style={{ flex: 1, minWidth: '170px' }}>
                    <label style={etichetta} htmlFor="bo-stato">Stato</label>
                    <select id="bo-stato" className="md-select" style={{ width: '100%' }} value={ticket.stato} disabled={invio} onChange={e => aggiorna('stato', e.target.value)}>
                        {STATI_TICKET.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                </div>
                <div style={{ flex: 1, minWidth: '140px' }}>
                    <label style={etichetta} htmlFor="bo-priorita">Priorità</label>
                    <select id="bo-priorita" className="md-select" style={{ width: '100%' }} value={ticket.priorita} disabled={invio} onChange={e => aggiorna('priorita', e.target.value)}>
                        {PRIORITA_TICKET.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={etichetta} htmlFor="bo-categoria">Categoria</label>
                    <select id="bo-categoria" className="md-select" style={{ width: '100%' }} value={ticket.categoria} disabled={invio} onChange={e => aggiorna('categoria', e.target.value)}>
                        {CATEGORIE_TICKET.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                </div>
            </div>

            <TicketThread messaggi={ticket.messaggi} perParte="supporto" />

            <div className="ticket-risposta">
                <label style={etichetta} htmlFor="bo-risposta">{notaInterna ? 'Nota interna (non visibile al cliente)' : 'Risposta al cliente'}</label>
                <textarea id="bo-risposta" className="md-input" maxLength={MAX_TESTO} value={testo} onChange={e => setTesto(e.target.value)}
                    style={notaInterna ? { background: 'var(--warning-container)' } : undefined}
                    placeholder={notaInterna ? 'Appunto per il team di supporto…' : 'Scrivi la risposta: il cliente riceve un avviso via email.'} />
                <div className="ticket-risposta-azioni">
                    <span className="ticket-contatore">{testo.length}/{MAX_TESTO}</span>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={notaInterna} onChange={e => { setNotaInterna(e.target.checked); setStatoDopo(e.target.checked ? '' : 'in_attesa_cliente'); }} />
                        <Lock size={14} /> Nota interna
                    </label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }} htmlFor="bo-stato-dopo">
                        Stato dopo l'invio
                        <select id="bo-stato-dopo" className="md-select" value={statoDopo} onChange={e => setStatoDopo(e.target.value)}>
                            {notaInterna && <option value="">Invariato</option>}
                            {STATI_TICKET.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                    </label>
                    <button type="button" className="btn-contained" onClick={rispondi} disabled={invio || !testo.trim()} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Send size={16} /> {invio ? 'Invio…' : notaInterna ? 'Salva nota' : 'Invia risposta'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Backoffice → Ticket (solo superuser): ticket di tutte le società
const BackofficeTicket = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const ticketAperto = searchParams.get('ticket');
    const [filtri, setFiltri] = useState({ ...FILTRI_DEFAULT, q: '', non_letti: false });
    const [cerca, setCerca] = useState('');
    const [lista, setLista] = useState(null);
    const [erroreLista, setErroreLista] = useState('');

    // Ricerca applicata dopo una breve pausa di digitazione
    useEffect(() => {
        const t = setTimeout(() => setFiltri(f => (f.q === cerca.trim() ? f : { ...f, q: cerca.trim(), pagina: 1 })), 350);
        return () => clearTimeout(t);
    }, [cerca]);

    const carica = useCallback(() => fetch(`/users/api/tickets/backoffice?${queryLista(filtri)}`)
        .then(async r => {
            const data = await r.json().catch(() => ({}));
            if (!r.ok) { setErroreLista(data.error || 'Ticket non disponibili'); setLista({ items: [], total: 0 }); return; }
            setErroreLista('');
            setLista(data);
        })
        .catch(() => setErroreLista('Errore di rete')), [filtri]);

    useEffect(() => { carica(); }, [carica]);

    const apri = (id) => setSearchParams(id ? { ticket: String(id) } : {});
    const pagine = lista ? Math.max(1, Math.ceil((lista.total || 0) / (lista.per_pagina || 25))) : 1;

    return (
        <div className="prodotti-full-container">
            <div className="main-content">
                {ticketAperto ? (
                    <DettaglioSupporto key={ticketAperto} ticketId={ticketAperto} onIndietro={() => apri(null)} onAggiornato={carica} />
                ) : (
                    <>
                        <TicketFiltri
                            filtri={filtri}
                            onChange={setFiltri}
                            conteggi={lista?.conteggi}
                            perParte="supporto"
                            azioni={<button type="button" className="btn-outlined" onClick={carica} title="Aggiorna" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><RefreshCw size={16} /> Aggiorna</button>}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', flex: 2, minWidth: '200px' }}>
                                <label style={{ fontSize: '0.85rem', marginBottom: '4px' }} htmlFor="bo-cerca">Cerca</label>
                                <input id="bo-cerca" className="md-input" placeholder="N. ticket, oggetto, società o email" value={cerca} onChange={e => setCerca(e.target.value)} />
                            </div>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', paddingBottom: '10px', cursor: 'pointer' }}>
                                <input type="checkbox" checked={filtri.non_letti} onChange={e => setFiltri(f => ({ ...f, non_letti: e.target.checked, pagina: 1 }))} />
                                Solo da leggere
                            </label>
                        </TicketFiltri>

                        <div className="table-card">
                            <div className="table-responsive">
                                <table className="md-table" data-testid="lista-ticket">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '70px' }}>N.</th>
                                            <th>Oggetto</th>
                                            <th>Società</th>
                                            <th>Priorità</th>
                                            <th>Stato</th>
                                            <th>Creato il</th>
                                            <th>Ultimo messaggio</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lista === null ? (
                                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>Caricamento…</td></tr>
                                        ) : erroreLista ? (
                                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--danger)' }}>{erroreLista}</td></tr>
                                        ) : lista.items.length === 0 ? (
                                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>Nessun ticket trovato</td></tr>
                                        ) : lista.items.map(t => {
                                            const stato = statoTicket(t.stato);
                                            const priorita = prioritaTicket(t.priorita);
                                            return (
                                                <tr key={t.id} onClick={() => apri(t.id)} style={{ cursor: 'pointer' }} className={t.non_letto ? 'ticket-row-nonletto' : ''}>
                                                    <td style={{ color: 'var(--text-secondary)' }}>#{t.id}</td>
                                                    <td style={{ fontWeight: t.non_letto ? 600 : 500 }}>
                                                        {t.non_letto && <span className="ticket-nuovo" title="Nuovo messaggio dal cliente" />}
                                                        {t.oggetto}
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>{categoriaLabel(t.categoria)} · {t.autore_email}</div>
                                                    </td>
                                                    <td style={{ fontSize: '0.875rem' }}>{t.societa?.denominazione || `#${t.societa_id}`}</td>
                                                    <td><span className={`badge ${priorita.badge}`}>{priorita.label}</span></td>
                                                    <td><span className={`badge ${stato.badge}`}>{stato.label}</span></td>
                                                    <td style={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{formatDateIT(t.createdAt)}</td>
                                                    <td style={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                                                        {formatDateTimeIT(t.ultimo_messaggio_at)}
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.ultimo_messaggio_da === 'supporto' ? 'dal supporto' : 'dal cliente'}</div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {lista && !erroreLista && <TicketPaginazione lista={lista} pagine={pagine} filtri={filtri} onFiltri={setFiltri} />}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default BackofficeTicket;
