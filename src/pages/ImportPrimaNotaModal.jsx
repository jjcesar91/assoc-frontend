import React, { useState, useMemo, useRef } from 'react';
import { X, Upload, ChevronRight, ChevronLeft, Check, AlertTriangle, Info } from 'lucide-react';

// ---------------------------------------------------------------------------
// Lazy-load xlsx from CDN (bypasses Vite module resolution — works even when
// the package is not installed in the container's node_modules)
// ---------------------------------------------------------------------------
let _xlsxPromise = null;
function loadXlsxFromCdn() {
    if (_xlsxPromise) return _xlsxPromise;
    _xlsxPromise = new Promise((resolve, reject) => {
        if (window.XLSX) { resolve(window.XLSX); return; }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        script.onload = () => resolve(window.XLSX);
        script.onerror = () => { _xlsxPromise = null; reject(new Error('Impossibile caricare la libreria XLSX. Verificare la connessione.')); };
        document.head.appendChild(script);
    });
    return _xlsxPromise;
}

// ---------------------------------------------------------------------------
// Shared: normalise a list of header+data objects into our row format
// ---------------------------------------------------------------------------
const EXPECTED_HEADERS = ['DESCRIZIONE', 'INTESTATARIO', 'DESC_OPERAZIONE', 'DESC_CONTO', 'IMPORTO', 'DATA_OPERAZIONE', 'MODALITA DI PAGAMENTO', 'FORNITORE', 'NOTE'];

function normaliseRows(rawRows) {
    const rows = rawRows.filter(r => r['DATA_OPERAZIONE'] && r['IMPORTO']);
    if (rows.length === 0) return { error: 'Nessuna riga con data e importo trovata nel file.' };
    return { rows };
}

// ---------------------------------------------------------------------------
// CSV parsing
// ---------------------------------------------------------------------------
function parseCsv(text) {
    const rawLines = text.split(/\r?\n/);
    // Find header line (skip "Tabella 1" etc.)
    const headerIdx = rawLines.findIndex(
        l => l.includes('DESCRIZIONE') && l.includes('IMPORTO') && l.includes('DATA_OPERAZIONE')
    );
    if (headerIdx < 0) return { error: 'Intestazione CSV non trovata. Verificare che il file contenga la riga header.' };

    const sep = ';';
    const headers = rawLines[headerIdx].split(sep).map(h => h.trim().replace(/^"|"$/g, ''));

    const rawRows = [];
    for (let i = headerIdx + 1; i < rawLines.length; i++) {
        const line = rawLines[i].trim();
        if (!line) continue;
        const cols = line.split(sep);
        if (cols.length < 5) continue;
        const obj = {};
        headers.forEach((h, j) => {
            obj[h] = (cols[j] || '').trim().replace(/^"|"$/g, '');
        });
        rawRows.push(obj);
    }
    return normaliseRows(rawRows);
}

// ---------------------------------------------------------------------------
// XLSX parsing (SheetJS loaded from CDN)
// ---------------------------------------------------------------------------
async function parseXlsx(file) {
    let XLSX;
    try {
        XLSX = await loadXlsxFromCdn();
    } catch (e) {
        return { error: e.message };
    }
    const buffer = await file.arrayBuffer();
    let workbook;
    try {
        workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    } catch {
        return { error: 'Impossibile leggere il file XLSX.' };
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Try to find header row (scan first 20 rows)
    const ref = sheet['!ref'];
    if (!ref) return { error: 'Foglio vuoto.' };
    const range = XLSX.utils.decode_range(ref);
    let headerRow = -1;
    for (let r = range.s.r; r <= Math.min(range.e.r, range.s.r + 20); r++) {
        const cellDesc = sheet[XLSX.utils.encode_cell({ r, c: range.s.c })];
        if (cellDesc && String(cellDesc.v).toUpperCase().includes('DESCRIZIONE')) {
            headerRow = r;
            break;
        }
    }
    if (headerRow < 0) return { error: 'Intestazione non trovata nel foglio XLSX.' };

    // Read headers
    const headers = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = sheet[XLSX.utils.encode_cell({ r: headerRow, c })];
        headers.push(cell ? String(cell.v).trim() : '');
    }

    // Read data rows
    const rawRows = [];
    for (let r = headerRow + 1; r <= range.e.r; r++) {
        const obj = {};
        headers.forEach((h, j) => {
            const cell = sheet[XLSX.utils.encode_cell({ r, c: range.s.c + j })];
            if (!cell) { obj[h] = ''; return; }
            // Format dates as DD/MM/YYYY
            if (cell.t === 'd' || (cell.t === 'n' && cell.z && cell.z.includes('/'))) {
                const d = cell.t === 'd' ? cell.v : XLSX.SSF.parse_date_code(cell.v);
                if (d instanceof Date) {
                    const dd = String(d.getDate()).padStart(2, '0');
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    obj[h] = `${dd}/${mm}/${d.getFullYear()}`;
                    return;
                }
            }
            obj[h] = cell.v != null ? String(cell.v).trim() : '';
        });
        rawRows.push(obj);
    }
    return normaliseRows(rawRows);
}

function parseImporto(s) {
    if (!s) return NaN;
    return parseFloat(s.replace(',', '.'));
}

function parseDate(s) {
    if (!s) return null;
    const parts = s.split('/');
    if (parts.length !== 3) return null;
    const [d, m, y] = parts;
    if (!d || !m || !y || y.length !== 4) return null;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function fmtImporto(s) {
    const n = parseImporto(s);
    if (isNaN(n)) return s;
    return (n >= 0 ? '+' : '') + n.toFixed(2).replace('.', ',') + ' €';
}

// Normalizza la modalità di pagamento dal CSV al formato interno
const MODALITA_MAP = {
    'bonifico': 'Bonifico',
    'pos': 'POS',
    'contanti': 'Contanti',
    'assegno': 'Assegno',
    'carta di credito': 'Carta di credito',
    'altro': 'Altro',
};
function normalizeModalita(raw) {
    if (!raw || !raw.trim()) return null;
    const key = raw.trim().toLowerCase();
    return MODALITA_MAP[key] || raw.trim();
}

// Identifica le righe "RISCOSSO DA CLIENTE" (incassi da socio/cliente)
function isRiscossoDaCliente(row) {
    const op = row['DESC_OPERAZIONE']?.trim().toLowerCase() || '';
    return op.includes('riscoss');
}

// Rimuove il prefisso "- " (trattino e spazio) da un nome prodotto
function stripLeadingDash(s) {
    if (!s) return s;
    return s.replace(/^-\s+/, '');
}

// Estrae numero ricevuta e nome prodotto dalla DESCRIZIONE
// Formati supportati: "1234 Quota associativa", "RIC. 1234 Quota", "1234/2025 Quota"
function parseDescrizioneRicevuta(desc) {
    if (!desc || !desc.trim()) return { numero: null, prodotto: null };
    const m = desc.trim().match(/^(?:RIC\.?\s+|N\.?\s+)?(\d+(?:\/\S+)?)\s+(.+)$/i);
    if (m) return { numero: m[1], prodotto: stripLeadingDash(m[2].trim()) };
    return { numero: null, prodotto: stripLeadingDash(desc.trim()) };
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------
const StepBar = ({ step }) => {
    const steps = [
        { n: 1, label: 'Carica file' },
        { n: 2, label: 'Mappa categorie' },
        { n: 3, label: 'Anteprima' },
        { n: 4, label: 'Verifica soci' },
        { n: 5, label: 'Risultato' },
    ];
    return (
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', gap: '4px', borderBottom: '1px solid #f0f0f0', background: '#f9fafb' }}>
            {steps.map((s, idx) => (
                <React.Fragment key={s.n}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                            width: '24px', height: '24px', borderRadius: '50%',
                            background: step >= s.n ? '#1565c0' : '#e5e7eb',
                            color: step >= s.n ? '#fff' : '#9ca3af',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: '700', fontSize: '0.78rem', flexShrink: 0,
                        }}>
                            {step > s.n ? <Check size={12} /> : s.n}
                        </div>
                        <span style={{ fontSize: '0.83rem', color: step >= s.n ? '#1565c0' : '#9ca3af', fontWeight: step === s.n ? '600' : '400', whiteSpace: 'nowrap' }}>
                            {s.label}
                        </span>
                    </div>
                    {idx < steps.length - 1 && (
                        <ChevronRight size={13} style={{ color: '#d1d5db', flexShrink: 0 }} />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------
const ImportPrimaNotaModal = ({ isOpen, onClose, societaId, onImported }) => {
    const [step, setStep] = useState(1);
    const [rows, setRows] = useState([]);
    const [parseError, setParseError] = useState(null);
    const [gruppi, setGruppi] = useState([]);
    const [conti, setConti] = useState([]);
    const [fornitori, setFornitori] = useState([]);
    const [soci, setSoci] = useState([]);
    const [products, setProducts] = useState([]);
    // For homonym resolution: intestatario → chosen socio id (or null = skip)
    const [socioOverrides, setSocioOverrides] = useState({});
    // For FORNITORE ambiguity: { [nomeFornitore]: { role: 'socio'|'fornitore', socioId?: number|null } }
    const [fornitoreAmbiguita, setFornitoreAmbiguita] = useState({});
    const [loadingGruppi, setLoadingGruppi] = useState(false);
    // mapping: descOperazione (string) → gruppoId (int|null)
    const [mapping, setMapping] = useState({});
    // indices of rows selected for import
    const [selectedRows, setSelectedRows] = useState([]);
    const [importing, setImporting] = useState(false);

    const [importResult, setImportResult] = useState(null);
    const [importProgress, setImportProgress] = useState(null); // { total, current, importati, errori[], logs[], done }
    const [importLogFilters, setImportLogFilters] = useState({ importati: true, errori: true });
    const importLogRef = useRef(null);
    const fileInputRef = useRef(null);
    const [dragging, setDragging] = useState(false);

    // Unique DESC_OPERAZIONE values in the parsed CSV
    const uniqueDescOp = useMemo(
        () => [...new Set(rows.map(r => r['DESC_OPERAZIONE']).filter(Boolean))].sort(),
        [rows]
    );

    // Per ogni INTESTATARIO unico nelle righe selezionate: ok | homonym | missing
    const socioIssues = useMemo(() => {
        const seen = new Set();
        const result = [];
        selectedRows.forEach(i => {
            const intestatario = rows[i]?.['INTESTATARIO']?.trim();
            if (!intestatario || seen.has(intestatario)) return;
            seen.add(intestatario);
            const needle = intestatario.toLowerCase();
            const matches = soci.filter(s => {
                const full1 = `${s.cognome} ${s.nome}`.toLowerCase();
                const full2 = `${s.nome} ${s.cognome}`.toLowerCase();
                return full1 === needle || full2 === needle;
            });
            if (matches.length === 1) {
                result.push({ intestatario, status: 'ok', matches });
            } else if (matches.length > 1) {
                result.push({ intestatario, status: 'homonym', matches });
            } else {
                result.push({ intestatario, status: 'missing', matches: [] });
            }
        });
        return result;
    }, [selectedRows, rows, soci]);

    // Valori in FORNITORE (su righe senza INTESTATARIO) che corrispondono anche a un socio
    const fornitoreConflicts = useMemo(() => {
        const seen = new Set();
        const result = [];
        selectedRows.forEach(i => {
            const row = rows[i];
            const fornitore = row?.['FORNITORE']?.trim();
            const intestatario = row?.['INTESTATARIO']?.trim();
            // Solo righe dove FORNITORE è l'identificatore principale (INTESTATARIO vuoto)
            if (!fornitore || intestatario || seen.has(fornitore)) return;
            seen.add(fornitore);
            const needle = fornitore.toLowerCase();
            const matchingSoci = soci.filter(s => {
                const full1 = `${s.cognome} ${s.nome}`.toLowerCase();
                const full2 = `${s.nome} ${s.cognome}`.toLowerCase();
                return full1 === needle || full2 === needle;
            });
            if (matchingSoci.length > 0) {
                result.push({ fornitore, matchingSoci });
            }
        });
        return result;
    }, [selectedRows, rows, soci]);

    // Flat list of all gruppi for selects (root + sottogruppi indented)
    const gruppiFlat = useMemo(() => {
        const result = [];
        const roots = gruppi.filter(g => !g.gruppo_id).sort((a, b) => (a.descrizione || '').localeCompare(b.descrizione || ''));
        roots.forEach(root => {
            result.push({ ...root, _label: root.descrizione });
            const sotto = gruppi.filter(g => g.gruppo_id === root.id).sort((a, b) => (a.numero || 0) - (b.numero || 0));
            sotto.forEach(s => result.push({ ...s, _label: `\u00a0\u00a0\u00a0└ ${s.descrizione}` }));
        });
        return result;
    }, [gruppi]);

    const handleFile = async (file) => {
        setParseError(null);
        const isXlsx = /\.xlsx?$/i.test(file.name);
        let parsed, error;
        if (isXlsx) {
            ({ rows: parsed, error } = await parseXlsx(file));
        } else {
            let text;
            try { text = await file.text(); } catch { setParseError('Impossibile leggere il file.'); return; }
            ({ rows: parsed, error } = parseCsv(text));
        }
        if (error) { setParseError(error); return; }
        setRows(parsed);

        // Load gruppi + conti and try auto-mapping
        setLoadingGruppi(true);
        const token = localStorage.getItem('token');
        try {
            const [gRes, cRes, fRes, sRes, pRes] = await Promise.all([
                fetch(`/payments/api/gruppi?societa_id=${societaId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`/payments/api/conti?societa_id=${societaId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`/payments/api/fornitori?societa_id=${societaId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`/users/api/soci?societa_id=${societaId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`/products/api?societaId=${societaId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
            ]);
            const [gData, cData, fData, sData, pData] = await Promise.all([
                gRes.ok ? gRes.json() : [],
                cRes.ok ? cRes.json() : [],
                fRes.ok ? fRes.json() : [],
                sRes.ok ? sRes.json() : [],
                pRes.ok ? pRes.json() : [],
            ]);
            setGruppi(gData);
            setConti(cData);
            setFornitori(fData);
            setSoci(sData);
            setProducts(pData);

            // Auto-match gruppi by exact description (case-insensitive)
            const autoMapping = {};
            const uniqueDescs = [...new Set(parsed.map(r => r['DESC_OPERAZIONE']).filter(Boolean))];
            uniqueDescs.forEach(desc => {
                const match = gData.find(g => g.descrizione.toLowerCase() === desc.toLowerCase());
                if (match) autoMapping[desc] = match.id;
            });
            setMapping(autoMapping);
        } catch (e) {
            console.error('Errore caricamento gruppi:', e);
        } finally {
            setLoadingGruppi(false);
        }

        setSelectedRows(parsed.map((_, i) => i));
        setStep(2);
    };

    const handleImport = async () => {
        setImporting(true);
        const token = localStorage.getItem('token');

        // --- Step 0: create groups for entries marked as __CREATE__ ---
        let resolvedMapping = { ...mapping };
        const toCreate = Object.entries(mapping).filter(([, v]) => v === '__CREATE__');
        for (const [desc] of toCreate) {
            try {
                const res = await fetch('/payments/api/gruppi', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                        societa_id: societaId,
                        descrizione: desc,
                        tipo: null,
                        sezione: null,
                        numero: null,
                        codice: null,
                        gruppo_id: null,
                        is_default: false,
                    }),
                });
                if (res.ok) {
                    const created = await res.json();
                    setGruppi(prev => [...prev, created]);
                    resolvedMapping[desc] = created.id;
                } else {
                    resolvedMapping[desc] = null;
                }
            } catch (e) {
                console.error('Errore creazione gruppo:', desc, e);
                resolvedMapping[desc] = null;
            }
        }
        if (toCreate.length > 0) setMapping(resolvedMapping);

        // --- Step A: find-or-create conti ---
        const uniqueContiDescs = [...new Set(
            selectedRows.map(i => rows[i]['DESC_CONTO']?.trim()).filter(Boolean)
        )];
        let resolvedConti = [...conti];
        for (const desc of uniqueContiDescs) {
            const existing = resolvedConti.find(
                c => c.descrizione.toLowerCase() === desc.toLowerCase()
            );
            if (!existing) {
                try {
                    const res = await fetch('/payments/api/conti', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ societa_id: societaId, descrizione: desc, modalita_pagamento: null }),
                    });
                    if (res.ok) {
                        const created = await res.json();
                        resolvedConti.push(created);
                    }
                } catch (e) {
                    console.error('Errore creazione conto:', desc, e);
                }
            }
        }
        setConti(resolvedConti);

        // --- Step A2: find-or-create prodotti (solo righe RISCOSSO DA CLIENTE) ---
        const riscossoRows = selectedRows.filter(i => isRiscossoDaCliente(rows[i]));
        const uniqueProdottiNomi = [...new Set(
            riscossoRows
                .flatMap(i => {
                    const prodotto = parseDescrizioneRicevuta(rows[i]['DESCRIZIONE']).prodotto;
                    if (!prodotto) return [];
                    return prodotto.split(',').map(s => s.trim()).filter(Boolean);
                })
        )];
        let resolvedProducts = [...products];
        for (const nomeProd of uniqueProdottiNomi) {
            const existing = resolvedProducts.find(
                p => (p.description || '').toLowerCase() === nomeProd.toLowerCase()
            );
            if (!existing) {
                try {
                    const res = await fetch('/products/api', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({
                            societaId: societaId,
                            description: nomeProd,
                            type: 'generic',
                            basePrice: 0,
                            visible: true,
                        }),
                    });
                    if (res.ok) {
                        const created = await res.json();
                        resolvedProducts.push(created);
                    }
                } catch (e) {
                    console.error('Errore creazione prodotto:', nomeProd, e);
                }
            }
        }
        setProducts(resolvedProducts);
        const uniqueFornitoriNomi = [...new Set(
            selectedRows.map(i => {
                const nome = rows[i]['FORNITORE']?.trim();
                if (!nome) return null;
                // Se questo FORNITORE è stato classificato come socio, non creare il fornitore
                const conflict = fornitoreConflicts.find(c => c.fornitore.toLowerCase() === nome.toLowerCase());
                if (conflict && fornitoreAmbiguita[conflict.fornitore]?.role === 'socio') return null;
                return nome;
            }).filter(Boolean)
        )];
        let resolvedFornitori = [...fornitori];
        for (const nome of uniqueFornitoriNomi) {
            const existing = resolvedFornitori.find(
                f => f.denominazione.toLowerCase() === nome.toLowerCase()
            );
            if (!existing) {
                try {
                    const res = await fetch('/payments/api/fornitori', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ societa_id: societaId, denominazione: nome }),
                    });
                    if (res.ok) {
                        const created = await res.json();
                        resolvedFornitori.push(created);
                    }
                } catch (e) {
                    console.error('Errore creazione fornitore:', nome, e);
                }
            }
        }
        setFornitori(resolvedFornitori);

        // --- Step C: build payments ---
        const paymentsToCreate = selectedRows.map(i => {
            const row = rows[i];
            const importo = parseImporto(row['IMPORTO']);
            const dataPagamento = parseDate(row['DATA_OPERAZIONE']);
            const intestatario = row['INTESTATARIO']?.trim() || row['FORNITORE']?.trim() || null;
            const gruppoId = resolvedMapping[row['DESC_OPERAZIONE']] || null;

            // Resolve conto
            const descConto = row['DESC_CONTO']?.trim() || null;
            const matchedConto = descConto
                ? resolvedConti.find(c => c.descrizione.toLowerCase() === descConto.toLowerCase())
                : null;
            const contoDescrizione = matchedConto ? matchedConto.descrizione : descConto;

            // Resolve fornitore vs socio (per righe senza INTESTATARIO)
            const nomeFornitore = row['FORNITORE']?.trim() || null;
            const intestatarioIsEmpty = !row['INTESTATARIO']?.trim();
            const fConflict = nomeFornitore && intestatarioIsEmpty
                ? fornitoreConflicts.find(c => c.fornitore.toLowerCase() === nomeFornitore.toLowerCase())
                : null;
            let matchedFornitore = null;
            let socioIdFromFornitore = null;
            if (fConflict) {
                const ovr = fornitoreAmbiguita[fConflict.fornitore];
                if (ovr?.role === 'socio') {
                    socioIdFromFornitore = fConflict.matchingSoci.length === 1
                        ? fConflict.matchingSoci[0].id
                        : (ovr.socioId !== undefined ? ovr.socioId : null);
                } else {
                    // role === 'fornitore' oppure non scelto (default: fornitore)
                    matchedFornitore = resolvedFornitori.find(f => f.denominazione.toLowerCase() === nomeFornitore.toLowerCase()) || null;
                }
            } else if (nomeFornitore) {
                matchedFornitore = resolvedFornitori.find(f => f.denominazione.toLowerCase() === nomeFornitore.toLowerCase()) || null;
            }

            // Resolve socio FK da INTESTATARIO (sovrascrive socioIdFromFornitore se presente)
            const intestatarioNeedle = row['INTESTATARIO']?.trim()?.toLowerCase();
            let socioId = socioIdFromFornitore;
            if (intestatarioNeedle) {
                const issue = socioIssues.find(x => x.intestatario.toLowerCase() === intestatarioNeedle);
                if (issue?.status === 'ok') {
                    socioId = issue.matches[0].id;
                } else if (issue?.status === 'homonym') {
                    socioId = socioOverrides[issue.intestatario] ?? null;
                } else {
                    socioId = null;
                }
            }

            const modalitaNorm = normalizeModalita(row['MODALITA DI PAGAMENTO']);

            // Resolve prodotto e numero_ricevuta per RISCOSSO DA CLIENTE
            let numRicevuta = null;
            let quoteCalc = row['DESCRIZIONE'] || null;
            let productId = null;
            if (isRiscossoDaCliente(row)) {
                const { numero, prodotto } = parseDescrizioneRicevuta(row['DESCRIZIONE']);
                numRicevuta = numero;
                quoteCalc = prodotto || row['DESCRIZIONE'] || null;
                if (prodotto) {
                    const firstProdotto = prodotto.split(',')[0].trim();
                    const matchedProd = resolvedProducts.find(
                        p => (p.description || '').toLowerCase() === firstProdotto.toLowerCase()
                    );
                    if (matchedProd) productId = matchedProd.id;
                }
            }

            return {
                societa_id: societaId,
                intestatario,
                data_pagamento: dataPagamento,
                importo,
                quote: quoteCalc,
                quote_types: isRiscossoDaCliente(row) ? 'generic' : 'operazione_manuale',
                modalita_pagamento: modalitaNorm,
                conto_destinazione: contoDescrizione,
                note: row['NOTE'] || null,
                stato_pagamento: '1. VALIDO CON RICEVUTA',
                gruppo_id: gruppoId,
                fornitore_id: matchedFornitore ? matchedFornitore.id : null,
                socio_id: socioId,
                numero_ricevuta: numRicevuta,
                product_id: productId,
            };
        });

        // --- Step D: elabora una operazione alla volta con progress bar ---
        setImportLogFilters({ importati: true, errori: true });
        setImportProgress({ total: paymentsToCreate.length, current: 0, importati: 0, errori: [], logs: [], done: false });
        setStep(5);

        let importati = 0;
        const errori = [];
        const logs = [];

        for (let i = 0; i < paymentsToCreate.length; i++) {
            const payment = paymentsToCreate[i];
            const label = payment.quote?.substring(0, 40) || payment.intestatario || `Operazione ${i + 1}`;
            try {
                const res = await fetch('/payments/api', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(payment),
                });
                if (res.ok) {
                    importati++;
                    logs.push({ type: 'OK', message: `Riga ${i + 1} — ${label}: importato` });
                } else {
                    const err = await res.json().catch(() => ({}));
                    const msg = err.error || err.message || 'errore sconosciuto';
                    errori.push(msg);
                    logs.push({ type: 'ERR', message: `Riga ${i + 1} — ${label}: ${msg}` });
                }
            } catch (e) {
                errori.push(`Riga ${i + 1}: errore di rete`);
                logs.push({ type: 'ERR', message: `Riga ${i + 1} — ${label}: errore di rete` });
            }
            const snap = { total: paymentsToCreate.length, current: i + 1, importati, errori: [...errori], logs: [...logs], done: false };
            setImportProgress(snap);
            if (importLogRef.current) importLogRef.current.scrollTop = importLogRef.current.scrollHeight;
        }

        setImportProgress({ total: paymentsToCreate.length, current: paymentsToCreate.length, importati, errori, logs, done: true });
        if (importLogRef.current) importLogRef.current.scrollTop = importLogRef.current.scrollHeight;
        if (importati > 0) onImported?.();
        setImporting(false);
    };

    const handleClose = () => {
        setStep(1);
        setRows([]);
        setParseError(null);
        setGruppi([]);
        setConti([]);
        setFornitori([]);
        setSoci([]);
        setSocioOverrides({});
        setFornitoreAmbiguita({});
        setProducts([]);
        setMapping({});
        setSelectedRows([]);
        setImportResult(null);
        setImportProgress(null);
        setImportLogFilters({ importati: true, errori: true });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
            onClick={handleClose}
        >
            <div
                style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '860px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e5e7eb', background: '#1565c0', borderRadius: '12px 12px 0 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff' }}>
                        <Upload size={20} />
                        <span style={{ fontWeight: '700', fontSize: '1.05rem' }}>Importa Prima Nota da CSV</span>
                    </div>
                    <button
                        onClick={handleClose}
                        style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}
                    >
                        <X size={18} />
                    </button>
                </div>

                <StepBar step={step} />

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

                    {/* STEP 1: Upload */}
                    {step === 1 && (
                        <div>
                            <div
                                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={e => {
                                    e.preventDefault();
                                    setDragging(false);
                                    const file = e.dataTransfer.files[0];
                                    if (file) handleFile(file);
                                }}
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    border: `2px dashed ${dragging ? '#1565c0' : '#d1d5db'}`,
                                    borderRadius: '12px',
                                    padding: '52px 24px',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    background: dragging ? '#eff6ff' : '#fafafa',
                                    transition: 'all 0.2s',
                                }}
                            >
                                <Upload size={40} style={{ color: '#9ca3af', marginBottom: '12px' }} />
                                <div style={{ fontWeight: '600', color: '#374151', fontSize: '1rem' }}>
                                    Trascina il file qui o clicca per selezionarlo
                                </div>
                                <div style={{ color: '#9ca3af', fontSize: '0.85rem', marginTop: '6px' }}>
                                    Formati supportati: <strong>.csv</strong> (separatore ;) oppure <strong>.xlsx / .xls</strong>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv,.txt,.xlsx,.xls"
                                    style={{ display: 'none' }}
                                    onChange={e => { const f = e.target.files[0]; if (f) handleFile(f); e.target.value = ''; }}
                                />
                            </div>

                            {parseError && (
                                <div style={{ marginTop: '12px', padding: '12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#dc2626', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                    <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                                    <span>{parseError}</span>
                                </div>
                            )}

                            <div style={{ marginTop: '16px', padding: '12px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', color: '#1d4ed8', fontSize: '0.83rem', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                <Info size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                                <div>
                                    Il file deve contenere le colonne (riga di intestazione):<br />
                                    <code style={{ fontSize: '0.78rem', background: '#dbeafe', padding: '2px 6px', borderRadius: '4px' }}>
                                        DESCRIZIONE · INTESTATARIO · DESC_OPERAZIONE · DESC_CONTO · IMPORTO · DATA_OPERAZIONE · MODALITA DI PAGAMENTO · FORNITORE · NOTE
                                    </code>
                                    <br /><br />
                                    Per i <strong>.csv</strong> il separatore deve essere il punto e virgola (;).
                                    Per i <strong>.xlsx/.xls</strong> vengono lette le prime colonne del primo foglio.<br />
                                    Le righe con <strong>INTESTATARIO</strong> compilato vengono usate come incassi da cliente;
                                    le righe senza usano il campo <strong>FORNITORE</strong> come intestatario.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Group mapping */}
                    {step === 2 && (
                        <div>
                            <div style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                Il file contiene <strong>{rows.length}</strong> righe.
                                Associa ogni categoria del CSV a un gruppo del piano dei conti.
                                Le categorie già abbinate automaticamente sono evidenziate in verde.
                                Puoi lasciare senza categoria le operazioni che non vuoi categorizzare.
                            </div>
                            {loadingGruppi ? (
                                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>Caricamento gruppi…</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                                    {uniqueDescOp.map(desc => {
                                        const mappingVal = mapping[desc];
                                        const isCreate = mappingVal === '__CREATE__';
                                        const matched = mappingVal != null && !isCreate;
                                        const count = rows.filter(r => r['DESC_OPERAZIONE'] === desc).length;
                                        return (
                                            <div key={desc} style={{
                                                display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px',
                                                background: isCreate ? '#eff6ff' : matched ? '#f0fdf4' : '#fff',
                                                border: `1px solid ${isCreate ? '#93c5fd' : matched ? '#86efac' : '#e5e7eb'}`,
                                                borderRadius: '8px',
                                            }}>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <span style={{ fontWeight: '500', color: '#1f2937', fontSize: '0.9rem' }}>
                                                        {desc || '(vuoto)'}
                                                    </span>
                                                    <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginLeft: '8px' }}>
                                                        {count} {count === 1 ? 'riga' : 'righe'}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                                    {matched && <Check size={15} style={{ color: '#22c55e' }} />}
                                                    <select
                                                        className="md-select"
                                                        style={{ fontSize: '0.85rem', padding: '5px 10px', minWidth: '230px' }}
                                                        value={mappingVal != null ? mappingVal : ''}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            setMapping(prev => ({
                                                                ...prev,
                                                                [desc]: val === '__CREATE__' ? '__CREATE__' : val ? parseInt(val, 10) : null,
                                                            }));
                                                        }}
                                                    >
                                                        <option value="">— nessun sottogruppo —</option>
                                                        {desc && <option value="__CREATE__">+ Crea da categoria</option>}
                                                        {gruppiFlat.map(g => (
                                                            <option key={g.id} value={g.id}>{g._label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 3: Preview */}
                    {step === 3 && (
                        <div>
                            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                    <strong>{selectedRows.length}</strong> di <strong>{rows.length}</strong> righe selezionate per l'importazione.
                                </div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                        style={{ fontSize: '0.78rem', padding: '4px 10px', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', background: '#f9fafb' }}
                                        onClick={() => setSelectedRows(rows.map((_, i) => i))}
                                    >Seleziona tutto</button>
                                    <button
                                        style={{ fontSize: '0.78rem', padding: '4px 10px', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', background: '#f9fafb' }}
                                        onClick={() => setSelectedRows([])}
                                    >Deseleziona tutto</button>
                                </div>
                            </div>
                            <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                    <thead>
                                        <tr style={{ background: '#1565c0', color: '#fff' }}>
                                            <th style={{ padding: '8px 10px', textAlign: 'center', width: '36px' }}></th>
                                            <th style={{ padding: '8px 10px', textAlign: 'left', whiteSpace: 'nowrap' }}>Data</th>
                                            <th style={{ padding: '8px 10px', textAlign: 'left' }}>Descrizione</th>
                                            <th style={{ padding: '8px 10px', textAlign: 'left' }}>Intestatario</th>
                                            <th style={{ padding: '8px 10px', textAlign: 'left' }}>Categoria</th>
                                            <th style={{ padding: '8px 10px', textAlign: 'left' }}>Conto</th>
                                            <th style={{ padding: '8px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>Importo</th>
                                            <th style={{ padding: '8px 10px', textAlign: 'left' }}>Modalità</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row, i) => {
                                            const isSelected = selectedRows.includes(i);
                                            const importo = parseImporto(row['IMPORTO']);
                                            const isEntrata = importo >= 0;
                                            const intestatario = row['INTESTATARIO']?.trim() || row['FORNITORE']?.trim() || '';
                                            const gruppoId = mapping[row['DESC_OPERAZIONE']];
                                            const gruppo = gruppiFlat.find(g => g.id === gruppoId);
                                            const dateOk = !!parseDate(row['DATA_OPERAZIONE']);
                                            const amtOk = !isNaN(importo);

                                            return (
                                                <tr key={i} style={{
                                                    background: isSelected ? '#fff' : '#f9fafb',
                                                    opacity: isSelected ? 1 : 0.45,
                                                    borderBottom: '1px solid #f0f0f0',
                                                }}>
                                                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={e => {
                                                                if (e.target.checked) setSelectedRows(prev => [...prev, i].sort((a, b) => a - b));
                                                                else setSelectedRows(prev => prev.filter(x => x !== i));
                                                            }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '6px 10px', whiteSpace: 'nowrap', color: dateOk ? '#6b7280' : '#dc2626', fontWeight: dateOk ? '400' : '600' }}>
                                                        {row['DATA_OPERAZIONE']}
                                                        {!dateOk && <AlertTriangle size={12} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />}
                                                    </td>
                                                    <td style={{ padding: '6px 10px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row['DESCRIZIONE']}>
                                                        {row['DESCRIZIONE']}
                                                    </td>
                                                    <td style={{ padding: '6px 10px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={intestatario}>
                                                        {intestatario || <span style={{ color: '#d1d5db' }}>—</span>}
                                                    </td>
                                                    <td style={{ padding: '6px 10px', color: gruppo ? '#16a34a' : '#9ca3af', fontStyle: gruppo ? 'normal' : 'italic', whiteSpace: 'nowrap' }}>
                                                        {gruppo ? gruppo.descrizione : <span style={{ color: '#9ca3af' }}>{row['DESC_OPERAZIONE'] || '—'}</span>}
                                                    </td>
                                                    <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>{row['DESC_CONTO']}</td>
                                                    <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '600', color: amtOk ? (isEntrata ? '#16a34a' : '#dc2626') : '#dc2626', whiteSpace: 'nowrap' }}>
                                                        {amtOk ? fmtImporto(row['IMPORTO']) : <span title="Importo non valido"><AlertTriangle size={12} /> {row['IMPORTO']}</span>}
                                                    </td>
                                                    <td style={{ padding: '6px 10px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                                                        {row['MODALITA DI PAGAMENTO'] || <span style={{ color: '#d1d5db' }}>—</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: Soci validation */}
                    {step === 4 && (() => {
                        const homonyms = socioIssues.filter(x => x.status === 'homonym');
                        const missing  = socioIssues.filter(x => x.status === 'missing');
                        const unresolvedHomonyms = homonyms.filter(
                            x => socioOverrides[x.intestatario] === undefined
                        );
                        const unresolvedFornConflicts = fornitoreConflicts.filter(c => {
                            const ovr = fornitoreAmbiguita[c.fornitore];
                            if (!ovr) return true;
                            if (ovr.role === 'fornitore') return false;
                            if (ovr.role === 'socio') {
                                if (c.matchingSoci.length === 1) return false;
                                return ovr.socioId === undefined;
                            }
                            return true;
                        });
                        const allOk = homonyms.length === 0 && missing.length === 0 && fornitoreConflicts.length === 0;
                        return (
                            <div>
                                <div style={{ marginBottom: '16px', color: '#374151', fontSize: '0.9rem' }}>
                                    Verifica delle corrispondenze tra i nomi nel file e i soci registrati.
                                    Il match avviene su <strong>Nome Cognome</strong> o <strong>Cognome Nome</strong> (non distingue maiuscole/minuscole).
                                </div>

                                {allOk && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', color: '#15803d' }}>
                                        <Check size={20} />
                                        <span style={{ fontWeight: '600' }}>Tutti i soci trovati correttamente. Puoi procedere con l'importazione.</span>
                                    </div>
                                )}

                                {homonyms.length > 0 && (
                                    <div style={{ marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px 8px 0 0', color: '#92400e', fontWeight: '600', fontSize: '0.875rem' }}>
                                            <AlertTriangle size={16} />
                                            {homonyms.length === 1 ? '1 omonimia trovata' : `${homonyms.length} omonimie trovate`} — seleziona quale socio associare
                                        </div>
                                        <div style={{ border: '1px solid #fcd34d', borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
                                            {homonyms.map((issue, idx) => (
                                                <div key={issue.intestatario} style={{
                                                    display: 'flex', flexDirection: 'column', gap: '8px',
                                                    padding: '12px 14px',
                                                    borderTop: idx > 0 ? '1px solid #fef3c7' : 'none',
                                                    background: socioOverrides[issue.intestatario] !== undefined ? '#fffbeb' : '#fff',
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontWeight: '600', color: '#374151' }}>{issue.intestatario}</span>
                                                        <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                                                            ({issue.matches.length} soci corrispondenti)
                                                        </span>
                                                    </div>
                                                    <select
                                                        className="md-select"
                                                        style={{ fontSize: '0.85rem', padding: '6px 10px', maxWidth: '480px' }}
                                                        value={
                                                        socioOverrides[issue.intestatario] === undefined
                                                            ? ''
                                                            : socioOverrides[issue.intestatario] === null
                                                                ? 'SKIP'
                                                                : String(socioOverrides[issue.intestatario])
                                                    }
                                                        onChange={e => setSocioOverrides(prev => ({
                                                            ...prev,
                                                            [issue.intestatario]: e.target.value === 'SKIP' ? null : (e.target.value === '' ? undefined : parseInt(e.target.value, 10)),
                                                        }))}
                                                    >
                                                        <option value="">— seleziona il socio corretto —</option>
                                                        {issue.matches.map(s => (
                                                            <option key={s.id} value={s.id}>
                                                                {s.cognome} {s.nome}
                                                                {s.codice_fiscale ? ` — CF: ${s.codice_fiscale}` : ''}
                                                                {s.data_nascita ? ` — nato: ${s.data_nascita}` : ''}
                                                            </option>
                                                        ))}
                                                        <option value="SKIP">— nessuno (importa senza collegamento) —</option>
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {missing.length > 0 && (
                                    <div style={{ marginBottom: fornitoreConflicts.length > 0 ? '16px' : '0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px 8px 0 0', color: '#dc2626', fontWeight: '600', fontSize: '0.875rem' }}>
                                            <AlertTriangle size={16} />
                                            {missing.length === 1 ? '1 socio non trovato' : `${missing.length} soci non trovati`} nel database
                                        </div>
                                        <div style={{ border: '1px solid #fca5a5', borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
                                            {missing.map((issue, idx) => (
                                                <div key={issue.intestatario} style={{
                                                    padding: '9px 14px',
                                                    borderTop: idx > 0 ? '1px solid #fee2e2' : 'none',
                                                    background: '#fff',
                                                    fontSize: '0.875rem',
                                                    color: '#374151',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                }}>
                                                    <X size={14} style={{ color: '#dc2626', flexShrink: 0 }} />
                                                    <span style={{ fontWeight: '500' }}>{issue.intestatario}</span>
                                                    <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>— le righe corrispondenti verranno importate senza collegamento al socio</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {fornitoreConflicts.length > 0 && (
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#f0f9ff', border: '1px solid #7dd3fc', borderRadius: '8px 8px 0 0', color: '#0369a1', fontWeight: '600', fontSize: '0.875rem' }}>
                                            <AlertTriangle size={16} />
                                            {fornitoreConflicts.length === 1 ? '1 voce' : `${fornitoreConflicts.length} voci`} nella colonna FORNITORE coincide con il nome di un socio — scegli come trattarla
                                        </div>
                                        <div style={{ border: '1px solid #7dd3fc', borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
                                            {fornitoreConflicts.map((conflict, idx) => {
                                                const ovr = fornitoreAmbiguita[conflict.fornitore];
                                                const roleChosen = ovr?.role;
                                                const needSocioDropdown = roleChosen === 'socio' && conflict.matchingSoci.length > 1;
                                                return (
                                                    <div key={conflict.fornitore} style={{
                                                        display: 'flex', flexDirection: 'column', gap: '8px',
                                                        padding: '12px 14px',
                                                        borderTop: idx > 0 ? '1px solid #e0f2fe' : 'none',
                                                        background: roleChosen ? '#f0f9ff' : '#fff',
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                                            <span style={{ fontWeight: '600', color: '#374151', minWidth: '140px' }}>{conflict.fornitore}</span>
                                                            <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                                                                corrisponde a {conflict.matchingSoci.length === 1
                                                                    ? `${conflict.matchingSoci[0].cognome} ${conflict.matchingSoci[0].nome}`
                                                                    : `${conflict.matchingSoci.length} soci`
                                                                }
                                                            </span>
                                                            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                                                                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.875rem', cursor: 'pointer', padding: '5px 12px', borderRadius: '6px', border: `1px solid ${roleChosen === 'fornitore' ? '#1565c0' : '#d1d5db'}`, background: roleChosen === 'fornitore' ? '#eff6ff' : '#fff', color: roleChosen === 'fornitore' ? '#1565c0' : '#374151', fontWeight: roleChosen === 'fornitore' ? '600' : '400' }}>
                                                                    <input
                                                                        type="radio"
                                                                        name={`forn-role-${conflict.fornitore}`}
                                                                        value="fornitore"
                                                                        checked={roleChosen === 'fornitore'}
                                                                        style={{ accentColor: '#1565c0' }}
                                                                        onChange={() => setFornitoreAmbiguita(prev => ({
                                                                            ...prev,
                                                                            [conflict.fornitore]: { role: 'fornitore' },
                                                                        }))}
                                                                    />
                                                                    Fornitore
                                                                </label>
                                                                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.875rem', cursor: 'pointer', padding: '5px 12px', borderRadius: '6px', border: `1px solid ${roleChosen === 'socio' ? '#16a34a' : '#d1d5db'}`, background: roleChosen === 'socio' ? '#f0fdf4' : '#fff', color: roleChosen === 'socio' ? '#15803d' : '#374151', fontWeight: roleChosen === 'socio' ? '600' : '400' }}>
                                                                    <input
                                                                        type="radio"
                                                                        name={`forn-role-${conflict.fornitore}`}
                                                                        value="socio"
                                                                        checked={roleChosen === 'socio'}
                                                                        style={{ accentColor: '#16a34a' }}
                                                                        onChange={() => setFornitoreAmbiguita(prev => ({
                                                                            ...prev,
                                                                            [conflict.fornitore]: {
                                                                                role: 'socio',
                                                                                // auto-set per socio unico
                                                                                socioId: conflict.matchingSoci.length === 1 ? conflict.matchingSoci[0].id : undefined,
                                                                            },
                                                                        }))}
                                                                    />
                                                                    Socio
                                                                </label>
                                                            </div>
                                                        </div>
                                                        {needSocioDropdown && (
                                                            <select
                                                                className="md-select"
                                                                style={{ fontSize: '0.85rem', padding: '6px 10px', maxWidth: '480px', alignSelf: 'flex-start' }}
                                                                value={ovr.socioId !== undefined ? String(ovr.socioId) : ''}
                                                                onChange={e => setFornitoreAmbiguita(prev => ({
                                                                    ...prev,
                                                                    [conflict.fornitore]: {
                                                                        ...prev[conflict.fornitore],
                                                                        socioId: e.target.value === '' ? undefined : parseInt(e.target.value, 10),
                                                                    },
                                                                }))}
                                                            >
                                                                <option value="">— seleziona il socio corretto —</option>
                                                                {conflict.matchingSoci.map(s => (
                                                                    <option key={s.id} value={s.id}>
                                                                        {s.cognome} {s.nome}
                                                                        {s.codice_fiscale ? ` — CF: ${s.codice_fiscale}` : ''}
                                                                        {s.data_nascita ? ` — nato: ${s.data_nascita}` : ''}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* STEP 5: Progress + Log */}
                    {step === 5 && importProgress && (
                        <div>
                            {!importProgress.done ? (
                                <>
                                    <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 600 }}>Importazione in corso…</h3>
                                    <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        Operazione {importProgress.current} di {importProgress.total}
                                    </p>
                                    <div style={{ height: '8px', borderRadius: '4px', backgroundColor: '#e0e0e0', overflow: 'hidden', marginBottom: '16px' }}>
                                        <div style={{
                                            height: '100%', borderRadius: '4px',
                                            backgroundColor: 'var(--primary-color, #1565c0)',
                                            width: `${importProgress.total > 0 ? Math.round((importProgress.current / importProgress.total) * 100) : 0}%`,
                                            transition: 'width 0.15s ease',
                                        }} />
                                    </div>
                                    <div style={{ display: 'flex', gap: '24px', fontSize: '0.88rem', marginBottom: '16px' }}>
                                        <span style={{ color: '#2e7d32' }}>✓ Importati: <strong>{importProgress.importati}</strong></span>
                                        <span style={{ color: '#c62828' }}>✗ Errori: <strong>{importProgress.errori.length}</strong></span>
                                    </div>
                                    <div ref={importLogRef} style={{
                                        fontFamily: 'monospace', fontSize: '0.78rem', lineHeight: '1.6',
                                        backgroundColor: '#1e1e1e', color: '#d4d4d4', borderRadius: '6px',
                                        padding: '10px 12px', height: '200px', overflowY: 'auto',
                                        whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                                    }}>
                                        {(importProgress.logs || []).map((l, i) => (
                                            <div key={i} style={{ color: l.type === 'OK' ? '#6fcf97' : '#eb5757' }}>
                                                {l.type === 'OK' ? '[OK]  ' : '[ERR] '}{l.message}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem', fontWeight: 600 }}>Importazione completata</h3>
                                    <div style={{ height: '8px', borderRadius: '4px', backgroundColor: '#e0e0e0', overflow: 'hidden', marginBottom: '14px' }}>
                                        <div style={{ height: '100%', borderRadius: '4px', backgroundColor: '#4caf50', width: '100%' }} />
                                    </div>
                                    <p style={{ margin: '0 0 8px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Clicca per filtrare i log:</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                                        <div
                                            onClick={() => setImportLogFilters(f => ({ ...f, importati: !f.importati }))}
                                            style={{
                                                display: 'flex', justifyContent: 'space-between', padding: '8px 12px',
                                                backgroundColor: importLogFilters.importati ? '#f1f8e9' : '#f5f5f5',
                                                borderRadius: '6px', cursor: 'pointer', userSelect: 'none',
                                                border: `2px solid ${importLogFilters.importati ? '#66bb6a' : '#e0e0e0'}`,
                                                opacity: importLogFilters.importati ? 1 : 0.5,
                                                transition: 'all 0.15s',
                                            }}
                                        >
                                            <span style={{ color: '#2e7d32' }}>✓ Operazioni importate</span>
                                            <strong style={{ color: '#2e7d32' }}>{importProgress.importati}</strong>
                                        </div>
                                        <div
                                            onClick={() => setImportLogFilters(f => ({ ...f, errori: !f.errori }))}
                                            style={{
                                                display: 'flex', justifyContent: 'space-between', padding: '8px 12px',
                                                backgroundColor: importLogFilters.errori ? '#fff3f3' : '#f9f9f9',
                                                borderRadius: '6px', cursor: 'pointer', userSelect: 'none',
                                                border: `2px solid ${importLogFilters.errori ? '#ef9a9a' : '#e0e0e0'}`,
                                                opacity: importLogFilters.errori ? 1 : 0.5,
                                                transition: 'all 0.15s',
                                            }}
                                        >
                                            <span style={{ color: '#c62828' }}>✗ Errori</span>
                                            <strong style={{ color: '#c62828' }}>{importProgress.errori.length}</strong>
                                        </div>
                                    </div>
                                    <div ref={importLogRef} style={{
                                        fontFamily: 'monospace', fontSize: '0.78rem', lineHeight: '1.6',
                                        backgroundColor: '#1e1e1e', color: '#d4d4d4', borderRadius: '6px',
                                        padding: '10px 12px', height: '200px', overflowY: 'auto',
                                        whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginBottom: '8px',
                                    }}>
                                        {(importProgress.logs || [])
                                            .filter(l =>
                                                (l.type === 'OK'  && importLogFilters.importati) ||
                                                (l.type === 'ERR' && importLogFilters.errori)
                                            )
                                            .map((l, i) => (
                                                <div key={i} style={{ color: l.type === 'OK' ? '#6fcf97' : '#eb5757' }}>
                                                    {l.type === 'OK' ? '[OK]  ' : '[ERR] '}{l.message}
                                                </div>
                                            ))
                                        }
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '14px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb', borderRadius: '0 0 12px 12px' }}>
                    <button
                        disabled={step === 5 && !importProgress?.done}
                        onClick={() => {
                            if (step === 5 || step === 1) handleClose();
                            else setStep(s => s - 1);
                        }}
                        style={{ padding: '8px 18px', border: '1px solid #d1d5db', borderRadius: '8px', cursor: (step === 5 && !importProgress?.done) ? 'not-allowed' : 'pointer', background: '#fff', color: '#374151', fontWeight: '500', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '5px', opacity: (step === 5 && !importProgress?.done) ? 0.4 : 1 }}
                    >
                        {step === 5 || step === 1 ? 'Chiudi' : <><ChevronLeft size={15} /> Indietro</>}
                    </button>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        {step === 2 && (
                            <button
                                onClick={() => setStep(3)}
                                style={{ padding: '8px 18px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: '#1565c0', color: '#fff', fontWeight: '600', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                            >
                                Anteprima <ChevronRight size={15} />
                            </button>
                        )}

                        {step === 3 && (
                            <button
                                onClick={() => setStep(4)}
                                disabled={selectedRows.length === 0}
                                style={{
                                    padding: '8px 18px', border: 'none', borderRadius: '8px',
                                    cursor: selectedRows.length === 0 ? 'not-allowed' : 'pointer',
                                    background: selectedRows.length === 0 ? '#9ca3af' : '#1565c0',
                                    color: '#fff', fontWeight: '600', fontSize: '0.875rem',
                                    display: 'flex', alignItems: 'center', gap: '5px',
                                }}
                            >
                                Verifica soci <ChevronRight size={15} />
                            </button>
                        )}

                        {step === 4 && (() => {
                            const homonyms = socioIssues.filter(x => x.status === 'homonym');
                            const missing  = socioIssues.filter(x => x.status === 'missing');
                            const unresolvedHomonyms = homonyms.filter(
                                x => socioOverrides[x.intestatario] === undefined
                            );
                            const unresolvedFornConflicts = fornitoreConflicts.filter(c => {
                                const ovr = fornitoreAmbiguita[c.fornitore];
                                if (!ovr) return true;
                                if (ovr.role === 'fornitore') return false;
                                if (ovr.role === 'socio') {
                                    if (c.matchingSoci.length === 1) return false;
                                    return ovr.socioId === undefined;
                                }
                                return true;
                            });
                            const canImport = unresolvedHomonyms.length === 0 && unresolvedFornConflicts.length === 0;
                            const hasMissing = missing.length > 0;
                            return (
                                <>
                                    {(unresolvedHomonyms.length > 0 || unresolvedFornConflicts.length > 0) && (
                                        <span style={{ fontSize: '0.8rem', color: '#92400e', alignSelf: 'center' }}>
                                            {unresolvedHomonyms.length > 0 ? 'Risolvi le omonimie' : 'Risolvi le ambiguità fornitore/socio'} per procedere
                                        </span>
                                    )}
                                    <button
                                        onClick={handleImport}
                                        disabled={importing || !canImport}
                                        style={{
                                            padding: '8px 18px', border: 'none', borderRadius: '8px',
                                            cursor: (importing || !canImport) ? 'not-allowed' : 'pointer',
                                            background: !canImport ? '#9ca3af' : hasMissing ? '#d97706' : '#16a34a',
                                            color: '#fff', fontWeight: '600', fontSize: '0.875rem',
                                            display: 'flex', alignItems: 'center', gap: '5px',
                                        }}
                                    >
                                        {importing
                                            ? 'Importazione…'
                                            : hasMissing && !importing
                                                ? <><AlertTriangle size={15} /> Procedi comunque</>  
                                                : <><Check size={15} /> Importa {selectedRows.length} {selectedRows.length === 1 ? 'operazione' : 'operazioni'}</>
                                        }
                                    </button>
                                </>
                            );
                        })()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImportPrimaNotaModal;
