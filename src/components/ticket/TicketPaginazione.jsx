import React from 'react';

// Totale e pagine della lista ticket
const TicketPaginazione = ({ lista, pagine, filtri, onFiltri }) => (
    <div className="ticket-paginazione">
        <span>Tot ticket: <strong>{lista.total}</strong></span>
        {pagine > 1 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <button type="button" className="btn-outlined" disabled={filtri.pagina <= 1} onClick={() => onFiltri({ ...filtri, pagina: filtri.pagina - 1 })}>‹</button>
                Pagina {filtri.pagina} di {pagine}
                <button type="button" className="btn-outlined" disabled={filtri.pagina >= pagine} onClick={() => onFiltri({ ...filtri, pagina: filtri.pagina + 1 })}>›</button>
            </span>
        )}
    </div>
);

export default TicketPaginazione;
