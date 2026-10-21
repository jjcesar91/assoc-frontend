import React, { useEffect, useRef } from 'react';
import { Lock } from 'lucide-react';
import { formatDateTimeIT } from '../../utils/dateUtils';
import { statoTicket } from '../../utils/ticket';
import './Ticket.css';

// Thread dei messaggi di un ticket. perParte: chi sta guardando ('cliente' | 'supporto'):
// i propri messaggi a destra, quelli dell'altra parte a sinistra; note interne evidenziate.
const TicketThread = ({ messaggi, perParte }) => {
    const fine = useRef(null);
    useEffect(() => { fine.current?.scrollIntoView({ block: 'nearest' }); }, [messaggi?.length]);

    return (
        <div className="ticket-thread" data-testid="ticket-thread">
            {(messaggi || []).map(m => {
                const mio = m.autore_tipo === perParte;
                const autore = m.autore_tipo === 'supporto'
                    ? (perParte === 'supporto' ? `Supporto${m.autore_email ? ` · ${m.autore_email}` : ''}` : 'Supporto GNP')
                    : (m.autore_email || 'Cliente');
                const stato = m.stato_impostato ? statoTicket(m.stato_impostato) : null;
                return (
                    <div key={m.id} className={`ticket-msg ${mio ? 'ticket-msg--mio' : ''} ${m.nota_interna ? 'ticket-msg--nota' : ''}`} data-testid="ticket-messaggio">
                        <div className="ticket-msg-head">
                            {m.nota_interna && <span className="ticket-msg-nota-label"><Lock size={12} /> Nota interna</span>}
                            <span className="ticket-msg-autore">{autore}</span>
                            <span className="ticket-msg-data">{formatDateTimeIT(m.createdAt)}</span>
                        </div>
                        <div className="ticket-msg-testo">{m.testo}</div>
                        {stato && (
                            <div className="ticket-msg-stato">
                                Stato: <span className={`badge ${stato.badge}`}>{perParte === 'cliente' ? stato.labelCliente : stato.label}</span>
                            </div>
                        )}
                    </div>
                );
            })}
            <div ref={fine} />
        </div>
    );
};

export default TicketThread;
