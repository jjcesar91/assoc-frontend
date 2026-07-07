import React, { useState, useRef } from 'react';
import { X, Upload, AlertTriangle, Check, Tag } from 'lucide-react';

// Parser CSV con supporto campi quotati (formato Odoo: separatore virgola)
function parseOdooCSV(text) {
    const records = [];
    let cur = ''; let inQ = false; let fields = [];
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQ) {
            if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; }
            else if (ch === '"') { inQ = false; }
            else { cur += ch; }
        } else if (ch === '"') {
            inQ = true;
        } else if (ch === ',') {
            fields.push(cur.trim()); cur = '';
        } else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
            if (ch === '\r') i++;
            fields.push(cur.trim()); cur = '';
            if (fields.some(f => f !== '')) records.push(fields);
            fields = [];
        } else {
            cur += ch;
        }
    }
    if (cur.trim() || fields.length) { fields.push(cur.trim()); if (fields.some(f => f !== '')) records.push(fields); }
    return records;
}

// Converte data Odoo "DD/MM/YYYY HH:MM:SS" → "YYYY-MM-DD"
function parseOdooDate(s) {
    if (!s) return null;
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (!m) return null;
    return `${m[3]}-${m[2]}-${m[1]}`;
}

// Parsa importo in formato italiano "1.234,56" o "1234.56"
function parseImporto(s) {
    if (!s) return 0;
    const cleaned = s.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
}

// Estrae nome addetto da "ETS Point Group - David" → "David"
function stripAddettoPrefix(s) {
    if (!s) return '';
    const idx = s.lastIndexOf(' - ');
    return idx >= 0 ? s.slice(idx + 3).trim() : s.trim();
}

// Parsa file CSV e raggruppa per Riferimento ordine (gestisce righe duplicate per etichette)
function parseFile(text) {
    const allRecords = parseOdooCSV(text);
    if (allRecords.length < 2) return { error: 'File vuoto o non valido.' };

    const headers = allRecords[0];
    const col = (name) => headers.findIndex(h => h.trim() === name);
    const g = (cells, name) => { const idx = col(name); return idx >= 0 ? (cells[idx] || '').trim() : ''; };

    const dataRows = allRecords.slice(1);

    // Raggruppa per Riferimento ordine: colleziona etichette da righe duplicate
    const ordiniMap = new Map();
    for (const cells of dataRows) {
        const rif = g(cells, 'Riferimento ordine');
        if (!rif) continue;

        const etichettaRiga = g(cells, 'Etichette/Nome etichetta') || g(cells, 'Etichette');

        if (ordiniMap.has(rif)) {
            // Riga aggiuntiva: aggiungi solo l'etichetta se non già presente
            if (etichettaRiga) {
                const existing = ordiniMap.get(rif);
                const labels = existing.etichette ? existing.etichette.split(',').map(s => s.trim()) : [];
                if (!labels.includes(etichettaRiga)) {
                    existing.etichette = [...labels, etichettaRiga].join(', ');
                }
            }
        } else {
            ordiniMap.set(rif, {
                riferimento_ordine: rif,
                cliente: g(cells, 'Cliente'),
                stato_fattura: g(cells, 'Stato fattura'),
                totale: parseImporto(g(cells, 'Totale')),
                data_ordine: parseOdooDate(g(cells, 'Data ordine')),
                etichette: etichettaRiga || '',
                addetto_vendite: stripAddettoPrefix(g(cells, 'Addetto vendite')),
            });
        }
    }

    if (ordiniMap.size === 0) return { error: 'Nessun ordine trovato (colonna "Riferimento ordine" mancante o vuota).' };

    // Valida formato riferimento ordine
    const righe = Array.from(ordiniMap.values());
    const nonValidi = righe.filter(r => !/^[Ss]\d+$/.test(r.riferimento_ordine));
    if (nonValidi.length > 0) {
        return { error: `Formato riferimento ordine non valido: ${nonValidi.map(r => r.riferimento_ordine).join(', ')}. Atteso formato "S00217".` };
    }

    return { rows: righe };
}

const STATO_BADGE = {
    'Da fatturare': { label: 'PROFORMA', color: 'var(--primary-hover)', bg: 'var(--primary-container)', border: 'var(--primary)' },
    'Interamente fatturato': { label: 'PAGATO', color: 'var(--success)', bg: 'var(--success-container)', border: 'var(--success)' },
};

const ImportOrdiniOdooModal = ({ isOpen, onClose, societaId, onImported }) => {
    const fileRef = useRef(null);
    const [preview, setPreview] = useState(null); // { rows: [] } | null
    const [parseError, setParseError] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null); // { count } | { error, conflitti }

    const resetState = () => {
        setPreview(null);
        setParseError('');
        setResult(null);
        if (fileRef.current) fileRef.current.value = '';
    };

    const handleClose = () => { resetState(); onClose(); };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setParseError('');
        setPreview(null);
        setResult(null);
        try {
            const text = await file.text();
            const parsed = parseFile(text);
            if (parsed.error) { setParseError(parsed.error); return; }
            setPreview(parsed);
        } catch (err) {
            setParseError('Errore durante la lettura del file: ' + err.message);
        }
    };

    const handleImport = async () => {
        if (!preview?.rows?.length) return;
        setLoading(true);
        setResult(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/payments/api/import-odoo-ordini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ societa_id: societaId, rows: preview.rows }),
            });
            const data = await res.json();
            if (res.ok) {
                setResult({ success: true, count: data.count });
                onImported?.();
            } else if (res.status === 409) {
                setResult({ error: data.error, conflitti: data.conflitti });
            } else {
                setResult({ error: data.error || 'Errore durante l\'importazione.' });
            }
        } catch (err) {
            setResult({ error: 'Errore di rete: ' + err.message });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(16, 24, 40, 0.45)', backdropFilter: 'blur(2px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px',
        }}>
            <div style={{
                backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '28px',
                width: '90%', maxWidth: '900px', maxHeight: '90vh',
                display: 'flex', flexDirection: 'column', gap: '20px',
                boxShadow: 'var(--shadow-modal)',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Upload size={20} /> Importa ordini da Odoo
                    </h2>
                    <button onClick={handleClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        <X size={22} />
                    </button>
                </div>

                {/* File picker */}
                <div>
                    <label style={{ fontSize: '0.9rem', color: '#555', marginBottom: '8px', display: 'block' }}>
                        Seleziona il file CSV esportato da Odoo (<em>Ordine di vendita</em>)
                    </label>
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        style={{ display: 'block' }}
                    />
                </div>

                {/* Errore parsing */}
                {parseError && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--on-danger-container)', backgroundColor: 'var(--danger-container)', border: '1px solid var(--danger-container)', borderRadius: '8px', padding: '12px 16px', fontSize: '0.9rem' }}>
                        <AlertTriangle size={18} /> {parseError}
                    </div>
                )}

                {/* Risultato import */}
                {result && (
                    result.success
                        ? <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', backgroundColor: 'var(--success-container)', border: '1px solid var(--success-container)', borderRadius: '8px', padding: '12px 16px', fontSize: '0.95rem', fontWeight: 600 }}>
                            <Check size={20} /> {result.count} ordini importati con successo.
                        </div>
                        : <div style={{ backgroundColor: 'var(--danger-container)', border: '1px solid var(--danger-container)', borderRadius: '8px', padding: '12px 16px', fontSize: '0.9rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--on-danger-container)', fontWeight: 600, marginBottom: result.conflitti?.length ? '8px' : 0 }}>
                                <AlertTriangle size={18} /> {result.error}
                            </div>
                            {result.conflitti?.length > 0 && (
                                <div style={{ color: 'var(--on-danger-container)', fontSize: '0.85rem' }}>
                                    Ricevute in conflitto: {result.conflitti.join(', ')}
                                </div>
                            )}
                        </div>
                )}

                {/* Preview tabella */}
                {preview?.rows?.length > 0 && !result?.success && (
                    <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                        <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '8px', fontWeight: 600 }}>
                            {preview.rows.length} ordini trovati — verranno importati come indicato:
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                            <thead>
                                <tr style={{ backgroundColor: 'var(--surface-1)', position: 'sticky', top: 0 }}>
                                    {['Rif. ordine', 'N. ricevuta', 'Cliente', 'Stato', 'Importo', 'Data ordine', 'Etichette', 'Addetto'].map(h => (
                                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '2px solid var(--border-color)', whiteSpace: 'nowrap', fontWeight: 700 }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {preview.rows.map((row, i) => {
                                    const numStr = row.riferimento_ordine.replace(/^[Ss]+0*/, '');
                                    const statoCfg = STATO_BADGE[row.stato_fattura] || STATO_BADGE['Da fatturare'];
                                    return (
                                        <tr key={i} style={{ borderBottom: '1px solid var(--surface-1)', backgroundColor: i % 2 === 0 ? '#fff' : 'var(--surface-1)' }}>
                                            <td style={{ padding: '7px 10px', fontWeight: 600 }}>{row.riferimento_ordine}</td>
                                            <td style={{ padding: '7px 10px', color: 'var(--primary)', fontWeight: 600 }}>{numStr}/ANNO</td>
                                            <td style={{ padding: '7px 10px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.cliente}>{row.cliente}</td>
                                            <td style={{ padding: '7px 10px' }}>
                                                <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '6px', fontWeight: 700, fontSize: '0.78rem', background: statoCfg.bg, color: statoCfg.color, border: `1px solid ${statoCfg.border}` }}>
                                                    {statoCfg.label}
                                                </span>
                                            </td>
                                            <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600 }}>€ {row.totale.toFixed(2).replace('.', ',')}</td>
                                            <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>{row.data_ordine || '—'}</td>
                                            <td style={{ padding: '7px 10px' }}>
                                                {row.etichette
                                                    ? row.etichette.split(',').map((e, j) => (
                                                        <span key={j} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'var(--info-container)', color: 'var(--primary-hover)', border: '1px solid var(--info-container)', borderRadius: '4px', padding: '1px 6px', fontSize: '0.75rem', marginRight: '4px' }}>
                                                            <Tag size={10} />{e.trim()}
                                                        </span>
                                                    ))
                                                    : <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                                                }
                                            </td>
                                            <td style={{ padding: '7px 10px', color: '#555' }}>{row.addetto_vendite || '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Footer azioni */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                    <button
                        onClick={handleClose}
                        style={{ padding: '8px 20px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.9rem' }}
                    >
                        {result?.success ? 'Chiudi' : 'Annulla'}
                    </button>
                    {preview?.rows?.length > 0 && !result?.success && (
                        <button
                            onClick={handleImport}
                            disabled={loading}
                            style={{ padding: '8px 24px', borderRadius: '6px', border: 'none', background: loading ? 'var(--info-container)' : 'var(--primary)', color: 'white', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.9rem', fontWeight: 600 }}
                        >
                            {loading ? 'Importazione...' : `Importa ${preview.rows.length} ordini`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImportOrdiniOdooModal;
