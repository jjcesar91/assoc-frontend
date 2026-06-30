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

    const dataDocumento = (p.data_ricevuta || p.data_pagamento)
        ? new Date(p.data_ricevuta || p.data_pagamento).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '';

    return {
        css: RICEVUTA_CSS,
        body,
        title: `Ricevuta ${p.numero_ricevuta || p.id}`,
        importoFormatted,
        isProforma,
        // Dati strutturati per la generazione del PDF vettoriale (pdfmake),
        // indipendente dal rendering HTML/canvas.
        data: {
            societa: {
                denominazione: societa?.denominazione || '',
                address: societaAddress,
                codiceFiscale: societa?.codice_fiscale || '',
                logoUrl,
            },
            tipoDocumento: isProforma ? 'PROFORMA' : 'RICEVUTA',
            numeroDocumento: isProforma ? '' : (p.numero_ricevuta || ''),
            dataDocumento,
            statoLabel,
            intestatario: (p.intestatario || '').toUpperCase(),
            codiceFiscaleIntestatario: p.codice_fiscale || codiceFiscaleSocio || p.partita_iva || '',
            modalitaLabel,
            indirizzo: indirizzoSocio,
            datiPagatore,
            note: p.note || '',
            lineItems,
            importoFormatted,
            footerText,
        },
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

/** Scarica un'immagine e la converte in data URL base64 (per pdfmake). */
async function fetchImageAsDataUrl(url) {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (!res.ok) return null;
        const blob = await res.blob();
        return await new Promise((resolve) => {
            const fr = new FileReader();
            fr.onloadend = () => resolve(typeof fr.result === 'string' ? fr.result : null);
            fr.onerror = () => resolve(null);
            fr.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

let _pdfMakePromise = null;
async function getPdfMake() {
    if (_pdfMakePromise) return _pdfMakePromise;
    _pdfMakePromise = (async () => {
        const pdfMakeMod = await import('pdfmake/build/pdfmake');
        const vfsMod = await import('pdfmake/build/vfs_fonts');
        const pdfMake = pdfMakeMod.default || pdfMakeMod;
        const vfs = vfsMod.vfs || vfsMod.default?.vfs || vfsMod.default || (vfsMod.pdfMake && vfsMod.pdfMake.vfs);
        // In pdfmake 0.3 i font vanno registrati nel virtual file system tramite
        // addVirtualFileSystem(); impostare `pdfMake.vfs` non ha alcun effetto e
        // getBase64 resterebbe appeso non trovando il font Roboto. I font di default
        // (Roboto) sono già configurati nel costruttore del singleton.
        if (vfs && typeof pdfMake.addVirtualFileSystem === 'function') {
            pdfMake.addVirtualFileSystem(vfs);
        } else if (vfs) {
            pdfMake.vfs = vfs; // fallback per pdfmake 0.2.x
        }
        return pdfMake;
    })();
    return _pdfMakePromise;
}

const GREY_HEADER = '#f3f4f6';
const BORDER = '#cccccc';

/**
 * Genera la ricevuta come PDF (vettoriale, via pdfmake) e ne ritorna il contenuto
 * in base64 (senza prefisso data URI).
 *
 * Scelta architetturale: pdfmake costruisce il PDF direttamente dai dati, senza
 * rasterizzare il DOM (niente html2canvas). Elimina così alla radice i problemi
 * di pagina bianca / margini tagliati che affliggevano l'approccio basato su
 * screenshot del DOM, e produce testo nitido e file più leggeri.
 * @returns {Promise<string>} base64 del PDF
 */
export async function generateRicevutaPdfBase64(p, { societa, products } = {}) {
    const { data } = await buildRicevutaDocument(p, { societa, products });
    const pdfMake = await getPdfMake();

    // Logo (solo PNG/JPEG: pdfmake non gestisce SVG come immagine raster).
    let logoImage = null;
    if (data.societa.logoUrl) {
        const dataUrl = await fetchImageAsDataUrl(data.societa.logoUrl);
        if (dataUrl && /^data:image\/(png|jpe?g);/i.test(dataUrl)) logoImage = dataUrl;
    }

    const headerCell = (text) => ({ text, style: 'th', fillColor: GREY_HEADER });
    const valueCell = (text, extra = {}) => ({ text: text || '', style: 'td', ...extra });
    const footerPlain = (data.footerText || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');

    const docDefinition = {
        pageSize: 'A4',
        pageMargins: [40, 36, 40, 40],
        defaultStyle: { fontSize: 9, color: '#000000' },
        styles: {
            th: { fontSize: 7.5, bold: true, color: '#555555' },
            td: { fontSize: 9, bold: true },
            itemTh: { fontSize: 9, bold: true, fillColor: GREY_HEADER },
        },
        content: [
            {
                columns: [
                    logoImage
                        ? { image: logoImage, fit: [150, 64], width: 160 }
                        : { text: '', width: 160 },
                    {
                        width: '*',
                        stack: [
                            { text: data.societa.denominazione, bold: true, fontSize: 13, alignment: 'right' },
                            { text: data.societa.address, fontSize: 9, color: '#444444', alignment: 'right', margin: [0, 2, 0, 0] },
                            { text: `CF: ${data.societa.codiceFiscale}`, fontSize: 9, color: '#444444', alignment: 'right' },
                        ],
                    },
                ],
            },
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: '#333333' }], margin: [0, 10, 0, 16] },
            {
                table: {
                    // Colonne in star ('*'): come la items-table, pdfmake le adatta alla
                    // larghezza utile della pagina INCLUDENDO padding e bordi delle celle.
                    // Con larghezze assolute, invece, padding+bordi si sommano e la tabella
                    // andava in overflow a destra.
                    widths: ['*', '*', '*', '*'],
                    body: [
                        [headerCell('TIPO DOCUMENTO'), headerCell('NUMERO DOCUMENTO'), headerCell('DATA DOCUMENTO'), headerCell('STATO DOCUMENTO')],
                        [valueCell(data.tipoDocumento), valueCell(data.numeroDocumento), valueCell(data.dataDocumento), valueCell(data.statoLabel)],
                        [{ ...headerCell('INTESTATARIO'), colSpan: 2 }, {}, headerCell('CODICE FISCALE / PARTITA IVA INTESTATARIO'), headerCell("MODALITA' PAGAMENTO")],
                        [{ ...valueCell(data.intestatario), colSpan: 2 }, {}, valueCell(data.codiceFiscaleIntestatario), valueCell(data.modalitaLabel)],
                        [{ ...headerCell('INDIRIZZO'), colSpan: 2 }, {}, { ...headerCell('DATI DI CHI HA EFFETTUATO IL PAGAMENTO'), colSpan: 2 }, {}],
                        [{ ...valueCell(data.indirizzo), colSpan: 2 }, {}, { ...valueCell(data.datiPagatore), colSpan: 2 }, {}],
                        [{ ...headerCell('NOTE'), colSpan: 4 }, {}, {}, {}],
                        [{ ...valueCell(data.note), colSpan: 4 }, {}, {}, {}],
                    ],
                },
                layout: {
                    hLineWidth: () => 0.5,
                    vLineWidth: () => 0.5,
                    hLineColor: () => BORDER,
                    vLineColor: () => BORDER,
                    paddingTop: () => 4,
                    paddingBottom: () => 4,
                    paddingLeft: () => 6,
                    paddingRight: () => 6,
                },
                margin: [0, 0, 0, 16],
            },
            {
                table: {
                    headerRows: 1,
                    widths: ['*', 'auto', 'auto', 'auto'],
                    body: [
                        [
                            { text: 'Descrizione', style: 'itemTh' },
                            { text: 'Qtà', style: 'itemTh', alignment: 'center' },
                            { text: 'Costo unitario', style: 'itemTh', alignment: 'right' },
                            { text: 'Subtotale', style: 'itemTh', alignment: 'right' },
                        ],
                        ...data.lineItems.map((li) => [
                            { text: li.descrizione || '', fontSize: 9 },
                            { text: li.qty !== null && li.qty !== undefined ? String(li.qty) : '—', fontSize: 9, alignment: 'center' },
                            { text: li.unitPrice !== null && li.unitPrice !== undefined ? li.unitPrice.toFixed(2).replace('.', ',') : '—', fontSize: 9, alignment: 'right' },
                            { text: li.subtotale !== null && li.subtotale !== undefined ? li.subtotale.toFixed(2).replace('.', ',') : '—', fontSize: 9, alignment: 'right' },
                        ]),
                        [
                            { text: 'TOTALE', bold: true, colSpan: 3, margin: [0, 2, 0, 2] }, {}, {},
                            { text: data.importoFormatted, bold: true, alignment: 'right', margin: [0, 2, 0, 2] },
                        ],
                    ],
                },
                layout: {
                    hLineWidth: (i, node) => (i === node.table.body.length - 1 || i === node.table.body.length ? 1.2 : 0.5),
                    vLineWidth: () => 0.5,
                    hLineColor: () => BORDER,
                    vLineColor: () => BORDER,
                    paddingTop: () => 6,
                    paddingBottom: () => 6,
                    paddingLeft: () => 8,
                    paddingRight: () => 8,
                },
            },
            { text: footerPlain, fontSize: 7.5, color: '#555555', margin: [0, 18, 0, 14] },
            { text: '_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _', color: '#999999', alignment: 'center' },
        ],
    };

    // pdfmake 0.3: getBase64() è async e ritorna una Promise<string> (NON usa callback,
    // come invece faceva la 0.2). Ritorna il base64 senza prefisso data URI.
    const pdf = pdfMake.createPdf(docDefinition);
    const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout generazione PDF ricevuta')), 20000)
    );
    const b64 = await Promise.race([pdf.getBase64(), timeout]);
    return b64 || '';
}

/**
 * Scarica/apre la ricevuta di pagamento caricata dal socio per un ordine.
 * Usa l'endpoint autenticato del payments-service e apre il file in una nuova scheda.
 * @param {number|string} paymentId
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function openRicevutaCaricata(paymentId) {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/payments/api/${paymentId}/ricevuta-file`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
            return { ok: false, error: res.status === 404 ? 'Ricevuta non disponibile' : 'Impossibile aprire la ricevuta' };
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
