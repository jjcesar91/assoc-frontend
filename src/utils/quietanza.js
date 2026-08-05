// Gestione della quietanza: il file che il socio carica come prova di aver
// effettuato un pagamento (es. bonifico) per una ricevuta.
// Estratto da utils/ricevuta.js, di cui condivide l'endpoint backend
// (che resta nominato "ricevuta" lato API, invariato).

/**
 * Scarica/apre la quietanza di pagamento caricata dal socio per una ricevuta.
 * Usa l'endpoint autenticato del payments-service e apre il file in una nuova scheda.
 * @param {number|string} paymentId
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function openQuietanzaCaricata(paymentId) {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/payments/api/${paymentId}/ricevuta-file`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
            return { ok: false, error: res.status === 404 ? 'Quietanza non disponibile' : 'Impossibile aprire la quietanza' };
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        // Rilascia l'oggetto URL dopo un breve intervallo (la scheda ha già caricato il blob).
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        return { ok: true };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}
