import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Edit2, Trash2, Folder, Printer, Mail, ChevronLeft, ChevronRight, User, Banknote, CreditCard, Landmark, DollarSign, ChevronDown, ChevronUp, Filter, Zap, FileInput } from 'lucide-react';
import { useConfirm } from '../components/ConfirmModal';
import { useAlert } from '../components/AlertModal';
import { useSocieta } from '../data/SocietaContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PagamentoFastModal from './PagamentoFastModal';
import DettaglioOrdineModal from './DettaglioOrdineModal';
import ImportVociRicevutaModal from './ImportVociRicevutaModal';
import ImportOrdiniOdooModal from './ImportOrdiniOdooModal';
import ComunicazioneModal from '../components/ComunicazioneModal';
import { getStatoOrdine } from '../utils/ordineUtils';
import { buildRicevutaHtml } from '../utils/ricevuta';
import './Soci.css';

const Ordini = () => {
    const { selectedSocietaId, societaList } = useSocieta();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const confirm = useConfirm();
    const showAlert = useAlert();
    const [payments, setPayments] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showPaymentMenu, setShowPaymentMenu] = useState(false);
    const [isFastModalOpen, setIsFastModalOpen] = useState(false);
    const [selectedPaymentDetail, setSelectedPaymentDetail] = useState(null);
    const [showImportVoci, setShowImportVoci] = useState(false);
    const [showImportOdoo, setShowImportOdoo] = useState(false);
    const [showComunicazioneModal, setShowComunicazioneModal] = useState(false);
    const [selectedSocioForComm, setSelectedSocioForComm] = useState(null);
    const [selectedOrdineForComm, setSelectedOrdineForComm] = useState(null);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowPaymentMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.addEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const [filters, setFilters] = useState({
        intestatario: '',
        dataDa: '',
        dataA: '',
        utente: 'TUTTI',
        statoOrdine: 'TUTTI',
        modalitaPagamento: 'TUTTI',
        etichetta: ''
    });
    const [showMoreFilters, setShowMoreFilters] = useState(false);

    useEffect(() => {
        // Reset filtri e stato UI al cambio società
        setFilters({
            intestatario: '',
            dataDa: '',
            dataA: '',
            utente: 'TUTTI',
            statoOrdine: 'TUTTI',
            modalitaPagamento: 'TUTTI',
            etichetta: ''
        });
        setSelectedPaymentDetail(null);
        setIsFastModalOpen(false);
        if (selectedSocietaId) {
            fetchPayments();
            fetchProducts();
        } else {
            setPayments([]);
            setProducts([]);
            setLoading(false);
        }
    }, [selectedSocietaId]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchProducts = async () => {
        try {
            const res = await fetch(`/products/api?societaId=${selectedSocietaId}`);
            if (res.ok) setProducts(await res.json());
        } catch (e) {
            console.error('Errore caricamento prodotti', e);
        }
    };

    const fetchPayments = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/payments/api?societa_id=${selectedSocietaId}`);
            if (response.ok) {
                const data = await response.json();
                setPayments(data);
                const pid = searchParams.get('paymentId');
                if (pid) {
                    const found = data.find(p => String(p.id) === String(pid));
                    if (found) setSelectedPaymentDetail(found);
                }
            }
        } catch (error) {
            console.error("Error fetching payments", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePayment = async (id) => {
        if (!await confirm('Sei sicuro di voler eliminare questo pagamento?')) return;
        try {
            const response = await fetch(`/payments/api/${id}`, { method: 'DELETE' });
            if (response.ok) {
                setPayments(prev => prev.filter(p => p.id !== id));
                if (selectedPaymentDetail?.id === id) setSelectedPaymentDetail(null);
            } else {
                showAlert('Errore durante l\'eliminazione del pagamento', 'Errore');
            }
        } catch (e) {
            console.error(e);
            showAlert('Errore di rete', 'Errore');
        }
    };

    // Restituisce un array di nomi prodotto per un pagamento (lookup da payment_items → products)
    const getItemNames = (pmt) => {
        let items = pmt.payment_items;
        if (typeof items === 'string') {
            try { items = JSON.parse(items); } catch { items = null; }
        }
        if (Array.isArray(items) && items.length > 0) {
            return items.map(item => {
                if (item.product_id && products.length) {
                    return products.find(pr => Number(pr.id) === Number(item.product_id))?.description
                        || item.quote || pmt.quote || '';
                }
                return item.quote || pmt.quote || '';
            }).filter(Boolean);
        }
        if (pmt.product_id && products.length) {
            const name = products.find(pr => Number(pr.id) === Number(pmt.product_id))?.description;
            if (name) return [name];
        }
        return (pmt.quote || '').split(', ').map(s => s.trim()).filter(Boolean);
    };

    const handlePrintPayment = async (p) => {
        // Apri la finestra subito, dentro il gesto dell'utente: se la si apre dopo
        // l'await il popup blocker restituisce un about:blank vuoto (o null).
        const printWindow = window.open('', '_blank');
        try {
            const societa = societaList.find(s => s.id == selectedSocietaId);
            const html = await buildRicevutaHtml(p, { societa, products, autoPrint: true });
            if (printWindow) {
                printWindow.document.open();
                printWindow.document.write(html);
                printWindow.document.close();
            }
        } catch (e) {
            console.error('Errore generazione ricevuta', e);
            if (printWindow) printWindow.close();
            showAlert(`Errore durante la generazione della ricevuta: ${e?.message || e}`, 'Errore');
        }
    };

    const handleAnnullaRicevuta = async (id) => {
        try {
            const response = await fetch(`/payments/api/${id}/annulla`, { method: 'PATCH' });
            if (response.ok) {
                const updated = await response.json();
                setPayments(prev => prev.map(p => p.id === updated.id ? updated : p));
                setSelectedPaymentDetail(updated);
            } else {
                showAlert('Errore durante l\'annullamento della ricevuta', 'Errore');
            }
        } catch (e) {
            console.error(e);
            showAlert('Errore di rete', 'Errore');
        }
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setCurrentPage(1);
    };

    const renderPaymentIcon = (modalita) => {
        if (!modalita) return <Banknote size={20} />;
        const m = modalita.toLowerCase();
        if (m.includes('contanti')) return <Banknote size={20} strokeWidth={1.5} />;
        if (m.includes('pos')) return <CreditCard size={20} strokeWidth={1.5} />;
        if (m.includes('bonifico')) return <Landmark size={20} strokeWidth={1.5} />;
        if (m.includes('assegno')) return <DollarSign size={20} strokeWidth={1.5} />;
        return <Banknote size={20} strokeWidth={1.5} />;
    };

    const [sort, setSort] = useState({ key: 'data', dir: 'desc' });
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 50;

    const handleSort = (key) => {
        setSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
        setCurrentPage(1);
    };

    const SortIcon = ({ col }) => {
        if (sort.key !== col) return <span style={{ opacity: 0.35, fontSize: '0.7rem', marginLeft: '4px' }}>⇅</span>;
        return <span style={{ fontSize: '0.7rem', marginLeft: '4px' }}>{sort.dir === 'asc' ? '↑' : '↓'}</span>;
    };

    const allEtichette = useMemo(() => {
        const set = new Set();
        payments.forEach(p => {
            if (p.etichette) p.etichette.split(',').forEach(t => { const v = t.trim(); if (v) set.add(v); });
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b, 'it'));
    }, [payments]);

    const filteredPayments = payments.filter(p => {
        // Lista Pagamenti: solo entrate (importo >= 0) legate a un socio
        if (parseFloat(p.importo) < 0) return false;
        if (!p.socio_id) return false;
        if (filters.intestatario && !p.intestatario?.toLowerCase().includes(filters.intestatario.toLowerCase())) return false;
        if (filters.modalitaPagamento !== 'TUTTI' && p.modalita_pagamento !== filters.modalitaPagamento) return false;
        if (filters.statoOrdine !== 'TUTTI' && getStatoOrdine(p) !== filters.statoOrdine.toLowerCase()) return false;
        if (filters.dataDa && (p.data_ricevuta || p.data_pagamento) < filters.dataDa) return false;
        if (filters.dataA && (p.data_ricevuta || p.data_pagamento) > filters.dataA) return false;
        if (filters.etichetta) {
            const tags = (p.etichette || '').split(',').map(t => t.trim());
            if (!tags.includes(filters.etichetta)) return false;
        }
        return true;
    }).sort((a, b) => {
        let va, vb;
        if (sort.key === 'data') {
            va = a.data_pagamento || '';
            vb = b.data_pagamento || '';
        } else if (sort.key === 'numero_ricevuta') {
            const parseNum = (p) => {
                if (p.tipo_documento === 'proforma') return Infinity;
                const raw = p.numero_ricevuta || '';
                const parts = raw.split('/');
                const num = parseInt(parts[0], 10);
                const year = parseInt(parts[1], 10);
                if (isNaN(num)) return 0;
                if (isNaN(year)) return num;
                return year * 100000 + num;
            };
            va = parseNum(a);
            vb = parseNum(b);
            return sort.dir === 'asc' ? va - vb : vb - va;
        } else if (sort.key === 'importo') {
            va = Math.abs(parseFloat(a.importo));
            vb = Math.abs(parseFloat(b.importo));
            return sort.dir === 'asc' ? va - vb : vb - va;
        }
        if (va < vb) return sort.dir === 'asc' ? -1 : 1;
        if (va > vb) return sort.dir === 'asc' ? 1 : -1;
        return 0;
    });

    const totalEntrate = filteredPayments.filter(p => parseFloat(p.importo) >= 0 && !p.stato_pagamento?.startsWith('3.')).reduce((acc, p) => acc + parseFloat(p.importo), 0);
    const totalUscite = filteredPayments.filter(p => parseFloat(p.importo) < 0 || p.stato_pagamento?.startsWith('3.')).reduce((acc, p) => acc + Math.abs(parseFloat(p.importo)), 0);

    const totalPages = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const paginatedPayments = filteredPayments.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    return (
        <div className="soci-full-container">
            <div className="main-content">

                {/* Filters Toolbar */}
                <div className="toolbar-card" style={{display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'stretch'}}>
                    <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '12px'}}>
                        
                        <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '120px'}}>
                            <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Intestatario</label>
                            <input 
                                className="md-input" 
                                placeholder="Intestatario" 
                                style={{width: '100%', padding: '6px 12px'}} 
                                value={filters.intestatario}
                                onChange={(e) => handleFilterChange('intestatario', e.target.value)}
                            />
                        </div>
                        
                        {/* Toggle filtri a scomparsa */}
                        <button
                            type="button"
                            className="btn-outlined"
                            style={{height: '35px', display:'flex', alignItems:'center', gap:'6px', fontSize:'0.9rem', padding: '0 12px'}}
                            onClick={() => setShowMoreFilters(v => !v)}
                            aria-expanded={showMoreFilters}
                        >
                            <Filter size={14}/> Filtri {showMoreFilters ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                        </button>

                        <div style={{display:'flex', gap:'8px', marginLeft: 'auto'}}>
                            <button
                                className="btn-contained" 
                                style={{backgroundColor: 'var(--primary)', height: '35px', display:'flex', alignItems:'center', gap:'8px', fontSize:'0.9rem', padding: '0 12px'}}
                            >
                                <Printer size={14}/> Esporta elenco
                            </button>
                            <button
                                className="btn-contained"
                                style={{backgroundColor: 'var(--primary)', height: '35px', display:'flex', alignItems:'center', gap:'8px', fontSize:'0.9rem', padding: '0 12px'}}
                                onClick={() => setShowImportVoci(true)}
                            >
                                <FileInput size={14}/> Importa ricevute
                            </button>
                            <button
                                className="btn-contained"
                                style={{backgroundColor: 'var(--warning)', height: '35px', display:'flex', alignItems:'center', gap:'8px', fontSize:'0.9rem', padding: '0 12px'}}
                                onClick={() => setShowImportOdoo(true)}
                            >
                                <FileInput size={14}/> Importa da Odoo
                            </button>
                            <div style={{ position: 'relative' }} ref={menuRef}>
                                <button 
                                    className="btn-contained" 
                                    style={{backgroundColor: 'var(--success-color)', height: '35px', display:'flex', alignItems:'center', gap:'8px', fontSize:'0.9rem', padding: '0 12px'}}
                                    onClick={() => navigate('/nuovo-ordine')}
                                >
                                    <Plus size={14}/> Nuovo Ordine
                                </button>
                                {/* Payment type dropdown hidden - keep code for future use
                                onClick={() => setShowPaymentMenu(!showPaymentMenu)}
                                <ChevronDown size={14}/>
                                {showPaymentMenu && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        right: 0,
                                        marginTop: '5px',
                                        backgroundColor: 'white',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                                        minWidth: '150px',
                                        zIndex: 100,
                                        overflow: 'hidden',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        padding: '5px 0'
                                    }}>
                                        <button onClick={() => { setShowPaymentMenu(false); navigate('/nuovo-ordine'); }}>
                                            <span>€</span> Normale
                                        </button>
                                        <button onClick={() => { setShowPaymentMenu(false); setIsFastModalOpen(true); }}>
                                            <Zap size={18} strokeWidth={1.5} /> Fast
                                        </button>
                                    </div>
                                )}
                                */}
                            </div>
                        </div>
                    </div>

                    {/* Filtri a scomparsa */}
                    {showMoreFilters && (
                        <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px'}}>

                            {/* Data da */}
                            <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '120px'}}>
                                <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Data da</label>
                                <input
                                    type="date"
                                    className="md-input"
                                    style={{width: '100%', padding: '6px 12px'}}
                                    value={filters.dataDa}
                                    onChange={(e) => handleFilterChange('dataDa', e.target.value)}
                                />
                            </div>

                            {/* Data a */}
                            <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '120px'}}>
                                <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Data a</label>
                                <input
                                    type="date"
                                    className="md-input"
                                    style={{width: '100%', padding: '6px 12px'}}
                                    value={filters.dataA}
                                    onChange={(e) => handleFilterChange('dataA', e.target.value)}
                                />
                            </div>

                            {/* Utente */}
                            <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '120px'}}>
                                <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Utente</label>
                                <select
                                    className="md-select"
                                    style={{width: '100%', padding: '6px 12px'}}
                                    value={filters.utente}
                                    onChange={(e) => handleFilterChange('utente', e.target.value)}
                                >
                                    <option value="TUTTI">TUTTI</option>
                                </select>
                            </div>

                            {/* Stato ordine */}
                            <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '120px'}}>
                                <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Stato ordine</label>
                                <select
                                    className="md-select"
                                    style={{width: '100%', padding: '6px 12px'}}
                                    value={filters.statoOrdine}
                                    onChange={(e) => handleFilterChange('statoOrdine', e.target.value)}
                                >
                                    <option value="TUTTI">TUTTI</option>
                                    <option value="PROFORMA">PROFORMA</option>
                                    <option value="PAGATO">PAGATO</option>
                                    <option value="ANNULLATO">ANNULLATO</option>
                                </select>
                            </div>

                            {/* Modalità pagamento */}
                            <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '120px'}}>
                                <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Modalità pagamento</label>
                                <select
                                    className="md-select"
                                    style={{width: '100%', padding: '6px 12px'}}
                                    value={filters.modalitaPagamento}
                                    onChange={(e) => handleFilterChange('modalitaPagamento', e.target.value)}
                                >
                                    <option value="TUTTI">TUTTI</option>
                                    <option value="Contanti">CONTANTI</option>
                                    <option value="POS">POS</option>
                                    <option value="Assegno">ASSEGNO</option>
                                    <option value="Bonifico">BONIFICO</option>
                                    <option value="Online">ONLINE</option>
                                </select>
                            </div>

                            {/* Etichette */}
                            <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '120px'}}>
                                <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Etichette</label>
                                <select
                                    className="md-select"
                                    style={{width: '100%', padding: '6px 12px'}}
                                    value={filters.etichetta}
                                    onChange={(e) => handleFilterChange('etichetta', e.target.value)}
                                >
                                    <option value="">TUTTE</option>
                                    {allEtichette.map(et => (
                                        <option key={et} value={et}>{et}</option>
                                    ))}
                                </select>
                            </div>

                        </div>
                    )}
                </div>

                {/* Table Block */}
                <div style={{marginTop: '8px', flex:1, display:'flex', flexDirection:'column'}} className="card">
                    <div className="table-responsive">
                        <table className="md-table" style={{ borderCollapse: 'separate', borderSpacing: '0 4px', backgroundColor: 'transparent' }}>
                            <thead>
                                <tr style={{backgroundColor: 'var(--warning)', color: '#fff'}}>
                                    <th style={{padding: '12px', borderTopLeftRadius: '6px', borderBottomLeftRadius: '6px', color:'#000', cursor:'pointer', userSelect:'none', whiteSpace:'nowrap'}} onClick={() => handleSort('data')}>Intestatario - Data - operatore<SortIcon col="data" /></th>
                                    <th style={{padding: '12px', color:'#000', cursor:'pointer', userSelect:'none', whiteSpace:'nowrap'}} onClick={() => handleSort('numero_ricevuta')}>Identificativi documento<SortIcon col="numero_ricevuta" /></th>
                                    <th style={{padding: '12px', color:'#000'}}>Quote</th>
                                    <th style={{padding: '12px', color:'#000', whiteSpace:'nowrap'}}>Etichette</th>
                                    <th style={{padding: '12px', textAlign:'right', color:'#000', cursor:'pointer', userSelect:'none', whiteSpace:'nowrap'}} onClick={() => handleSort('importo')}>Importo<SortIcon col="importo" /></th>
                                    <th style={{padding: '12px', textAlign:'right', borderTopRightRadius: '6px', borderBottomRightRadius: '6px', color:'#000'}}>Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" style={{textAlign:'center', padding:'32px', color:'var(--text-secondary)'}}>
                                            Caricamento...
                                        </td>
                                    </tr>
                                ) : paginatedPayments.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" style={{textAlign:'center', padding:'32px', color:'var(--text-secondary)'}}>
                                            Nessun pagamento trovato
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedPayments.map(p => {
                                        const amount = parseFloat(p.importo);
                                        const isAnnullato = p.stato_pagamento?.startsWith('3.');
                                        const isEntrata = amount >= 0 && !isAnnullato;
                                        
                                        return (
                                            <tr key={p.id} style={{
                                                backgroundColor: isAnnullato ? 'var(--danger-container)' : (isEntrata ? '#fff' : 'var(--danger-container)'),
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                                borderLeft: `5px solid ${isAnnullato ? 'var(--danger)' : (isEntrata ? 'var(--success)' : 'var(--danger)')}`,
                                                opacity: isAnnullato ? 0.75 : 1
                                            }}>
                                                <td style={{padding: '12px', borderTopLeftRadius: '4px', borderBottomLeftRadius: '4px'}}>
                                                    <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                                                        <div style={{width:'36px', height:'36px', borderRadius:'50%', backgroundColor: isAnnullato ? 'var(--danger-container)' : (isEntrata ? 'var(--primary-container)' : 'var(--danger-container)'), color: isAnnullato ? 'var(--danger)' : (isEntrata ? 'var(--success)' : 'var(--danger)'), display:'flex', alignItems:'center', justifyContent:'center'}}>
                                                            {renderPaymentIcon(p.modalita_pagamento)}
                                                        </div>
                                                        <div>
                                                            <div style={{fontWeight:'600', color: isAnnullato ? 'var(--danger)' : 'var(--text-primary)', textDecoration: isAnnullato ? 'line-through' : 'none'}}>
                                                                {p.socio_id ? (
                                                                    <a href={`/soci?apriSocioPath=${p.socio_id}`} target="_blank" rel="noreferrer" style={{color:'inherit', textDecoration:'underline', cursor:'pointer'}} onClick={e => e.stopPropagation()}>{p.intestatario}</a>
                                                                ) : p.intestatario}
                                                            </div>
                                                            <div style={{fontSize:'0.8rem', color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:'4px'}}>
                                                                {new Date(p.updatedAt || p.createdAt).toLocaleDateString('it-IT')} {(p.updatedAt || p.createdAt) ? `- h ${new Date(p.updatedAt || p.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}` : ''} <User size={12}/> {p.modificato_da || p.utente_nome || 'ADMIN'}
                                                                {isAnnullato && <span style={{color:'var(--danger)', fontWeight:'bold', fontSize:'0.75rem'}}>ANNULLATO</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{padding: '12px'}}>
                                                    <div style={{display:'flex', flexDirection:'column', gap:'4px'}}>
                                                        <span style={{
                                                            border: `1px solid ${isAnnullato ? 'var(--danger)' : (isEntrata ? 'var(--success)' : 'var(--danger)')}`, 
                                                            color: isAnnullato ? 'var(--danger)' : (isEntrata ? 'var(--success)' : 'var(--danger)'),
                                                            padding: '2px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold',
                                                            textDecoration: isAnnullato ? 'line-through' : 'none'
                                                        }}>
                                                            {p.tipo_documento === 'proforma' ? '—' : (p.numero_ricevuta || `#${p.id}`)}
                                                        </span>
                                                        {p.tipo_documento === 'proforma' && (
                                                            <span style={{
                                                                border: '1px solid var(--primary)', color: 'var(--primary)',
                                                                padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold',
                                                                display: 'inline-block', width: 'fit-content'
                                                            }}>
                                                                PROFORMA
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{padding: '12px'}}>
                                                    <div style={{display:'flex', flexDirection:'column', gap:'4px'}}>
                                                        {getItemNames(p).map((q, i) => (
                                                            <span key={i} style={{
                                                                border: '1px solid #ccc', borderRadius: '12px', padding: '3px 10px', fontSize: '0.8rem', background: '#fff', display: 'inline-block'
                                                            }}>
                                                                {q}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td style={{padding: '12px'}}>
                                                    {p.etichette
                                                        ? <div style={{display:'flex', flexWrap:'wrap', gap:'4px'}}>
                                                            {p.etichette.split(',').map((e, i) => (
                                                                <span key={i} style={{
                                                                    display:'inline-block', background:'var(--info-container)', color:'var(--primary-hover)',
                                                                    border:'1px solid var(--info-container)', borderRadius:'4px',
                                                                    padding:'2px 8px', fontSize:'0.75rem', fontWeight:600, whiteSpace:'nowrap'
                                                                }}>
                                                                    {e.trim()}
                                                                </span>
                                                            ))}
                                                          </div>
                                                        : null
                                                    }
                                                </td>
                                                <td style={{padding: '12px', textAlign:'right'}}>
                                                    <span style={{
                                                        backgroundColor: isAnnullato ? 'var(--danger)' : (isEntrata ? 'var(--success)' : 'var(--danger-container)'),
                                                        color: 'white', padding: '4px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '1rem', minWidth: '80px', display: 'inline-block', textAlign: 'right',
                                                        textDecoration: isAnnullato ? 'line-through' : 'none'
                                                    }}>
                                                        {Math.abs(amount).toFixed(2).replace('.', ',')}
                                                    </span>
                                                </td>
                                                <td style={{padding: '12px', textAlign:'right', borderTopRightRadius: '4px', borderBottomRightRadius: '4px'}}>
                                                    <div style={{display:'flex', justifyContent:'flex-end', gap:'5px'}}>
                                                        <button 
                                                            style={{padding: 0, border:'none', width:'32px', height:'32px', borderRadius:'4px', display:'inline-flex', alignItems:'center', justifyContent:'center', cursor:'pointer', backgroundColor: 'var(--warning)', color:'white'}} 
                                                            title="Dettaglio"
                                                            onClick={() => setSelectedPaymentDetail(p)}
                                                        >
                                                            <Folder size={16} />
                                                        </button>
                                                        <button style={{padding: 0, border:'none', width:'32px', height:'32px', borderRadius:'4px', display:'inline-flex', alignItems:'center', justifyContent:'center', cursor:'pointer', backgroundColor: 'var(--primary)', color:'white'}} title="Stampa" onClick={() => handlePrintPayment(p)}><Printer size={16} /></button>
                                                        <button style={{padding: 0, border:'none', width:'32px', height:'32px', borderRadius:'4px', display:'inline-flex', alignItems:'center', justifyContent:'center', cursor:'pointer', backgroundColor: 'var(--primary)', color:'white', opacity: p.socio_id ? 1 : 0.4}} title="Invia email" disabled={!p.socio_id} onClick={() => { setSelectedSocioForComm(p.socio_id); setSelectedOrdineForComm(p); setShowComunicazioneModal(true); }}><Mail size={16} /></button>

                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination Footer */}
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:'15px', borderTop:'1px solid #eee', marginTop:'auto'}}>
                        <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
                            <button disabled={safePage === 1} onClick={() => setCurrentPage(1)} style={{border:'1px solid #ddd', background:'white', padding:'6px 12px', borderRadius:'4px', cursor: safePage === 1 ? 'not-allowed' : 'pointer', color:'#333', opacity: safePage === 1 ? 0.4 : 1}}>&lt;&lt;</button>
                            <button disabled={safePage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} style={{border:'1px solid #ddd', background:'white', padding:'6px 12px', borderRadius:'4px', cursor: safePage === 1 ? 'not-allowed' : 'pointer', color:'#333', opacity: safePage === 1 ? 0.4 : 1}}>&lt;</button>
                            <span style={{background:'var(--primary-color)', color:'white', border:'1px solid var(--primary-color)', padding:'6px 12px', borderRadius:'4px', fontWeight:'bold', minWidth:'36px', textAlign:'center'}}>{safePage} / {totalPages}</span>
                            <button disabled={safePage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} style={{border:'1px solid #ddd', background:'white', padding:'6px 12px', borderRadius:'4px', cursor: safePage === totalPages ? 'not-allowed' : 'pointer', color:'#333', opacity: safePage === totalPages ? 0.4 : 1}}>&gt;</button>
                            <button disabled={safePage === totalPages} onClick={() => setCurrentPage(totalPages)} style={{border:'1px solid #ddd', background:'white', padding:'6px 12px', borderRadius:'4px', cursor: safePage === totalPages ? 'not-allowed' : 'pointer', color:'#333', opacity: safePage === totalPages ? 0.4 : 1}}>&gt;&gt;</button>
                            <span style={{marginLeft:'10px', color:'var(--primary-color)', fontWeight:'bold'}}>Tot righe: {filteredPayments.length}</span>
                        </div>
                        <div style={{display:'flex', gap:'10px'}}>
                            <span style={{backgroundColor:'var(--danger)', color:'white', padding:'5px 15px', borderRadius:'4px', fontWeight:'bold'}}>€ {totalUscite.toFixed(2).replace('.', ',')}</span>
                            <span style={{backgroundColor:'var(--success)', color:'white', padding:'5px 15px', borderRadius:'4px', fontWeight:'bold'}}>€ {totalEntrate.toFixed(2).replace('.', ',')}</span>
                        </div>
                    </div>
                </div>

            </div>

            <PagamentoFastModal 
                isOpen={isFastModalOpen} 
                onClose={() => setIsFastModalOpen(false)} 
                societaId={selectedSocietaId} 
            />

            <DettaglioOrdineModal
                isOpen={selectedPaymentDetail !== null}
                onClose={() => setSelectedPaymentDetail(null)}
                ordine={selectedPaymentDetail}
                onAnnulla={handleAnnullaRicevuta}
                onConvertProforma={(updated) => {
                    setPayments(prev => prev.map(p => p.id === updated.id ? updated : p));
                    setSelectedPaymentDetail(updated);
                }}
                onDeleteProforma={(id) => {
                    setPayments(prev => prev.filter(p => p.id !== id));
                    setSelectedPaymentDetail(null);
                }}
                onUpdate={(updated) => {
                    setPayments(prev => prev.map(p => p.id === updated.id ? updated : p));
                    setSelectedPaymentDetail(updated);
                }}
                societa={societaList?.find(s => s.id == selectedSocietaId)}
                products={products}
                allEtichette={allEtichette}
            />

            <ImportVociRicevutaModal
                isOpen={showImportVoci}
                onClose={() => setShowImportVoci(false)}
                societaId={selectedSocietaId}
                onImported={fetchPayments}
            />

            <ImportOrdiniOdooModal
                isOpen={showImportOdoo}
                onClose={() => setShowImportOdoo(false)}
                societaId={selectedSocietaId}
                onImported={fetchPayments}
            />

            {showComunicazioneModal && selectedSocioForComm && (
                <ComunicazioneModal
                    socioId={selectedSocioForComm}
                    ordine={selectedOrdineForComm}
                    products={products}
                    societa={societaList?.find(s => s.id == selectedSocietaId)}
                    onClose={() => { setShowComunicazioneModal(false); setSelectedSocioForComm(null); setSelectedOrdineForComm(null); }}
                />
            )}
        </div>
    );
};

export default Ordini;
