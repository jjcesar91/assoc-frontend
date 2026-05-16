import React, { useState } from 'react';
import { X, Mail, MessageSquare, Check } from 'lucide-react';
import SimpleEditor from './SimpleEditor';
import { useAlert } from './AlertModal';
import './ComunicazioneModal.css';

const ComunicazioneModal = ({ onClose, socioId, onSave }) => {
    const showAlert = useAlert();
    const [tipo, setTipo] = useState('EMAIL'); // 'SMS' or 'EMAIL'
    const [oggetto, setOggetto] = useState('');
    const [testo, setTesto] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validation
        if (tipo === 'EMAIL' && !oggetto) {
            showAlert("L'oggetto è obbligatorio per le email", 'Campo mancante', 'warning');
            return;
        }
        if (!testo || testo.trim() === '<p><br></p>') {
            showAlert("Il testo del messaggio è obbligatorio", 'Campo mancante', 'warning');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                tipo,
                oggetto: tipo === 'EMAIL' ? oggetto : null,
                testo
            };

            const response = await fetch(`/users/api/soci/${socioId}/comunicazioni`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Errore durante l\'invio');
            }

            const data = await response.json();
            if (onSave) onSave(data.comunicazione || data);
            onClose();
            if (data.warning) {
                showAlert(data.warning, 'Attenzione', 'warning');
            }
        } catch (error) {
            console.error(error);
            showAlert(error.message, 'Errore invio');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" style={{zIndex: 2000}} onClick={e => e.stopPropagation()}>
            <div className="comunicazione-modal" onClick={e => e.stopPropagation()}>
                <div className="comunicazione-header">
                    <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                        <Mail size={20} />
                        <span>Invio comunicazione</span>
                    </div>
                    <button className="comunicazione-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="comunicazione-body">
                    <div style={{textAlign: 'center', marginBottom: '10px'}}>
                        <label className="field-label" style={{display:'block', marginBottom:'8px'}}>Tipologia comunicazione</label>
                        <div style={{display:'inline-flex', borderRadius:'6px', overflow:'hidden', border:'1px solid #d1d5db'}}>
                            <button 
                                type="button" 
                                className={`type-btn ${tipo === 'SMS' ? 'active' : ''}`}
                                onClick={() => setTipo('SMS')}
                                style={{
                                    backgroundColor: tipo === 'SMS' ? '#10b981' : 'white', 
                                    color: tipo === 'SMS' ? 'white' : '#4b5563',
                                    border: 'none',
                                    padding: '8px 24px',
                                    fontWeight: '500',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    cursor: 'pointer'
                                }}
                            >
                                <MessageSquare size={16} /> SMS
                            </button>
                            <button 
                                type="button" 
                                className={`type-btn ${tipo === 'EMAIL' ? 'active' : ''}`}
                                onClick={() => setTipo('EMAIL')}
                                style={{
                                    backgroundColor: tipo === 'EMAIL' ? '#10b981' : 'white', 
                                    color: tipo === 'EMAIL' ? 'white' : '#4b5563',
                                    border: 'none',
                                    padding: '8px 24px',
                                    fontWeight: '500',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    cursor: 'pointer',
                                    borderLeft: '1px solid #d1d5db'
                                }}
                            >
                                <Mail size={16} /> EMAIL
                            </button>
                        </div>
                    </div>

                    {tipo === 'EMAIL' && (
                        <div className="comunicazione-field">
                            <label>Oggetto</label>
                            <input 
                                className="comunicazione-input" 
                                value={oggetto} 
                                onChange={(e) => setOggetto(e.target.value)} 
                                placeholder="Oggetto della mail"
                            />
                        </div>
                    )}

                    <div className="comunicazione-field" style={{flex: 1}}>
                        <label>{tipo === 'SMS' ? `Testo sms (caratteri rimanenti : ${160 - testo.length})` : 'Testo email'}</label>
                        {tipo === 'SMS' ? (
                            <textarea 
                                className="comunicazione-input comunicazione-textarea" 
                                value={testo} 
                                onChange={(e) => setTesto(e.target.value.substring(0, 160))} 
                                placeholder="Scrivi il tuo messaggio..."
                                style={{height: '150px'}}
                            />
                        ) : (
                            <SimpleEditor 
                                value={testo} 
                                onChange={(e) => setTesto(e.target.value)}
                            />
                        )}
                    </div>
                </div>

                <div className="comunicazione-footer">
                    <button className="btn-annulla" onClick={onClose} disabled={isSubmitting}>
                        <X size={18} /> Annulla
                    </button>
                    <button className="btn-invia" onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? 'Invio...' : (
                            <>
                                <Check size={18} /> Invia
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ComunicazioneModal;
