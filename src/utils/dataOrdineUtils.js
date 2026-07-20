import { getAnnoDateRange } from '../data/AnnoContext';

/**
 * Regole condivise sulla data documento/ricevuta di un ordine.
 *
 * Usate sia dalla creazione di un nuovo ordine (GeneraOrdineModal) sia dalla
 * conversione di una proforma in pagamento (DettaglioOrdineModal → "Registra
 * Pagamento"), così che le due schermate applichino gli stessi vincoli.
 *
 * Il controllo è volutamente solo lato client: il backend non valida la data.
 */

/** Data odierna in formato YYYY-MM-DD nel fuso orario locale. */
export function oggiStr() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Converte una data YYYY-MM-DD nel formato italiano GG/MM/AAAA. */
export function formatDataIT(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}

/**
 * Intervallo selezionabile per la data di un ordine.
 *
 * - massimo: il minore fra la fine dell'anno associativo scelto e oggi
 *   (nessuna data futura, e per gli anni passati non si esce dall'anno);
 * - minimo: la data dell'ultima ricevuta emessa nell'anno se esiste — per non
 *   spezzare la cronologia della numerazione progressiva — altrimenti l'inizio
 *   dell'anno associativo.
 *
 * @param {number|null} anno anno associativo selezionato
 * @param {object} societa società corrente (per il tipo di anno associativo)
 * @param {string} lastPaymentDate data ultima ricevuta dell'anno (YYYY-MM-DD), opzionale
 * @returns {{min: string, max: string, minDaUltimaRicevuta: boolean}}
 */
export function getRangeDataOrdine(anno, societa, lastPaymentDate) {
    const today = oggiStr();
    if (anno == null) {
        return { min: lastPaymentDate || '', max: today, minDaUltimaRicevuta: !!lastPaymentDate };
    }
    const { start, end } = getAnnoDateRange(anno, societa);
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    return {
        min: lastPaymentDate || startStr,
        max: endStr < today ? endStr : today,
        minDaUltimaRicevuta: !!lastPaymentDate,
    };
}

/**
 * Valida la data di un ordine contro l'intervallo consentito.
 * @returns {{ok: boolean, error?: string}} messaggio pronto da mostrare all'utente
 */
export function validaDataOrdine(data, range) {
    const { min, max, minDaUltimaRicevuta } = range || {};
    if (!data) {
        return { ok: false, error: 'Indica la data del documento.' };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return { ok: false, error: 'La data del documento non è valida.' };
    }
    if (max && data > max) {
        return {
            ok: false,
            error: max === oggiStr()
                ? 'La data del documento non può essere futura.'
                : `La data del documento non può essere successiva al ${formatDataIT(max)}, fine dell'anno associativo selezionato.`,
        };
    }
    if (min && data < min) {
        return {
            ok: false,
            error: minDaUltimaRicevuta
                ? `La data del documento non può essere precedente al ${formatDataIT(min)}, data dell'ultimo ordine registrato nell'anno.`
                : `La data del documento non può essere precedente al ${formatDataIT(min)}, inizio dell'anno associativo selezionato.`,
        };
    }
    return { ok: true };
}
