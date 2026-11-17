// Nomi dei file (PDF salvati, titolo della pagina di stampa → nome proposto da
// "Salva come PDF") per i documenti intestati a un socio: sempre con prefisso
// "COGNOME NOME", così i file dello stesso socio stanno vicini in una cartella.

/** Rimuove i caratteri non ammessi nei nomi file (es. "/" nei numeri ricevuta). */
export const pulisciNomeFile = (s) => String(s ?? '')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * "COGNOME NOME" del socio; per i soci associazione senza nome/cognome la
 * ragione sociale; altrimenti il fallback (es. intestatario della ricevuta).
 */
export const cognomeNome = (socio, fallback = '') =>
    pulisciNomeFile([socio?.cognome, socio?.nome].filter(Boolean).join(' ') || socio?.ragione_sociale || fallback);

/** "COGNOME NOME - descrizione" (solo descrizione se il nominativo manca). */
export const nomeFileSocio = (socio, descrizione, fallback = '') => {
    const nominativo = cognomeNome(socio, fallback);
    const descr = pulisciNomeFile(descrizione);
    return nominativo ? `${nominativo} - ${descr}` : descr;
};

/** Descrizione di una ricevuta/proforma per il nome file: "Ricevuta 35-2025" o "Proforma 2026-11-17". */
export const descrizioneRicevuta = (p) => (p.tipo_documento === 'proforma'
    ? `Proforma ${p.data_ricevuta || p.data_pagamento || ''}`.trim()
    : `Ricevuta ${p.numero_ricevuta || p.id}`);
