// Costruzione dell'HTML del modulo (stampa "in bianco" da Modulistica.jsx, precompilata
// con i dati di un socio da SocioModal.jsx, o dalla pagina pubblica RicevutaTelematica.jsx)
// per l'anteprima + stampa via window.print(). Estratto per evitare che le varie pagine
// divergano nel template HTML (è già successo: un fix al problema dello spazio vuoto dopo
// la tabella anagrafica era stato applicato solo in una delle due copie).
import { formatDateIT } from './dateUtils';

/** Converte un'immagine (es. il logo della società) in data URL base64, per evitare problemi CORS nel PDF. */
export function loadImageAsBase64(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = url;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
    });
}

export function resolveLogoUrl(societa) {
    if (!societa || !societa.logo_path) return '';
    const { logo_path } = societa;
    if (logo_path.startsWith('http') || logo_path.startsWith('blob:') || logo_path.startsWith('data:')) {
        return logo_path;
    }
    return `/users/${logo_path.startsWith('/') ? logo_path.slice(1) : logo_path}`;
}

/**
 * Costruisce l'HTML del modulo pronto per html2pdf.
 * @param {Object} p
 * @param {Object} p.modulo - { descrizione, htmlContent|testo }
 * @param {Object|null} p.societa - società (logo/denominazione/indirizzo/footer)
 * @param {string|null} p.logoBase64
 * @param {string} p.today - data già formattata (gg/mm/aaaa)
 * @param {Object|null} [p.socio] - se presente, precompila la tabella anagrafica con i suoi dati
 */
export function buildModuloHtml({ modulo, societa, logoBase64 = null, today, socio = null }) {
    const denomination = societa ? societa.denominazione : 'Nome Società';
    const address = societa ? `${societa.indirizzo || ''} ${societa.cap || ''} ${societa.comune || ''} ${societa.provincia ? '(' + societa.provincia + ')' : ''}` : '';
    const cfInfo = societa ? `CF: ${societa.codice_fiscale || ''}${societa.partita_iva ? ' - P.IVA: ' + societa.partita_iva : ''}` : '';
    const footerText = societa ? (societa.footer_text || '') : '';

    const luogoData = societa?.comune ? `${societa.comune}, ${today}` : today;

    const birthDateDisplay = socio?.data_nascita
        ? (formatDateIT(socio.data_nascita) || socio.data_nascita)
        : '';
    const residenza = socio ? `${socio.indirizzo || ''} ${socio.cap || ''} ${socio.comune || ''}`.trim() : '';

    return `
    <div style="padding: 20px; font-family: 'Helvetica', 'Arial', sans-serif; color: #000; background: white;">

        <!-- HEADER -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; margin-bottom: 20px; padding-bottom: 15px;">
            <div style="flex: 0 0 150px; height: 100px; display: flex; align-items: center; justify-content: flex-start;">
                ${logoBase64 ? `<img src="${logoBase64}" style="max-height: 100px; max-width: 150px; object-fit: contain;" />` : ''}
            </div>
            <div style="flex: 1; text-align: right; padding-left: 20px;">
                <h3 style="margin: 0; font-size: 16pt; font-weight: bold; line-height: 1.2;">${denomination}</h3>
                <div style="font-size: 10pt; margin-top: 5px; line-height: 1.3;">${address}</div>
                <div style="font-size: 10pt; margin-top: 2px;">${cfInfo}</div>
            </div>
        </div>

        <!-- TITLE -->
        <h1 style="text-align: center; font-size: 20pt; font-weight: bold; margin: 0 0 30px 0; text-transform: uppercase;">${modulo.descrizione}</h1>

        <!-- MEMBER TABLE -->
        <style>
            .pdf-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 8pt; }
            .pdf-table td { border: 1px solid #000; padding: 6.4px; vertical-align: top; }
            .pdf-label { font-size: 6.4pt; text-transform: uppercase; color: #000; margin-bottom: 3.2px; font-weight: bold; }
            .pdf-value { min-height: 14.4px; font-weight: 500; }
        </style>
        <table class="pdf-table">
            <tr>
                <td style="width: 25%;">
                    <div class="pdf-label">COGNOME</div>
                    <div class="pdf-value">${socio?.cognome || ''}</div>
                </td>
                <td style="width: 25%;">
                    <div class="pdf-label">NOME</div>
                    <div class="pdf-value">${socio?.nome || ''}</div>
                </td>
                <td style="width: 25%;">
                    <div class="pdf-label">DATA DI NASCITA</div>
                    <div class="pdf-value">${birthDateDisplay}</div>
                </td>
                <td style="width: 25%;">
                    <div class="pdf-label">LUOGO DI NASCITA</div>
                    <div class="pdf-value">${socio?.luogo_nascita || ''}</div>
                </td>
            </tr>
            <tr>
                 <td colspan="2">
                    <div class="pdf-label">CODICE FISCALE</div>
                    <div class="pdf-value">${socio?.codice_fiscale || ''}</div>
                </td>
                 <td>
                    <div class="pdf-label">TELEFONO</div>
                    <div class="pdf-value">${socio?.telefono || ''}</div>
                </td>
                <td>
                    <div class="pdf-label">EMAIL</div>
                    <div class="pdf-value">${socio?.email || ''}</div>
                </td>
            </tr>
            <tr>
                <td colspan="4">
                    <div class="pdf-label">INDIRIZZO RESIDENZA</div>
                    <div class="pdf-value">${residenza}</div>
                </td>
            </tr>
        </table>

        <!-- BODY CONTENT -->
        <div class="pdf-body-content" style="font-size: 11pt; line-height: 1.12; text-align: justify; margin-bottom: 60px;">
            ${modulo.htmlContent || modulo.testo || ''}
        </div>

        <!-- SIGNATURES -->
        <table class="pdf-no-break" style="width: 100%; margin-top: 50px; border: none;">
            <tr>
                <td style="width: 40%; vertical-align: bottom; font-size: 12pt;">
                    ${luogoData}
                </td>
                <td style="width: 20%;"></td>
                <td style="width: 40%; text-align: center; vertical-align: bottom;">
                    <div style="font-size: 12pt; margin-bottom: 40px; text-align: left;">Firma</div>
                    <div style="border-bottom: 1px solid #000; height: 1px;"></div>
                </td>
            </tr>
        </table>

        ${footerText ? `
        <!-- FOOTER -->
        <div style="margin-top: 40px; padding-top: 10px; border-top: 1px solid #000; font-size: 8pt; color: #555; text-align: center; line-height: 1.4;">
            ${footerText}
        </div>` : ''}
    </div>
    `;
}

/**
 * Costruisce il documento HTML completo (non solo il frammento di buildModuloHtml)
 * pronto per essere scritto in una finestra e stampato da browser — stesso schema
 * di buildRicevutaHtml() in utils/ricevuta.js. Usato dalla pagina pubblica
 * /ricevuta-telematica/:societaId, che riusa buildModuloHtml così da non far
 * divergere ancora una volta il template del modulo tra le varie pagine che lo stampano.
 * @param {Object} p
 * @param {Object} p.modulo
 * @param {Object|null} p.societa
 * @param {string|null} [p.logoBase64]
 * @param {string} p.today - data ISO da mostrare come data di compilazione
 * @param {Object|null} [p.socio]
 * @param {boolean} [p.autoPrint=true]
 */
export function buildModuloPrintHtml({ modulo, societa, logoBase64 = null, today, socio = null, autoPrint = true }) {
    const todayFormatted = formatDateIT(today);
    const body = buildModuloHtml({ modulo, societa, logoBase64, today: todayFormatted, socio });

    return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8" />
<title>${modulo.descrizione || 'Modulo'}</title>
<style>
  @page { size: A4; margin: 0; }
  body { margin: 0; }
</style>
</head>
<body>
${body}
${autoPrint ? '<script>window.onload = () => window.print();</script>' : ''}
</body>
</html>`;
}
