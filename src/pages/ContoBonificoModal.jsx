import React, { useState, useEffect } from 'react';
import { Landmark, X, Check } from 'lucide-react';
import SimpleEditor from '../components/SimpleEditor';
import './ContoBonificoModal.css';

const IBAN_TOKEN = '{{IBAN}}';

const ContoBonificoModal = ({ isOpen, onClose, onSave, conto }) => {
    const [descrizione, setDescrizione] = useState('');
    const [iban, setIban] = useState('');
    const [istruzioni, setIstruzioni] = useState('');

    useEffect(() => {
        if (isOpen) {
            setDescrizione(conto?.descrizione || '');
            setIban(conto?.iban || '');
            setIstruzioni(conto?.istruzioni_pagamento || '');
        }
    }, [isOpen, conto]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            descrizione: descrizione.trim(),
            iban: iban.trim().toUpperCase().replace(/\s+/g, ''),
            istruzioni_pagamento: istruzioni,
        });
    };

    return (
        <div className="conto-bonifico-modal-overlay">
            <div className="conto-bonifico-modal">
                <div className="conto-bonifico-modal-header">
                    <h2><Landmark size={20} /> Configurazione conto Bonifico</h2>
                    <button className="close-btn" onClick={onClose} title="Chiudi">✕</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="conto-bonifico-modal-body">

                        <div className="conto-bonifico-field">
                            <label>Descrizione *</label>
                            <input
                                className="md-input"
                                placeholder="Es. Conto Bonifico Principale"
                                value={descrizione}
                                onChange={(e) => setDescrizione(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>

                        <div className="conto-bonifico-field">
                            <label>IBAN</label>
                            <input
                                className="md-input"
                                placeholder="IT60 X054 2811 1010 0000 0123 456"
                                value={iban}
                                onChange={(e) => setIban(e.target.value.toUpperCase())}
                                style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}
                                maxLength={42}
                            />
                        </div>

                        <div className="conto-bonifico-field">
                            <label>Istruzioni di pagamento per il cliente</label>
                            <SimpleEditor
                                value={istruzioni}
                                onChange={(e) => setIstruzioni(e.target.value)}
                                insertFields={[
                                    { label: 'IBAN', token: IBAN_TOKEN, title: "Inserisci il campo IBAN nel punto in cui si trova il cursore" },
                                ]}
                            />
                            <div className="field-hint">
                                Usa il pulsante <strong>IBAN</strong> nella barra degli strumenti per inserire il campo
                                nel punto desiderato: il segnaposto <code>{IBAN_TOKEN}</code> verrà sostituito automaticamente
                                con l'IBAN configurato qui sopra.
                            </div>
                        </div>

                    </div>

                    <div className="conto-bonifico-modal-footer">
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

export default ContoBonificoModal;
