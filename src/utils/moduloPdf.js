// Costruzione e generazione del PDF di un modulo (stampa "in bianco" da Modulistica.jsx
// oppure precompilata con i dati di un socio da SocioModal.jsx). Estratto per evitare che
// le due pagine divergano nel template HTML o nella configurazione di html2pdf (è già
// successo: un fix al problema dello spazio vuoto dopo la tabella anagrafica era stato
// applicato solo in una delle due copie).
import { formatDateIT } from './dateUtils';

const HTML2PDF_SCRIPT_ID = 'html2pdf-script';
const HTML2PDF_SCRIPT_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';

/** Inserisce lo script html2pdf nella pagina se non è già presente/in caricamento. */
export function ensureHtml2PdfScript() {
    if (typeof document === 'undefined') return;
    if (window.html2pdf || document.getElementById(HTML2PDF_SCRIPT_ID)) return;
    const script = document.createElement('script');
    script.id = HTML2PDF_SCRIPT_ID;
    script.src = HTML2PDF_SCRIPT_SRC;
    script.async = true;
    document.body.appendChild(script);
}

/** Converte un'immagine (es. il logo della società) in data URL base64, per evitare problemi CORS nel PDF. */
function loadImageAsBase64(url) {
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

function resolveLogoUrl(societa) {
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
        <div style="font-size: 11pt; line-height: 1.12; text-align: justify; margin-bottom: 60px;">
            ${modulo.htmlContent || modulo.testo || ''}
        </div>

        <!-- SIGNATURES -->
        <table class="pdf-no-break" style="width: 100%; margin-top: 50px; border: none;">
            <tr>
                <td style="width: 40%; vertical-align: bottom; font-size: 12pt;">
                    ${today}
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
 * Genera e scarica il PDF di un modulo, in bianco o precompilato con i dati di un socio.
 * @param {Object} p
 * @param {Object} p.modulo - { descrizione, htmlContent|testo }
 * @param {Object|null} p.societa
 * @param {string} p.dateToPrint - data ISO da mostrare come data di stampa
 * @param {Object|null} [p.socio] - dati del socio per precompilare la tabella anagrafica
 */
export async function generateModuloPdf({ modulo, societa, dateToPrint, socio = null }) {
    if (!window.html2pdf) {
        throw new Error('La libreria PDF sta caricando, riprova tra un secondo.');
    }

    const logoUrl = resolveLogoUrl(societa);
    let logoBase64 = null;
    if (logoUrl) {
        try {
            logoBase64 = await loadImageAsBase64(logoUrl);
        } catch (e) {
            console.error('Errore caricamento logo:', e);
        }
    }

    const today = formatDateIT(dateToPrint);
    const element = document.createElement('div');
    element.style.width = '100%';
    element.style.maxWidth = '800px';
    element.innerHTML = buildModuloHtml({ modulo, societa, logoBase64, today, socio });

    const filenameParts = [modulo.descrizione.replace(/[^a-z0-9]/gi, '_').toLowerCase()];
    if (socio) filenameParts.push(socio.cognome, socio.nome);
    const filename = `${filenameParts.filter(Boolean).join('_')}.pdf`;

    const opt = {
        margin: 0.5,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
        // Non usare 'avoid-all': forzerebbe l'intero blocco di testo del modulo
        // (che può essere lungo) a saltare per intero su pagina 2 se non entra
        // nello spazio residuo di pagina 1, lasciando la prima pagina quasi vuota.
        // Si evita lo spezzamento solo sugli elementi che devono restare integri.
        pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', 'img', '.pdf-table', '.pdf-no-break'] }
    };

    // html2pdf.js impagina in modo affidabile solo dopo che il layout si è assestato.
    await new Promise((resolve) => setTimeout(resolve, 500));
    return window.html2pdf().set(opt).from(element).save();
}
