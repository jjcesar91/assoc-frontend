// Modalità di pagamento e conti nei form (Registra pagamento, Prima Nota, Dettaglio ricevuta).
//
// Si sceglie prima la modalità, poi il conto tra quelli che la accettano.
// Un conto senza modalità configurate le accetta tutte (comportamento storico,
// per non bloccare l'operatore).
export const MODALITA_STANDARD = ['Contanti', 'POS', 'Assegno', 'Bonifico', 'Carta di credito', 'Altro'];

export const modalitaDi = (c) => (Array.isArray(c?.modalita_pagamento) ? c.modalita_pagamento : []);
export const contoAccetta = (c, m) => !m || modalitaDi(c).length === 0 || modalitaDi(c).includes(m);

// Modalità proposte: quelle configurate sui conti (in ordine), più quelle di `base`
// se non ci sono conti o qualche conto non ne ha configurate; in coda il valore attuale.
export function modalitaDisponibili(conti, base = MODALITA_STANDARD, attuale = null) {
    const lista = conti || [];
    const out = [...new Set(lista.flatMap(modalitaDi))];
    if (!lista.length || !out.length || lista.some(c => modalitaDi(c).length === 0)) {
        base.forEach(m => { if (!out.includes(m)) out.push(m); });
    }
    if (attuale && !out.includes(attuale)) out.push(attuale);
    return out;
}

// Conti che accettano la modalità (tutti se la modalità è vuota o nessuno la accetta)
export function contiPerModalita(conti, m) {
    const lista = conti || [];
    const ok = lista.filter(c => contoAccetta(c, m));
    return ok.length ? ok : lista;
}

// Conto predefinito di Configurazione → Conti (altrimenti il primo)
export const contoPredefinito = (conti) => (conti || []).find(c => c.predefinito) || (conti || [])[0] || null;

// Conto da proporre per una modalità: il predefinito se compatibile, poi uno che
// la dichiara esplicitamente, poi il primo compatibile.
export function contoPerModalita(conti, m) {
    const ok = contiPerModalita(conti, m);
    return ok.find(c => c.predefinito) || ok.find(c => modalitaDi(c).includes(m)) || ok[0] || null;
}

// Modalità iniziale per un conto: "Contanti" se la accetta, altrimenti la sua prima.
export const modalitaPerConto = (conto, fallback = 'Contanti') =>
    (!conto || contoAccetta(conto, 'Contanti') ? fallback : modalitaDi(conto)[0]);

// Al cambio di modalità: il conto resta se compatibile, altrimenti si passa a quello proposto.
export function contoDopoCambioModalita(conti, contoAttuale, m) {
    if (!(conti || []).length) return contoAttuale;
    if (contiPerModalita(conti, m).some(c => c.descrizione === contoAttuale)) return contoAttuale;
    return contoPerModalita(conti, m)?.descrizione || '';
}
