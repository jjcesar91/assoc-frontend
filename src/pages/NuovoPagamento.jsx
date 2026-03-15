import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, List, CreditCard, Check, X, User, FileEdit, AlertTriangle, Folder } from 'lucide-react';
import { useSocieta } from '../data/SocietaContext';
import RicercaSocioModal from './RicercaSocioModal';
import GeneraPagamentoModal from './GeneraPagamentoModal';
import DettaglioPagamentoModal from './DettaglioPagamentoModal';
import './NuovoPagamento.css'; // Make sure we use the right CSS with isolated namespaces

const getCertStatus = (scadenza) => {
    if (!scadenza) return 'NON ISCRITTO';
    const scadenzaDate = new Date(scadenza);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (scadenzaDate < today) return 'SCADUTO';
    return 'ISCRITTO';
};

const NuovoPagamento = () => {
    const { selectedSocietaId } = useSocieta();
    const navigate = useNavigate();
    const [isRicercaModalOpen, setIsRicercaModalOpen] = useState(false);
    const [isGeneraModalOpen, setIsGeneraModalOpen] = useState(false);
    const [selectedPaymentDetail, setSelectedPaymentDetail] = useState(null);
    const [selectedSocio, setSelectedSocio] = useState(null);
    const [recentPayments, setRecentPayments] = useState([]);
    
    // Products
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [productSearch, setProductSearch] = useState('');
    
    // Cart
    const [cart, setCart] = useState([]);

    useEffect(() => {
        if (selectedSocietaId) {
            fetchProducts();
        }
    }, [selectedSocietaId]);

    const fetchProducts = async () => {
        try {
            const response = await fetch(`/products/api?societaId=${selectedSocietaId}`);
            if (response.ok) {
                const data = await response.json();
                setProducts(data);
                setFilteredProducts(data);
            }
        } catch (error) {
            console.error("Error fetching products", error);
        }
    };

    useEffect(() => {
        if (productSearch) {
            setFilteredProducts(products.filter(p => (p.description || p.name || '').toLowerCase().includes(productSearch.toLowerCase())));
        } else {
            setFilteredProducts(products);
        }
    }, [productSearch, products]);

    const handleSocioSelect = async (socio) => {
        setSelectedSocio(socio);
        setIsRicercaModalOpen(false);
        try {
            const response = await fetch(`/payments/api?societa_id=${selectedSocietaId}`);
            if (response.ok) {
                const data = await response.json();
                const userPayments = data.filter(p => p.codice_fiscale && p.codice_fiscale.toUpperCase() === (socio.codice_fiscale || '').toUpperCase()).slice(0, 3);
                setRecentPayments(userPayments);
            }
        } catch(e) {
            console.error(e);
        }
    };

    const addToCart = (product) => {
        if (cart.length >= 5) {
            alert('Max 5 prodotti nel carrello');
            return;
        }
        const existing = cart.find(item => item.id === product.id);
        if (existing) {
            setCart(cart.map(item => item.id === product.id ? {...item, qty: item.qty + 1} : item));
        } else {
            setCart([...cart, { ...product, qty: 1 }]);
        }
    };

    const removeFromCart = (productId) => {
        setCart(cart.filter(item => item.id !== productId));
    };

    const generatePayment = () => {
        if (cart.length === 0) {
            alert("Aggiungi almeno un prodotto al carrello.");
            return;
        }
        setIsGeneraModalOpen(true);
    };

    const handleConfirmPayment = async (paymentData) => {
        try {
            const body = {
                ...paymentData,
                societa_id: selectedSocietaId
            };
            const response = await fetch('/payments/api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            
            if (response.ok) {
                alert("Pagamento generato con successo!");
                setIsGeneraModalOpen(false);
                navigate('/pagamenti');
            } else {
                alert("Errore durante la generazione del pagamento");
            }
        } catch (e) {
            console.error("Errore salvataggio pagamento", e);
            alert("Errore durante la generazione del pagamento");
        }
    };

    const cartTotal = cart.reduce((acc, item) => acc + (parseFloat(item.basePrice || 0) * item.qty), 0);

    return (
        <div className="np-container">
            <RicercaSocioModal 
                isOpen={isRicercaModalOpen} 
                onClose={() => setIsRicercaModalOpen(false)} 
                onSelect={handleSocioSelect}
                societaId={selectedSocietaId}
            />
            
            <GeneraPagamentoModal
                isOpen={isGeneraModalOpen}
                onClose={() => setIsGeneraModalOpen(false)}
                onConfirm={handleConfirmPayment}
                totale={cartTotal}
                socio={selectedSocio}
                cart={cart}
            />

            <DettaglioPagamentoModal
                isOpen={selectedPaymentDetail !== null}
                onClose={() => setSelectedPaymentDetail(null)}
                pagamento={selectedPaymentDetail}
            />
            
            <div className="np-grid">
                
                {/* LEFT COLUMN */}
                <div className="np-col-left">
                    
                    {/* INTESTATARIO BLOCK */}
                    <div className="np-card">
                        <div className="np-card-header np-header-default">
                            Intestatario pagamento
                        </div>
                        <div className="np-card-body">
                            {!selectedSocio ? (
                                <>
                                    <div className="np-alert-red">
                                        <AlertTriangle size={18} strokeWidth={1.5}/>
                                        Seleziona un socio, oppure imposta l'intestatario (non censito) dopo aver fatto click su 'Genera Pagamento'
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                                        <button className="np-btn np-btn-yellow" onClick={() => setIsRicercaModalOpen(true)}>
                                            <FileEdit size={16} strokeWidth={1.5}/> Seleziona intestatario
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <h3 style={{ margin: '0 0 10px 0', fontSize: '20px' }}>{selectedSocio.id} {selectedSocio.cognome} {selectedSocio.nome}</h3>
                                            <div style={{ fontSize: '13px', color: '#555', marginBottom: '12px' }}>
                                                Data nascita {selectedSocio.data_nascita ? new Date(selectedSocio.data_nascita).toLocaleDateString('it-IT') : ''} - Codice fiscale {selectedSocio.codice_fiscale}
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <span className="np-badge np-badge-danger">
                                                    {getCertStatus(selectedSocio.scadenza_certificato)}
                                                </span>
                                                {selectedSocio.scadenza_certificato && (
                                                    <span className="np-badge np-badge-danger">
                                                        CERTIFICATO MEDICO {getCertStatus(selectedSocio.scadenza_certificato)} ({new Date(selectedSocio.scadenza_certificato).toLocaleDateString('it-IT')})
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ color: '#3498db' }}>
                                            <User size={64} strokeWidth={1.2}/>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                        <button className="np-btn np-btn-green" onClick={() => window.open(`/soci?apriSocioPath=${selectedSocio.id}`, '_blank')}>
                                            <User size={16} strokeWidth={1.5}/> Scheda
                                        </button>
                                        <button className="np-btn np-btn-yellow" onClick={() => setIsRicercaModalOpen(true)}>
                                            <FileEdit size={16} strokeWidth={1.5}/> Modifica intestatario
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* PRODOTTI DISPONIBILI */}
                    <div className="np-card">
                        <div className="np-card-header np-header-yellow">
                            <List size={18} strokeWidth={2}/> 
                            Prodotti disponibili 
                            <span style={{ fontSize: '12px', fontWeight: 400, opacity: 0.9, marginLeft: '6px' }}>
                                - In evidenza i prodotti pagati in passato dal socio
                            </span>
                        </div>
                        <div className="np-card-body">
                            <div className="np-search-group">
                                <input 
                                    type="text" 
                                    placeholder="Prodotto" 
                                    className="np-input" 
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                />
                                <button className="np-btn-search">
                                    <Search size={18} strokeWidth={1.5}/>
                                </button>
                            </div>
                            
                            <table className="np-table np-table-selectable">
                                <tbody>
                                    {filteredProducts.map((p, idx) => (
                                        <tr key={idx} onClick={() => addToCart(p)}>
                                            <td style={{ fontSize: '15px' }}>{p.description || p.name}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <span className="np-badge-price">
                                                    {parseFloat(p.basePrice || 0).toFixed(2).replace('.', ',')}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            
                            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div className="np-pagination">
                                    <button className="np-page-btn">&lt;&lt;</button>
                                    <button className="np-page-btn">&lt;</button>
                                    <button className="np-page-btn active">1</button>
                                    <button className="np-page-btn">&gt;</button>
                                    <button className="np-page-btn">&gt;&gt;</button>
                                </div>
                                <span style={{ fontSize: '13px', color: '#1976d2', fontWeight: 600 }}>Tot righe: {filteredProducts.length}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="np-col-right">
                    
                    {/* ULTIMI 3 PAGAMENTI */}
                    <div className="np-card">
                        <div className="np-card-header np-header-default">
                            € Ultimi 3 pagamenti
                        </div>
                        <div className="np-card-body">
                            {!selectedSocio || recentPayments.length === 0 ? (
                                <div className="np-alert-red" style={{ padding: '30px 0' }}>
                                    <AlertTriangle size={18} strokeWidth={1.5}/>
                                    Non sono presenti pagamenti per il socio selezionato come intestatario del pagamento corrente
                                </div>
                            ) : (
                                <div>
                                    {recentPayments.map((p, i) => (
                                        <div key={i} className="np-recent-payment-item">
                                            {p.numero_ricevuta ? (
                                                <span style={{ fontWeight: 600 }}>N. {p.numero_ricevuta}</span>
                                            ) : (
                                                <span style={{ fontWeight: 100, color: '#888' }}>NO RIC</span>
                                            )}
                                            <span style={{ color: '#666' }}>{new Date(p.data_pagamento).toLocaleDateString('it-IT')}</span>
                                            <span style={{ fontWeight: 600 }}>€ {parseFloat(p.importo).toFixed(2).replace('.', ',')}</span>
                                            <button 
                                                className="np-btn np-btn-outline-yellow"
                                                onClick={() => setSelectedPaymentDetail(p)}
                                            >
                                                <Folder size={16} strokeWidth={1.5}/> Dettagli
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* CARRELLO */}
                    <div className="np-card">
                        <div className="np-card-header np-header-green">
                            <CreditCard size={18} strokeWidth={2}/> Carrello prodotti (max. 5)
                            

                        </div>
                        <div className="np-card-body">
                            <div style={{ border: '1px solid #eef0f3', borderRadius: '4px', marginBottom: '20px', overflow: 'hidden' }}>
                                <table className="np-table np-table-green">
                                    <thead style={{ backgroundColor: '#fcfcfc' }}>
                                        <tr>
                                            <th>Prodotto</th>
                                            <th>Importo unitario</th>
                                            <th>Qtà</th>
                                            <th>Subtotale</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cart.length === 0 ? (
                                            <tr>
                                                <td colSpan="4">
                                                    <div className="np-cart-empty">
                                                        Carrello vuoto
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            cart.map((item, i) => (
                                                <tr key={i}>
                                                    <td style={{ fontWeight: 500, fontSize: '14px', color: '#333', borderRight: '1px solid #eef0f3' }}>
                                                        {item.description || item.name} 
                                                        <button onClick={() => removeFromCart(item.id)} style={{ border: 'none', background: 'none', color: '#e74c3c', cursor: 'pointer', float: 'right' }}>
                                                            <X size={16}/>
                                                        </button>
                                                    </td>
                                                    <td style={{ borderRight: '1px solid #eef0f3' }}>{parseFloat(item.basePrice || 0).toFixed(2).replace('.', ',')}</td>
                                                    <td style={{ borderRight: '1px solid #eef0f3' }}>{item.qty}</td>
                                                    <td style={{ fontWeight: 600 }}>{(parseFloat(item.basePrice || 0) * item.qty).toFixed(2).replace('.', ',')}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button className="np-btn np-btn-red" onClick={() => setCart([])}>
                                    <X size={16} strokeWidth={2}/> Annulla
                                </button>
                                <button className={`np-btn ${cart.length > 0 ? 'np-btn-green' : 'np-btn-light-green'}`} onClick={generatePayment} disabled={cart.length === 0}>
                                    <Check size={16} strokeWidth={2}/> Genera pagamento
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default NuovoPagamento;
