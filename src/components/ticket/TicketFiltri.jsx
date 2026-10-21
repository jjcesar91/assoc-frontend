import React from 'react';
import { STATI_TICKET, ORDINAMENTI_TICKET } from '../../utils/ticket';

const campo = { display: 'flex', flexDirection: 'column', flex: 1, minWidth: '160px' };
const etichetta = { fontSize: '0.85rem', marginBottom: '4px' };

// Filtri della lista ticket: stato (con conteggi), ordinamento e verso.
// children: filtri aggiuntivi (es. ricerca nel Backoffice); azioni: pulsanti a destra
const TicketFiltri = ({ filtri, onChange, conteggi, perParte = 'cliente', children, azioni }) => {
    const set = (k, v) => onChange({ ...filtri, [k]: v, pagina: 1 });
    const totale = conteggi ? Object.values(conteggi).reduce((s, n) => s + n, 0) : null;
    return (
        <div className="toolbar-card" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '12px' }}>
            {children}
            <div style={campo}>
                <label style={etichetta} htmlFor="ticket-filtro-stato">Stato</label>
                <select id="ticket-filtro-stato" className="md-select" value={filtri.stato} onChange={e => set('stato', e.target.value)}>
                    <option value="">Tutti{totale !== null ? ` (${totale})` : ''}</option>
                    {STATI_TICKET.map(s => (
                        <option key={s.value} value={s.value}>
                            {perParte === 'cliente' ? s.labelCliente : s.label}{conteggi ? ` (${conteggi[s.value] || 0})` : ''}
                        </option>
                    ))}
                </select>
            </div>
            <div style={campo}>
                <label style={etichetta} htmlFor="ticket-filtro-ordina">Ordina per</label>
                <select id="ticket-filtro-ordina" className="md-select" value={filtri.ordina} onChange={e => set('ordina', e.target.value)}>
                    {ORDINAMENTI_TICKET.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
            </div>
            <div style={campo}>
                <label style={etichetta} htmlFor="ticket-filtro-dir">Verso</label>
                <select id="ticket-filtro-dir" className="md-select" value={filtri.dir} onChange={e => set('dir', e.target.value)}>
                    <option value="desc">Più recenti prima</option>
                    <option value="asc">Meno recenti prima</option>
                </select>
            </div>
            {azioni && <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>{azioni}</div>}
        </div>
    );
};

export default TicketFiltri;
