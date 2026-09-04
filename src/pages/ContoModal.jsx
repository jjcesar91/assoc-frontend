import React, { useState, useEffect } from 'react';
import { Wallet, X, Check } from 'lucide-react';
import './ContoModal.css';

const MODALITA_OPTIONS = ['Contanti', 'POS', 'Assegno', 'Bonifico'];

// Modal di modifica generico: descrizione e modalità di pagamento associate
// (più di una possibile). Se tra le modalità è presente "Bonifico", IBAN e
// istruzioni di pagamento si configurano separatamente da ContoBonificoModal
// (azione dedicata nell'elenco conti), non da qui.
const ContoModal = ({ isOpen, onClose, onSave, conto }) => {
    const [descrizione, setDescrizione] = useState('');
    const [modalita, setModalita] = useState([]);

    useEffect(() => {
        if (isOpen) {
            setDescrizione(conto?.descrizione || '');
            setModalita(conto?.modalita_pagamento || []);
        }
    }, [isOpen, conto]);

    if (!isOpen) return null;

    const toggleModalita = (m) => {
        setModalita(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
    };

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
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '4px' }}>
                                {MODALITA_OPTIONS.map(m => (
                                    <label key={m} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={modalita.includes(m)}
                                            onChange={() => toggleModalita(m)}
                                            style={{ width: 16, height: 16 }}
                                        />
                                        {m}
                                    </label>
                                ))}
                            </div>
                            {modalita.includes('Bonifico') && (
                                <div className="field-hint">
                                    Con <strong>Bonifico</strong> tra le modalità selezionate, l'IBAN e le istruzioni di
                                    pagamento si configurano dall'azione dedicata nell'elenco conti.
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
