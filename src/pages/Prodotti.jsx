import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ShoppingCart } from 'lucide-react';
import { useSocieta } from '../data/SocietaContext';
import ProdottoModal from './ProdottoModal';
import RateScadenzarioModal from './RateScadenzarioModal';
import './Prodotti.css';

const Prodotti = () => {
    const { selectedSocietaId } = useSocieta();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentProduct, setCurrentProduct] = useState(null);
    const [isRateModalOpen, setIsRateModalOpen] = useState(false);
    const [currentRateProduct, setCurrentRateProduct] = useState(null);
    const [filters, setFilters] = useState({
        description: '',
        type: '',
        visible: '',
        sellableOnline: '',
        hasRevenueCenter: ''
    });

    useEffect(() => {
        if (selectedSocietaId) {
            fetchProducts();
        } else {
            setProducts([]);
            setLoading(false);
        }
    }, [selectedSocietaId]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/products/api?societaId=${selectedSocietaId}`);
            if (response.ok) {
                const data = await response.json();
                setProducts(data);
            }
        } catch (error) {
            console.error("Error fetching products", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (productData) => {
        try {
            const url = productData.id ? `/products/api/${productData.id}` : '/products/api';
            const method = productData.id ? 'PUT' : 'POST';
            
            // Add societaId for new products
            const dataToSave = productData.id ? productData : { ...productData, societaId: selectedSocietaId };

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dataToSave)
            });

            if (response.ok) {
                fetchProducts();
                setIsModalOpen(false);
            }
        } catch (error) {
            console.error("Error saving product", error);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Sei sicuro di voler eliminare questo prodotto?")) return;
        try {
            await fetch(`/products/api/${id}`, { method: 'DELETE' });
            fetchProducts();
        } catch (error) {
            console.error("Error deleting product", error);
        }
    };
    
    // Filter logic
    const filteredProducts = products.filter(p => {
        if (filters.description && !p.description.toLowerCase().includes(filters.description.toLowerCase())) return false;
        if (filters.type && p.type !== filters.type) return false;
        if (filters.visible !== '' && String(p.visible) !== filters.visible) return false;
        if (filters.sellableOnline !== '' && String(p.sellableOnline) !== filters.sellableOnline) return false;
         if (filters.hasRevenueCenter !== '' && String(p.hasRevenueCenter) !== filters.hasRevenueCenter) return false;
        return true;
    });

    return (
        <div className="prodotti-full-container">
            <div className="main-content">
                <div className="toolbar-card" style={{display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'stretch'}}>
                     <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '12px'}}>
                        <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '200px'}}>
                            <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Descrizione</label>
                            <input 
                                className="md-input"
                                type="text" 
                                placeholder="Descrizione" 
                                value={filters.description}
                                onChange={(e) => setFilters({...filters, description: e.target.value})}
                            />
                        </div>
                        <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '150px'}}>
                            <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Tipologia</label>
                            <select className="md-select" value={filters.type} onChange={(e) => setFilters({...filters, type: e.target.value})}>
                                <option value="">Tutti</option>
                                <option value="generic">Prodotto generico</option>
                                <option value="periodic_quota">Quota periodica</option>
                                <option value="subscription">Abbonamento</option>
                                <option value="inscription">Iscrizione</option>
                                <option value="schedule">Scadenzario</option>
                            </select>
                        </div>
                        <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '120px'}}>
                            <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Visibilità</label>
                            <select className="md-select" value={filters.visible} onChange={(e) => setFilters({...filters, visible: e.target.value})}>
                                <option value="">Tutti</option>
                                <option value="true">Solo visibili</option>
                                <option value="false">Solo obsoleti</option>
                            </select>
                        </div>
                        <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '150px'}}>
                            <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Vendibile online</label>
                            <select className="md-select" value={filters.sellableOnline} onChange={(e) => setFilters({...filters, sellableOnline: e.target.value})}>
                                <option value="">Tutti</option>
                                <option value="true">Solo vendibili online</option>
                                <option value="false">Solo non vendibili online</option>
                            </select>
                        </div>
                        <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '150px'}}>
                            <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Ha almeno un centro di ricavo</label>
                            <select className="md-select" value={filters.hasRevenueCenter} onChange={(e) => setFilters({...filters, hasRevenueCenter: e.target.value})}>
                                <option value="">Tutti</option>
                                <option value="true">Si</option>
                                <option value="false">No</option>
                            </select>
                        </div>
                        <div className="actions-group">
                            <button 
                                className="btn-contained" 
                                style={{backgroundColor: 'var(--success-color)'}} /* Using inline style to ensure color overrides if needed, but class should handle it */
                                onClick={() => { setCurrentProduct(null); setIsModalOpen(true); }}
                            >
                                <Plus size={18} /> Nuovo prodotto
                            </button>
                        </div>
                    </div>
                </div>

                <div className="table-card">
                    <div className="table-responsive">
                        <table className="md-table">
                            <thead>
                                <tr>
                                    <th>Descrizione</th>
                                    <th>Prezzo base</th>
                                    <th>Visibile</th>
                                    <th>Vendibile online</th>
                                    <th style={{textAlign: 'right'}}>Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map(product => (
                                    <tr key={product.id}>
                                        <td>
                                            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                                                <div style={{
                                                    width:'40px', height:'40px', borderRadius:'50%', 
                                                    backgroundColor:'#e8eaf6', color:'#3f51b5',
                                                    display:'flex', alignItems:'center', justifyContent:'center'
                                                }}>
                                                    <ShoppingCart size={20} />
                                                </div>
                                                <div>
                                                    <div style={{fontWeight: 500}}>{product.description}</div>
                                                    <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
                                                        {product.type === 'generic' ? 'Prodotto generico' :
                                                        product.type === 'periodic_quota' ? 'Quota periodica' :
                                                        product.type === 'subscription' ? 'Abbonamento' :
                                                        product.type === 'inscription' ? 'Iscrizione' :
                                                        product.type === 'schedule' ? 'Scadenzario' : product.type}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{fontWeight: 500}}>€ {parseFloat(product.basePrice).toFixed(2)}</td>
                                        <td>
                                            <div className={`status-toggle ${product.visible ? 'active' : ''}`}></div>
                                        </td>
                                        <td>
                                            <div className={`status-toggle ${product.sellableOnline ? 'active' : ''}`}></div>
                                        </td>
                                        <td style={{textAlign: 'right'}}>
                                            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px'}}>
                                                <button className="btn-icon-small" title="Modifica" onClick={() => { setCurrentProduct(product); setIsModalOpen(true); }}>
                                                    <Edit2 size={18} />
                                                </button>
                                                <button className="btn-icon-small" title="Elimina" onClick={() => handleDelete(product.id)} style={{color: 'var(--danger-color)'}}>
                                                    <Trash2 size={18} />
                                                </button>
                                                {product.type === 'schedule' && (
                                                    <button 
                                                        className="btn-rate"
                                                        onClick={() => {
                                                            setCurrentRateProduct(product);
                                                            setIsRateModalOpen(true);
                                                        }}
                                                    >
                                                        € Rate
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredProducts.length === 0 && (
                                    <tr>
                                        <td colSpan="5" style={{textAlign:'center', padding:'32px', color:'var(--text-secondary)'}}>
                                            Nessun prodotto trovato
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <ProdottoModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                product={currentProduct}
            />

            {isRateModalOpen && currentRateProduct && (
                <RateScadenzarioModal
                    isOpen={isRateModalOpen}
                    onClose={() => {
                        setIsRateModalOpen(false);
                        setCurrentRateProduct(null);
                    }}
                    onSave={async (installments) => {
                        await handleSave({ ...currentRateProduct, installments });
                        setIsRateModalOpen(false);
                        setCurrentRateProduct(null);
                    }}
                    numInstallments={currentRateProduct.numInstallments}
                    basePrice={currentRateProduct.basePrice}
                    productDescription={currentRateProduct.description}
                    existingInstallments={currentRateProduct.installments}
                />
            )}
        </div>
    );
};

export default Prodotti;
