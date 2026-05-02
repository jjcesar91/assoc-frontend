/**
 * Calcola la data di scadenza del certificato medico a partire dalla data di presentazione.
 * Formula: data presentazione + 1 anno - 1 giorno
 * Esempio: presentato il 3 febbraio 2026 → scade il 2 febbraio 2027
 *
 * @param {string|Date|null} dataPresentazione
 * @returns {Date|null}
 */
export function computeScadenzaCertificato(dataPresentazione) {
    if (!dataPresentazione) return null;
    const d = new Date(dataPresentazione);
    if (isNaN(d.getTime())) return null;
    d.setFullYear(d.getFullYear() + 1);
    d.setDate(d.getDate() - 1);
    return d;
}

/**
 * Restituisce la data di scadenza come stringa YYYY-MM-DD,
 * o stringa vuota se la data di presentazione non è valida.
 *
 * @param {string|null} dataPresentazione
 * @returns {string}
 */
export function computeScadenzaCertificatoStr(dataPresentazione) {
    const d = computeScadenzaCertificato(dataPresentazione);
    if (!d) return '';
    return d.toISOString().split('T')[0];
}
