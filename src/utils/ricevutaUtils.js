/**
 * Mappa i campi backend (tipo_documento + stato_pagamento) nel
 * nuovo concetto unificato "stato_ricevuta" usato dal frontend.
 *
 * Il backend rimane invariato: i dati storici continuano a funzionare.
 */
export function getStatoRicevuta(record) {
    if (!record) return null;
    if (record.stato_pagamento?.startsWith('3.')) return 'annullato';
    if (record.tipo_documento === 'proforma') return 'proforma';
    return 'pagato';
}

/**
 * Etichette generate dal sistema: non sono salvate nel campo `etichette` del
 * record (che contiene solo quelle inserite dagli operatori) ma derivano dallo
 * stato della ricevuta, ed è così che vengono mostrate come badge in lista.
 *
 * Servono per poterci filtrare sopra insieme alle etichette manuali. Restano
 * separate da queste ultime perché non devono finire fra i suggerimenti
 * dell'editor di etichette: nessuno deve poterle scrivere o rimuovere a mano.
 */
export const ETICHETTE_SISTEMA = [
    { label: 'PROFORMA', match: (p) => p.tipo_documento === 'proforma' },
    { label: 'DA CLIENTE', match: (p) => p.origine === 'cliente' },
    { label: 'ANNULLATO', match: (p) => !!p.stato_pagamento?.startsWith('3.') },
];

/** Restituisce la definizione dell'etichetta di sistema con quel nome, se esiste. */
export function getEtichettaSistema(label) {
    return ETICHETTE_SISTEMA.find(e => e.label === label) || null;
}

export const STATO_RICEVUTA_CONFIG = {
    proforma: {
        label: 'PROFORMA',
        color: '#7c3aed',
        bg: '#f3e8ff',
        border: '#a855f7',
    },
    pagato: {
        label: 'PAGATO',
        color: '#15803d',
        bg: '#dcfce7',
        border: '#22c55e',
    },
    annullato: {
        label: 'ANNULLATO',
        color: '#b91c1c',
        bg: '#fef2f2',
        border: '#ef4444',
    },
};

export function getStatoRicevutaBadgeStyle(stato) {
    const cfg = STATO_RICEVUTA_CONFIG[stato] || STATO_RICEVUTA_CONFIG.pagato;
    return {
        display: 'inline-block',
        padding: '3px 12px',
        borderRadius: '6px',
        fontWeight: 700,
        fontSize: '0.85rem',
        background: cfg.bg,
        color: cfg.color,
        border: `1.5px solid ${cfg.border}`,
        letterSpacing: '0.5px',
    };
}
