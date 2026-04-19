import React, { useState } from 'react';
import { AlertTriangle, Ban, Calendar, User, X } from 'lucide-react';
import { getAnnoDateRange } from '../data/AnnoContext';
import './DettaglioPagamentoModal.css';

const DettaglioPagamentoModal = ({ isOpen, onClose, pagamento, onAnnulla, societa }) => {
    const [showConferma, setShowConferma] = useState(false);

    if (!isOpen || !pagamento) return null;

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatCurrency = (amount) => {
        return parseFloat(amount || 0).toFixed(2).replace('.', ',');
    };

    // Calcola la data di scadenza del tesseramento
    const getScadenzaTesseramento = () => {
        const types = (pagamento.quote_types || '').split(',').map(t => t.trim().toLowerCase());
        if (!types.includes('tesseramento')) return null;
        if (!pagamento.data_pagamento) return null;

        const periodicity = pagamento.periodicity_tesseramento;
        if (!periodicity) return null;

        const d = new Date(pagamento.data_pagamento);

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
    };

    const scadenzaTess = getScadenzaTesseramento();

    const isAnnullato = pagamento.stato_pagamento?.startsWith('3.');

    const handleConfermaAnnulla = () => {
        setShowConferma(false);
        if (onAnnulla) onAnnulla(pagamento.id);
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
                                    {pagamento.numero_ricevuta || '—'}
                                    {pagamento.numero_ricevuta && (
                                        isAnnullato
                                            ? <span className="dpm-badge-annullata">ANNULLATA</span>
                                            : <span className="dpm-badge-valida">VALIDA</span>
                                    )}
                                </div>
                            </div>
                            <div className="dpm-field">
                                <label>Progressivo stagione</label>
                                <div className="dpm-value">{pagamento.progressivo_stagione || '—'}</div>
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
                            <span>
                                € {formatCurrency(pagamento.importo)}
                                {scadenzaTess && !(pagamento.quote || '').includes('(Scadenza') && (
                                    <span style={{ marginLeft: '8px', color: '#6b7280', fontSize: '0.9em' }}>
                                        (Scadenza {scadenzaTess.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })})
                                    </span>
                                )}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer azioni */}
                {!isAnnullato && (
                    <div className="dpm-footer">
                        <button className="dpm-btn-annulla" onClick={() => setShowConferma(true)}>
                            <Ban size={16} />
                            Annulla ricevuta
                        </button>
                    </div>
                )}
                {isAnnullato && (
                    <div className="dpm-footer dpm-footer-annullato">
                        <Ban size={16} />
                        Ricevuta annullata
                    </div>
                )}
            </div>

            {/* Modal di conferma annullamento */}
            {showConferma && (
                <div className="dpm-confirm-overlay">
                    <div className="dpm-confirm-modal">
                        <div className="dpm-confirm-header">
                            <AlertTriangle size={22} />
                            <span>Conferma annullamento</span>
                        </div>
                        <div className="dpm-confirm-body">
                            <p>Stai per annullare la ricevuta <strong>{pagamento.numero_ricevuta}</strong> intestata a <strong>{pagamento.intestatario}</strong>.</p>
                            <p>Il pagamento e la ricevuta verranno marcati come <strong>ANNULLATI</strong> e l'importo non verrà più conteggiato tra gli incassi validi.</p>
                            <p className="dpm-confirm-warning">Questa operazione non può essere annullata.</p>
                        </div>
                        <div className="dpm-confirm-footer">
                            <button className="dpm-confirm-btn-cancel" onClick={() => setShowConferma(false)}>
                                <X size={15} /> No, torna indietro
                            </button>
                            <button className="dpm-confirm-btn-ok" onClick={handleConfermaAnnulla}>
                                <Ban size={15} /> Sì, annulla ricevuta
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DettaglioPagamentoModal;
