import React, { useState, useEffect } from 'react';
import { Banknote, CreditCard, Receipt, Landmark, Check, Coins, Zap, X } from 'lucide-react';
import './PagamentoFastModal.css';

const PagamentoFastModal = ({ isOpen, onClose, societaId }) => {
    const [products, setProducts] = useState([]);
    const [formData, setFormData] = useState({
        modalita_pagamento: 'Contanti',
        prodotto_id: '',
        importo: '1'
    });

    useEffect(() => {
        const loadProducts = async () => {
            if (!isOpen || !societaId) return;
            try {
                const response = await fetch(`/products/api?societaId=${societaId}`);
                if (response.ok) {
                    const data = await response.json();
                    setProducts(data);
                    if (data.length > 0) {
                        setFormData(prev => ({
                            ...prev, 
                            prodotto_id: data[0].id,
                            importo: data[0].basePrice || '1'
                        }));
                    }
                }
            } catch (error) {
                console.error("Error fetching products", error);
            }
        };
        
        loadProducts();
    }, [isOpen, societaId]);

    const handleProductChange = (e) => {
        const prodId = e.target.value;
        const prod = products.find(p => p.id === parseInt(prodId) || p.id === prodId);
        
        setFormData(prev => ({
            ...prev,
            prodotto_id: prodId,
            importo: prod && prod.basePrice ? prod.basePrice : '1'
        }));
    };

    const handlePaymentMode = (mode) => {
        setFormData(prev => ({...prev, modalita_pagamento: mode}));
    };

    const handleGenerate = async () => {
        // Mock save logic, you will implement next
        console.log("Generating fast payment:", formData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fast-modal-overlay" onClick={onClose}>
            <div className="fast-modal-content" onClick={e => e.stopPropagation()}>
                <div className="fast-modal-header">
                    <h2>
                        <Zap size={20} fill="#fff" /> Pagamento fast
                    </h2>
                    <button className="fast-icon-btn" onClick={onClose}>
                        <X size={24} color="white" />
                    </button>
                </div>
                
                <div className="fast-modal-body">
                    <div className="fast-form-group">
                        <label>Modalità di pagamento</label>
                        <div className="payment-mode-group">
                            <button 
                                className={`payment-mode-btn ${formData.modalita_pagamento === 'Contanti' ? 'active' : ''}`}
                                onClick={() => handlePaymentMode('Contanti')}
                            >
                                <Coins size={18} /> Contanti
                            </button>
                            <button 
                                className={`payment-mode-btn ${formData.modalita_pagamento === 'POS' ? 'active' : ''}`}
                                onClick={() => handlePaymentMode('POS')}
                            >
                                <CreditCard size={18} /> POS
                            </button>
                            <button 
                                className={`payment-mode-btn ${formData.modalita_pagamento === 'Assegno' ? 'active' : ''}`}
                                onClick={() => handlePaymentMode('Assegno')}
                            >
                                <Receipt size={18} /> Assegno
                            </button>
                            <button 
                                className={`payment-mode-btn ${formData.modalita_pagamento === 'Bonifico' ? 'active' : ''}`}
                                onClick={() => handlePaymentMode('Bonifico')}
                            >
                                <Landmark size={18} /> Bonifico
                            </button>
                        </div>
                    </div>

                    <div className="fast-form-group">
                        <label>Seleziona prodotto</label>
                        <select 
                            className="fast-input" 
                            value={formData.prodotto_id} 
                            onChange={handleProductChange}
                        >
                            {products.length === 0 && <option value="">Nessun prodotto disponibile</option>}
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.nome || p.description}</option>
                            ))}
                        </select>
                    </div>

                    <div className="fast-form-group">
                        <label>Importo</label>
                        <input 
                            type="number" 
                            className="fast-input" 
                            value={formData.importo}
                            onChange={e => setFormData({...formData, importo: e.target.value})}
                        />
                    </div>

                    <button className="fast-btn-generate" onClick={handleGenerate}>
                        <Check size={18} /> Genera
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PagamentoFastModal;
