import React, { useState } from 'react';
import { X, Mail, MessageSquare, Check } from 'lucide-react';
import SimpleEditor from './SimpleEditor';
import { useAlert } from './AlertModal';
import {
    getComConfig,
    applyShortcodes,
    buildIstruzioniPagamento,
    formatImporto,
} from '../utils/comunicazioniOrdini';
import './ComunicazioneModal.css';

// Comunicazioni di default richiamabili dal selettore.
const DEFAULT_TEMPLATES = [
    { key: 'proforma', label: 'Creazione proforma' },
    { key: 'pagamento', label: 'Proforma registrata' },
];

const nomeSocioFromRecord = (s) => {
    if (!s) return '';
    return s.tipo_socio === 'associazione'
        ? (s.ragione_sociale || '')
        : [s.nome, s.cognome].filter(Boolean).join(' ');
};

const ComunicazioneModal = ({ onClose, socioId, onSave, ordine, societa }) => {
    const showAlert = useAlert();
    const [tipo, setTipo] = useState('EMAIL'); // 'SMS' or 'EMAIL'
    const [oggetto, setOggetto] = useState('');
    const [testo, setTesto] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [templateKey, setTemplateKey] = useState('');
    const [loadingTemplate, setLoadingTemplate] = useState(false);

    // Carica una comunicazione di default risolvendo i placeholder {{}} col
    // contesto dell'ordine (nome socio, importo, numero, istruzioni pagamento).
    const handleSelectTemplate = async (key) => {
        setTemplateKey(key);
        if (!key) return;

        setLoadingTemplate(true);
        try {
            const config = getComConfig(societa, key);

            // Nominativo del destinatario: dal socio se disponibile, altrimenti
            // dall'intestatario dell'ordine.
            let nome = ordine?.intestatario || '';
            if (socioId) {
                try {
                    const token = localStorage.getItem('token');
                    const r = await fetch(`/users/api/soci/${socioId}`, {
                        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                    });
                    if (r.ok) {
                        const s = await r.json();
                        nome = nomeSocioFromRecord(s) || nome;
                    }
                } catch { /* ignore */ }
            }

            // Istruzioni di pagamento: solo per proforma con bonifico.
            let istruzioni = '';
            const modalita = ordine?.modalita_pagamento;
            if (key === 'proforma' && (modalita || '').toLowerCase() === 'bonifico') {
                try {
                    const token = localStorage.getItem('token');
                    const r = await fetch(`/payments/api/conti?societa_id=${societa?.id ?? ''}`, {
                        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                    });
                    if (r.ok) {
                        const conti = await r.json();
                        istruzioni = buildIstruzioniPagamento(conti, ordine?.conto_destinazione, modalita);
                    }
                } catch { /* ignore */ }
            }

            const testoRisolto = applyShortcodes(config.testo, {
                nome,
                importo: formatImporto(ordine?.importo),
                numeroOrdine: ordine?.numero_ricevuta || `#${ordine?.id || ''}`,
                istruzioni,
                linkRicevuta: '',
            });

            setTipo('EMAIL');
            setOggetto(config.oggetto);
            setTesto(testoRisolto);
        } finally {
            setLoadingTemplate(false);
        }
    };

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
                    {ordine && (
                        <div className="comunicazione-field">
                            <label>Comunicazione predefinita</label>
                            <select
                                className="comunicazione-input"
                                value={templateKey}
                                onChange={(e) => handleSelectTemplate(e.target.value)}
                                disabled={loadingTemplate}
                            >
                                <option value="">— Nessuna —</option>
                                {DEFAULT_TEMPLATES.map(t => (
                                    <option key={t.key} value={t.key}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div style={{textAlign: 'center', marginBottom: '10px'}}>
                        <label className="field-label" style={{display:'block', marginBottom:'8px'}}>Tipologia comunicazione</label>
                        <div style={{display:'inline-flex', borderRadius:'6px', overflow:'hidden', border:'1px solid var(--border-color)'}}>
                            <button 
                                type="button" 
                                className={`type-btn ${tipo === 'SMS' ? 'active' : ''}`}
                                onClick={() => setTipo('SMS')}
                                style={{
                                    backgroundColor: tipo === 'SMS' ? 'var(--success)' : 'white', 
                                    color: tipo === 'SMS' ? 'white' : 'var(--text-secondary)',
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
                                    backgroundColor: tipo === 'EMAIL' ? 'var(--success)' : 'white', 
                                    color: tipo === 'EMAIL' ? 'white' : 'var(--text-secondary)',
                                    border: 'none',
                                    padding: '8px 24px',
                                    fontWeight: '500',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    cursor: 'pointer',
                                    borderLeft: '1px solid var(--border-color)'
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
