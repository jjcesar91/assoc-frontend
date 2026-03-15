const fs = require('fs');

const code = `import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronDown, List, CreditCard, Euro, Check, X, MousePointerClick, User, FileEdit, Calendar, AlertTriangle, Folder } from 'lucide-react';
import { useSocieta } from '../data/SocietaContext';
import RicercaSocioModal from './RicercaSocioModal';
import './Soci.css'; // Usiamo direttamente gli stili base esistenti

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
    const [selectedSocio, setSelectedSocio] = useState(null);
    const [recentPayments, setRecentPayments] = useState([]);
    
    // Products
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [productSearch, setProductSearch] = useState('');
    
    // Cart
    const [cart, setCart] = useState([]);
    const [discount, setDiscount] = useState('Nessuno sconto');

    useEffect(() => {
        if (selectedSocietaId) {
            fetchProducts();
        }
    }, [selectedSocietaId]);

    const fetchProducts = async () => {
        try {
            const response = await fetch(\`/products/api?societaId=\${selectedSocietaId}\`);
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
            setFilteredProducts(products.filter(p => (p.description || '').toLowerCase().includes(productSearch.toLowerCase())));
        } else {
            setFilteredProducts(products);
        }
    }, [productSearch, products]);

    const handleSocioSelect = async (socio) => {
        setSelectedSocio(socio);
        setIsRicercaModalOpen(false);
        try {
            const response = await fetch(\`/payments/api?societa_id=\${selectedSocietaId}\`);
            if (response.ok) {
                const data = await response.json();
                const userPayments = data.filter(p => p.socio_id === socio.id).slice(0, 3);
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

    const generatePayment = async () => {
        if (cart.length === 0) {
            alert("Aggiungi almeno un prodotto al carrello.");
            return;
        }
        alert("Generazione pagamento simulata con successo!");
        navigate('/pagamenti');
    };

    const cartTotal = cart.reduce((acc, item) => acc + (parseFloat(item.basePrice || 0) * item.qty), 0);

    return (
        <div className="soci-full-container">
            <RicercaSocioModal 
                isOpen={isRicercaModalOpen} 
                onClose={() => setIsRicercaModalOpen(false)} 
                onSelect={handleSocioSelect}
                societaId={selectedSocietaId}
            />
            
            <div className="main-content" style={{overflowY: 'auto', paddingBottom: '40px'}}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1fr) minmax(500px, 1.5fr)', gap: '24px', alignItems: 'start' }}>
                    
                    {/* LEFT COLUMN */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        
                        {/* INTESTATARIO BLOCK */}
                        <div className="table-card">
                            <div style={{ padding: '16px 20px', backgroundColor: 'var(--surface-color)', borderBottom: '2px solid var(--border-color)', fontWeight: 500, fontSize: '1rem', color: 'var(--text-primary)' }}>
                                Intestatario pagamento
                            </div>
                            <div style={{ padding: '20px' }}>
                                {!selectedSocio ? (
                                    <>
                                        <div style={{ color: 'var(--danger-color)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                                            <AlertTriangle size={16}/> Seleziona un socio, oppure imposta l'intestatario (non censito) dopo aver fatto click su 'Genera Pagamento'
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <button className="btn-contained" style={{ backgroundColor: 'var(--warning-color)', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setIsRicercaModalOpen(true)}>
                                                <FileEdit size={14}/> Seleziona intestatario
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: 'var(--text-primary)' }}>{selectedSocio.id} {selectedSocio.cognome} {selectedSocio.nome}</h3>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                                                    Data nascita {selectedSocio.data_nascita ? new Date(selectedSocio.data_nascita).toLocaleDateString('it-IT') : ''} - Codice fiscale {selectedSocio.codice_fiscale}
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <span className="chip" style={{ backgroundColor: 'var(--danger-color)', color: 'white' }}>
                                                        {getCertStatus(selectedSocio.scadenza_certificato)}
                                                    </span>
                                                    {selectedSocio.scadenza_certificato && (
                                                        <span className="chip" style={{ backgroundColor: 'var(--danger-color)', color: 'white' }}>
                                                            CERTIFICATO MEDICO {getCertStatus(selectedSocio.scadenza_certificato)} ({new Date(selectedSocio.scadenza_certificato).toLocaleDateString('it-IT')})
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ color: 'var(--primary-color)', opacity: 0.8 }}>
                                                <User size={56} strokeWidth={1}/>
                                            </div>
                                        </div>
                                        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                            <button className="btn-contained" style={{ backgroundColor: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <User size={14}/> Scheda
                                            </button>
                                            <button className="btn-contained" style={{ backgroundColor: 'var(--warning-color)', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setIsRicercaModalOpen(true)}>
                                                <FileEdit size={14}/> Modifica intestatario
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* PRODOTTI DISPONIBILI */}
                        <div className="table-card">
                            <div style={{ padding: '16px 20px', backgroundColor: 'var(--warning-color)', color: 'white', fontWeight: 500, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <List size={18}/> Prodotti disponibili 
                                <span style={{ fontSize: '0.8rem', fontWeight: 400, opacity: 0.9 }}>- In evidenza i prodotti pagati in passato dal socio</span>
                            </div>
                            <div style={{ padding: '20px' }}>
                                <div style={{ display: 'flex', marginBottom: '16px' }}>
                                    <div className="search-field-wrapper" style={{ flex: 1 }}>
                                        <input 
                                            type="text" 
                                            placeholder="Cerca prodotto..." 
                                            className="md-input" 
                                            style={{ width: '100%', borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                                            value={productSearch}
                                            onChange={(e) => setProductSearch(e.target.value)}
                                        />
                                    </div>
                                    <button className="btn-contained" style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, backgroundColor: 'var(--primary-color)', padding: '0 16px' }}>
                                        <Search size={18}/>
                                    </button>
                                </div>
                                
                                <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                    <table className="md-table" style={{ margin: 0 }}>
                                        <tbody>
                                            {filteredProducts.map((p, idx) => (
                                                <tr key={idx} style={{ cursor: 'pointer' }} onClick={() => addToCart(p)}>
                                                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{p.description || p.name}</td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                        <span style={{ backgroundColor: 'var(--success-color)', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600 }}>
                                                            {parseFloat(p.basePrice || 0).toFixed(2).replace('.', ',')}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                
                                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button className="btn-outlined" style={{ padding: '4px 8px', minWidth: 'auto' }}>&lt;&lt;</button>
                                        <button className="btn-outlined" style={{ padding: '4px 8px', minWidth: 'auto' }}>&lt;</button>
                                        <button className="btn-contained" style={{ padding: '4px 12px', minWidth: 'auto' }}>1</button>
                                        <button className="btn-outlined" style={{ padding: '4px 8px', minWidth: 'auto' }}>&gt;</button>
                                        <button className="btn-outlined" style={{ padding: '4px 8px', minWidth: 'auto' }}>&gt;&gt;</button>
                                    </div>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--primary-color)', fontWeight: 500 }}>Tot righe: {filteredProducts.length}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        
                        {/* ULTIMI 3 PAGAMENTI */}
                        <div className="table-card">
                            <div style={{ padding: '16px 20px', backgroundColor: 'var(--surface-color)', borderBottom: '2px solid var(--border-color)', fontWeight: 500, fontSize: '1rem', color: 'var(--text-primary)' }}>
                                € Ultimi 3 pagamenti
                            </div>
                            <div style={{ padding: '20px' }}>
                                {!selectedSocio || recentPayments.length === 0 ? (
                                    <div style={{ color: 'var(--danger-color)', fontSize: '0.9rem', textAlign: 'center', padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                        <AlertTriangle size={24} style={{ opacity: 0.5 }}/>
                                        Non sono presenti pagamenti per il socio selezionato
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {recentPayments.map((p, i) => (
                                            <div key={i} style={{ border: '1px solid var(--warning-color)', borderRadius: '4px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fffdf2' }}>
                                                <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{p.id}N. {p.socio_id}/{new Date().getFullYear()}</span>
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{new Date(p.data_pagamento).toLocaleDateString('it-IT')}</span>
                                                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>€ {parseFloat(p.importo).toFixed(2).replace('.', ',')}</span>
                                                <button className="btn-outlined" style={{ padding: '4px 12px', color: 'var(--warning-color)', borderColor: 'var(--warning-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Folder size={14}/> Dettagli
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* CARRELLO */}
                        <div className="table-card">
                            <div style={{ padding: '16px 20px', backgroundColor: 'var(--success-color)', color: 'white', fontWeight: 500, fontSize: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <CreditCard size={18}/> Carrello prodotti (max. 5)
                                </div>
                                <select className="md-select" style={{ padding: '6px 12px', fontSize: '0.85rem', minWidth: '150px' }}>
                                    <option>Nessuno sconto</option>
                                    <option>10%</option>
                                    <option>20%</option>
                                </select>
                            </div>
                            <div style={{ padding: '20px' }}>
                                <div className="table-responsive" style={{ border: '1px solid var(--border-color)', borderRadius: '4px', marginBottom: '24px' }}>
                                    <table className="md-table" style={{ margin: 0 }}>
                                        <thead>
                                            <tr>
                                                <th style={{ color: 'var(--success-color)' }}>Prodotto</th>
                                                <th style={{ color: 'var(--success-color)' }}>Importo unitario</th>
                                                <th style={{ color: 'var(--success-color)' }}>Qtà</th>
                                                <th style={{ color: 'var(--success-color)' }}>Subtotale</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {cart.length === 0 ? (
                                                <tr>
                                                    <td colSpan="4" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>Carrello vuoto. Seleziona almeno un prodotto e aggiungilo cliccando sulla riga a sinistra.</td>
                                                </tr>
                                            ) : (
                                                cart.map((item, i) => (
                                                    <tr key={i}>
                                                        <td style={{ fontWeight: 500 }}>
                                                            {item.description || item.name} 
                                                            <button onClick={() => removeFromCart(item.id)} style={{ border: 'none', background: 'none', color: 'var(--danger-color)', cursor: 'pointer', float: 'right', padding: '4px' }}>
                                                                <X size={16}/>
                                                            </button>
                                                        </td>
                                                        <td>{parseFloat(item.basePrice || 0).toFixed(2).replace('.', ',')}</td>
                                                        <td>{item.qty}</td>
                                                        <td style={{ fontWeight: 600 }}>{(parseFloat(item.basePrice || 0) * item.qty).toFixed(2).replace('.', ',')}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                        {cart.length > 0 && (
                                            <tfoot>
                                                <tr style={{ backgroundColor: '#fcfcfc' }}>
                                                    <td colSpan="3" style={{ textAlign: 'right', fontWeight: 600, padding: '16px' }}>Totale:</td>
                                                    <td style={{ fontWeight: 600, color: 'var(--success-color)', fontSize: '1.1rem', padding: '16px' }}>{cartTotal.toFixed(2).replace('.', ',')}</td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                                
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
                                    <button className="btn-contained" style={{ backgroundColor: 'var(--danger-color)', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setCart([])}>
                                        <X size={16}/> Annulla
                                    </button>
                                    <button className="btn-contained" style={{ backgroundColor: (cart.length > 0 ? 'var(--success-color)' : '#9e9e9e'), display: 'flex', alignItems: 'center', gap: '8px' }} onClick={generatePayment} disabled={cart.length === 0}>
                                        <Check size={16}/> Genera pagamento
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default NuovoPagamento;
`;

fs.writeFileSync('/home/dave/management-software/frontend/src/pages/NuovoPagamento.jsx', code);
