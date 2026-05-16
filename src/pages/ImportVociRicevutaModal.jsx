import React, { useState, useRef, useMemo } from 'react';
import { X, Upload, Check, AlertTriangle, ChevronRight, FileText } from 'lucide-react';

// ---------------------------------------------------------------------------
// Lazy-load xlsx from CDN
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
// Normalizza le chiavi del row (gestisce varianti di intestazione)
// ---------------------------------------------------------------------------
function normalizeRow(obj) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        const key = k.trim().toUpperCase().replace(/\s+/g, ' ');
        if (key === 'NUM RIC' || key === 'NUMRIC' || key === 'NUM_RIC') out['NUM RIC'] = String(v ?? '').trim();
        else if (key === 'DATA') out['DATA'] = String(v ?? '').trim();
        else if (key === 'INTESTATARIO') out['INTESTATARIO'] = String(v ?? '').trim();
        else if (key === 'QUOTA') out['QUOTA'] = String(v ?? '').trim();
        else if (key === 'IMPORTO') out['IMPORTO'] = String(v ?? '').trim();
        else if (key === 'VALIDO') out['VALIDO'] = String(v ?? '').trim();
    }
    return out;
}

// ---------------------------------------------------------------------------
// Parsing CSV
// ---------------------------------------------------------------------------
function parseCsv(text) {
    const lines = text.split(/\r?\n/);
    const headerIdx = lines.findIndex(l => l.toUpperCase().replace(/\s+/g, ' ').includes('NUM RIC'));
    if (headerIdx < 0) return { error: 'Intestazione non trovata. Il file deve contenere la colonna "NUM RIC".' };

    const sep = ';';
    const headers = lines[headerIdx].split(sep).map(h => h.trim().replace(/^"|"$/g, '').toUpperCase());

    const rawRows = [];
    for (let i = headerIdx + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(sep);
        if (cols.length < 4) continue;
        const obj = {};
        headers.forEach((h, j) => {
            obj[h] = (cols[j] || '').trim().replace(/^"|"$/g, '');
        });
        rawRows.push(normalizeRow(obj));
    }

    const rows = rawRows.filter(r => r['NUM RIC']);
    if (rows.length === 0) return { error: 'Nessuna riga valida trovata nel file.' };
    return { rows };
}

// ---------------------------------------------------------------------------
// Parsing XLSX
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
    const ref = sheet['!ref'];
    if (!ref) return { error: 'Foglio vuoto.' };

    const range = XLSX.utils.decode_range(ref);
    let headerRow = -1;
    for (let r = range.s.r; r <= Math.min(range.e.r, range.s.r + 20); r++) {
        for (let c = range.s.c; c <= range.e.c; c++) {
            const cell = sheet[XLSX.utils.encode_cell({ r, c })];
            if (cell && String(cell.v).toUpperCase().replace(/\s+/g, ' ').includes('NUM RIC')) {
                headerRow = r;
                break;
            }
        }
        if (headerRow >= 0) break;
    }
    if (headerRow < 0) return { error: 'Intestazione non trovata nel foglio XLSX.' };

    const headers = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = sheet[XLSX.utils.encode_cell({ r: headerRow, c })];
        headers.push(cell ? String(cell.v).trim().toUpperCase() : '');
    }

    const rawRows = [];
    for (let r = headerRow + 1; r <= range.e.r; r++) {
        const obj = {};
        headers.forEach((h, j) => {
            const cell = sheet[XLSX.utils.encode_cell({ r, c: range.s.c + j })];
            if (!cell) { obj[h] = ''; return; }
            if (cell.t === 'd') {
                const d = cell.v;
                const dd = String(d.getDate()).padStart(2, '0');
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                obj[h] = `${d.getFullYear()}-${mm}-${dd}`;
                return;
            }
            obj[h] = cell.v != null ? String(cell.v).trim() : '';
        });
        rawRows.push(normalizeRow(obj));
    }

    const rows = rawRows.filter(r => r['NUM RIC']);
    if (rows.length === 0) return { error: 'Nessuna riga valida trovata.' };
    return { rows };
}

// Rimuove il prefisso "- " (trattino e spazio) da un nome prodotto/quota
function stripLeadingDash(s) {
    if (!s) return s;
    return s.replace(/^-\s+/, '');
}

// ---------------------------------------------------------------------------
// Match quota → product (case-insensitive, includes)
// ---------------------------------------------------------------------------
function matchProduct(quota, products) {
    if (!quota || !products?.length) return null;
    const q = stripLeadingDash(quota).toLowerCase().trim();
    // exact match
    const exact = products.find(p => p.description.toLowerCase().trim() === q);
    if (exact) return exact;
    // partial match
    return products.find(p =>
        q.includes(p.description.toLowerCase().trim()) ||
        p.description.toLowerCase().trim().includes(q)
    ) || null;
}

// Inferisce il quote_type dalla descrizione quota (fallback se non c'è match prodotto)
function inferQuoteType(quota) {
    const q = (quota || '').toLowerCase();
    if (q.includes('associat') || q.includes('tesseram')) return 'quota_associativa';
    if (q.includes('abbonamento') || q.includes('quota') || q.includes('corso')) return 'subscription';
    return 'generic';
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------
const StepBar = ({ step }) => {
    const steps = [
        { n: 1, label: 'Carica file' },
        { n: 2, label: 'Anteprima' },
        { n: 3, label: 'Risultato' },
    ];
    return (
        <div style={{ display: 'flex', alignItems: 'center', padding: '10px 20px', gap: '4px', borderBottom: '1px solid #f0f0f0', background: '#f9fafb' }}>
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
                    {idx < steps.length - 1 && <ChevronRight size={13} style={{ color: '#d1d5db', flexShrink: 0 }} />}
                </React.Fragment>
            ))}
        </div>
    );
};

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------
const ImportVociRicevutaModal = ({ isOpen, onClose, societaId, onImported }) => {
    const [step, setStep] = useState(1);
    const [rows, setRows] = useState([]);
    const [parseError, setParseError] = useState(null);
    const [products, setProducts] = useState([]);
    // Mappa: numero_ricevuta → { product_id, quote_types } per override manuale per riga del file
    const [productOverrides, setProductOverrides] = useState({});
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [importProgress, setImportProgress] = useState(null); // { total, current, aggiornati, nonTrovati, errori[], logs[], done }
    const [importLogFilters, setImportLogFilters] = useState({ aggiornati: true, nonTrovati: true, errori: true });
    const importLogRef = useRef(null);
    const fileInputRef = useRef(null);
    const [dragging, setDragging] = useState(false);

    // Raggruppa le righe per NUM RIC
    const groups = useMemo(() => {
        const map = {};
        for (const row of rows) {
            const key = row['NUM RIC'];
            if (!map[key]) map[key] = [];
            map[key].push(row);
        }
        // Restituisce array di { numeroRicevuta, intestatario, data, righe }
        return Object.entries(map).map(([nr, righe]) => ({
            numeroRicevuta: nr,
            intestatario: righe[0]?.['INTESTATARIO'] || '',
            data: righe[0]?.['DATA'] || '',
            righe,
        }));
    }, [rows]);

    // Per ogni riga del file, prova a trovare il prodotto corrispondente
    const rowProducts = useMemo(() => {
        const map = {};
        for (const row of rows) {
            const key = `${row['NUM RIC']}|${row['QUOTA']}`;
            if (!map[key]) {
                map[key] = matchProduct(row['QUOTA'], products);
            }
        }
        return map;
    }, [rows, products]);

    const handleFile = async (file) => {
        setParseError(null);
        setRows([]);
        setProductOverrides({});
        setImportResult(null);

        let result;
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext === 'csv' || ext === 'txt') {
            const text = await file.text();
            result = parseCsv(text);
        } else if (ext === 'xlsx' || ext === 'xls') {
            result = await parseXlsx(file);
        } else {
            setParseError('Formato non supportato. Usare CSV o XLSX.');
            return;
        }

        if (result.error) {
            setParseError(result.error);
            return;
        }

        setRows(result.rows);

        // Carica prodotti
        try {
            const res = await fetch(`/products/api?societaId=${societaId}`);
            if (res.ok) setProducts(await res.json());
        } catch (e) {
            console.error('Errore caricamento prodotti', e);
        }

        setStep(2);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    };

    const handleImport = async () => {
        setImporting(true);
        setImportLogFilters({ aggiornati: true, nonTrovati: true, errori: true });
        setImportProgress({ total: groups.length, current: 0, aggiornati: 0, nonTrovati: 0, errori: [], logs: [], done: false });
        setStep(3);

        const token = localStorage.getItem('token');
        let aggiornati = 0;
        let nonTrovati = 0;
        const errori = [];
        const logs = [];

        for (let i = 0; i < groups.length; i++) {
            const g = groups[i];
            const item = {
                numero_ricevuta: g.numeroRicevuta,
                rows: g.righe.map(row => {
                    const key = `${row['NUM RIC']}|${row['QUOTA']}`;
                    const prod = productOverrides[key] !== undefined
                        ? products.find(p => p.id === productOverrides[key]) || null
                        : rowProducts[key];
                    const quotaCleaned = stripLeadingDash(row['QUOTA']);
                    return {
                        quota: quotaCleaned,
                        importo: parseFloat(String(row['IMPORTO']).replace(',', '.')) || 0,
                        valido: row['VALIDO'] === '1' || row['VALIDO'] === 'true' || row['VALIDO'] === '' ? 1 : 0,
                        product_id: prod?.id || null,
                        quote_types: prod?.type || inferQuoteType(quotaCleaned),
                    };
                }),
            };

            try {
                const res = await fetch('/payments/api/import-voci', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ societa_id: societaId, items: [item] }),
                });
                const data = await res.json();
                if (data.error) {
                    errori.push(data.error);
                    logs.push({ type: 'ERR', message: `Ricevuta ${g.numeroRicevuta}: ${data.error}` });
                } else if (data.updated?.length > 0) {
                    aggiornati++;
                    const label = g.intestatario ? ` — ${g.intestatario}` : '';
                    logs.push({ type: 'OK', message: `Ricevuta ${g.numeroRicevuta}${label}: aggiornata` });
                } else if (data.errors?.length > 0) {
                    errori.push(data.errors[0].error);
                    logs.push({ type: 'ERR', message: `Ricevuta ${g.numeroRicevuta}: ${data.errors[0].error}` });
                } else {
                    // notFound
                    nonTrovati++;
                    logs.push({ type: 'SKIP', message: `Ricevuta ${g.numeroRicevuta}: non trovata nel sistema` });
                }
            } catch (e) {
                errori.push(`Ricevuta ${g.numeroRicevuta}: errore di rete`);
                logs.push({ type: 'ERR', message: `Ricevuta ${g.numeroRicevuta}: errore di rete` });
            }

            const snap = { total: groups.length, current: i + 1, aggiornati, nonTrovati, errori: [...errori], logs: [...logs], done: false };
            setImportProgress(snap);
            if (importLogRef.current) importLogRef.current.scrollTop = importLogRef.current.scrollHeight;
        }

        setImportProgress({ total: groups.length, current: groups.length, aggiornati, nonTrovati, errori, logs, done: true });
        if (importLogRef.current) importLogRef.current.scrollTop = importLogRef.current.scrollHeight;
        if (aggiornati > 0 && onImported) onImported();
        setImporting(false);
    };

    const handleClose = () => {
        setStep(1);
        setRows([]);
        setParseError(null);
        setProducts([]);
        setProductOverrides({});
        setImportResult(null);
        setImportProgress(null);
        setImportLogFilters({ aggiornati: true, nonTrovati: true, errori: true });
        onClose();
    };

    if (!isOpen) return null;

    // Numero ricevute con più voci (multi-item)
    const multiItemGroups = groups.filter(g => g.righe.length > 1);
    const singleItemGroups = groups.filter(g => g.righe.length === 1);

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <div style={{
                background: '#fff', borderRadius: '12px',
                width: '900px', maxWidth: '95vw', maxHeight: '90vh',
                display: 'flex', flexDirection: 'column',
                boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 20px', borderBottom: '1px solid #eee', flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FileText size={20} color="#1565c0" />
                        <span style={{ fontWeight: 700, fontSize: '1rem' }}>Importa voci ricevuta</span>
                    </div>
                    <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: '4px' }}>
                        <X size={20} />
                    </button>
                </div>

                <StepBar step={step} />

                {/* Body */}
                <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>

                    {/* ── Step 1: Upload ── */}
                    {step === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                            <p style={{ color: '#555', margin: 0, textAlign: 'center', fontSize: '0.9rem' }}>
                                Carica un file <strong>CSV</strong> o <strong>XLSX</strong> con le colonne:<br />
                                <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: '4px' }}>
                                    NUM RIC ; DATA ; INTESTATARIO ; QUOTA ; IMPORTO ; VALIDO
                                </code>
                            </p>
                            <div
                                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    width: '100%', maxWidth: '480px',
                                    border: `2px dashed ${dragging ? '#1565c0' : '#ccc'}`,
                                    borderRadius: '10px',
                                    padding: '40px 20px',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                                    cursor: 'pointer',
                                    background: dragging ? '#e8f0fe' : '#fafafa',
                                    transition: 'all 0.2s',
                                }}
                            >
                                <Upload size={36} color={dragging ? '#1565c0' : '#aaa'} />
                                <span style={{ color: '#555', fontSize: '0.9rem' }}>
                                    Trascina il file qui oppure <strong style={{ color: '#1565c0' }}>clicca per selezionare</strong>
                                </span>
                                <span style={{ color: '#aaa', fontSize: '0.78rem' }}>CSV, XLSX, XLS</span>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,.xlsx,.xls,.txt"
                                style={{ display: 'none' }}
                                onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ''; }}
                            />
                            {parseError && (
                                <div style={{ color: '#c0392b', background: '#fdedec', border: '1px solid #f1948a', borderRadius: '8px', padding: '10px 16px', display: 'flex', gap: '8px', alignItems: 'flex-start', maxWidth: '480px', width: '100%' }}>
                                    <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <span style={{ fontSize: '0.88rem' }}>{parseError}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Step 2: Preview ── */}
                    {step === 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Summary */}
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: '8px', padding: '10px 16px', fontSize: '0.88rem' }}>
                                    <strong>{groups.length}</strong> ricevute trovate nel file
                                </div>
                                {multiItemGroups.length > 0 && (
                                    <div style={{ background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: '8px', padding: '10px 16px', fontSize: '0.88rem' }}>
                                        <strong>{multiItemGroups.length}</strong> ricevute con più voci
                                    </div>
                                )}
                                <div style={{ background: '#f3e5f5', border: '1px solid #ce93d8', borderRadius: '8px', padding: '10px 16px', fontSize: '0.88rem' }}>
                                    <strong>{rows.length}</strong> righe totali
                                </div>
                            </div>

                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#555' }}>
                                Per ogni riga viene tentata la corrispondenza automatica con i prodotti del catalogo.
                                Puoi modificare il prodotto abbinato prima di procedere.
                                Solo le righe con <strong>VALIDO=1</strong> vengono importate.
                            </p>

                            {/* Table */}
                            <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                                    <thead>
                                        <tr style={{ background: '#f1f5f9' }}>
                                            <th style={thStyle}>N. Ricevuta</th>
                                            <th style={thStyle}>Data</th>
                                            <th style={thStyle}>Intestatario</th>
                                            <th style={thStyle}>Quota</th>
                                            <th style={{ ...thStyle, textAlign: 'right' }}>Importo</th>
                                            <th style={{ ...thStyle, textAlign: 'center' }}>Valido</th>
                                            <th style={thStyle}>Prodotto abbinato</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {groups.map(g => (
                                            g.righe.map((row, rIdx) => {
                                                const key = `${row['NUM RIC']}|${row['QUOTA']}`;
                                                const isValido = row['VALIDO'] === '1' || row['VALIDO'] === '' || row['VALIDO'] === 'true';
                                                const autoProduct = rowProducts[key];
                                                const overrideId = productOverrides[key];
                                                const currentProduct = overrideId !== undefined
                                                    ? products.find(p => p.id === overrideId) || null
                                                    : autoProduct;
                                                const isMulti = g.righe.length > 1;

                                                return (
                                                    <tr key={`${g.numeroRicevuta}-${rIdx}`} style={{
                                                        background: !isValido ? '#fef9f9' : (rIdx % 2 === 0 ? '#fff' : '#fafafa'),
                                                        borderLeft: isMulti ? '3px solid #1565c0' : '3px solid transparent',
                                                        opacity: isValido ? 1 : 0.55,
                                                    }}>
                                                        <td style={tdStyle}>
                                                            {rIdx === 0 ? (
                                                                <span style={{
                                                                    fontWeight: 600,
                                                                    color: isMulti ? '#1565c0' : '#333',
                                                                    fontSize: '0.82rem',
                                                                }}>
                                                                    {g.numeroRicevuta}
                                                                    {isMulti && <span style={{ marginLeft: '4px', fontSize: '0.7rem', background: '#1565c0', color: '#fff', borderRadius: '4px', padding: '1px 5px' }}>{g.righe.length} voci</span>}
                                                                </span>
                                                            ) : (
                                                                <span style={{ color: '#bbb', fontSize: '0.75rem' }}>↑</span>
                                                            )}
                                                        </td>
                                                        <td style={tdStyle}>{row['DATA']}</td>
                                                        <td style={tdStyle}>{row['INTESTATARIO']}</td>
                                                        <td style={{ ...tdStyle, fontWeight: 500 }}>{row['QUOTA']}</td>
                                                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                                                            {parseFloat(String(row['IMPORTO']).replace(',', '.') || 0).toFixed(2).replace('.', ',')} €
                                                        </td>
                                                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                            {isValido
                                                                ? <Check size={14} color="#2ecc71" />
                                                                : <span style={{ color: '#e74c3c', fontSize: '0.75rem' }}>skip</span>}
                                                        </td>
                                                        <td style={tdStyle}>
                                                            {isValido ? (
                                                                <select
                                                                    value={overrideId !== undefined ? (overrideId ?? '') : (autoProduct?.id ?? '')}
                                                                    onChange={e => {
                                                                        const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                                                                        setProductOverrides(prev => ({ ...prev, [key]: val }));
                                                                    }}
                                                                    style={{
                                                                        border: currentProduct ? '1px solid #a5d6a7' : '1px solid #e0e0e0',
                                                                        borderRadius: '4px',
                                                                        padding: '4px 8px',
                                                                        fontSize: '0.8rem',
                                                                        background: currentProduct ? '#f1faf3' : '#fff',
                                                                        color: '#222',
                                                                        height: '30px',
                                                                        maxWidth: '220px',
                                                                        width: '100%',
                                                                        appearance: 'auto',
                                                                        WebkitAppearance: 'menulist',
                                                                    }}
                                                                >
                                                                    <option value="">-- nessun prodotto --</option>
                                                                    {products.map(p => (
                                                                        <option key={p.id} value={p.id}>{p.description}</option>
                                                                    ))}
                                                                </select>
                                                            ) : (
                                                                <span style={{ color: '#aaa', fontSize: '0.75rem' }}>—</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── Step 3: Progress + Log ── */}
                    {step === 3 && importProgress && (
                        <div>
                            {!importProgress.done ? (
                                <>
                                    <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 600 }}>Importazione in corso…</h3>
                                    <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#6b7280' }}>
                                        Ricevuta {importProgress.current} di {importProgress.total}
                                    </p>
                                    <div style={{ height: '8px', borderRadius: '4px', backgroundColor: '#e0e0e0', overflow: 'hidden', marginBottom: '16px' }}>
                                        <div style={{
                                            height: '100%', borderRadius: '4px',
                                            backgroundColor: '#1565c0',
                                            width: `${importProgress.total > 0 ? Math.round((importProgress.current / importProgress.total) * 100) : 0}%`,
                                            transition: 'width 0.15s ease',
                                        }} />
                                    </div>
                                    <div style={{ display: 'flex', gap: '24px', fontSize: '0.88rem', marginBottom: '16px' }}>
                                        <span style={{ color: '#2e7d32' }}>✓ Aggiornate: <strong>{importProgress.aggiornati}</strong></span>
                                        <span style={{ color: '#888' }}>↷ Non trovate: <strong>{importProgress.nonTrovati}</strong></span>
                                        <span style={{ color: '#c62828' }}>✗ Errori: <strong>{importProgress.errori.length}</strong></span>
                                    </div>
                                    <div ref={importLogRef} style={{
                                        fontFamily: 'monospace', fontSize: '0.78rem', lineHeight: '1.6',
                                        backgroundColor: '#1e1e1e', color: '#d4d4d4', borderRadius: '6px',
                                        padding: '10px 12px', height: '200px', overflowY: 'auto',
                                        whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                                    }}>
                                        {(importProgress.logs || []).map((l, i) => (
                                            <div key={i} style={{
                                                color: l.type === 'OK' ? '#6fcf97' : l.type === 'ERR' ? '#eb5757' : '#b0b0b0'
                                            }}>
                                                {l.type === 'OK' ? '[OK]   ' : l.type === 'ERR' ? '[ERR]  ' : '[SKIP] '}{l.message}
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
                                    <p style={{ margin: '0 0 8px', fontSize: '0.78rem', color: '#6b7280' }}>Clicca per filtrare i log:</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                                        <div
                                            onClick={() => setImportLogFilters(f => ({ ...f, aggiornati: !f.aggiornati }))}
                                            style={{
                                                display: 'flex', justifyContent: 'space-between', padding: '8px 12px',
                                                backgroundColor: importLogFilters.aggiornati ? '#f1f8e9' : '#f5f5f5',
                                                borderRadius: '6px', cursor: 'pointer', userSelect: 'none',
                                                border: `2px solid ${importLogFilters.aggiornati ? '#66bb6a' : '#e0e0e0'}`,
                                                opacity: importLogFilters.aggiornati ? 1 : 0.5, transition: 'all 0.15s',
                                            }}
                                        >
                                            <span style={{ color: '#2e7d32' }}>✓ Ricevute aggiornate</span>
                                            <strong style={{ color: '#2e7d32' }}>{importProgress.aggiornati}</strong>
                                        </div>
                                        <div
                                            onClick={() => setImportLogFilters(f => ({ ...f, nonTrovati: !f.nonTrovati }))}
                                            style={{
                                                display: 'flex', justifyContent: 'space-between', padding: '8px 12px',
                                                backgroundColor: importLogFilters.nonTrovati ? '#f5f5f5' : '#f9f9f9',
                                                borderRadius: '6px', cursor: 'pointer', userSelect: 'none',
                                                border: `2px solid ${importLogFilters.nonTrovati ? '#bdbdbd' : '#e0e0e0'}`,
                                                opacity: importLogFilters.nonTrovati ? 1 : 0.5, transition: 'all 0.15s',
                                            }}
                                        >
                                            <span style={{ color: '#666' }}>↷ Non trovate nel sistema</span>
                                            <strong style={{ color: '#666' }}>{importProgress.nonTrovati}</strong>
                                        </div>
                                        <div
                                            onClick={() => setImportLogFilters(f => ({ ...f, errori: !f.errori }))}
                                            style={{
                                                display: 'flex', justifyContent: 'space-between', padding: '8px 12px',
                                                backgroundColor: importLogFilters.errori ? '#fff3f3' : '#f9f9f9',
                                                borderRadius: '6px', cursor: 'pointer', userSelect: 'none',
                                                border: `2px solid ${importLogFilters.errori ? '#ef9a9a' : '#e0e0e0'}`,
                                                opacity: importLogFilters.errori ? 1 : 0.5, transition: 'all 0.15s',
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
                                        whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                                    }}>
                                        {(importProgress.logs || [])
                                            .filter(l =>
                                                (l.type === 'OK'   && importLogFilters.aggiornati) ||
                                                (l.type === 'SKIP' && importLogFilters.nonTrovati)  ||
                                                (l.type === 'ERR'  && importLogFilters.errori)
                                            )
                                            .map((l, i) => (
                                                <div key={i} style={{
                                                    color: l.type === 'OK' ? '#6fcf97' : l.type === 'ERR' ? '#eb5757' : '#b0b0b0'
                                                }}>
                                                    {l.type === 'OK' ? '[OK]   ' : l.type === 'ERR' ? '[ERR]  ' : '[SKIP] '}{l.message}
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
                <div style={{
                    display: 'flex', justifyContent: 'flex-end', gap: '10px',
                    padding: '14px 20px', borderTop: '1px solid #eee', flexShrink: 0,
                    background: '#fafafa',
                }}>
                    {step === 1 && (
                        <button onClick={handleClose} style={btnSecondary}>Annulla</button>
                    )}
                    {step === 2 && (
                        <>
                            <button onClick={() => { setStep(1); setRows([]); setParseError(null); }} style={btnSecondary}>
                                Indietro
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={importing || groups.length === 0}
                                style={{ ...btnPrimary, opacity: (importing || groups.length === 0) ? 0.6 : 1, cursor: (importing || groups.length === 0) ? 'not-allowed' : 'pointer' }}
                            >
                                {importing ? 'Importazione in corso…' : `Importa ${groups.length} ricevute`}
                            </button>
                        </>
                    )}
                    {step === 3 && (
                        <button onClick={handleClose} disabled={!importProgress?.done} style={{ ...btnPrimary, opacity: !importProgress?.done ? 0.4 : 1, cursor: !importProgress?.done ? 'not-allowed' : 'pointer' }}>Chiudi</button>
                    )}
                </div>
            </div>
        </div>
    );
};

const thStyle = {
    padding: '8px 12px',
    textAlign: 'left',
    fontWeight: 600,
    fontSize: '0.78rem',
    color: '#374151',
    borderBottom: '1px solid #e5e7eb',
    whiteSpace: 'nowrap',
};
const tdStyle = {
    padding: '7px 12px',
    borderBottom: '1px solid #f3f4f6',
    verticalAlign: 'middle',
};
const btnPrimary = {
    background: '#1565c0', color: '#fff', border: 'none',
    borderRadius: '6px', padding: '8px 20px', fontWeight: 600,
    fontSize: '0.9rem', cursor: 'pointer',
};
const btnSecondary = {
    background: '#fff', color: '#555', border: '1px solid #ddd',
    borderRadius: '6px', padding: '8px 20px', fontWeight: 500,
    fontSize: '0.9rem', cursor: 'pointer',
};

export default ImportVociRicevutaModal;
