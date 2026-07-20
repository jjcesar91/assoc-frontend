import React, { useState, useEffect } from 'react';
import { Wallet, X, Check } from 'lucide-react';
import './ContoModal.css';

// Modal di modifica per i conti non bancari (contanti, POS, assegno, nessuna modalità).
// I conti di tipo Bonifico usano ContoBonificoModal, che gestisce anche IBAN e istruzioni.
const ContoModal = ({ isOpen, onClose, onSave, conto }) => {
    const [descrizione, setDescrizione] = useState('');
    const [modalita, setModalita] = useState('');

    useEffect(() => {
        if (isOpen) {
            setDescrizione(conto?.descrizione || '');
            setModalita(conto?.modalita_pagamento || '');
        }
    }, [isOpen, conto]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            descrizione: descrizione.trim(),
            modalita_pagamento: modalita,
        });
    };

    return (
        <div className="conto-modal-overlay">
            <div className="conto-modal">
                <div className="conto-modal-header">
                    <h2><Wallet size={20} /> Modifica Conto</h2>
                    <button className="close-btn" onClick={onClose} title="Chiudi">✕</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="conto-modal-body">

                        <div className="conto-modal-field">
                            <label>Descrizione *</label>
                            <input
                                className="md-input"
                                placeholder="Es. Cassa Principale"
                                value={descrizione}
                                onChange={(e) => setDescrizione(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>

                        <div className="conto-modal-field">
                            <label>Modalità di Pagamento</label>
                            <select
                                className="md-select"
                                style={{ padding: '10px 12px' }}
                                value={modalita}
                                onChange={(e) => setModalita(e.target.value)}
                            >
                                <option value="">— nessuna —</option>
                                <option value="Contanti">Contanti</option>
                                <option value="POS">POS</option>
                                <option value="Assegno">Assegno</option>
                                <option value="Bonifico">Bonifico</option>
                            </select>
                            {modalita?.toLowerCase() === 'bonifico' && (
                                <div className="field-hint">
                                    Salvando come <strong>Bonifico</strong>, alla prossima modifica si aprirà la
                                    configurazione dedicata con IBAN e istruzioni di pagamento.
                                </div>
                            )}
                        </div>

                    </div>

                    <div className="conto-modal-footer">
                        <button type="button" className="btn-contained" style={{ backgroundColor: 'var(--danger-color)' }} onClick={onClose}>
                            <X size={16} /> Annulla
                        </button>
                        <button type="submit" className="btn-contained" style={{ backgroundColor: 'var(--success-color)' }}>
                            <Check size={16} /> Salva
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ContoModal;
