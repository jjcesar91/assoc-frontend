import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import './PagamentoModal.css';

const PagamentoModal = ({ isOpen, onClose, payment, societaId }) => {
    const [formData, setFormData] = useState({
        intestatario: '',
        data_pagamento: new Date().toISOString().split('T')[0],
        importo: '',
        numero_ricevuta: '',
        progressivo_stagione: '',
        data_ricevuta: new Date().toISOString().split('T')[0],
        modalita_pagamento: 'Contanti',
        conto_destinazione: 'CASSA',
        codice_fiscale: '',
        codice_fiscale_genitore: '',
        partita_iva: '',
        note: '',
        quote: '',
        stato_pagamento: '1. VALIDO CON RICEVUTA',
        utente_nome: 'ADMIN' // placeholder
    });

    useEffect(() => {
        if (payment) {
            setFormData({
                ...payment,
                data_pagamento: payment.data_pagamento || new Date().toISOString().split('T')[0],
                data_ricevuta: payment.data_ricevuta || new Date().toISOString().split('T')[0]
            });
        }
    }, [payment]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        try {
            const method = payment ? 'PUT' : 'POST';
            const url = payment ? `/payments/api/${payment.id}` : '/payments/api';
            const payload = { ...formData, societa_id: societaId };

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                onClose();
            } else {
                console.error("Failed to save payment");
            }
        } catch (error) {
            console.error("Error saving payment", error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content pagamento-modal">
                <div className="modal-header yellow-header">
                    <h2>Dettaglio pagamento</h2>
                    <button className="icon-btn" onClick={onClose}><X size={24} color="white" /></button>
                </div>
                
                <div className="modal-body">
                    <div className="section-header">
                        <h3>Dettagli</h3>
                        <button className="btn-save" onClick={handleSave}>
                            <Check size={16} /> Salva modifiche
                        </button>
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label>Intestatario</label>
                            <input type="text" name="intestatario" value={formData.intestatario || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Data pagamento</label>
                            <input type="date" name="data_pagamento" value={formData.data_pagamento || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>€ Importo</label>
                            <input type="number" step="0.01" name="importo" value={formData.importo || ''} onChange={handleChange} />
                        </div>

                        <div className="form-group">
                            <label>Numero ricevuta</label>
                            <div className="input-with-badge">
                                <span>{formData.numero_ricevuta || 'Nuova'} <span className="badge-valid">VALIDA</span></span>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Progressivo stagione</label>
                            <div className="readonly-val">{formData.progressivo_stagione || 'Auto'}</div>
                        </div>
                        <div className="form-group">
                            <label>Data ricevuta</label>
                            <input type="date" name="data_ricevuta" value={formData.data_ricevuta || ''} onChange={handleChange} />
                        </div>

                        <div className="form-group">
                            <label>Modalità di pagamento</label>
                            <select name="modalita_pagamento" value={formData.modalita_pagamento || ''} onChange={handleChange}>
                                <option value="Contanti">Contanti</option>
                                <option value="POS">POS</option>
                                <option value="Assegno">Assegno</option>
                                <option value="Bonifico">Bonifico</option>
                                <option value="Online">Online</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Conto di destinazione</label>
                            <select name="conto_destinazione" value={formData.conto_destinazione || ''} onChange={handleChange}>
                                <option value="CASSA">CASSA</option>
                                <option value="BANCA">BANCA</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Codice fiscale</label>
                            <input type="text" name="codice_fiscale" value={formData.codice_fiscale || ''} onChange={handleChange} />
                        </div>

                        <div className="form-group">
                            <label>Codice fiscale genitore</label>
                            <input type="text" name="codice_fiscale_genitore" value={formData.codice_fiscale_genitore || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Partita IVA</label>
                            <input type="text" name="partita_iva" value={formData.partita_iva || ''} onChange={handleChange} />
                        </div>
                        <div></div>{/* Empty spacer */}
                        
                        <div className="form-group full-width">
                            <label>Note</label>
                            <textarea name="note" rows="3" value={formData.note || ''} onChange={handleChange}></textarea>
                        </div>
                        <div className="form-group full-width">
                            <label>Quote Descrizione (Es. danza bimbe rata1)</label>
                            <input type="text" name="quote" value={formData.quote || ''} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="section-header gray-bg mt-3">
                        <h3>Quote</h3>
                    </div>
                    <div className="quote-row">
                        <span>{formData.quote || 'Nessuna quota specificata'}</span>
                        <span className="quote-amount">€ {parseFloat(formData.importo || 0).toFixed(2).replace('.', ',')}</span>
                    </div>

                    <div className="section-header gray-bg mt-3">
                        <h3>Azioni disponibili</h3>
                    </div>
                    <div className="azioni-row">
                        <button className="btn-annulla"><X size={16}/> Annulla ricevuta</button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default PagamentoModal;
