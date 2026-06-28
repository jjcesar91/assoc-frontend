// Configurazione e logica delle comunicazioni automatiche legate agli ordini.
// Due tipologie:
//   - 'proforma'  : alla creazione di una proforma (ordine)
//   - 'pagamento' : alla conferma/registrazione del pagamento di una proforma
//
// Ogni comunicazione ha uno stato: 'NON_ATTIVA' | 'CHIEDI' | 'AUTOMATICA'.

export const STATI_COMUNICAZIONE = ['NON_ATTIVA', 'CHIEDI', 'AUTOMATICA'];

export const STATO_LABELS = {
    NON_ATTIVA: 'Non attiva',
    CHIEDI: 'Chiedi',
    AUTOMATICA: 'Automatica',
};

// Shortcode disponibili nel WYSIWYG (inseribili dai pulsanti della toolbar).
export const SHORTCODE_ISTRUZIONI = '{{ISTRUZIONI_PAGAMENTO}}';
export const SHORTCODE_LINK_RICEVUTA = '{{LINK_RICEVUTA}}';

export const SHORTCODE_FIELDS_COMUNI = [
    { label: 'Nome', token: '{{NOME}}', title: 'Inserisci il nome del destinatario' },
    { label: 'Importo', token: '{{IMPORTO}}', title: "Inserisci l'importo totale dell'ordine" },
    { label: 'N. Ordine', token: '{{NUMERO_ORDINE}}', title: 'Inserisci il numero del documento' },
];

export const SHORTCODE_FIELDS_PROFORMA = [
    ...SHORTCODE_FIELDS_COMUNI,
    { label: 'Istruzioni pagamento', token: SHORTCODE_ISTRUZIONI, title: 'Inserisce le istruzioni di pagamento del conto (solo per conti Bonifico)' },
    { label: 'Link ricevuta', token: SHORTCODE_LINK_RICEVUTA, title: 'Inserisce il link per il caricamento della ricevuta (solo per pagamenti con bonifico, valido 3 giorni)' },
];

// Testi di default già pronti all'uso.
export const DEFAULTS = {
    proforma: {
        oggetto: 'Conferma ordine e istruzioni di pagamento',
        testo:
            '<p>Gentile {{NOME}},</p>' +
            '<p>abbiamo registrato il tuo ordine per un importo di <strong>{{IMPORTO}}</strong>.</p>' +
            `<p>${SHORTCODE_ISTRUZIONI}</p>` +
            '<p>Grazie,<br>Lo staff</p>',
    },
    pagamento: {
        oggetto: 'Pagamento registrato - Ricevuta allegata',
        testo:
            '<p>Gentile {{NOME}},</p>' +
            '<p>confermiamo il tuo ordine: il pagamento di <strong>{{IMPORTO}}</strong> è stato registrato correttamente.</p>' +
            '<p>In allegato trovi la ricevuta del pagamento.</p>' +
            '<p>Grazie,<br>Lo staff</p>',
    },
};

/**
 * Restituisce la configurazione di una comunicazione per la società,
 * applicando i default ai campi non ancora valorizzati.
 * @param {Object} societa
 * @param {'proforma'|'pagamento'} tipo
 */
export function getComConfig(societa, tipo) {
    const prefix = tipo === 'pagamento' ? 'com_pagamento' : 'com_proforma';
    const stato = societa?.[`${prefix}_stato`] || 'NON_ATTIVA';
    const oggetto = societa?.[`${prefix}_oggetto`] ?? '';
    const testo = societa?.[`${prefix}_testo`] ?? '';
    return {
        stato,
        oggetto: oggetto || DEFAULTS[tipo].oggetto,
        testo: testo || DEFAULTS[tipo].testo,
    };
}

/**
 * Sostituisce gli shortcode nel testo HTML.
 * @param {string} html
 * @param {{ nome?: string, importo?: string, numeroOrdine?: string, istruzioni?: string, linkRicevuta?: string }} ctx
 */
export function applyShortcodes(html, ctx = {}) {
    if (!html) return '';
    let out = html
        .replaceAll('{{NOME}}', ctx.nome || '')
        .replaceAll('{{IMPORTO}}', ctx.importo || '')
        .replaceAll('{{NUMERO_ORDINE}}', ctx.numeroOrdine || '')
        .replaceAll(SHORTCODE_ISTRUZIONI, ctx.istruzioni || '');

    // Link ricevuta: solo per bonifico. Se assente, rimuovo l'eventuale paragrafo che lo contiene.
    const tokenRe = SHORTCODE_LINK_RICEVUTA.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (ctx.linkRicevuta) {
        const anchor = `<a href="${ctx.linkRicevuta}">${ctx.linkRicevuta}</a>`;
        out = out.replaceAll(SHORTCODE_LINK_RICEVUTA, anchor);
    } else {
        // rimuove un intero blocco <p>...{{LINK_RICEVUTA}}...</p>, poi eventuali token residui
        out = out
            .replace(new RegExp(`<p[^>]*>(?:(?!</p>).)*${tokenRe}(?:(?!</p>).)*</p>`, 'gi'), '')
            .replaceAll(SHORTCODE_LINK_RICEVUTA, '');
    }
    return out;
}

/** Formatta un importo numerico in stringa "€ 1.234,56". */
export function formatImporto(value) {
    const n = Math.abs(parseFloat(value || 0));
    return '€ ' + n.toFixed(2).replace('.', ',');
}

/**
 * Costruisce il testo delle istruzioni di pagamento per i conti Bonifico.
 * Sostituisce {{IBAN}} con l'IBAN del conto. Per conti non Bonifico ritorna ''.
 * @param {Array} conti - elenco conti della società
 * @param {string} contoDestinazione - descrizione del conto legato all'ordine
 * @param {string} modalita - modalità di pagamento dell'ordine
 */
export function buildIstruzioniPagamento(conti, contoDestinazione, modalita) {
    if ((modalita || '').toLowerCase() !== 'bonifico') return '';
    if (!Array.isArray(conti)) return '';
    const conto = conti.find(c => c.descrizione === contoDestinazione)
        || conti.find(c => c.modalita_pagamento?.toLowerCase() === 'bonifico');
    if (!conto?.istruzioni_pagamento) return '';
    return conto.istruzioni_pagamento.replaceAll('{{IBAN}}', conto.iban || '');
}

/**
 * Invia una comunicazione email al socio.
 * @param {Object} params
 * @param {number|string} params.socioId
 * @param {string} params.oggetto
 * @param {string} params.testo - HTML
 * @param {Array} [params.allegati] - [{ filename, content(base64) }]
 * @returns {Promise<{ ok: boolean, warning?: string, error?: string }>}
 */
export async function sendComunicazioneEmail({ socioId, oggetto, testo, allegati }) {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/users/api/soci/${socioId}/comunicazioni`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ tipo: 'EMAIL', oggetto, testo, allegati }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            return { ok: false, error: data.error || 'Errore durante l\'invio della comunicazione' };
        }
        return { ok: true, warning: data.warning };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}
