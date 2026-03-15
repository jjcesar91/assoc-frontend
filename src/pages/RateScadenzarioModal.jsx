import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import './RateScadenzarioModal.css';

const RateScadenzarioModal = ({ isOpen, onClose, onSave, numInstallments, basePrice, productDescription, existingInstallments }) => {
    const [installments, setInstallments] = useState([]);
    const totalAmount = parseFloat(basePrice) || 0;

    useEffect(() => {
        if (isOpen) {
            if (existingInstallments && existingInstallments.length > 0) {
                // Generate unique IDs for existing installments just in case
                setInstallments(existingInstallments.map((inst, i) => ({
                    ...inst,
                    id: inst.id || Date.now() + i
                })));
            } else {
                const num = parseInt(numInstallments, 10) || 1;
                const amountPerInstallment = (totalAmount / num).toFixed(2);
                
                const initialInstallments = Array.from({ length: num }).map((_, i) => ({
                    id: Date.now() + i, // unique ID for key
                    date: '',
                    description: `Rata ${i + 1}`,
                    amount: i === num - 1 
                        ? (totalAmount - (amountPerInstallment * (num - 1))).toFixed(2) 
                        : amountPerInstallment
                }));
                
                setInstallments(initialInstallments);
            }
        }
    }, [isOpen, numInstallments, totalAmount, existingInstallments]);

    if (!isOpen) return null;

    const handleAddInstallment = () => {
        const newInstallment = {
            id: Date.now(),
            date: '',
            description: `Rata ${installments.length + 1}`,
            amount: '0.00'
        };
        setInstallments([...installments, newInstallment]);
    };

    const handleDeleteInstallment = (id) => {
        setInstallments(installments.filter(inst => inst.id !== id));
    };

    const handleChange = (id, field, value) => {
        setInstallments(installments.map(inst => 
            inst.id === id ? { ...inst, [field]: value } : inst
        ));
    };

    const currentTotal = installments.reduce((sum, inst) => sum + (parseFloat(inst.amount) || 0), 0);
    const isTotalMatching = Math.abs(currentTotal - totalAmount) < 0.01;

    const handleSave = () => {
        onSave(installments);
    };

    return (
        <div className="rate-modal-overlay">
            <div className="rate-modal">
                <div className="rate-modal-header">
                    <h2>€ Rate Scadenzario</h2>
                    <button onClick={onClose} className="close-btn"><React.Fragment>X</React.Fragment></button>
                </div>
                
                <div className="rate-modal-content">
                    <div className="rate-modal-subheader">
                        <h3>{productDescription} € {totalAmount.toFixed(2)}</h3>
                        <button type="button" className="btn-add-rata" onClick={handleAddInstallment}>
                            + Rata
                        </button>
                    </div>

                    <div className="installments-list">
                        {installments.map((inst, index) => (
                            <div key={inst.id} className="installment-row">
                                <input 
                                    type="date" 
                                    className="rate-input"
                                    value={inst.date}
                                    onChange={(e) => handleChange(inst.id, 'date', e.target.value)}
                                />
                                <input 
                                    type="text" 
                                    className="rate-input"
                                    value={inst.description}
                                    onChange={(e) => handleChange(inst.id, 'description', e.target.value)}
                                />
                                <input 
                                    type="number" 
                                    className="rate-input"
                                    value={inst.amount}
                                    step="0.01"
                                    onChange={(e) => handleChange(inst.id, 'amount', e.target.value)}
                                />
                                <button 
                                    type="button"
                                    className="btn-delete-rata"
                                    onClick={() => handleDeleteInstallment(inst.id)}
                                    title="Elimina rata"
                                >
                                    <Trash2 size={20} color="#ffffff" strokeWidth={2} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="rate-modal-footer-summary">
                        <span className="totale-label">Totale</span>
                        <span className={`totale-badge ${isTotalMatching ? 'matching' : 'mismatching'}`}>
                            € {currentTotal.toFixed(2)}
                        </span>
                    </div>
                </div>

                <div className="rate-modal-actions">
                    <button type="button" className="btn-annulla" onClick={onClose}>
                        <React.Fragment>X</React.Fragment> Annulla
                    </button>
                    <button type="button" className="btn-salva" onClick={handleSave}>
                        <React.Fragment>✓</React.Fragment> Salva
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RateScadenzarioModal;