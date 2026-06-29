// Costruzione del documento ricevuta/proforma (stampa + generazione PDF allegato).
// Estratto da Ordini.jsx per essere riusato sia per la stampa che per l'invio
// della ricevuta come allegato PDF nelle comunicazioni email.

const RICEVUTA_CSS = `
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; font-size: 12px; }
        .header { display: flex; align-items: center; justify-content: flex-end; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #333; }
        .header-logo { margin-right: 20px; }
        .header-logo img { max-height: 70px; }
        .header-info { text-align: right; }
        .header-info h2 { margin: 0 0 4px 0; font-size: 16px; }
        .header-info div { font-size: 12px; color: #444; }
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
        .info-table th { background: #f3f4f6; border: 1px solid #ccc; padding: 5px 8px; font-weight: bold; font-size: 10px; color: #555; text-align: left; }
        .info-table td { border: 1px solid #ccc; padding: 6px 8px; font-weight: bold; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .items-table th { border: 1px solid #ccc; padding: 8px 10px; background: #f3f4f6; text-align: left; font-size: 12px; }
        .items-table th:nth-child(2) { text-align: center; width: 50px; }
        .items-table th:nth-child(3), .items-table th:last-child { text-align: right; }
        .items-table td { border: 1px solid #ccc; padding: 8px 10px; font-size: 12px; }
        .items-table td:nth-child(2) { text-align: center; }
        .items-table td:nth-child(3), .items-table td:last-child { text-align: right; }
        .total-row td { font-weight: bold; border-top: 2px solid #333; }
        .footer-text { font-size: 10px; color: #555; margin-top: 20px; margin-bottom: 20px; }
        .bonifico-box { border: 1px solid #ccc; border-radius: 4px; padding: 12px 14px; margin-bottom: 20px; background: #fafafa; }
        .bonifico-title { font-size: 10px; font-weight: bold; color: #555; letter-spacing: 0.5px; margin-bottom: 8px; }
        .bonifico-content { font-size: 12px; color: #222; }
        .bonifico-content p { margin: 4px 0; }
        .bonifico-content ul, .bonifico-content ol { margin: 4px 0; padding-left: 20px; }
        .separator { letter-spacing: 2px; color: #999; margin: 20px 0; text-align: center; }
        .proforma-watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 130px; font-weight: 900; color: rgba(180, 0, 0, 0.13); pointer-events: none; z-index: 9999; white-space: nowrap; letter-spacing: 8px; user-select: none; }
        @media print { body { padding: 0; } .proforma-watermark { position: fixed; color: rgba(180, 0, 0, 0.13); } }
        @page { margin: 10mm; }
`;

/**
 * Raccoglie i dati e costruisce il corpo HTML della ricevuta/proforma.
 * @param {Object} p - record pagamento
 * @param {Object} opts
 * @param {Object|null} opts.societa - società (per logo/footer/anagrafica)
 * @param {Array} [opts.products] - elenco prodotti (per descrizioni voci)
 * @returns {Promise<{ css: string, body: string, title: string, importoFormatted: string, isProforma: boolean }>}
 */
export async function buildRicevutaDocument(p, { societa = null, products = [] } = {}) {
    const token = localStorage.getItem('token');
    const statoLabel = p.stato_pagamento?.startsWith('3.') ? 'ANNULLATO' : 'VALIDO';
    const isProforma = p.tipo_documento === 'proforma';

    const modalitaMap = {
        'Contanti': 'CONTANTI',
        'POS': 'CARTA/BANCOMAT',
        'Bonifico': 'BONIFICO',
        'Assegno': 'ASSEGNO',
        'Online': 'ONLINE',
        'Carta/Bancomat': 'CARTA/BANCOMAT',
    };
    const modalitaLabel = modalitaMap[p.modalita_pagamento] || (p.modalita_pagamento?.toUpperCase() || '');

    // Carica tutti gli item della stessa ricevuta (stesso numero_ricevuta)
    let allItems = [p];
    if (p.numero_ricevuta) {
        try {
            const sibRes = await fetch(
                `/payments/api?societa_id=${p.societa_id}&numero_ricevuta=${encodeURIComponent(p.numero_ricevuta)}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (sibRes.ok) {
                const siblings = await sibRes.json();
                if (siblings.length > 0) allItems = siblings;
            }
        } catch (e) {
            console.error('Errore recupero items ricevuta:', e);
        }
    }

    // Costruisce le righe della ricevuta:
    // NOTA: il backend rimuove 'quote' dagli item prima di salvare → usa product lookup + top-level pmt.quote
    const stripQuoteSuffix = s => (s || '').replace(/\s*\(x\d+\)\s*€[\d,.]+(\s*\[.*?\]|\s*\(Scadenza[^)]*\))?/, '').trim();
    let lineItems; // array di { descrizione, qty, unitPrice, subtotale }
    const piSource = allItems.find(i => {
        const pi = i.payment_items;
        if (!pi) return false;
        const arr = Array.isArray(pi) ? pi : (() => { try { return JSON.parse(pi); } catch { return null; } })();
        return Array.isArray(arr) && arr.length > 0;
    });
    if (piSource) {
        const arr = Array.isArray(piSource.payment_items)
            ? piSource.payment_items
            : JSON.parse(piSource.payment_items);
        const topParts = (piSource.quote || '').split(/\s+\+\s+/).map(s => s.trim()).filter(Boolean);
        lineItems = arr.map((pi, idx) => {
            const topPart = topParts[idx] || '';
            const qtyMatch = topPart.match(/\(x(\d+)\)/);
            const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
            const subtotale = Math.abs(parseFloat(pi.importo || 0));
            const unitPrice = qty > 0 ? subtotale / qty : subtotale;
            const fromProduct = (pi.product_id && products.length)
                ? (products.find(pr => Number(pr.id) === Number(pi.product_id))?.description || null)
                : null;
            const descrizione = fromProduct || stripQuoteSuffix(topPart) || `Voce ${idx + 1}`;
            return { descrizione, qty, unitPrice, subtotale };
        });
    } else {
        const primaryItem = allItems[0] || p;
        const rawQuote = primaryItem.quote || '';
        const parts = rawQuote.split(/\s+\+\s+/).map(s => s.trim()).filter(Boolean);
        const totalSplit = Math.abs(parseFloat(primaryItem.importo || 0));
        if (parts.length <= 1) {
            lineItems = [{ descrizione: stripQuoteSuffix(rawQuote) || rawQuote, qty: 1, unitPrice: totalSplit, subtotale: totalSplit }];
        } else {
            lineItems = parts.map(d => ({ descrizione: stripQuoteSuffix(d), qty: null, unitPrice: null, subtotale: null }));
        }
    }

    const totalAmount = lineItems.reduce((acc, li) => acc + (li.subtotale ?? 0), 0) ||
        Math.abs(parseFloat((allItems[0] || p).importo || 0));
    const importoFormatted = totalAmount.toFixed(2).replace('.', ',');

    const quoteRows = lineItems.map(li => `
            <tr>
                <td>${li.descrizione}</td>
                <td style="text-align:center">${li.qty !== null ? li.qty : '—'}</td>
                <td style="text-align:right">${li.unitPrice !== null ? li.unitPrice.toFixed(2).replace('.', ',') : '—'}</td>
                <td style="text-align:right">${li.subtotale !== null ? li.subtotale.toFixed(2).replace('.', ',') : '—'}</td>
            </tr>
        `).join('');

    const logoUrl = societa?.logo_path ? `/users/${societa.logo_path}` : null;
    const footerText = societa?.receipt_footer_text || societa?.footer_text ||
        'Fuori campo iva art.4 dpr 633/72 - Esente imposte art.148 TUIR -<br/>Esente bollo L 30/12/2018 n. 145 art.1 c.646';
    const societaAddress = [societa?.indirizzo, societa?.comune].filter(Boolean).join(' - ');

    let datiPagatore = p.codice_fiscale_genitore || '';
    let indirizzoSocio = '';
    let codiceFiscaleSocio = '';
    if (p.socio_id) {
        try {
            const socioRes = await fetch(`/users/api/soci/${p.socio_id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (socioRes.ok) {
                const socio = await socioRes.json();
                indirizzoSocio = [socio.indirizzo, socio.cap, socio.comune].filter(Boolean).join(' - ');
                codiceFiscaleSocio = socio.codice_fiscale || '';
                if (socio.data_nascita && (socio.nome_genitore || socio.cognome_genitore || socio.cf_genitore)) {
                    const dataRif = new Date(p.data_pagamento || p.data_ricevuta || new Date());
                    const nascita = new Date(socio.data_nascita);
                    let eta = dataRif.getFullYear() - nascita.getFullYear();
                    const mDiff = dataRif.getMonth() - nascita.getMonth();
                    if (mDiff < 0 || (mDiff === 0 && dataRif.getDate() < nascita.getDate())) eta--;
                    if (eta < 18) {
                        const nomeGenitore = [socio.cognome_genitore, socio.nome_genitore].filter(Boolean).join(' ');
                        const cfGenitore = socio.cf_genitore || p.codice_fiscale_genitore || '';
                        datiPagatore = [nomeGenitore, cfGenitore].filter(Boolean).join(' - ');
                    }
                }
            }
        } catch (e) {
            console.error('Errore recupero dati socio per stampa:', e);
        }
    }

    // NB: le istruzioni di pagamento (bonifico) NON vanno incluse nella ricevuta.
    // Restano disponibili nel testo dell'email tramite lo shortcode {{ISTRUZIONI}}.

    const body = `
    ${isProforma ? '<div class="proforma-watermark">PROFORMA</div>' : ''}
    <div class="header">
        ${logoUrl ? `<div class="header-logo"><img src="${logoUrl}" alt="Logo" /></div>` : ''}
        <div class="header-info">
            <h2>${societa?.denominazione || ''}</h2>
            <div>${societaAddress}</div>
            <div>CF: ${societa?.codice_fiscale || ''}</div>
        </div>
    </div>

    <table class="info-table">
        <tr>
            <th>TIPO DOCUMENTO</th>
            <th>NUMERO DOCUMENTO</th>
            <th>DATA DOCUMENTO</th>
            <th>STATO DOCUMENTO</th>
        </tr>
        <tr>
            <td>${isProforma ? 'PROFORMA' : 'RICEVUTA'}</td>
            <td>${isProforma ? '' : (p.numero_ricevuta || '')}</td>
            <td>${(p.data_ricevuta || p.data_pagamento || '') ? new Date(p.data_ricevuta || p.data_pagamento).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}</td>
            <td>${statoLabel}</td>
        </tr>
        <tr>
            <th colspan="2">INTESTATARIO</th>
            <th>CODICE FISCALE / PARTITA IVA INTESTATARIO</th>
            <th>MODALITA' PAGAMENTO</th>
        </tr>
        <tr>
            <td colspan="2">${(p.intestatario || '').toUpperCase()}</td>
            <td>${p.codice_fiscale || codiceFiscaleSocio || p.partita_iva || ''}</td>
            <td>${modalitaLabel}</td>
        </tr>
        <tr>
            <th colspan="2">INDIRIZZO</th>
            <th colspan="2">DATI DI CHI HA EFFETTUATO IL PAGAMENTO</th>
        </tr>
        <tr>
            <td colspan="2">${indirizzoSocio}</td>
            <td colspan="2">${datiPagatore}</td>
        </tr>
        <tr><th colspan="4">NOTE</th></tr>
        <tr><td colspan="4">${p.note || ''}</td></tr>
    </table>

    <table class="items-table">
        <tr>
            <th>Descrizione</th>
            <th>Qtà</th>
            <th>Costo unitario</th>
            <th>Subtotale</th>
        </tr>
        ${quoteRows}
        <tr class="total-row">
            <td colspan="3">TOTALE</td>
            <td>${importoFormatted}</td>
        </tr>
    </table>
    <div class="footer-text">${footerText}</div>
    <div class="separator">_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _</div>`;

    return {
        css: RICEVUTA_CSS,
        body,
        title: `Ricevuta ${p.numero_ricevuta || p.id}`,
        importoFormatted,
        isProforma,
    };
}

/** Costruisce il documento HTML completo (per apertura finestra di stampa). */
export async function buildRicevutaHtml(p, { societa, products, autoPrint = false } = {}) {
    const { css, body, title } = await buildRicevutaDocument(p, { societa, products });
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>${css}</style>
</head>
<body>${body}
    ${autoPrint ? '<script>window.onload = function() { window.print(); }</script>' : ''}
</body>
</html>`;
}

/**
 * Attende che tutte le immagini (es. logo) del container siano caricate.
 * html2canvas non aspetta il load delle immagini: senza questa attesa il logo
 * può risultare mancante nel PDF. Timeout di sicurezza per non bloccare l'invio.
 * @param {HTMLElement} el
 * @param {number} timeoutMs
 */
function waitForImages(el, timeoutMs = 3000) {
    const imgs = Array.from(el.querySelectorAll('img'));
    if (imgs.length === 0) return Promise.resolve();
    const loaders = imgs.map(img => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise(resolve => {
            img.addEventListener('load', resolve, { once: true });
            img.addEventListener('error', resolve, { once: true });
        });
    });
    return Promise.race([
        Promise.all(loaders),
        new Promise(resolve => setTimeout(resolve, timeoutMs)),
    ]);
}

/**
 * Genera la ricevuta come PDF e ritorna il contenuto in base64 (senza prefisso data URI).
 * Usa html2pdf.js renderizzando il documento in un container nascosto ma catturabile.
 * @returns {Promise<string>} base64 del PDF
 */
export async function generateRicevutaPdfBase64(p, { societa, products } = {}) {
    const { css, body } = await buildRicevutaDocument(p, { societa, products });
    const html2pdf = (await import('html2pdf.js')).default;

    // Il container va renderizzato in posizione catturabile da html2canvas.
    // Con top:-9999px html2canvas cattura l'area (0,0) e produce una pagina bianca.
    // Lo posizioniamo quindi a (0,0) ma dietro l'app (z-index negativo) così non è
    // visibile all'utente, mentre html2canvas legge direttamente il nodo DOM.
    const PDF_WIDTH = 794; // ≈ A4 a 96dpi
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `position:fixed;top:0;left:0;width:${PDF_WIDTH}px;background:#ffffff;z-index:-9999;pointer-events:none;`;
    // Il CSS della ricevuta usa la regola `body { ... padding: 20px }`: iniettata così
    // com'è inquinerebbe il <body> reale e il clone di html2canvas, spostando il
    // contenuto e tagliandolo sul margine sinistro. La rendiamo quindi locale al
    // wrapper, sostituendo il selettore `body` con `.ricevuta-root`.
    const scopedCss = css.replace(/\bbody\b/g, '.ricevuta-root');
    wrapper.innerHTML = `<style>${scopedCss}</style><div class="ricevuta-root">${body}</div>`;
    document.body.appendChild(wrapper);

    await waitForImages(wrapper);

    try {
        // Misura le dimensioni reali del contenuto DOPO il layout/caricamento immagini.
        // Passandole esplicitamente a html2canvas (width/height + windowWidth/windowHeight)
        // la cattura non dipende più dalla posizione del wrapper nel viewport: senza queste
        // dimensioni un wrapper fuori flusso (z-index negativo) veniva catturato come pagina
        // bianca, generando un PDF "vuoto" di ~3kb.
        const captureWidth = wrapper.scrollWidth || PDF_WIDTH;
        const captureHeight = wrapper.scrollHeight || wrapper.offsetHeight || 1123;

        const dataUri = await html2pdf()
            .set({
                margin: [10, 10, 10, 10],
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    scrollX: 0,
                    scrollY: 0,
                    x: 0,
                    y: 0,
                    width: captureWidth,
                    height: captureHeight,
                    windowWidth: captureWidth,
                    windowHeight: captureHeight,
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['css', 'legacy'] },
            })
            .from(wrapper)
            .outputPdf('datauristring');
        // dataUri = "data:application/pdf;base64,...."
        return dataUri.split(',')[1] || '';
    } finally {
        document.body.removeChild(wrapper);
    }
}
