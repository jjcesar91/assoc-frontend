// Calcolo dello stato di iscrizione (quota associativa) di un socio.
// Logica condivisa tra la colonna "Iscrizione" della tabella soci (Soci.jsx)
// e la label ISCRITTO/NON ISCRITTO della modal socio (SocioModal.jsx), in modo
// che le due viste siano sempre coerenti tra loro.
import { getAnnoDateRange } from '../data/AnnoContext';

// Anno contabile (anno associativo) a cui appartiene una certa data.
export const annoContabileDiData = (dateInput, societa) => {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d)) return null;
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const tipo = societa?.tipo_anno_associativo || 'solare';
    if (tipo === 'associativo') return month < 9 ? year - 1 : year;
    if (tipo === 'personalizzato' && societa?.data_inizio_anno_associativo) {
        const parts = String(societa.data_inizio_anno_associativo).split('-');
        if (parts.length === 2) {
            const cDay = parseInt(parts[0], 10);
            const cMonth = parseInt(parts[1], 10);
            if (month < cMonth || (month === cMonth && day < cDay)) return year - 1;
        }
        return year;
    }
    return year;
};

// Scadenza di un pagamento Iscrizione (quota associativa): fine anno contabile del pagamento.
export const scadenzaPagamentoIscrizione = (p, societa) => {
    if (!p.data_pagamento) return null;
    const anno = annoContabileDiData(p.data_pagamento, societa);
    if (anno == null) return null;
    return getAnnoDateRange(anno, societa).end;
};

// Da una scadenza (timestamp) allo stato: REGOLARE / IN SCADENZA (entro N gg, default 30) / SCADUTO / NO.
// giorniAvviso: soglia specifica del prodotto (es. tesseramento), se disponibile.
export const statoDaScadenza = (scadTs, giorniAvviso) => {
    if (scadTs == null) return 'NO';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const s = new Date(scadTs); s.setHours(0, 0, 0, 0);
    if (s < today) return 'SCADUTO';
    const limit = new Date(today); limit.setDate(limit.getDate() + (giorniAvviso ?? 30));
    if (s <= limit) return 'IN SCADENZA';
    return 'REGOLARE';
};

// Combina la scadenza "quota associativa" più favorevole (bestScadTs, timestamp o null) con le
// iscrizioni senza ricevuta del socio, applicando lo stesso shortcut/estensione usati nella
// tabella soci, e restituisce lo stato finale: REGOLARE / IN SCADENZA / SCADUTO / NO.
export const combineIscrizioneStato = (bestScadTs, iscrizioni, currentRefYear, societa) => {
    const list = iscrizioni || [];
    // Flag "Iscrizione senza ricevuta" per l'anno contabile corrente => sempre REGOLARE
    if (list.some(i => i.anno === currentRefYear)) return 'REGOLARE';
    let best = bestScadTs;
    // Iscrizioni senza ricevuta di altri anni: valgono come quota (scadenza = fine anno contabile)
    for (const i of list) {
        if (i.anno == null) continue;
        const ts = getAnnoDateRange(i.anno, societa).end.getTime();
        if (best == null || ts > best) best = ts;
    }
    return statoDaScadenza(best);
};

// Stato "ISCRITTO"/"NON ISCRITTO" binario, coerente con la tabella soci: ISCRITTO se lo stato
// calcolato risulta REGOLARE o IN SCADENZA, NON ISCRITTO se SCADUTO o NO.
export const isIscrittoDaStato = (stato) => stato === 'REGOLARE' || stato === 'IN SCADENZA';

// Scadenza (timestamp) più favorevole tra i pagamenti quota_associativa/iscrizione di un socio
// (lista di pagamenti "grezzi" già filtrati per il socio, es. socioPagamenti nella modal).
export const bestScadTsIscrizioneDaPagamenti = (payments, societa) => {
    let best = null;
    for (const p of (payments || [])) {
        if (typeof p.stato_pagamento === 'string' && p.stato_pagamento.startsWith('3.')) continue; // annullati/storni
        const types = (p.quote_types || '').split(',').map(t => t.trim().toLowerCase());
        if (!types.includes('quota_associativa')) continue;
        const scad = scadenzaPagamentoIscrizione(p, societa);
        if (!scad) continue;
        const ts = scad.getTime();
        if (isNaN(ts)) continue;
        if (best == null || ts > best) best = ts;
    }
    return best;
};
