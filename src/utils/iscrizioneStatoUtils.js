// Calcolo dello stato di iscrizione (quota associativa) e tesseramento di un socio.
// Logica condivisa tra le colonne "Iscrizione"/"Tesseramento" della tabella soci
// (Soci.jsx) e le label ISCRITTO/NON ISCRITTO e TESSERATO/NON TESSERATO della modal
// socio (SocioModal.jsx), in modo che le due viste siano sempre coerenti tra loro.
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

// Scadenza di un pagamento Tesseramento: 365 giorni (anno_solare) oppure fine anno contabile
// (anno_associativo o periodicità non specificata).
export const scadenzaPagamentoTesseramento = (p, societa) => {
    if (!p.data_pagamento) return null;
    if (p.periodicity_tesseramento === 'anno_solare') {
        const scad = new Date(p.data_pagamento);
        scad.setFullYear(scad.getFullYear() + 1);
        scad.setDate(scad.getDate() - 1);
        return scad;
    }
    const anno = annoContabileDiData(p.data_pagamento, societa);
    if (anno == null) return null;
    return getAnnoDateRange(anno, societa).end;
};

// Risolve il product_id di un pagamento tesseramento (item multi-riga o riga singola).
export const getTesseramentoProductId = (p) => {
    if (Array.isArray(p.payment_items)) {
        const item = p.payment_items.find(i => i.quote_types === 'tesseramento');
        return item?.product_id ?? p.product_id ?? null;
    }
    return p.product_id ?? null;
};

// Scadenza (timestamp) + giorni di avviso più favorevoli tra i pagamenti tesseramento di un
// socio (lista di pagamenti "grezzi" già filtrati per il socio). getGiorniAvviso(productId),
// se fornita, risolve i giorni di avviso specifici del prodotto tesseramento che ha generato
// il pagamento (soglia di preavviso personalizzata, come nella tabella soci).
export const bestScadTessDaPagamenti = (payments, societa, getGiorniAvviso) => {
    let best = null; // { ts, giorniAvviso }
    for (const p of (payments || [])) {
        if (typeof p.stato_pagamento === 'string' && p.stato_pagamento.startsWith('3.')) continue; // annullati/storni
        const types = (p.quote_types || '').split(',').map(t => t.trim().toLowerCase());
        if (!types.includes('tesseramento')) continue;
        const scad = scadenzaPagamentoTesseramento(p, societa);
        if (!scad) continue;
        const ts = scad.getTime();
        if (isNaN(ts)) continue;
        if (best == null || ts > best.ts) {
            const productId = getTesseramentoProductId(p);
            best = { ts, giorniAvviso: getGiorniAvviso ? getGiorniAvviso(productId) : undefined };
        }
    }
    return best;
};

// Scadenza (timestamp) derivata da una Data Tesseramento inserita manualmente (senza pagamento/
// prodotto associato): 365 giorni fissi dalla data inserita, come i prodotti tesseramento con
// periodicità "anno_solare" (nessun prodotto quindi nessun giorniAvviso personalizzato).
export const scadTessDaDataManuale = (dataManuale) => {
    if (!dataManuale) return null;
    const scad = new Date(dataManuale);
    if (isNaN(scad)) return null;
    scad.setFullYear(scad.getFullYear() + 1);
    scad.setDate(scad.getDate() - 1);
    const ts = scad.getTime();
    if (isNaN(ts)) return null;
    return { ts, giorniAvviso: undefined };
};

// Stato Tesseramento di un socio, con priorità in quest'ordine:
// 1. Data Tesseramento inserita manualmente sul socio (dataManuale) — sovrascrive sia il calcolo
//    dai pagamenti sia l'eredità dall'iscrizione.
// 2. Opzione società "Quota associativa e Tesseramento Unico": eredita lo stato dell'iscrizione
//    (statoIscrizione, già calcolato altrove).
// 3. statoDaScadenza sulla scadenza tesseramento più favorevole tra i pagamenti del socio
//    (bestScadTess, da bestScadTessDaPagamenti/bestScadTessTs).
// Stessa combinazione usata sia nella tabella soci (getTesseramentoStatus in Soci.jsx) sia nella
// modal socio, così le due viste restano coerenti.
export const getTesseramentoStato = ({ dataManuale, bestScadTess, statoIscrizione, quotaTesseramentoUnico }) => {
    if (dataManuale) {
        const scad = scadTessDaDataManuale(dataManuale);
        return statoDaScadenza(scad?.ts ?? null);
    }
    if (quotaTesseramentoUnico) return statoIscrizione;
    return statoDaScadenza(bestScadTess?.ts ?? null, bestScadTess?.giorniAvviso);
};
