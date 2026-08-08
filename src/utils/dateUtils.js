/**
 * Utility centralizzate per la formattazione delle date in tutto il frontend.
 * Formato di visualizzazione standard: GG/MM/AAAA (it-IT).
 */

/**
 * Converte una data (Date, stringa ISO, stringa YYYY-MM-DD) nel formato italiano GG/MM/AAAA.
 * Le stringhe che iniziano con YYYY-MM-DD vengono lette testualmente (senza passare da `Date`)
 * per evitare shift di fuso orario introdotti da `new Date('YYYY-MM-DD')`.
 */
export function formatDateIT(value) {
    if (!value) return '';

    if (value instanceof Date) {
        if (isNaN(value.getTime())) return '';
        const dd = String(value.getDate()).padStart(2, '0');
        const mm = String(value.getMonth() + 1).padStart(2, '0');
        return `${dd}/${mm}/${value.getFullYear()}`;
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (match) {
        const [, y, m, d] = match;
        return `${d}/${m}/${y}`;
    }

    const d = new Date(value);
    return isNaN(d.getTime()) ? '' : formatDateIT(d);
}

/** Come formatDateIT, ma aggiunge l'orario locale nel formato HH:mm. */
export function formatDateTimeIT(value) {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return '';
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${formatDateIT(d)} ${hh}:${min}`;
}
