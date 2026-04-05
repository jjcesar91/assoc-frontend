import React, { useState, useEffect } from 'react';
import { ShoppingCart } from 'lucide-react';
import './ProdottoModal.css';
import RateScadenzarioModal from './RateScadenzarioModal';

const ProdottoModal = ({ isOpen, onClose, onSave, product }) => {
    const [showRateModal, setShowRateModal] = useState(false);
    // Initial state based on `product` if editing
    const [formData, setFormData] = useState({
        type: 'generic', // Default
        description: '',
        basePrice: '',
        visible: true,
        sellableOnline: false,
        visibleInFast: false,
        hasRevenueCenter: false, // Default
        // Specifics
        periodicity: '',
        duration: '',
        unlimitedEntries: false,
        numEntries: '',
        season: '',
        numInstallments: '',
        installments: []
    });

    useEffect(() => {
        if (product) {
            setFormData({
                ...product
            });
        } else {
            // Reset form for new product
             setFormData({
                type: 'generic',
                description: '',
                basePrice: '',
                visible: true,
                sellableOnline: false,
                visibleInFast: false,
                hasRevenueCenter: false,
                periodicity: '',
                duration: '',
                unlimitedEntries: false,
                numEntries: '',
                season: '',
                numInstallments: '',
                installments: []
            });
        }
    }, [product, isOpen]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        // Validate basePrice: only digits and comma
        if (name === 'basePrice' && !/^\d*,?\d*$/.test(value)) return;

        // Handle boolean selects properly
        let finalValue = value;
        if (value === 'true') finalValue = true;
        if (value === 'false') finalValue = false;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : finalValue,
            ...(name === 'unlimitedEntries' && finalValue === true ? { numEntries: '' } : {})
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const handleRateSave = (installments) => {
        setShowRateModal(false);
        onSave({ ...formData, installments });
    };

    if (!isOpen) return null;

    // Render logic for specific fields based on type
    const renderSpecificFields = () => {
        switch (formData.type) {
            case 'subscription':
                return (
                    <div className="prodotto-form-row">
                        <div className="prodotto-form-col">
                             <div className="prodotto-form-group">
                                <label>Durata</label>
                                <select name="duration" value={formData.duration} onChange={handleChange} className="prodotto-form-control">
                                    <option value="">Seleziona...</option>
                                    <option value="1_mese">1 mese</option>
                                    <option value="2_mesi">2 mesi</option>
                                    <option value="3_mesi">3 mesi</option>
                                    <option value="4_mesi">4 mesi</option>
                                    <option value="6_mesi">6 mesi</option>
                                    <option value="12_mesi">12 mesi</option>
                                </select>
                            </div>
                        </div>
                        <div className="prodotto-form-col">
                             <div className="prodotto-form-group">
                                <label>Open (ingressi illimitati)</label>
                                <select name="unlimitedEntries" value={formData.unlimitedEntries} onChange={handleChange} className="prodotto-form-control">
                                    <option value="">Seleziona...</option>
                                    <option value={true}>Si</option>
                                    <option value={false}>No</option>
                                </select>
                            </div>
                        </div>
                         <div className="prodotto-form-col">
                             <div className="prodotto-form-group">
                                <label>Numero ingressi</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    name="numEntries"
                                    value={formData.numEntries}
                                    onChange={(e) => { if (/^\d*$/.test(e.target.value)) handleChange(e); }}
                                    className="prodotto-form-control"
                                    disabled={formData.unlimitedEntries === true}
                                    placeholder="es. 10"
                                />
                            </div>
                        </div>
                    </div>
                );
            case 'tesseramento':
                return (
                    <div className="prodotto-form-group">
                        <label>Periodicità</label>
                        <select name="periodicity" value={formData.periodicity} onChange={handleChange} className="prodotto-form-control">
                            <option value="">Seleziona...</option>
                            <option value="anno_associativo">Anno Associativo</option>
                            <option value="anno_solare">Anno Solare</option>
                        </select>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="prodotto-modal-overlay">
            <div className="prodotto-modal">
                <div className="prodotto-modal-header">
                    <h2><ShoppingCart size={24} /> Prodotto</h2>
                    <button onClick={onClose} className="close-btn"><React.Fragment>X</React.Fragment></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="prodotto-modal-content">
                        <div className="prodotto-tabs">
                             <button type="button" className="prodotto-tab-btn"><ShoppingCart size={16}/> Generali</button>
                        </div>

                        <div className="prodotto-form-group">
                            <label>Tipo prodotto</label>
                            <select name="type" value={formData.type} onChange={handleChange} className="prodotto-form-control">
                                <option value="generic">Prodotto generico</option>
                                <option value="subscription">Abbonamento</option>
                                <option value="quota_associativa">Quota associativa/Iscrizione</option>
                                <option value="tesseramento">Tesseramento</option>
                            </select>
                        </div>

                        <div className="prodotto-form-group">
                            <label>Descrizione</label>
                            <input type="text" name="description" value={formData.description} onChange={handleChange} className="prodotto-form-control" />
                        </div>

                        <div className="prodotto-form-row">
                             <div className="prodotto-form-col">
                                <div className="prodotto-form-group">
                                    <label>Prezzo base</label>
                                    <div className="prodotto-input-euro-wrapper">
                                        <input type="text" inputMode="decimal" name="basePrice" value={formData.basePrice} onChange={handleChange} className="prodotto-form-control prodotto-input-euro" />
                                        <span className="prodotto-euro-symbol">€</span>
                                    </div>
                                </div>
                            </div>
                            <div className="prodotto-form-col">
                                <div className="prodotto-form-group">
                                    <label>Visibile</label>
                                    <select name="visible" value={formData.visible} onChange={handleChange} className="prodotto-form-control">
                                        <option value={true}>Si</option>
                                        <option value={false}>No</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        {renderSpecificFields()}
                    </div>
                     <div className="prodotto-modal-footer">
                         <div style={{flex: 1}}></div>
                        <button type="submit" className="btn-save"><React.Fragment>✓</React.Fragment> Salva</button>
                    </div>
                </form>
            </div>

            {showRateModal && (
                <RateScadenzarioModal
                    isOpen={showRateModal}
                    onClose={() => setShowRateModal(false)}
                    onSave={handleRateSave}
                    numInstallments={formData.numInstallments}
                    basePrice={formData.basePrice}
                    productDescription={formData.description}
                    existingInstallments={formData.installments}
                />
            )}
        </div>
    );
};

export default ProdottoModal;
