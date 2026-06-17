/**
 * Mappa i campi backend (tipo_documento + stato_pagamento) nel
 * nuovo concetto unificato "stato_ordine" usato dal frontend.
 *
 * Il backend rimane invariato: i dati storici continuano a funzionare.
 */
export function getStatoOrdine(record) {
    if (!record) return null;
    if (record.stato_pagamento?.startsWith('3.')) return 'annullato';
    if (record.tipo_documento === 'proforma') return 'proforma';
    return 'pagato';
}

export const STATO_ORDINE_CONFIG = {
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

export function getStatoOrdineBadgeStyle(stato) {
    const cfg = STATO_ORDINE_CONFIG[stato] || STATO_ORDINE_CONFIG.pagato;
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
