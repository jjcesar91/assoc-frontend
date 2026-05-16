import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Euro, Printer, X, CalendarClock, User, Landmark, Banknote } from 'lucide-react';
import { useSocieta } from '../data/SocietaContext';
import { useAnno, getAnnoDateRange } from '../data/AnnoContext';
import './Soci.css';
import './DettaglioPagamentoModal.css';

// Calcola la data di scadenza per i pagamenti di tipo tesseramento
function computeScadenzaTesseramento(p, societa) {
    if (!p.data_pagamento) return null;
    const periodicity = p.periodicity_tesseramento;
    if (!periodicity) return null;

    const d = new Date(p.data_pagamento);

    if (periodicity === 'anno_solare') {
        const scad = new Date(d);
        scad.setFullYear(scad.getFullYear() + 1);
        scad.setDate(scad.getDate() - 1);
        return scad;
    }

    if (periodicity === 'anno_associativo') {
        const tipo = societa?.tipo_anno_associativo || 'solare';
        let anno = d.getFullYear();
        const m = d.getMonth() + 1;
        const day = d.getDate();
        if (tipo === 'associativo') {
            if (m < 9) anno = d.getFullYear() - 1;
        } else if (tipo === 'personalizzato' && societa?.data_inizio_anno_associativo) {
            const parts = societa.data_inizio_anno_associativo.split('-');
            const cDay = parseInt(parts[0], 10);
            const cMonth = parseInt(parts[1], 10);
            if (m < cMonth || (m === cMonth && day < cDay)) anno = d.getFullYear() - 1;
        }
        const { end } = getAnnoDateRange(anno, societa);
        return end;
    }

    return null;
}

function computeStato(scadenzaDate) {
    if (!scadenzaDate) return 'N/D';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const limit = new Date(today);
    limit.setDate(limit.getDate() + 30);
    if (scadenzaDate < today) return 'SCADUTO';
    if (scadenzaDate <= limit) return 'IN SCADENZA';
    return 'VALIDO';
}

// ---------------------------------------------------------------------------
// Inline detail modal
// ---------------------------------------------------------------------------
const ScadenziarioDettaglioModal = ({ row, societa, onClose, products }) => {
    if (!row) return null;
    const p = row.pagamento;
    const stato = computeStato(row.scadenzaDate);

    const formatDate = (s) => {
        if (!s) return '—';
        return new Date(s).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const statoStyle = (st) => {
        if (st === 'SCADUTO') return { backgroundColor: '#e74c3c', color: 'white' };
        if (st === 'IN SCADENZA') return { backgroundColor: '#f39c12', color: 'white' };
        return { backgroundColor: '#2ecc71', color: 'white' };
    };

    const handlePrint = async () => {
        const statoLabel = p.stato_pagamento?.startsWith('3.') ? 'ANNULLATO' : 'VALIDO';
        const modalitaMap = {
            'Contanti': 'CONTANTI', 'POS': 'CARTA/BANCOMAT',
            'Bonifico': 'BONIFICO', 'Assegno': 'ASSEGNO',
            'Online': 'ONLINE', 'Carta/Bancomat': 'CARTA/BANCOMAT',
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

        const totalAmount = allItems.reduce((acc, item) => acc + Math.abs(parseFloat(item.importo || 0)), 0);
        const importoFormatted = totalAmount.toFixed(2).replace('.', ',');

        // Costruisce le righe: priorità payment_items (con product_id lookup) → fallback top-level quote
        const piSource = allItems.find(i => {
            const pi = i.payment_items;
            if (!pi) return false;
            const arr = Array.isArray(pi) ? pi : (() => { try { return JSON.parse(pi); } catch { return null; } })();
            return Array.isArray(arr) && arr.length > 0;
        });
        const getProductName = (productId) => {
            if (!productId || !products?.length) return null;
            return products.find(pr => Number(pr.id) === Number(productId))?.description || null;
        };
        let lineItems;
        if (piSource) {
            const arr = Array.isArray(piSource.payment_items)
                ? piSource.payment_items
                : JSON.parse(piSource.payment_items);
            lineItems = arr.map(pi => ({
                descrizione: getProductName(pi.product_id) || pi.quote || '',
                importo: Math.abs(parseFloat(pi.importo || 0)),
            }));
        } else {
            lineItems = allItems.map(item => ({
                descrizione: getProductName(item.product_id) || item.quote || '',
                importo: Math.abs(parseFloat(item.importo || 0)),
            }));
        }

        const quoteRows = lineItems.map(li => {
            const itemImporto = li.importo.toFixed(2).replace('.', ',');
            return `<tr><td>${li.descrizione}</td><td style="text-align:right">${itemImporto}</td></tr>`;
        }).join('');

        const logoUrl = societa?.logo_path ? `/users/${societa.logo_path}` : null;
        const footerText = societa?.footer_text ||
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
        .header-logo { margin-right: 20px; } .header-logo img { max-height: 70px; }
        .header-info { text-align: right; } .header-info h2 { margin: 0 0 4px 0; font-size: 16px; }
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
        @media print { body { padding: 0; } } @page { margin: 10mm; }
    </style>
</head>
<body>
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
            <th>TIPO DOCUMENTO</th><th>NUMERO DOCUMENTO</th>
            <th>PROGRESSIVO STAGIONE</th><th>DATA DOCUMENTO</th><th>STATO DOCUMENTO</th>
        </tr>
        <tr>
            <td>RICEVUTA</td><td>${p.numero_ricevuta || ''}</td>
            <td>${p.progressivo_stagione || ''}</td>
            <td>${(p.data_ricevuta || p.data_pagamento) ? new Date(p.data_ricevuta || p.data_pagamento).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}</td>
            <td>${statoLabel}</td>
        </tr>
        <tr>
            <th colspan="2">INTESTATARIO</th>
            <th colspan="2">CODICE FISCALE / PARTITA IVA INTESTATARIO</th>
            <th>MODALITA' PAGAMENTO</th>
        </tr>
        <tr>
            <td colspan="2">${(p.intestatario || '').toUpperCase()}</td>
            <td colspan="2">${p.codice_fiscale || codiceFiscaleSocio || p.partita_iva || ''}</td>
            <td>${modalitaLabel}</td>
        </tr>
        <tr>
            <th colspan="3">INDIRIZZO</th>
            <th colspan="2">DATI DI CHI HA EFFETTUATO IL PAGAMENTO</th>
        </tr>
        <tr><td colspan="3">${indirizzoSocio}</td><td colspan="2">${datiPagatore}</td></tr>
        <tr><th colspan="5">NOTE</th></tr>
        <tr><td colspan="5">${p.note || ''}</td></tr>
    </table>
    <table class="items-table">
        <tr><th>Descrizione</th><th>Subtotale</th></tr>
        ${quoteRows}
        <tr class="total-row"><td>TOTALE</td><td>${importoFormatted}</td></tr>
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

    return (
        <div className="dpm-overlay">
            <div className="dpm-modal">
                <div className="dpm-header">
                    <div className="dpm-title">
                        <CalendarClock size={20} />
                        <h2>Dettaglio scadenza</h2>
                    </div>
                    <button className="dpm-close-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="dpm-body">
                    {/* Scadenza */}
                    <div className="dpm-section">
                        <div className="dpm-section-title">Scadenza</div>
                        <div className="dpm-grid-3">
                            <div className="dpm-field">
                                <label>Tipo</label>
                                <div className="dpm-value">{row.tipo}</div>
                            </div>
                            <div className="dpm-field">
                                <label>Data scadenza</label>
                                <div className="dpm-value" style={{ fontWeight: 700 }}>{formatDate(row.scadenzaStr)}</div>
                            </div>
                            <div className="dpm-field">
                                <label>Stato</label>
                                <div className="dpm-value">
                                    <span style={{ ...statoStyle(stato), padding: '3px 10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                        {stato}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pagamento */}
                    <div className="dpm-section">
                        <div className="dpm-section-title">Pagamento registrato</div>
                        <div className="dpm-grid-3">
                            <div className="dpm-field">
                                <label><User size={14} /> Intestatario</label>
                                <div className="dpm-value">{p.intestatario}</div>
                            </div>
                            <div className="dpm-field">
                                <label>Data pagamento</label>
                                <div className="dpm-value">{formatDate(p.data_pagamento)}</div>
                            </div>
                            <div className="dpm-field">
                                <label>€ Importo</label>
                                <div className="dpm-value">€ {Math.abs(parseFloat(p.importo || 0)).toFixed(2).replace('.', ',')}</div>
                            </div>
                        </div>
                        <div className="dpm-divider" />
                        <div className="dpm-grid-3">
                            <div className="dpm-field">
                                <label>Operatore</label>
                                <div className="dpm-value">{p.utente_nome || '—'}</div>
                            </div>
                            <div className="dpm-field">
                                <label><Landmark size={14} /> Conto destinazione</label>
                                <div className="dpm-value">{p.conto_destinazione || '—'}</div>
                            </div>
                            <div className="dpm-field">
                                <label><Banknote size={14} /> Modalità</label>
                                <div className="dpm-value">{p.modalita_pagamento || '—'}</div>
                            </div>
                        </div>
                        <div className="dpm-divider" />
                        <div className="dpm-grid-3">
                            <div className="dpm-field">
                                <label>Numero ricevuta</label>
                                <div className="dpm-value dpm-ricevuta">
                                    {p.numero_ricevuta || '—'}
                                    {p.numero_ricevuta && (
                                        p.stato_pagamento?.startsWith('3.')
                                            ? <span className="dpm-badge-annullata">ANNULLATA</span>
                                            : <span className="dpm-badge-valida">VALIDA</span>
                                    )}
                                </div>
                            </div>
                            <div className="dpm-field">
                                <label>Data ricevuta</label>
                                <div className="dpm-value">{formatDate(p.data_ricevuta)}</div>
                            </div>
                            <div className="dpm-field">
                                <label>Codice fiscale</label>
                                <div className="dpm-value">{p.codice_fiscale || '—'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Quote */}
                    <div className="dpm-section dpm-section-quote">
                        <div className="dpm-section-title">Quote</div>
                        {(() => {
                            let items = p.payment_items;
                            if (typeof items === 'string') {
                                try { items = JSON.parse(items); } catch { items = null; }
                            }
                            const getProductName = (productId) => {
                                if (!productId || !products?.length) return null;
                                return products.find(pr => Number(pr.id) === Number(productId))?.description || null;
                            };
                            if (Array.isArray(items) && items.length > 0) {
                                if (items.length === 1) {
                                    const item = items[0];
                                    const prodName = getProductName(item.product_id) || item.quote || '';
                                    return (
                                        <div className="dpm-quote-row">
                                            <span>{prodName}</span>
                                            <span>€ {Math.abs(parseFloat(item.importo || 0)).toFixed(2).replace('.', ',')}</span>
                                        </div>
                                    );
                                }
                                return (
                                    <>
                                        {items.map((item, idx) => {
                                            const prodName = getProductName(item.product_id) || item.quote || '';
                                            return (
                                                <div key={idx} className="dpm-quote-row">
                                                    <span>{prodName}</span>
                                                    <span>€ {Math.abs(parseFloat(item.importo || 0)).toFixed(2).replace('.', ',')}</span>
                                                </div>
                                            );
                                        })}
                                        <div className="dpm-quote-row" style={{ borderTop: '1px solid #e5e7eb', marginTop: '4px', paddingTop: '6px', fontWeight: 700 }}>
                                            <span>Totale</span>
                                            <span>€ {Math.abs(parseFloat(p.importo || 0)).toFixed(2).replace('.', ',')}</span>
                                        </div>
                                    </>
                                );
                            }
                            // Fallback top-level
                            const prodName = getProductName(p.product_id) || p.quote || '';
                            return (
                                <div className="dpm-quote-row">
                                    <span>{prodName}</span>
                                    <span>€ {Math.abs(parseFloat(p.importo || 0)).toFixed(2).replace('.', ',')}</span>
                                </div>
                            );
                        })()}
                    </div>
                </div>

                <div className="dpm-footer" style={{ gap: '10px' }}>
                    <button
                        className="dpm-btn-annulla"
                        style={{ backgroundColor: '#1abc9c' }}
                        onClick={handlePrint}
                    >
                        <Printer size={16} /> Scarica PDF
                    </button>
                    <button
                        className="dpm-btn-annulla"
                        style={{ backgroundColor: '#95a5a6' }}
                        onClick={onClose}
                    >
                        <X size={16} /> Chiudi
                    </button>
                </div>
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const Scadenziario = () => {
    const { selectedSocietaId, societaList } = useSocieta();
    const { selectedAnno } = useAnno();
    const navigate = useNavigate();
    const [payments, setPayments] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDettaglio, setSelectedDettaglio] = useState(null);

    const [filters, setFilters] = useState({
        intestatario: '',
        dataDa: '',
        dataA: '',
        stato: 'TUTTI',
    });

    const [sort, setSort] = useState({ key: 'scadenza', dir: 'asc' });

    const societa = useMemo(
        () => societaList?.find(s => s.id == selectedSocietaId) || null,
        [societaList, selectedSocietaId]
    );

    const fetchPayments = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/payments/api?societa_id=${selectedSocietaId}`);
            if (response.ok) {
                const data = await response.json();
                setPayments(data);
            }
        } catch (error) {
            console.error('Error fetching payments', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await fetch(`/products/api?societaId=${selectedSocietaId}`);
            if (res.ok) setProducts(await res.json());
        } catch (e) {
            console.error('Errore caricamento prodotti', e);
        }
    };

    useEffect(() => {
        setFilters({ intestatario: '', dataDa: '', dataA: '', stato: 'TUTTI' });
        if (selectedSocietaId) {
            fetchPayments();
            fetchProducts();
        } else {
            setPayments([]);
            setProducts([]);
            setLoading(false);
        }
    }, [selectedSocietaId]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (selectedSocietaId) fetchPayments();
    }, [selectedAnno]); // eslint-disable-line react-hooks/exhaustive-deps

    // Costruisce le righe scadenze dai pagamenti nella stagione selezionata
    const scadenze = useMemo(() => {
        if (!selectedAnno || !societa) return [];
        const { start, end } = getAnnoDateRange(selectedAnno, societa);
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];

        const rows = [];

        // Per ogni (utente, product_id), tieni solo l'ultimo pagamento in ordine cronologico
        const latestByKey = new Map();
        for (const p of payments) {
            if (p.stato_pagamento?.startsWith('3.')) continue;
            if (!p.data_pagamento) continue;
            if (p.data_pagamento < startStr || p.data_pagamento > endStr) continue;
            const userKey = p.socio_id != null ? `s:${p.socio_id}` : `i:${p.intestatario || ''}`;
            const groupKey = p.product_id != null ? `${userKey}|p:${p.product_id}` : `${userKey}|id:${p.id}`;
            const existing = latestByKey.get(groupKey);
            if (!existing || p.data_pagamento > existing.data_pagamento) {
                latestByKey.set(groupKey, p);
            }
        }
        const deduplicatedPayments = Array.from(latestByKey.values());

        for (const p of deduplicatedPayments) {
            const type = (p.quote_types || '').trim().toLowerCase();

            // Tesseramento 365 giorni (anno_solare) → scade un anno dopo il pagamento
            if (type === 'tesseramento' && p.periodicity_tesseramento === 'anno_solare') {
                const scad = computeScadenzaTesseramento(p, societa);
                if (scad) {
                    rows.push({
                        key: `${p.id}`,
                        pagamento: p,
                        tipo: 'Tessera 365 giorni',
                        tipoKey: 'tesseramento',
                        scadenzaDate: scad,
                        scadenzaStr: scad.toISOString().split('T')[0],
                    });
                }
            }

            // Abbonamento → scade a data_scadenza_abbonamento
            if (type === 'subscription') {
                if (p.data_scadenza_abbonamento) {
                    const scad = new Date(p.data_scadenza_abbonamento);
                    rows.push({
                        key: `${p.id}`,
                        pagamento: p,
                        tipo: 'Abbonamento',
                        tipoKey: 'subscription',
                        scadenzaDate: scad,
                        scadenzaStr: p.data_scadenza_abbonamento,
                    });
                }
            }
        }

        return rows;
    }, [payments, selectedAnno, societa]);

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const handleSort = (key) => {
        setSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
    };

    const SortIcon = ({ col }) => {
        if (sort.key !== col) return <span style={{ opacity: 0.35, fontSize: '0.7rem', marginLeft: '4px' }}>⇅</span>;
        return <span style={{ fontSize: '0.7rem', marginLeft: '4px' }}>{sort.dir === 'asc' ? '↑' : '↓'}</span>;
    };

    const filteredRows = useMemo(() => {
        return scadenze.filter(row => {
            const stato = computeStato(row.scadenzaDate);
            if (filters.intestatario && !row.pagamento.intestatario?.toLowerCase().includes(filters.intestatario.toLowerCase())) return false;
            if (filters.stato !== 'TUTTI' && stato !== filters.stato) return false;
            if (filters.dataDa && row.scadenzaStr < filters.dataDa) return false;
            if (filters.dataA && row.scadenzaStr > filters.dataA) return false;
            return true;
        }).sort((a, b) => {
            let va, vb;
            if (sort.key === 'intestatario') {
                va = a.pagamento.intestatario || '';
                vb = b.pagamento.intestatario || '';
            } else if (sort.key === 'tipo') {
                va = a.tipo;
                vb = b.tipo;
            } else {
                // scadenza (default)
                va = a.scadenzaStr;
                vb = b.scadenzaStr;
            }
            if (va < vb) return sort.dir === 'asc' ? -1 : 1;
            if (va > vb) return sort.dir === 'asc' ? 1 : -1;
            return 0;
        });
    }, [scadenze, filters, sort]);

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const statoStyle = (stato) => {
        if (stato === 'SCADUTO') return { backgroundColor: '#e74c3c', color: 'white' };
        if (stato === 'IN SCADENZA') return { backgroundColor: '#f39c12', color: 'white' };
        return { backgroundColor: '#2ecc71', color: 'white' };
    };

    return (
        <div className="soci-full-container">
            <div className="main-content">

                {/* Filters Toolbar */}
                <div className="toolbar-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '12px' }}>

                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '120px' }}>
                            <label style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Intestatario</label>
                            <input
                                className="md-input"
                                placeholder="Intestatario"
                                style={{ width: '100%', padding: '6px 12px' }}
                                value={filters.intestatario}
                                onChange={(e) => handleFilterChange('intestatario', e.target.value)}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '120px' }}>
                            <label style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Scadenza da</label>
                            <input
                                type="date"
                                className="md-input"
                                style={{ width: '100%', padding: '6px 12px' }}
                                value={filters.dataDa}
                                onChange={(e) => handleFilterChange('dataDa', e.target.value)}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '120px' }}>
                            <label style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Scadenza a</label>
                            <input
                                type="date"
                                className="md-input"
                                style={{ width: '100%', padding: '6px 12px' }}
                                value={filters.dataA}
                                onChange={(e) => handleFilterChange('dataA', e.target.value)}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '120px' }}>
                            <label style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Stato</label>
                            <select
                                className="md-select"
                                style={{ width: '100%', padding: '6px 12px' }}
                                value={filters.stato}
                                onChange={(e) => handleFilterChange('stato', e.target.value)}
                            >
                                <option value="TUTTI">TUTTI</option>
                                <option value="VALIDO">VALIDO</option>
                                <option value="IN SCADENZA">IN SCADENZA</option>
                                <option value="SCADUTO">SCADUTO</option>
                            </select>
                        </div>

                    </div>
                </div>

                {/* Table Block */}
                <div style={{ marginTop: '8px', flex: 1, display: 'flex', flexDirection: 'column' }} className="card">
                    <div className="table-responsive">
                        <table className="md-table" style={{ borderCollapse: 'separate', borderSpacing: '0 4px', backgroundColor: 'transparent' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f1c40f', color: '#fff' }}>
                                    <th style={{ padding: '12px', borderTopLeftRadius: '6px', borderBottomLeftRadius: '6px', color: '#000', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }} onClick={() => handleSort('intestatario')}>
                                        Intestatario<SortIcon col="intestatario" />
                                    </th>
                                    <th style={{ padding: '12px', color: '#000' }}>Quote</th>
                                    <th style={{ padding: '12px', color: '#000', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }} onClick={() => handleSort('scadenza')}>
                                        Data scadenza<SortIcon col="scadenza" />
                                    </th>
                                    <th style={{ padding: '12px', textAlign: 'right', color: '#000', whiteSpace: 'nowrap' }}>Importo</th>
                                    <th style={{ padding: '12px', color: '#000', whiteSpace: 'nowrap' }}>Stato</th>
                                    <th style={{ padding: '12px', textAlign: 'right', color: '#000', borderTopRightRadius: '6px', borderBottomRightRadius: '6px', whiteSpace: 'nowrap' }}>Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                                            Caricamento...
                                        </td>
                                    </tr>
                                ) : filteredRows.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                                            Nessuna scadenza trovata
                                        </td>
                                    </tr>
                                ) : filteredRows.map(row => {
                                    const p = row.pagamento;
                                    const stato = computeStato(row.scadenzaDate);
                                    const isScaduto = stato === 'SCADUTO';
                                    const isInScadenza = stato === 'IN SCADENZA';
                                    const rowBg = isScaduto ? '#fceceb' : (isInScadenza ? '#fef9e7' : '#fff');
                                    const borderColor = isScaduto ? '#e74c3c' : (isInScadenza ? '#f39c12' : '#2ecc71');

                                    return (
                                        <tr key={row.key} style={{
                                            backgroundColor: rowBg,
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                            borderLeft: `5px solid ${borderColor}`,
                                        }}>
                                            <td style={{ padding: '12px', borderTopLeftRadius: '4px', borderBottomLeftRadius: '4px' }}>
                                                <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                                                    {p.socio_id ? (
                                                        <a href={`/soci?apriSocioPath=${p.socio_id}`} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }}>{p.intestatario}</a>
                                                    ) : p.intestatario}
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                    {row.tipo} · {formatDate(p.data_pagamento)} · {p.numero_ricevuta || `#${p.id}`}
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    {(p.quote || '').split(', ').filter(Boolean).map((q, i) => (
                                                        <span key={i} style={{
                                                            border: '1px solid #ccc', borderRadius: '12px', padding: '3px 10px',
                                                            fontSize: '0.8rem', background: '#fff', display: 'inline-block'
                                                        }}>
                                                            {q}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                                {formatDate(row.scadenzaStr)}
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'right' }}>
                                                <span style={{
                                                    backgroundColor: '#2ecc71', color: 'white',
                                                    padding: '4px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '1rem'
                                                }}>
                                                    {Math.abs(parseFloat(p.importo || 0)).toFixed(2).replace('.', ',')}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <span style={{
                                                    ...statoStyle(stato),
                                                    padding: '4px 10px', borderRadius: '4px',
                                                    fontWeight: 'bold', fontSize: '0.8rem', whiteSpace: 'nowrap'
                                                }}>
                                                    {stato}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'right', borderTopRightRadius: '4px', borderBottomRightRadius: '4px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '5px' }}>
                                                    <button
                                                        title="Paga"
                                                        style={{ padding: 0, border: 'none', width: '32px', height: '32px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backgroundColor: '#2ecc71', color: 'white' }}
                                                        onClick={() => navigate('/nuovo-pagamento', {
                                                            state: {
                                                                socio: {
                                                                    id: p.socio_id || null,
                                                                    cognome: p.intestatario || '',
                                                                    nome: '',
                                                                    codice_fiscale: p.codice_fiscale || '',
                                                                },
                                                                prefilledQuoteType: row.tipoKey,
                                                                prefilledProductId: p.product_id || null,
                                                            }
                                                        })}
                                                    >
                                                        <Euro size={16} />
                                                    </button>
                                                    <button
                                                        title="Dettaglio"
                                                        style={{ padding: 0, border: 'none', width: '32px', height: '32px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backgroundColor: '#3498db', color: 'white' }}
                                                        onClick={() => setSelectedDettaglio(row)}
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    <div style={{ display: 'flex', alignItems: 'center', paddingTop: '15px', borderTop: '1px solid #eee', marginTop: 'auto' }}>
                        <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>Tot righe: {filteredRows.length}</span>
                    </div>
                </div>

            </div>

            <ScadenziarioDettaglioModal
                row={selectedDettaglio}
                societa={societa}
                onClose={() => setSelectedDettaglio(null)}
                products={products}
            />
        </div>
    );
};

export default Scadenziario;
