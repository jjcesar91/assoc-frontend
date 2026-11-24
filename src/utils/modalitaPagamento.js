// Modalità di pagamento proposte nei form di modifica (Prima Nota, Dettaglio ricevuta).
export const MODALITA_STANDARD = ['Contanti', 'POS', 'Assegno', 'Bonifico', 'Carta di credito', 'Altro'];

// Opzioni per la select modalità: quelle del conto scelto, poi le standard, poi il valore attuale.
export function opzioniModalita(conti, contoDescrizione, valoreAttuale) {
    const conto = (conti || []).find(c => c.descrizione === contoDescrizione);
    const delConto = Array.isArray(conto?.modalita_pagamento) ? conto.modalita_pagamento : [];
    return [...new Set([...delConto, ...MODALITA_STANDARD, valoreAttuale].filter(Boolean))];
}
