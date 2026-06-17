import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Folder, Printer, Mail, ChevronLeft, ChevronRight, User, Banknote, CreditCard, Landmark, DollarSign, ChevronDown, Zap, FileInput } from 'lucide-react';
import { useConfirm } from '../components/ConfirmModal';
import { useAlert } from '../components/AlertModal';
import { useSocieta } from '../data/SocietaContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PagamentoFastModal from './PagamentoFastModal';
import DettaglioPagamentoModal from './DettaglioPagamentoModal';
import ImportVociRicevutaModal from './ImportVociRicevutaModal';
import ComunicazioneModal from '../components/ComunicazioneModal';
import './Soci.css';

const Pagamenti = () => {
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
    const [showComunicazioneModal, setShowComunicazioneModal] = useState(false);
    const [selectedSocioForComm, setSelectedSocioForComm] = useState(null);
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
        statoPagamento: 'TUTTI',
        modalitaPagamento: 'TUTTI',
        tipoDocumento: 'TUTTI'
    });

    useEffect(() => {
        // Reset filtri e stato UI al cambio società
        setFilters({
            intestatario: '',
            dataDa: '',
            dataA: '',
            utente: 'TUTTI',
            statoPagamento: 'TUTTI',
            modalitaPagamento: 'TUTTI',
            tipoDocumento: 'TUTTI'
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
        const societa = societaList.find(s => s.id == selectedSocietaId);

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
                const token = localStorage.getItem('token');
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
        // Priorità: payment_items (con importo per voce) → fallback: split del campo quote
        let lineItems; // array di { descrizione, importo: number|null }
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
            lineItems = arr.map(pi => ({
                descrizione: (pi.product_id && products.length)
                    ? (products.find(pr => Number(pr.id) === Number(pi.product_id))?.description || pi.quote || piSource.quote || '')
                    : (pi.quote || piSource.quote || ''),
                importo: Math.abs(parseFloat(pi.importo || 0)),
            }));
        } else {
            // Fallback: splittare il campo quote per righe visibili distinte
            // Non abbiamo importi individuali → importo = null (si mostra solo il TOTALE)
            const primaryItem = allItems[0] || p;
            const rawQuote = primaryItem.quote || '';
            const sep = rawQuote.includes(' + ') ? ' + ' : ', ';
            const parts = rawQuote.split(sep).map(s => s.trim()).filter(Boolean);
            const totalSplit = Math.abs(parseFloat(primaryItem.importo || 0));
            if (parts.length <= 1) {
                lineItems = [{ descrizione: rawQuote, importo: totalSplit }];
            } else {
                // Righe senza importo individuale, solo totale
                lineItems = parts.map(d => ({ descrizione: d, importo: null }));
            }
        }

        const totalAmount = lineItems.reduce((acc, li) => acc + (li.importo ?? 0), 0) ||
            Math.abs(parseFloat((allItems[0] || p).importo || 0));
        const importoFormatted = totalAmount.toFixed(2).replace('.', ',');

        const quoteRows = lineItems.map(li => {
            const cell = li.importo !== null
                ? `<td style="text-align:right">${li.importo.toFixed(2).replace('.', ',')}</td>`
                : `<td style="text-align:right; color:#aaa;">—</td>`;
            return `<tr><td>${li.descrizione}</td>${cell}</tr>`;
        }).join('');

        const logoUrl = societa?.logo_path ? `/users/${societa.logo_path}` : null;
        const footerText = societa?.receipt_footer_text || societa?.footer_text ||
            'Fuori campo iva art.4 dpr 633/72 - Esente imposte art.148 TUIR -<br/>Esente bollo L 30/12/2018 n. 145 art.1 c.646';
        const societaAddress = [societa?.indirizzo, societa?.comune].filter(Boolean).join(' - ');

        let datiPagatore = p.codice_fiscale_genitore || '';
        let indirizzoSocio = '';
        let codiceFiscaleSocio = '';
        if (p.socio_id) {
            try {
                const token = localStorage.getItem('token');
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

        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Ricevuta ${p.numero_ricevuta || p.id}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; font-size: 12px; }
        .header { display: flex; align-items: center; justify-content: flex-end; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #333; }
        .header-logo { margin-right: 20px; }
        .header-logo img { max-height: 70px; }
        .header-info { text-align: right; }
        .header-info h2 { margin: 0 0 4px 0; font-size: 16px; }
        .header-info div { font-size: 12px; color: #444; }
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
        .info-table th { background: #f9f9f9; border: 1px solid #ccc; padding: 5px 8px; font-weight: bold; font-size: 10px; color: #555; text-align: left; }
        .info-table td { border: 1px solid #ccc; padding: 6px 8px; font-weight: bold; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .items-table th { border: 1px solid #ccc; padding: 8px 10px; background: #f5f5f5; text-align: left; font-size: 12px; }
        .items-table th:last-child { text-align: right; }
        .items-table td { border: 1px solid #ccc; padding: 8px 10px; font-size: 12px; }
        .items-table td:last-child { text-align: right; }
        .total-row td { font-weight: bold; border-top: 2px solid #333; }
        .footer-text { font-size: 10px; color: #555; margin-top: 20px; margin-bottom: 20px; }
        .separator { letter-spacing: 2px; color: #999; margin: 20px 0; text-align: center; }
        .proforma-watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 130px; font-weight: 900; color: rgba(180, 0, 0, 0.13); pointer-events: none; z-index: 9999; white-space: nowrap; letter-spacing: 8px; user-select: none; }
        @media print { body { padding: 0; } .proforma-watermark { position: fixed; color: rgba(180, 0, 0, 0.13); } }
        @page { margin: 10mm; }
    </style>
</head>
<body>
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
            <th>Subtotale</th>
        </tr>
        ${quoteRows}
        <tr class="total-row">
            <td>TOTALE</td>
            <td>${importoFormatted}</td>
        </tr>
    </table>

    <div class="footer-text">${footerText}</div>
    <div class="separator">_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _</div>
    <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
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

    const filteredPayments = payments.filter(p => {
        // Lista Pagamenti: solo entrate (importo >= 0) legate a un socio
        if (parseFloat(p.importo) < 0) return false;
        if (!p.socio_id) return false;
        if (filters.intestatario && !p.intestatario?.toLowerCase().includes(filters.intestatario.toLowerCase())) return false;
        if (filters.modalitaPagamento !== 'TUTTI' && p.modalita_pagamento !== filters.modalitaPagamento) return false;
        if (filters.statoPagamento !== 'TUTTI' && p.stato_pagamento !== filters.statoPagamento) return false;
        if (filters.tipoDocumento === 'PROFORMA' && p.tipo_documento !== 'proforma') return false;
        if (filters.tipoDocumento === 'NORMALE' && p.tipo_documento === 'proforma') return false;
        if (filters.dataDa && p.data_pagamento < filters.dataDa) return false;
        if (filters.dataA && p.data_pagamento > filters.dataA) return false;
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
                        
                        <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '120px'}}>
                            <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Stato pagamento</label>
                            <select 
                                className="md-select" 
                                style={{width: '100%', padding: '6px 12px'}}
                                value={filters.statoPagamento}
                                onChange={(e) => handleFilterChange('statoPagamento', e.target.value)}
                            >
                                <option value="TUTTI">TUTTI</option>
                                <option value="1. VALIDO CON RICEVUTA">1. VALIDO CON RICEVUTA</option>
                                <option value="2. VALIDO SENZA RICEVUTA">2. VALIDO SENZA RICEVUTA</option>
                                <option value="3. ANNULLATO CON RICEVUTA">3. ANNULLATO CON RICEVUTA</option>
                            </select>
                        </div>

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

                        <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '120px'}}>
                            <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Tipo documento</label>
                            <select
                                className="md-select"
                                style={{width: '100%', padding: '6px 12px'}}
                                value={filters.tipoDocumento}
                                onChange={(e) => handleFilterChange('tipoDocumento', e.target.value)}
                            >
                                <option value="TUTTI">TUTTI</option>
                                <option value="NORMALE">NORMALE</option>
                                <option value="PROFORMA">PROFORMA</option>
                            </select>
                        </div>

                        <div style={{display:'flex', gap:'8px', marginLeft: 'auto'}}>
                            <button
                                className="btn-contained" 
                                style={{backgroundColor: '#1abc9c', height: '35px', display:'flex', alignItems:'center', gap:'8px', fontSize:'0.9rem', padding: '0 12px'}}
                            >
                                <Printer size={14}/> Esporta elenco
                            </button>
                            <button
                                className="btn-contained"
                                style={{backgroundColor: '#8e44ad', height: '35px', display:'flex', alignItems:'center', gap:'8px', fontSize:'0.9rem', padding: '0 12px'}}
                                onClick={() => setShowImportVoci(true)}
                            >
                                <FileInput size={14}/> Importa ricevute
                            </button>
                            <div style={{ position: 'relative' }} ref={menuRef}>
                                <button 
                                    className="btn-contained" 
                                    style={{backgroundColor: 'var(--success-color)', height: '35px', display:'flex', alignItems:'center', gap:'8px', fontSize:'0.9rem', padding: '0 12px'}}
                                    onClick={() => navigate('/nuovo-pagamento')}
                                >
                                    <Plus size={14}/> Nuovo Pagamento
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
                                        <button onClick={() => { setShowPaymentMenu(false); navigate('/nuovo-pagamento'); }}>
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
                </div>

                {/* Table Block */}
                <div style={{marginTop: '8px', flex:1, display:'flex', flexDirection:'column'}} className="card">
                    <div className="table-responsive">
                        <table className="md-table" style={{ borderCollapse: 'separate', borderSpacing: '0 4px', backgroundColor: 'transparent' }}>
                            <thead>
                                <tr style={{backgroundColor: '#f1c40f', color: '#fff'}}>
                                    <th style={{padding: '12px', borderTopLeftRadius: '6px', borderBottomLeftRadius: '6px', color:'#000', cursor:'pointer', userSelect:'none', whiteSpace:'nowrap'}} onClick={() => handleSort('data')}>Intestatario - Data - operatore<SortIcon col="data" /></th>
                                    <th style={{padding: '12px', color:'#000', cursor:'pointer', userSelect:'none', whiteSpace:'nowrap'}} onClick={() => handleSort('numero_ricevuta')}>Identificativi documento<SortIcon col="numero_ricevuta" /></th>
                                    <th style={{padding: '12px', color:'#000'}}>Quote</th>
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
                                                backgroundColor: isAnnullato ? '#fceceb' : (isEntrata ? '#fff' : '#fceceb'),
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                                borderLeft: `5px solid ${isAnnullato ? '#e74c3c' : (isEntrata ? '#2ecc71' : '#e74c3c')}`,
                                                opacity: isAnnullato ? 0.75 : 1
                                            }}>
                                                <td style={{padding: '12px', borderTopLeftRadius: '4px', borderBottomLeftRadius: '4px'}}>
                                                    <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                                                        <div style={{width:'36px', height:'36px', borderRadius:'50%', backgroundColor: isAnnullato ? '#fdedec' : (isEntrata ? '#e8f8f5' : '#fdedec'), color: isAnnullato ? '#e74c3c' : (isEntrata ? '#2ecc71' : '#e74c3c'), display:'flex', alignItems:'center', justifyContent:'center'}}>
                                                            {renderPaymentIcon(p.modalita_pagamento)}
                                                        </div>
                                                        <div>
                                                            <div style={{fontWeight:'600', color: isAnnullato ? '#c0392b' : 'var(--text-primary)', textDecoration: isAnnullato ? 'line-through' : 'none'}}>
                                                                {p.socio_id ? (
                                                                    <a href={`/soci?apriSocioPath=${p.socio_id}`} target="_blank" rel="noreferrer" style={{color:'inherit', textDecoration:'underline', cursor:'pointer'}} onClick={e => e.stopPropagation()}>{p.intestatario}</a>
                                                                ) : p.intestatario}
                                                            </div>
                                                            <div style={{fontSize:'0.8rem', color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:'4px'}}>
                                                                {p.data_pagamento} {p.createdAt ? `- h ${new Date(p.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : ''} <User size={12}/> {p.utente_nome || 'ADMIN'}
                                                                {isAnnullato && <span style={{color:'#e74c3c', fontWeight:'bold', fontSize:'0.75rem'}}>ANNULLATO</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{padding: '12px'}}>
                                                    <div style={{display:'flex', flexDirection:'column', gap:'4px'}}>
                                                        <span style={{
                                                            border: `1px solid ${isAnnullato ? '#e74c3c' : (isEntrata ? '#2ecc71' : '#e74c3c')}`, 
                                                            color: isAnnullato ? '#e74c3c' : (isEntrata ? '#2ecc71' : '#e74c3c'),
                                                            padding: '2px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold',
                                                            textDecoration: isAnnullato ? 'line-through' : 'none'
                                                        }}>
                                                            {p.tipo_documento === 'proforma' ? '—' : (p.numero_ricevuta || `#${p.id}`)}
                                                        </span>
                                                        {p.tipo_documento === 'proforma' && (
                                                            <span style={{
                                                                border: '1px solid #8e44ad', color: '#8e44ad',
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
                                                <td style={{padding: '12px', textAlign:'right'}}>
                                                    <span style={{
                                                        backgroundColor: isAnnullato ? '#e74c3c' : (isEntrata ? '#2ecc71' : '#f1948a'),
                                                        color: 'white', padding: '4px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '1rem', minWidth: '80px', display: 'inline-block', textAlign: 'right',
                                                        textDecoration: isAnnullato ? 'line-through' : 'none'
                                                    }}>
                                                        {Math.abs(amount).toFixed(2).replace('.', ',')}
                                                    </span>
                                                </td>
                                                <td style={{padding: '12px', textAlign:'right', borderTopRightRadius: '4px', borderBottomRightRadius: '4px'}}>
                                                    <div style={{display:'flex', justifyContent:'flex-end', gap:'5px'}}>
                                                        <button 
                                                            style={{padding: 0, border:'none', width:'32px', height:'32px', borderRadius:'4px', display:'inline-flex', alignItems:'center', justifyContent:'center', cursor:'pointer', backgroundColor: '#f1c40f', color:'white'}} 
                                                            title="Dettaglio"
                                                            onClick={() => setSelectedPaymentDetail(p)}
                                                        >
                                                            <Folder size={16} />
                                                        </button>
                                                        <button style={{padding: 0, border:'none', width:'32px', height:'32px', borderRadius:'4px', display:'inline-flex', alignItems:'center', justifyContent:'center', cursor:'pointer', backgroundColor: '#1abc9c', color:'white'}} title="Stampa" onClick={() => handlePrintPayment(p)}><Printer size={16} /></button>
                                                        <button style={{padding: 0, border:'none', width:'32px', height:'32px', borderRadius:'4px', display:'inline-flex', alignItems:'center', justifyContent:'center', cursor:'pointer', backgroundColor: '#5dade2', color:'white', opacity: p.socio_id ? 1 : 0.4}} title="Invia email" disabled={!p.socio_id} onClick={() => { setSelectedSocioForComm(p.socio_id); setShowComunicazioneModal(true); }}><Mail size={16} /></button>

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
                            <span style={{backgroundColor:'#e74c3c', color:'white', padding:'5px 15px', borderRadius:'4px', fontWeight:'bold'}}>€ {totalUscite.toFixed(2).replace('.', ',')}</span>
                            <span style={{backgroundColor:'#2ecc71', color:'white', padding:'5px 15px', borderRadius:'4px', fontWeight:'bold'}}>€ {totalEntrate.toFixed(2).replace('.', ',')}</span>
                        </div>
                    </div>
                </div>

            </div>

            <PagamentoFastModal 
                isOpen={isFastModalOpen} 
                onClose={() => setIsFastModalOpen(false)} 
                societaId={selectedSocietaId} 
            />

            <DettaglioPagamentoModal
                isOpen={selectedPaymentDetail !== null}
                onClose={() => setSelectedPaymentDetail(null)}
                pagamento={selectedPaymentDetail}
                onAnnulla={handleAnnullaRicevuta}
                onConvertProforma={(updated) => {
                    setPayments(prev => prev.map(p => p.id === updated.id ? updated : p));
                    setSelectedPaymentDetail(updated);
                }}
                onDeleteProforma={(id) => {
                    setPayments(prev => prev.filter(p => p.id !== id));
                    setSelectedPaymentDetail(null);
                }}
                societa={societaList?.find(s => s.id == selectedSocietaId)}
                products={products}
            />

            <ImportVociRicevutaModal
                isOpen={showImportVoci}
                onClose={() => setShowImportVoci(false)}
                societaId={selectedSocietaId}
                onImported={fetchPayments}
            />

            {showComunicazioneModal && selectedSocioForComm && (
                <ComunicazioneModal
                    socioId={selectedSocioForComm}
                    onClose={() => { setShowComunicazioneModal(false); setSelectedSocioForComm(null); }}
                />
            )}
        </div>
    );
};

export default Pagamenti;
