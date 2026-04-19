import React, { useState, useEffect } from 'react';
import { ShoppingCart } from 'lucide-react';
import './ProdottoModal.css';
import RateScadenzarioModal from './RateScadenzarioModal';

const getDurationDays = (duration) => {
    const map = {
        '1_mese': 30,
        '2_mesi': 60,
        '3_mesi': 90,
        '4_mesi': 120,
        '6_mesi': 180,
        '12_mesi': 365,
    };
    return map[duration] || 30;
};

const ProdottoModal = ({ isOpen, onClose, onSave, product }) => {
    const [showRateModal, setShowRateModal] = useState(false);
    const [formErrors, setFormErrors] = useState({});
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
        duration: '1_mese',
        giorniAvvisoScadenza: 7,
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
                duration: '1_mese',
                giorniAvvisoScadenza: 7,
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

        setFormData(prev => {
            const updated = {
                ...prev,
                [name]: type === 'checkbox' ? checked : finalValue,
                ...(name === 'unlimitedEntries' && finalValue === true ? { numEntries: '' } : {})
            };
            if (name === 'duration') {
                const maxDays = getDurationDays(finalValue);
                const current = parseInt(updated.giorniAvvisoScadenza, 10);
                if (!isNaN(current) && current >= maxDays) {
                    updated.giorniAvvisoScadenza = Math.max(2, maxDays - 1);
                }
            }
            return updated;
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const errors = {};

        if (!formData.description || !formData.description.trim()) {
            errors.description = 'La descrizione è obbligatoria.';
        }

        const priceStr = String(formData.basePrice).replace(',', '.');
        if (formData.basePrice === '' || formData.basePrice === null || isNaN(parseFloat(priceStr)) || parseFloat(priceStr) < 0) {
            errors.basePrice = 'Inserire un prezzo valido (≥ 0).';
        }

        if (formData.type === 'subscription') {
            if (!formData.duration) {
                errors.duration = 'Selezionare la durata.';
            }
            if (formData.unlimitedEntries === '' || formData.unlimitedEntries === null || formData.unlimitedEntries === undefined) {
                errors.unlimitedEntries = 'Specificare se l\'abbonamento è open.';
            }
            if (formData.unlimitedEntries === false || formData.unlimitedEntries === 'false') {
                const n = parseInt(formData.numEntries, 10);
                if (!formData.numEntries || isNaN(n) || n <= 0) {
                    errors.numEntries = 'Inserire un numero di ingressi valido (> 0).';
                }
            }
            const avviso = parseInt(formData.giorniAvvisoScadenza, 10);
            const maxDays = getDurationDays(formData.duration);
            if (isNaN(avviso) || avviso <= 1) {
                errors.giorniAvvisoScadenza = 'Il valore deve essere un intero > 1.';
            } else if (avviso >= maxDays) {
                errors.giorniAvvisoScadenza = `Il valore deve essere inferiore alla durata (${maxDays} giorni).`;
            }
        }

        if (formData.type === 'tesseramento' && !formData.periodicity) {
            errors.periodicity = 'Selezionare la periodicità.';
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setFormErrors({});
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
                    <>
                    <div className="prodotto-form-row">
                        <div className="prodotto-form-col">
                             <div className="prodotto-form-group">
                                <label>Durata</label>
                                <select name="duration" value={formData.duration} onChange={handleChange} className={`prodotto-form-control${formErrors.duration ? ' prodotto-form-control-error' : ''}`}>
                                    <option value="">Seleziona...</option>
                                    <option value="1_mese">1 mese</option>
                                    <option value="2_mesi">2 mesi</option>
                                    <option value="3_mesi">3 mesi</option>
                                    <option value="4_mesi">4 mesi</option>
                                    <option value="6_mesi">6 mesi</option>
                                    <option value="12_mesi">12 mesi</option>
                                </select>
                                {formErrors.duration && <span className="prodotto-form-error">{formErrors.duration}</span>}
                            </div>
                        </div>
                        <div className="prodotto-form-col">
                             <div className="prodotto-form-group">
                                <label>Open (ingressi illimitati)</label>
                                <select name="unlimitedEntries" value={formData.unlimitedEntries} onChange={handleChange} className={`prodotto-form-control${formErrors.unlimitedEntries ? ' prodotto-form-control-error' : ''}`}>
                                    <option value="">Seleziona...</option>
                                    <option value={true}>Si</option>
                                    <option value={false}>No</option>
                                </select>
                                {formErrors.unlimitedEntries && <span className="prodotto-form-error">{formErrors.unlimitedEntries}</span>}
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
                                    className={`prodotto-form-control${formErrors.numEntries ? ' prodotto-form-control-error' : ''}`}
                                    disabled={formData.unlimitedEntries === true}
                                    placeholder="es. 10"
                                />
                                {formErrors.numEntries && <span className="prodotto-form-error">{formErrors.numEntries}</span>}
                            </div>
                        </div>
                    </div>
                    <div className="prodotto-form-row">
                        <div className="prodotto-form-col">
                            <div className="prodotto-form-group">
                                <label>Giorni di avviso scadenza</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    name="giorniAvvisoScadenza"
                                    value={formData.giorniAvvisoScadenza}
                                    onChange={(e) => {
                                        if (/^\d*$/.test(e.target.value)) handleChange(e);
                                    }}
                                    onBlur={(e) => {
                                        const val = parseInt(e.target.value, 10);
                                        const maxDays = getDurationDays(formData.duration);
                                        if (isNaN(val) || val <= 1) {
                                            setFormData(prev => ({ ...prev, giorniAvvisoScadenza: 2 }));
                                        } else if (val >= maxDays) {
                                            setFormData(prev => ({ ...prev, giorniAvvisoScadenza: maxDays - 1 }));
                                        }
                                    }}
                                    className={`prodotto-form-control${formErrors.giorniAvvisoScadenza ? ' prodotto-form-control-error' : ''}`}
                                    placeholder="es. 7"
                                />
                                {formErrors.giorniAvvisoScadenza && <span className="prodotto-form-error">{formErrors.giorniAvvisoScadenza}</span>}
                            </div>
                        </div>
                    </div>
                    </>
                );
            case 'tesseramento':
                return (
                    <div className="prodotto-form-group">
                        <label>Periodicità</label>
                        <select name="periodicity" value={formData.periodicity} onChange={handleChange} className={`prodotto-form-control${formErrors.periodicity ? ' prodotto-form-control-error' : ''}`}>
                            <option value="">Seleziona...</option>
                            <option value="anno_associativo">Anno Associativo</option>
                            <option value="anno_solare">365 Giorni</option>
                        </select>
                        {formErrors.periodicity && <span className="prodotto-form-error">{formErrors.periodicity}</span>}
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
                            <input type="text" name="description" value={formData.description} onChange={handleChange} className={`prodotto-form-control${formErrors.description ? ' prodotto-form-control-error' : ''}`} />
                            {formErrors.description && <span className="prodotto-form-error">{formErrors.description}</span>}
                        </div>

                        <div className="prodotto-form-row">
                             <div className="prodotto-form-col">
                                <div className="prodotto-form-group">
                                    <label>Prezzo base</label>
                                    <div className="prodotto-input-euro-wrapper">
                                        <input type="text" inputMode="decimal" name="basePrice" value={formData.basePrice} onChange={handleChange} className={`prodotto-form-control prodotto-input-euro${formErrors.basePrice ? ' prodotto-form-control-error' : ''}`} />
                                        <span className="prodotto-euro-symbol">€</span>
                                    </div>
                                    {formErrors.basePrice && <span className="prodotto-form-error">{formErrors.basePrice}</span>}
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
