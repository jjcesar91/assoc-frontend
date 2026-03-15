import React from 'react';
import { Calendar, User, X } from 'lucide-react';
import './DettaglioPagamentoModal.css';

const DettaglioPagamentoModal = ({ isOpen, onClose, pagamento }) => {
    if (!isOpen || !pagamento) return null;

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatCurrency = (amount) => {
        return parseFloat(amount || 0).toFixed(2).replace('.', ',');
    };

    return (
        <div className="dpm-overlay">
            <div className="dpm-modal">
                <div className="dpm-header">
                    <div className="dpm-title">
                        <Calendar size={20} />
                        <h2>Dettaglio pagamento</h2>
                    </div>
                    <button className="dpm-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="dpm-body">
                    {/* Dettagli Section */}
                    <div className="dpm-section">
                        <div className="dpm-section-title">Dettagli</div>
                        
                        <div className="dpm-grid-3">
                            <div className="dpm-field">
                                <label><User size={14} /> Intestatario</label>
                                <div className="dpm-value">{pagamento.intestatario}</div>
                            </div>
                            <div className="dpm-field">
                                <label><Calendar size={14} /> Data pagamento</label>
                                <div className="dpm-value">{formatDate(pagamento.data_pagamento)}</div>
                            </div>
                            <div className="dpm-field">
                                <label>€ Importo</label>
                                <div className="dpm-value">{formatCurrency(pagamento.importo)}</div>
                            </div>
                        </div>

                        <div className="dpm-divider"></div>

                        <div className="dpm-grid-3">
                            <div className="dpm-field">
                                <label>Numero ricevuta</label>
                                <div className="dpm-value dpm-ricevuta">
                                    {pagamento.numero_ricevuta || ''}
                                    {pagamento.numero_ricevuta && <span className="dpm-badge-valida">VALIDA</span>}
                                </div>
                            </div>
                            <div className="dpm-field">
                                <label>Progressivo stagione</label>
                                <div className="dpm-value">{pagamento.progressivo_stagione || ''}</div>
                            </div>
                            <div className="dpm-field">
                                <label>Data ricevuta</label>
                                <div className="dpm-value">{formatDate(pagamento.data_ricevuta)}</div>
                            </div>
                        </div>
                    </div>

                    {/* Quote Section */}
                    <div className="dpm-section dpm-section-quote">
                        <div className="dpm-section-title">Quote</div>
                        <div className="dpm-quote-row">
                            <span>{pagamento.quote || ''}</span>
                            <span>€ {formatCurrency(pagamento.importo)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DettaglioPagamentoModal;
