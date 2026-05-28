import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BookOpen, FolderOpen, Trash2, Plus, BarChart2, Download, Star, ChevronDown, Search, X, Calendar, CreditCard, FileText, User, Tag, Upload, ExternalLink } from 'lucide-react';
import { useConfirm } from '../components/ConfirmModal';
import { useSocieta } from '../data/SocietaContext';
import { useAnno, getAnnoDateRange } from '../data/AnnoContext';
import NuovaOperazioneModal from './NuovaOperazioneModal';
import ImportPrimaNotaModal from './ImportPrimaNotaModal';
import './Soci.css';

// ---------------------------------------------------------------------------
// Dropdown: Operazioni Preferite
// ---------------------------------------------------------------------------
const OperazioniPreferiteDropdown = ({ societaId, onSelect }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [preferite, setPreferite] = useState([]);
    const dropdownRef = useRef(null);
    const confirm = useConfirm();

    useEffect(() => {
        if (!open) return;
        const key = `op_preferite_${societaId}`;
        const stored = JSON.parse(localStorage.getItem(key) || '[]');
        setPreferite(stored);
        setQuery('');
    }, [open, societaId]);

    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    const handleDeletePreferita = async (e, pref) => {
        e.stopPropagation();
        const ok = await confirm(`Eliminare la preferita "${pref.nome}"?`, 'Elimina preferita');
        if (!ok) return;
        const key = `op_preferite_${societaId}`;
        const updated = preferite.filter(p => p.id !== pref.id);
        localStorage.setItem(key, JSON.stringify(updated));
        setPreferite(updated);
    };

    const filtered = useMemo(() => {
        if (!query.trim()) return preferite;
        const q = query.toLowerCase();
        return preferite.filter(p => p.nome.toLowerCase().includes(q));
    }, [preferite, query]);

    return (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
                onClick={() => setOpen(v => !v)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '8px 16px',
                    backgroundColor: '#f59e0b',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                }}
            >
                <Star size={16} />
                Preferite
                <ChevronDown size={14} />
            </button>

            {open && (
                <div style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 6px)',
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
                    zIndex: 1100,
                    minWidth: '280px',
                    maxWidth: '360px',
                }}>
                    <div style={{ padding: '10px 12px', borderBottom: '1px solid #f0f0f0' }}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <Search size={14} style={{ position: 'absolute', left: '8px', color: '#9ca3af', pointerEvents: 'none' }} />
                            <input
                                autoFocus
                                className="md-input"
                                placeholder="Cerca preferita…"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                style={{ paddingLeft: '28px', width: '100%', boxSizing: 'border-box' }}
                            />
                        </div>
                    </div>
                    <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                        {filtered.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>
                                {preferite.length === 0 ? 'Nessuna operazione preferita salvata' : 'Nessun risultato'}
                            </div>
                        ) : filtered.map(pref => (
                            <div
                                key={pref.id}
                                style={{
                                    padding: '10px 14px',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid #f9fafb',
                                    fontSize: '0.9rem',
                                    color: '#1f2937',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'background 0.1s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#fef3c7'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                                onClick={() => { onSelect(pref.snapshot); setOpen(false); }}
                            >
                                <Star size={13} style={{ color: '#f59e0b', flexShrink: 0 }} />
                                <span style={{ fontWeight: '500', flex: 1 }}>{pref.nome}</span>
                                <button
                                    title="Elimina preferita"
                                    onClick={e => handleDeletePreferita(e, pref)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '2px 4px',
                                        color: '#9ca3af',
                                        display: 'flex',
                                        alignItems: 'center',
                                        borderRadius: '4px',
                                        flexShrink: 0,
                                        transition: 'color 0.15s',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; }}
                                    onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; }}
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ---------------------------------------------------------------------------
// Modal: Dettaglio Operazione
// ---------------------------------------------------------------------------
const DettaglioOperazioneModal = ({ payment, onClose }) => {
    if (!payment) return null;

    const importo = parseFloat(payment.importo || 0);
    const isAnnullato = payment.stato_pagamento?.startsWith('3.');
    const isEntrata = importo >= 0 && !isAnnullato;

    const formatDate = (s) => {
        if (!s) return '—';
        const [y, m, d] = s.split('-');
        return `${d}/${m}/${y}`;
    };

    const rows = [
        { icon: <Tag size={15} />, label: 'Operazione', value: payment.quote || payment.numero_ricevuta || `#${payment.id}` },
        { icon: <Calendar size={15} />, label: 'Data', value: formatDate(payment.data_pagamento) },
        { icon: <User size={15} />, label: 'Intestatario', value: payment.intestatario || '—' },
        { icon: <CreditCard size={15} />, label: 'Modalità pagamento', value: payment.modalita_pagamento || '—' },
        { icon: <FileText size={15} />, label: 'Conto', value: payment.conto_destinazione || '—' },
        ...(payment.note ? [{ icon: <FileText size={15} />, label: 'Note', value: payment.note }] : []),
        { icon: <FileText size={15} />, label: 'Stato', value: (payment.stato_pagamento || '—').replace(/^\d+\.\s*/, '') },
    ];

    return (
        <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}

        >
            <div
                style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid #f0f0f0', background: isAnnullato ? '#e74c3c' : (isEntrata ? '#2ecc71' : '#e74c3c') }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff' }}>
                        <FolderOpen size={20} />
                        <span style={{ fontWeight: '700', fontSize: '1rem' }}>Dettaglio Operazione</span>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}>
                        <X size={18} />
                    </button>
                </div>

                {/* Importo prominente */}
                <div style={{ padding: '20px 20px 0', textAlign: 'center' }}>
                    <span style={{
                        display: 'inline-block',
                        backgroundColor: isAnnullato ? '#e74c3c' : (isEntrata ? '#2ecc71' : '#e74c3c'),
                        color: '#fff',
                        padding: '8px 24px',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '1.4rem',
                        textDecoration: isAnnullato ? 'line-through' : 'none',
                    }}>
                        {isEntrata ? '+ ' : '− '}{Math.abs(importo).toFixed(2).replace('.', ',')} €
                    </span>
                </div>

                {/* Campi */}
                <div style={{ padding: '16px 20px 20px' }}>
                    {rows.map((row, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 0', borderBottom: i < rows.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                            <div style={{ color: '#9ca3af', marginTop: '1px', flexShrink: 0 }}>{row.icon}</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{row.label}</div>
                                <div style={{ fontSize: '0.95rem', color: '#1f2937', fontWeight: '500' }}>{row.value}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div style={{ padding: '12px 20px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {payment.socio_id ? (
                        <button
                            onClick={() => window.open(`/pagamenti?paymentId=${payment.id}`, '_blank')}
                            style={{ padding: '8px 16px', background: '#1565c0', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', color: '#fff', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <ExternalLink size={15} /> Vedi pagamento
                        </button>
                    ) : <span />}
                    <button
                        onClick={onClose}
                        style={{ padding: '8px 20px', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', color: '#374151', fontSize: '0.9rem' }}
                    >
                        Chiudi
                    </button>
                </div>
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Tab: Prima Nota
// ---------------------------------------------------------------------------
const PrimaNotaTab = ({ payments, loading, selectedAnno, societa, onNuovaOperazione, onNuovaOperazioneDaPreferita, onDettaglio, onElimina, onImportCsv }) => {
    const dateRange = useMemo(() => {
        if (!selectedAnno || !societa) {
            const y = new Date().getFullYear();
            return { dataDa: `${y}-01-01`, dataA: `${y}-12-31` };
        }
        const { start, end } = getAnnoDateRange(selectedAnno, societa);
        return {
            dataDa: start.toISOString().split('T')[0],
            dataA: end.toISOString().split('T')[0],
        };
    }, [selectedAnno, societa]);

    const [filters, setFilters] = useState({
        descrizione: '',
        intestatario: '',
        dataDa: dateRange.dataDa,
        dataA: dateRange.dataA,
        conto: 'TUTTI',
        segno: 'TUTTI',
    });

    useEffect(() => {
        setFilters(prev => ({ ...prev, dataDa: dateRange.dataDa, dataA: dateRange.dataA }));
    }, [dateRange.dataDa, dateRange.dataA]);

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setCurrentPage(1);
    };

    const handleResetFilters = () => {
        setFilters({
            descrizione: '',
            intestatario: '',
            dataDa: dateRange.dataDa,
            dataA: dateRange.dataA,
            conto: 'TUTTI',
            segno: 'TUTTI',
        });
        setCurrentPage(1);
    };

    const contiUnici = useMemo(() => {
        const s = new Set(payments.map(p => p.conto_destinazione).filter(Boolean));
        return [...s].sort();
    }, [payments]);

    const filtered = useMemo(() => {
        return payments.filter(p => {
            if (filters.dataDa && p.data_pagamento < filters.dataDa) return false;
            if (filters.dataA && p.data_pagamento > filters.dataA) return false;
            if (filters.descrizione) {
                const q = filters.descrizione.toLowerCase();
                const inQuote = (p.quote || '').toLowerCase().includes(q);
                const inRicevuta = (p.numero_ricevuta || '').toLowerCase().includes(q);
                if (!inQuote && !inRicevuta) return false;
            }
            if (filters.intestatario) {
                const q = filters.intestatario.toLowerCase();
                if (!(p.intestatario || '').toLowerCase().includes(q)) return false;
            }
            if (filters.conto !== 'TUTTI' && p.conto_destinazione !== filters.conto) return false;
            if (filters.segno !== 'TUTTI') {
                const importo = parseFloat(p.importo || 0);
                const isAnnullato = p.stato_pagamento?.startsWith('3.');
                if (filters.segno === 'AVERE' && (importo < 0 || isAnnullato)) return false;
                if (filters.segno === 'DARE' && importo >= 0 && !isAnnullato) return false;
            }
            return true;
        }).sort((a, b) => (b.data_pagamento || '').localeCompare(a.data_pagamento || ''));
    }, [payments, filters]);

    const totaleAvere = useMemo(() =>
        filtered
            .filter(p => parseFloat(p.importo || 0) >= 0 && !p.stato_pagamento?.startsWith('3.'))
            .reduce((acc, p) => acc + parseFloat(p.importo || 0), 0),
        [filtered]
    );

    const PAGE_SIZE = 50;
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const paginatedFiltered = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const formatDate = (s) => {
        if (!s) return '\u2014';
        const [y, m, d] = s.split('-');
        return `${d}/${m}/${y}`;
    };

    return (
        <>
            {/* Filters Toolbar */}
            <div className="toolbar-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '12px', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '12px', flex: 1 }}>

                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: '130px' }}>
                        <label style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Data da</label>
                        <input
                            type="date"
                            className="md-input"
                            style={{ padding: '6px 12px' }}
                            value={filters.dataDa}
                            onChange={(e) => handleFilterChange('dataDa', e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: '130px' }}>
                        <label style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Data a</label>
                        <input
                            type="date"
                            className="md-input"
                            style={{ padding: '6px 12px' }}
                            value={filters.dataA}
                            onChange={(e) => handleFilterChange('dataA', e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button
                            onClick={handleResetFilters}
                            title="Reimposta filtri"
                            style={{
                                padding: '7px 10px',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                background: '#f9fafb',
                                cursor: 'pointer',
                                color: '#374151',
                                fontSize: '1rem',
                                lineHeight: 1,
                            }}
                        >
                            &#8635;
                        </button>
                    </div>

                    <div style={{ width: '1px', background: '#e0e0e0', alignSelf: 'stretch', margin: '0 2px' }} />

                    <div style={{ display: 'flex', flexDirection: 'column', flex: 2, minWidth: '160px' }}>
                        <label style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Descrizione</label>
                        <input
                            className="md-input"
                            placeholder="Cerca in descrizione o num. ricevuta..."
                            style={{ padding: '6px 12px' }}
                            value={filters.descrizione}
                            onChange={(e) => handleFilterChange('descrizione', e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '140px' }}>
                        <label style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Fornitore / Cliente</label>
                        <input
                            className="md-input"
                            placeholder="Intestatario..."
                            style={{ padding: '6px 12px' }}
                            value={filters.intestatario}
                            onChange={(e) => handleFilterChange('intestatario', e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '120px' }}>
                        <label style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Conto</label>
                        <select
                            className="md-select"
                            style={{ padding: '6px 12px' }}
                            value={filters.conto}
                            onChange={(e) => handleFilterChange('conto', e.target.value)}
                        >
                            <option value="TUTTI">Tutti</option>
                            {contiUnici.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '110px' }}>
                        <label style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Entrata/Uscita</label>
                        <select
                            className="md-select"
                            style={{ padding: '6px 12px' }}
                            value={filters.segno}
                            onChange={(e) => handleFilterChange('segno', e.target.value)}
                        >
                            <option value="TUTTI">Tutti</option>
                            <option value="AVERE">Entrata</option>
                            <option value="DARE">Uscita</option>
                        </select>
                    </div>
                    </div>{/* fine inner flex */}

                    {/* Bottone Nuova Operazione + Preferiti + Importa CSV */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', flexShrink: 0, gap: '8px' }}>
                        <OperazioniPreferiteDropdown
                            societaId={societa?.id}
                            onSelect={onNuovaOperazioneDaPreferita}
                        />
                        <button
                            onClick={onImportCsv}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '7px',
                                padding: '8px 16px',
                                backgroundColor: '#1565c0',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <Upload size={16} />
                            Importa Prima Nota
                        </button>
                        <button
                            onClick={onNuovaOperazione}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '7px',
                                padding: '8px 16px',
                                backgroundColor: '#4caf50',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <Plus size={16} />
                            Nuova
                        </button>
                    </div>
                </div>
            </div>

            {/* Table Block */}
            <div style={{ marginTop: '0', flex: 1, display: 'flex', flexDirection: 'column' }} className="card">
                <div className="table-responsive">
                    <table
                        className="md-table"
                        style={{ borderCollapse: 'separate', borderSpacing: '0 3px', backgroundColor: 'transparent' }}
                    >
                        <thead>
                            <tr>
                                <th style={{ padding: '12px 16px', borderTopLeftRadius: '6px', borderBottomLeftRadius: '6px', backgroundColor: '#4caf50', color: '#fff', whiteSpace: 'nowrap', fontWeight: '600' }}>
                                    Operazione - tipologia
                                </th>
                                <th style={{ padding: '12px 16px', backgroundColor: '#4caf50', color: '#fff', whiteSpace: 'nowrap', fontWeight: '600', borderLeft: '1px solid rgba(255,255,255,0.25)' }}>
                                    Data
                                </th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', backgroundColor: '#4caf50', color: '#fff', whiteSpace: 'nowrap', fontWeight: '600', borderLeft: '1px solid rgba(255,255,255,0.25)' }}>
                                    Importo
                                </th>
                                <th style={{ padding: '12px 16px', backgroundColor: '#4caf50', color: '#fff', whiteSpace: 'nowrap', fontWeight: '600', borderLeft: '1px solid rgba(255,255,255,0.25)' }}>
                                    Conto
                                </th>
                                <th style={{ padding: '12px 16px', backgroundColor: '#4caf50', color: '#fff', whiteSpace: 'nowrap', fontWeight: '600', borderLeft: '1px solid rgba(255,255,255,0.25)' }}>
                                    Modalità
                                </th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', backgroundColor: '#4caf50', color: '#fff', borderTopRightRadius: '6px', borderBottomRightRadius: '6px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                    Azioni
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                                        Caricamento...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                                        Nessuna registrazione trovata
                                    </td>
                                </tr>
                            ) : paginatedFiltered.map(p => {
                                const importo = parseFloat(p.importo || 0);
                                const isAnnullato = p.stato_pagamento?.startsWith('3.');
                                const isEntrata = importo >= 0 && !isAnnullato;

                                const titolo = [p.numero_ricevuta, p.quote].filter(Boolean).join(' - ');

                                const quoteTypeLabel = (types) => {
                                    if (!types) return null;
                                    const map = {
                                        quota_associativa: 'Quota associativa',
                                        tesseramento: 'Tesseramento',
                                        generic: 'Prodotto generico',
                                        periodic_quota: 'Quota periodica',
                                        subscription: 'Abbonamento',
                                        inscription: 'Iscrizione',
                                        schedule: 'Scadenzario',
                                    };
                                    const first = types.split(',')[0].trim();
                                    return map[first] || first;
                                };

                                const typeLabel = quoteTypeLabel(p.quote_types);
                                const sottotitolo = (p.socio_id && p.quote_types)
                                    ? `RISCOSSO DA CLIENTE${typeLabel ? ` \u2014 ${typeLabel}` : ''}`
                                    : null;

                                return (
                                    <tr
                                        key={p.id}
                                        style={{
                                            backgroundColor: isAnnullato ? '#fceceb' : '#fff',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                                            borderLeft: `4px solid ${isAnnullato ? '#e74c3c' : (isEntrata ? '#2ecc71' : '#e74c3c')}`,
                                            opacity: isAnnullato ? 0.75 : 1,
                                        }}
                                    >
                                        <td style={{ padding: '10px 16px', borderTopLeftRadius: '4px', borderBottomLeftRadius: '4px', maxWidth: '420px' }}>
                                            <div style={{
                                                fontWeight: '600',
                                                color: isAnnullato ? '#c0392b' : 'var(--text-primary)',
                                                textDecoration: isAnnullato ? 'line-through' : 'none',
                                                fontSize: '0.9rem',
                                            }}>
                                                {titolo || `#${p.id}`}
                                            </div>
                                            {sottotitolo && (
                                                <div style={{
                                                    fontSize: '0.72rem',
                                                    color: 'var(--text-secondary)',
                                                    marginTop: '2px',
                                                    fontWeight: '600',
                                                    letterSpacing: '0.04em',
                                                    textTransform: 'uppercase',
                                                }}>
                                                    {sottotitolo}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '10px 16px', whiteSpace: 'nowrap', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                            {formatDate(p.data_pagamento)}
                                        </td>
                                        <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                                            <span style={{
                                                backgroundColor: isAnnullato ? '#e74c3c' : (isEntrata ? '#2ecc71' : '#e74c3c'),
                                                color: 'white',
                                                padding: '3px 10px',
                                                borderRadius: '4px',
                                                fontWeight: 'bold',
                                                fontSize: '0.875rem',
                                                display: 'inline-block',
                                                minWidth: '72px',
                                                textAlign: 'right',
                                                textDecoration: isAnnullato ? 'line-through' : 'none',
                                            }}>
                                                {isEntrata ? '+ ' : '\u2212 '}{Math.abs(importo).toFixed(2).replace('.', ',')}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px 16px', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                                            {p.conto_destinazione || '\u2014'}
                                        </td>
                                        <td style={{ padding: '10px 16px', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                                            {p.modalita_pagamento || '\u2014'}
                                        </td>
                                        <td style={{ padding: '10px 16px', textAlign: 'right', borderTopRightRadius: '4px', borderBottomRightRadius: '4px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '5px' }}>
                                                <button
                                                    style={{ padding: 0, border: 'none', width: '30px', height: '30px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backgroundColor: '#3b82f6', color: 'white' }}
                                                    title="Dettaglio"
                                                    onClick={() => onDettaglio(p)}
                                                >
                                                    <FolderOpen size={14} />
                                                </button>
                                                {p.quote_types === 'operazione_manuale' && (
                                                    <button
                                                        style={{ padding: 0, border: 'none', width: '30px', height: '30px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backgroundColor: '#e74c3c', color: 'white' }}
                                                        title="Elimina"
                                                        onClick={() => onElimina(p)}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                {!loading && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 8px 0', borderTop: '1px solid #eee', marginTop: 'auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <button disabled={safePage === 1} onClick={() => setCurrentPage(1)} style={{ border: '1px solid #ddd', background: 'white', color: '#333', padding: '5px 10px', borderRadius: '4px', cursor: safePage === 1 ? 'not-allowed' : 'pointer', opacity: safePage === 1 ? 0.4 : 1 }}>&lt;&lt;</button>
                            <button disabled={safePage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} style={{ border: '1px solid #ddd', background: 'white', color: '#333', padding: '5px 10px', borderRadius: '4px', cursor: safePage === 1 ? 'not-allowed' : 'pointer', opacity: safePage === 1 ? 0.4 : 1 }}>&lt;</button>
                            <span style={{ background: '#4caf50', color: 'white', padding: '5px 10px', borderRadius: '4px', fontWeight: 'bold', minWidth: '36px', textAlign: 'center' }}>{safePage} / {totalPages}</span>
                            <button disabled={safePage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} style={{ border: '1px solid #ddd', background: 'white', color: '#333', padding: '5px 10px', borderRadius: '4px', cursor: safePage === totalPages ? 'not-allowed' : 'pointer', opacity: safePage === totalPages ? 0.4 : 1 }}>&gt;</button>
                            <button disabled={safePage === totalPages} onClick={() => setCurrentPage(totalPages)} style={{ border: '1px solid #ddd', background: 'white', color: '#333', padding: '5px 10px', borderRadius: '4px', cursor: safePage === totalPages ? 'not-allowed' : 'pointer', opacity: safePage === totalPages ? 0.4 : 1 }}>&gt;&gt;</button>
                            <span style={{ marginLeft: '8px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Tot righe: <strong>{filtered.length}</strong></span>
                        </div>
                        <span style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: '1rem' }}>
                            € {totaleAvere.toFixed(2).replace('.', ',')}
                        </span>
                    </div>
                )}
            </div>
        </>
    );
};

// ---------------------------------------------------------------------------
// Mapping automatico quote_types → codice sottogruppo APS
const QUOTE_TYPE_TO_CODICE = {
    quota_associativa: 'AE1',
    inscription:       'AE1', // retrocompatibilità pagamenti precedenti alla migrazione
    subscription:      'AE3',
    tesseramento:      'AE3',
    generic:           'AE3',
};

// Tab: Bilancio (Mod. D - Rendiconto per Cassa)
// ---------------------------------------------------------------------------
const BilancioTab = ({ payments, loading, selectedAnno, societa }) => {
    const { selectedSocietaId, societaList } = useSocieta();
    const [gruppi, setGruppi] = useState([]);
    const [loadingGruppi, setLoadingGruppi] = useState(false);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const tableRef = useRef(null);

    const nomeSocieta = useMemo(
        () => societa?.denominazione || societa?.nome || '',
        [societa]
    );

    const handleDownloadPdf = async () => {
        if (!tableRef.current) return;
        setGeneratingPdf(true);
        try {
            const html2pdf = (await import('html2pdf.js')).default;

            // A4 portrait con margini 8mm: area utile ≈ 194mm ≈ 733px a 96dpi.
            // I font e i padding vengono scalati al 70% per far stare tutto in verticale.
            const SCALE = 0.70;
            const clone = tableRef.current.cloneNode(true);
            clone.style.cssText = 'box-sizing:border-box;background:#ffffff;padding:6px 8px;width:700px;font-family:Arial,sans-serif;';

            // Copia colori e stili computati dall'originale al clone
            const originalEls = Array.from(tableRef.current.querySelectorAll('*'));
            const cloneEls = Array.from(clone.querySelectorAll('*'));
            const PROPS = ['color', 'backgroundColor', 'fontWeight', 'fontStyle',
                           'textDecoration', 'borderTopColor', 'borderBottomColor',
                           'borderLeftColor', 'borderRightColor', 'fontSize'];
            const PAD_PROPS = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'];
            originalEls.forEach((orig, i) => {
                const cs = window.getComputedStyle(orig);
                const cl = cloneEls[i];
                if (!cl) return;
                PROPS.forEach(p => { cl.style[p] = cs[p]; });
                PAD_PROPS.forEach(p => { cl.style[p] = cs[p]; });
            });

            // Riduce font e padding del clone per adattarli al formato A4 verticale
            cloneEls.forEach(el => {
                if (el.style.fontSize) {
                    const px = parseFloat(el.style.fontSize);
                    if (!isNaN(px)) el.style.fontSize = `${(px * SCALE).toFixed(2)}px`;
                }
                PAD_PROPS.forEach(p => {
                    if (el.style[p]) {
                        const px = parseFloat(el.style[p]);
                        if (!isNaN(px)) el.style[p] = `${(px * SCALE).toFixed(2)}px`;
                    }
                });
            });

            // Monta il clone fuori schermo
            const wrapper = document.createElement('div');
            wrapper.style.cssText = 'position:fixed;top:-9999px;left:-9999px;';
            wrapper.appendChild(clone);
            document.body.appendChild(wrapper);

            const stagione = `${dateRange.dataDa}_${dateRange.dataA}`;
            const nomeSocietaSafe = nomeSocieta.replace(/\s+/g, '_') || 'societa';
            const filename = `bilancio_${nomeSocietaSafe}_${stagione}.pdf`;
            const headerLine = nomeSocieta
                ? `${nomeSocieta}  |  ${dateRange.dataDa} — ${dateRange.dataA}`
                : `${dateRange.dataDa} — ${dateRange.dataA}`;

            await html2pdf()
                .set({
                    margin: [12, 8, 8, 8],
                    filename,
                    image: { type: 'jpeg', quality: 1 },
                    html2canvas: {
                        scale: 3,
                        useCORS: true,
                        backgroundColor: '#ffffff',
                        windowWidth: 720,
                    },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                    pagebreak: { mode: 'avoid-all' },
                })
                .from(clone)
                .toPdf()
                .get('pdf')
                .then(pdf => {
                    const totalPages = pdf.internal.getNumberOfPages();
                    for (let i = 1; i <= totalPages; i++) {
                        pdf.setPage(i);
                        pdf.setFontSize(8);
                        pdf.setTextColor(80, 80, 80);
                        pdf.text(
                            headerLine,
                            pdf.internal.pageSize.getWidth() / 2,
                            7,
                            { align: 'center' }
                        );
                    }
                })
                .save();

            document.body.removeChild(wrapper);
        } catch (e) {
            console.error('Errore generazione PDF:', e);
        } finally {
            setGeneratingPdf(false);
        }
    };

    useEffect(() => {
        if (!selectedSocietaId) { setGruppi([]); return; }
        setLoadingGruppi(true);
        const token = localStorage.getItem('token');
        fetch(`/payments/api/gruppi?societa_id=${selectedSocietaId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        })
            .then(r => r.ok ? r.json() : [])
            .then(data => setGruppi(data))
            .catch(() => {})
            .finally(() => setLoadingGruppi(false));
    }, [selectedSocietaId]);

    const dateRange = useMemo(() => {
        if (!selectedAnno || !societa) {
            const y = new Date().getFullYear();
            return { dataDa: `${y}-01-01`, dataA: `${y}-12-31` };
        }
        const { start, end } = getAnnoDateRange(selectedAnno, societa);
        return {
            dataDa: start.toISOString().split('T')[0],
            dataA: end.toISOString().split('T')[0],
        };
    }, [selectedAnno, societa]);

    // Pagamenti validi del periodo: con gruppo assegnato OPPURE con tipo auto-mappabile
    const paymentsValidi = useMemo(() => payments.filter(p => {
        if (p.stato_pagamento?.startsWith('3.')) return false;
        const hasAutoGroup = p.quote_types && p.quote_types.split(',').some(t => QUOTE_TYPE_TO_CODICE[t.trim()]);
        if (!p.gruppo_id && !hasAutoGroup) return false;
        if (dateRange.dataDa && p.data_pagamento < dateRange.dataDa) return false;
        if (dateRange.dataA && p.data_pagamento > dateRange.dataA) return false;
        return true;
    }), [payments, dateRange]);

    // Totale per gruppo/sottogruppo (sempre positivo — il segno è dato dal tipo)
    const totaliPerGruppo = useMemo(() => {
        const codiceToId = {};
        gruppi.forEach(g => { if (g.codice) codiceToId[g.codice] = g.id; });
        const map = {};
        paymentsValidi.forEach(p => {
            let targetId = p.gruppo_id;
            if (!targetId && p.quote_types) {
                const types = p.quote_types.split(',').map(t => t.trim());
                for (const t of types) {
                    const codice = QUOTE_TYPE_TO_CODICE[t];
                    if (codice && codiceToId[codice]) { targetId = codiceToId[codice]; break; }
                }
            }
            if (targetId) {
                map[targetId] = (map[targetId] || 0) + Math.abs(parseFloat(p.importo || 0));
            }
        });
        return map;
    }, [paymentsValidi, gruppi]);

    const gruppiRadice = useMemo(() => gruppi.filter(g => !g.gruppo_id), [gruppi]);
    const allSotto = useMemo(() => gruppi.filter(g => g.gruppo_id), [gruppi]);

    // Sezioni uniche ordinate
    const sezioni = useMemo(() => {
        const s = [...new Set(gruppiRadice.map(g => g.sezione).filter(Boolean))].sort();
        return s;
    }, [gruppiRadice]);

    const getGruppoBySezioneETipo = (sezione, tipo) =>
        gruppiRadice.find(g => g.sezione === sezione && g.tipo === tipo);

    const getSottoGruppi = (gruppoId) =>
        allSotto.filter(g => g.gruppo_id === gruppoId)
                .sort((a, b) => (a.numero || 0) - (b.numero || 0));

    const getTotaleGruppo = (gruppoId) => {
        const sotto = getSottoGruppi(gruppoId);
        if (sotto.length > 0) {
            return sotto.reduce((acc, s) => acc + (totaliPerGruppo[s.id] || 0), 0);
        }
        return totaliPerGruppo[gruppoId] || 0;
    };

    const fmt = (val) => `€ ${val.toFixed(2).replace('.', ',')}`;

    // Totali generali
    const grandTotUscite = sezioni.reduce((acc, s) => {
        const g = getGruppoBySezioneETipo(s, 'Uscita');
        return acc + (g ? getTotaleGruppo(g.id) : 0);
    }, 0);
    const grandTotEntrate = sezioni.reduce((acc, s) => {
        const g = getGruppoBySezioneETipo(s, 'Entrata');
        return acc + (g ? getTotaleGruppo(g.id) : 0);
    }, 0);
    const avanzoFinale = grandTotEntrate - grandTotUscite;

    // Stili comuni
    const HEADER_US = { background: '#1565c0', color: '#fff' };
    const HEADER_EN = { background: '#2e7d32', color: '#fff' };
    const cellBase = { padding: '7px 14px', fontSize: '0.87rem', verticalAlign: 'top' };
    const sectionHead = { fontWeight: '700', fontStyle: 'italic', textDecoration: 'underline', padding: '10px 14px', background: '#f0f4ff' };
    const totaleRow = { fontWeight: '700', fontStyle: 'italic', borderTop: '2px solid #d0d7e3', background: '#f8f9fa', padding: '8px 14px' };
    const avanzRow = { fontWeight: '600', fontStyle: 'italic', background: '#fafafa', padding: '6px 14px', fontSize: '0.86rem' };

    if (loading || loadingGruppi) {
        return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>Caricamento...</div>;
    }

    if (sezioni.length === 0) {
        return (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <BarChart2 size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <div>Nessun gruppo configurato.</div>
                <div style={{ fontSize: '0.85rem', marginTop: '6px' }}>
                    Crea gruppi e sottogruppi nella sezione <strong>Gruppi &amp; Sottogruppi</strong> per visualizzare il bilancio.
                </div>
            </div>
        );
    }

    return (
        <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: '700px' }}>

                {/* Toolbar: periodo + bottone PDF */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingRight: '4px' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                        Periodo: <strong>{dateRange.dataDa}</strong> — <strong>{dateRange.dataA}</strong>
                    </div>
                    <button
                        onClick={handleDownloadPdf}
                        disabled={generatingPdf}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '7px',
                            padding: '7px 16px',
                            backgroundColor: generatingPdf ? '#9e9e9e' : '#1565c0',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '600',
                            fontSize: '0.88rem',
                            cursor: generatingPdf ? 'not-allowed' : 'pointer',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        <Download size={15} />
                        {generatingPdf ? 'Generazione...' : 'Scarica PDF'}
                    </button>
                </div>

                {/* Contenuto PDF */}
                <div ref={tableRef}>

                {/* Intestazione documento */}
                {nomeSocieta && (
                    <div style={{ textAlign: 'center', fontWeight: '700', fontSize: '1rem', marginBottom: '6px' }}>
                        {nomeSocieta}
                    </div>
                )}
                <div style={{ textAlign: 'center', fontWeight: '600', fontSize: '0.9rem', marginBottom: '12px', color: '#444' }}>
                    Mod. D — Rendiconto per Cassa &nbsp;|&nbsp; {dateRange.dataDa} — {dateRange.dataA}
                </div>

                {/* Tabella principale */}
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d0d7e3', borderRadius: '8px', overflow: 'hidden' }}>
                    <thead>
                        <tr>
                            <td style={{ ...HEADER_US, fontWeight: '700', fontSize: '1rem', padding: '12px 16px', width: '50%', borderRight: '2px solid #fff' }}>
                                USCITE
                            </td>
                            <td style={{ ...HEADER_EN, fontWeight: '700', fontSize: '1rem', padding: '12px 16px', width: '50%' }}>
                                ENTRATE
                            </td>
                        </tr>
                    </thead>
                    <tbody>
                        {sezioni.map(sezione => {
                            const gu = getGruppoBySezioneETipo(sezione, 'Uscita');
                            const ge = getGruppoBySezioneETipo(sezione, 'Entrata');
                            const sottoUs = gu ? getSottoGruppi(gu.id) : [];
                            const sottoEn = ge ? getSottoGruppi(ge.id) : [];
                            const totUs = gu ? getTotaleGruppo(gu.id) : 0;
                            const totEn = ge ? getTotaleGruppo(ge.id) : 0;
                            const avanzSez = totEn - totUs;
                            const maxRows = Math.max(sottoUs.length, sottoEn.length, 1);

                            const rowsUs = sottoUs.length > 0 ? sottoUs : (gu ? [null] : []);
                            const rowsEn = sottoEn.length > 0 ? sottoEn : (ge ? [null] : []);

                            return (
                                <React.Fragment key={sezione}>
                                    {/* Intestazione sezione */}
                                    <tr style={{ borderTop: '3px solid #d0d7e3' }}>
                                        <td style={{ ...sectionHead, borderRight: '1px solid #e0e6ef' }}>
                                            {gu ? `${sezione}) ${gu.descrizione}` : `${sezione}) —`}
                                        </td>
                                        <td style={sectionHead}>
                                            {ge ? `${sezione}) ${ge.descrizione}` : `${sezione}) —`}
                                        </td>
                                    </tr>

                                    {/* Righe sottogruppi */}
                                    {Array.from({ length: maxRows }).map((_, i) => {
                                        const su = rowsUs[i];
                                        const se = rowsEn[i];
                                        return (
                                            <tr key={i} style={{ borderBottom: '1px solid #f0f4f8' }}>
                                                <td style={{ ...cellBase, borderRight: '1px solid #e0e6ef' }}>
                                                    {su === undefined ? null : su === null ? (
                                                        <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}> </span>
                                                    ) : (
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                                            <span>{su.numero}) {su.descrizione}</span>
                                                            <span style={{ fontFamily: 'monospace', color: totaliPerGruppo[su.id] ? '#c62828' : 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                                                {fmt(totaliPerGruppo[su.id] || 0)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={cellBase}>
                                                    {se === undefined ? null : se === null ? (
                                                        <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}> </span>
                                                    ) : (
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                                            <span>{se.numero}) {se.descrizione}</span>
                                                            <span style={{ fontFamily: 'monospace', color: totaliPerGruppo[se.id] ? '#2e7d32' : 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                                                {fmt(totaliPerGruppo[se.id] || 0)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {/* Totale sezione */}
                                    <tr>
                                        <td style={{ ...totaleRow, borderRight: '1px solid #e0e6ef' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Totale</span>
                                                <span style={{ fontFamily: 'monospace', color: '#c62828' }}>{fmt(totUs)}</span>
                                            </div>
                                        </td>
                                        <td style={totaleRow}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Totale</span>
                                                <span style={{ fontFamily: 'monospace', color: '#2e7d32' }}>{fmt(totEn)}</span>
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Avanzo/Disavanzo sezione */}
                                    <tr style={{ background: '#fafafa' }}>
                                        <td style={{ borderRight: '1px solid #e0e6ef' }} />
                                        <td style={{ ...avanzRow, color: avanzSez >= 0 ? '#2e7d32' : '#c62828' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Avanzo/Disavanzo sezione {sezione} (+/-)</span>
                                                <span style={{ fontFamily: 'monospace' }}>
                                                    {avanzSez >= 0 ? '+' : '−'} {fmt(Math.abs(avanzSez))}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                </React.Fragment>
                            );
                        })}

                        {/* Totali generali */}
                        <tr style={{ borderTop: '3px solid #555', background: '#fff' }}>
                            <td style={{ padding: '12px 14px', fontWeight: '700', fontStyle: 'italic', borderRight: '1px solid #e0e6ef', background: '#ffebee' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Totale USCITE della gestione</span>
                                    <span style={{ fontFamily: 'monospace', color: '#c62828' }}>{fmt(grandTotUscite)}</span>
                                </div>
                            </td>
                            <td style={{ padding: '12px 14px', fontWeight: '700', fontStyle: 'italic', background: '#e8f5e9' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Totale ENTRATE della gestione</span>
                                    <span style={{ fontFamily: 'monospace', color: '#2e7d32' }}>{fmt(grandTotEntrate)}</span>
                                </div>
                            </td>
                        </tr>

                        {/* A/D d'esercizio prima delle imposte */}
                        <tr style={{ background: '#f5f5f5' }}>
                            <td style={{ borderRight: '1px solid #e0e6ef' }} />
                            <td style={{ padding: '9px 14px', fontWeight: '700', fontStyle: 'italic', color: avanzoFinale >= 0 ? '#2e7d32' : '#c62828' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Avanzo/Disavanzo d'esercizio prima delle imposte (+/-)</span>
                                    <span style={{ fontFamily: 'monospace' }}>
                                        {avanzoFinale >= 0 ? '+' : '−'} {fmt(Math.abs(avanzoFinale))}
                                    </span>
                                </div>
                            </td>
                        </tr>

                        {/* Imposte */}
                        <tr>
                            <td style={{ borderRight: '1px solid #e0e6ef' }} />
                            <td style={{ padding: '7px 14px', color: 'var(--text-secondary)', fontSize: '0.87rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Imposte</span>
                                    <span style={{ fontFamily: 'monospace' }}>{fmt(0)}</span>
                                </div>
                            </td>
                        </tr>

                        {/* AVANZO/DISAVANZO COMPLESSIVO */}
                        <tr style={{ borderTop: '2px solid #555' }}>
                            <td style={{ borderRight: '1px solid #e0e6ef' }} />
                            <td style={{ padding: '12px 14px', fontWeight: '700', background: avanzoFinale >= 0 ? '#e8f5e9' : '#ffebee', color: avanzoFinale >= 0 ? '#1b5e20' : '#b71c1c' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>AVANZO/DISAVANZO COMPLESSIVO</span>
                                    <span style={{ fontFamily: 'monospace' }}>
                                        {avanzoFinale >= 0 ? '+' : '−'} {fmt(Math.abs(avanzoFinale))}
                                    </span>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>

                </div>{/* fine ref={tableRef} */}
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const Contabilita = () => {
    const [activeTab, setActiveTab] = useState('prima-nota');
    const { selectedSocietaId, societaList } = useSocieta();
    const { selectedAnno } = useAnno();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [nuovaOpModalOpen, setNuovaOpModalOpen] = useState(false);
    const [nuovaOpInitialData, setNuovaOpInitialData] = useState(null);
    const [dettaglioPayment, setDettaglioPayment] = useState(null);
    const [importCsvOpen, setImportCsvOpen] = useState(false);
    const confirm = useConfirm();

    const societa = useMemo(
        () => societaList?.find(s => s.id == selectedSocietaId) || null,
        [societaList, selectedSocietaId]
    );

    useEffect(() => {
        if (!selectedSocietaId) {
            setPayments([]);
            return;
        }
        setLoading(true);
        const token = localStorage.getItem('token');
        fetch(`/payments/api?societa_id=${selectedSocietaId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        })
            .then(r => r.ok ? r.json() : [])
            .then(data => setPayments(data))
            .catch(() => setPayments([]))
            .finally(() => setLoading(false));
    }, [selectedSocietaId]);

    const handleElimina = async (payment) => {
        const ok = await confirm(`Eliminare l'operazione "${payment.quote || payment.numero_ricevuta || '#' + payment.id}"?`, 'Elimina operazione');
        if (!ok) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/payments/api/${payment.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (res.ok) refreshPayments();
        } catch (err) {
            console.error('Errore eliminazione operazione:', err);
        }
    };

    const refreshPayments = () => {
        if (!selectedSocietaId) return;
        const token = localStorage.getItem('token');
        fetch(`/payments/api?societa_id=${selectedSocietaId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        })
            .then(r => r.ok ? r.json() : [])
            .then(data => setPayments(data))
            .catch(() => {});
    };

    return (
        <div className="soci-full-container">
            <div className="main-content" style={{ gap: '0' }}>

                {/* Tabs */}
                <div
                    style={{
                        display: 'flex',
                        gap: '4px',
                        backgroundColor: '#e5e7eb',
                        padding: '6px 6px 0 6px',
                        borderBottom: '1px solid #d1d5db',
                        marginBottom: '16px',
                    }}
                >
                    <button
                        onClick={() => setActiveTab('prima-nota')}
                        style={{
                            padding: '12px 32px',
                            border: 'none',
                            borderRadius: '8px 8px 0 0',
                            backgroundColor: activeTab === 'prima-nota' ? 'var(--primary-color, #1976d2)' : 'transparent',
                            cursor: 'pointer',
                            fontWeight: '500',
                            color: activeTab === 'prima-nota' ? '#fff' : '#4b5563',
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { if (activeTab !== 'prima-nota') e.currentTarget.style.backgroundColor = '#d1d5db'; }}
                        onMouseLeave={e => { if (activeTab !== 'prima-nota') e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                        <BookOpen size={17} />
                        Prima Nota
                    </button>

                    <button
                        onClick={() => setActiveTab('bilancio')}
                        style={{
                            padding: '12px 32px',
                            border: 'none',
                            borderRadius: '8px 8px 0 0',
                            backgroundColor: activeTab === 'bilancio' ? 'var(--primary-color, #1976d2)' : 'transparent',
                            cursor: 'pointer',
                            fontWeight: '500',
                            color: activeTab === 'bilancio' ? '#fff' : '#4b5563',
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { if (activeTab !== 'bilancio') e.currentTarget.style.backgroundColor = '#d1d5db'; }}
                        onMouseLeave={e => { if (activeTab !== 'bilancio') e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                        <BarChart2 size={17} />
                        Bilancio
                    </button>
                </div>

                {/* Tab content */}
                {activeTab === 'prima-nota' && (
                    <PrimaNotaTab
                        payments={payments}
                        loading={loading}
                        selectedAnno={selectedAnno}
                        societa={societa}
                        onNuovaOperazione={() => { setNuovaOpInitialData(null); setNuovaOpModalOpen(true); }}
                        onNuovaOperazioneDaPreferita={(snapshot) => { setNuovaOpInitialData(snapshot); setNuovaOpModalOpen(true); }}
                        onDettaglio={(p) => setDettaglioPayment(p)}
                        onElimina={handleElimina}
                        onImportCsv={() => setImportCsvOpen(true)}
                    />
                )}

                {activeTab === 'bilancio' && (
                    <BilancioTab
                        payments={payments}
                        loading={loading}
                        selectedAnno={selectedAnno}
                        societa={societa}
                    />
                )}

                <NuovaOperazioneModal
                    isOpen={nuovaOpModalOpen}
                    onClose={() => { setNuovaOpModalOpen(false); setNuovaOpInitialData(null); }}
                    onSaved={refreshPayments}
                    societaId={selectedSocietaId}
                    initialData={nuovaOpInitialData}
                />

                <DettaglioOperazioneModal
                    payment={dettaglioPayment}
                    onClose={() => setDettaglioPayment(null)}
                />

                <ImportPrimaNotaModal
                    isOpen={importCsvOpen}
                    onClose={() => setImportCsvOpen(false)}
                    societaId={selectedSocietaId}
                    onImported={refreshPayments}
                />
            </div>
        </div>
    );
};

export default Contabilita;
