// Configurazione e logica delle comunicazioni automatiche legate alle ricevute.
// Due tipologie:
//   - 'proforma'  : alla creazione di una proforma (ricevuta provvisoria)
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
// NOTA: i valori dei token sono persistiti nei testi salvati dagli operatori
// (societa.com_proforma_testo / com_pagamento_testo, conto.istruzioni_pagamento):
// non vanno rinominati, pena la rottura della sostituzione nei testi già salvati.
export const SHORTCODE_ISTRUZIONI = '{{ISTRUZIONI_PAGAMENTO}}';
export const SHORTCODE_LINK_QUIETANZA = '{{LINK_RICEVUTA}}';
export const SHORTCODE_NOME_ASSOCIAZIONE = '{{NOME_ASSOCIAZIONE}}';
export const SHORTCODE_NUMERO_RICEVUTA = '{{NUMERO_RICEVUTA}}';

export const SHORTCODE_FIELDS_COMUNI = [
    { label: 'Nome', token: '{{NOME}}', title: 'Inserisci il nome del destinatario' },
    { label: 'Importo', token: '{{IMPORTO}}', title: "Inserisci l'importo totale della ricevuta" },
    { label: 'N. Riferimento', token: '{{NUMERO_ORDINE}}', title: 'Inserisci il numero del documento' },
];

export const SHORTCODE_FIELDS_PROFORMA = [
    ...SHORTCODE_FIELDS_COMUNI,
    { label: 'Istruzioni pagamento', token: SHORTCODE_ISTRUZIONI, title: 'Inserisce le istruzioni di pagamento del conto (solo per conti Bonifico)' },
    { label: 'Link quietanza', token: SHORTCODE_LINK_QUIETANZA, title: 'Inserisce il link per il caricamento della quietanza (solo per pagamenti con bonifico, valido 3 giorni)' },
];

// Placeholder disponibili nel WYSIWYG dell'oggetto (unica funzione: inserire i campi dinamici).
export const SUBJECT_FIELDS_PROFORMA = [
    { label: 'Importo', token: '{{IMPORTO}}', title: "Inserisci l'importo totale della ricevuta" },
    { label: 'N. Riferimento', token: '{{NUMERO_ORDINE}}', title: 'Inserisci il numero del documento' },
    { label: 'Nome socio', token: '{{NOME}}', title: 'Inserisci il nome del socio destinatario' },
    { label: 'Nome associazione', token: SHORTCODE_NOME_ASSOCIAZIONE, title: "Inserisci il nome dell'associazione" },
];

export const SUBJECT_FIELDS_PAGAMENTO = [
    ...SUBJECT_FIELDS_PROFORMA,
    { label: 'N. Ricevuta', token: SHORTCODE_NUMERO_RICEVUTA, title: 'Inserisci il numero della ricevuta' },
];

// Testi di default già pronti all'uso.
export const DEFAULTS = {
    proforma: {
        oggetto: 'Conferma ricevuta e istruzioni di pagamento',
        testo:
            '<p>Gentile {{NOME}},</p>' +
            '<p>abbiamo registrato la tua ricevuta per un importo di <strong>{{IMPORTO}}</strong>.</p>' +
            `<p>${SHORTCODE_ISTRUZIONI}</p>` +
            '<p>Grazie,<br>Lo staff</p>',
    },
    pagamento: {
        oggetto: 'Pagamento registrato {{NOME_ASSOCIAZIONE}} - Ricevuta n. {{NUMERO_RICEVUTA}}',
        testo:
            '<p>Gentile {{NOME}},</p>' +
            '<p>confermiamo la tua ricevuta: il pagamento di <strong>{{IMPORTO}}</strong> è stato registrato correttamente.</p>' +
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
        // Copia conoscenza nascosta (CCn) alla mail anagrafica della società (solo invii automatici).
        ccn: !!societa?.[`${prefix}_ccn`],
    };
}

/**
 * Sostituisce gli shortcode nel testo HTML (usato anche per l'oggetto).
 * @param {string} html
 * @param {{ nome?: string, importo?: string, numeroRiferimento?: string, numeroRicevuta?: string, nomeAssociazione?: string, istruzioni?: string, linkQuietanza?: string }} ctx
 */
export function applyShortcodes(html, ctx = {}) {
    if (!html) return '';
    let out = html
        .replaceAll('{{NOME}}', ctx.nome || '')
        .replaceAll('{{IMPORTO}}', ctx.importo || '')
        .replaceAll('{{NUMERO_ORDINE}}', ctx.numeroRiferimento || '')
        .replaceAll(SHORTCODE_NUMERO_RICEVUTA, ctx.numeroRicevuta || '')
        .replaceAll(SHORTCODE_NOME_ASSOCIAZIONE, ctx.nomeAssociazione || '')
        .replaceAll(SHORTCODE_ISTRUZIONI, ctx.istruzioni || '');

    // Link quietanza: solo per bonifico. Se assente, rimuovo l'eventuale paragrafo che lo contiene.
    const tokenRe = SHORTCODE_LINK_QUIETANZA.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (ctx.linkQuietanza) {
        const anchor = `<a href="${ctx.linkQuietanza}">${ctx.linkQuietanza}</a>`;
        out = out.replaceAll(SHORTCODE_LINK_QUIETANZA, anchor);
    } else {
        // rimuove un intero blocco <p>...{{LINK_RICEVUTA}}...</p>, poi eventuali token residui
        out = out
            .replace(new RegExp(`<p[^>]*>(?:(?!</p>).)*${tokenRe}(?:(?!</p>).)*</p>`, 'gi'), '')
            .replaceAll(SHORTCODE_LINK_QUIETANZA, '');
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
 * @param {string} contoDestinazione - descrizione del conto legato alla ricevuta
 * @param {string} modalita - modalità di pagamento della ricevuta
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
 * @param {boolean} [params.ccnSocieta] - Se true, invia in CCn (copia conoscenza nascosta) alla mail anagrafica della società
 * @returns {Promise<{ ok: boolean, warning?: string, error?: string }>}
 */
export async function sendComunicazioneEmail({ socioId, oggetto, testo, allegati, ccnSocieta }) {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/users/api/soci/${socioId}/comunicazioni`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ tipo: 'EMAIL', oggetto, testo, allegati, ccnSocieta: !!ccnSocieta }),
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
