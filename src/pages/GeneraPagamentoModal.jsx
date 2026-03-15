import React, { useState, useEffect } from 'react';
import { X, Check, Euro, Coins, CreditCard, Banknote, Landmark } from 'lucide-react';
import './GeneraPagamentoModal.css';

const GeneraPagamentoModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    totale, 
    socio, 
    cart 
}) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const defaultDataRicevuta = todayStr.split('-').reverse().join('/'); // basic parse to DD/MM/YYYY is visually confusing with normal input date, better keep YYYY-MM-DD for input type date

    const [modalita, setModalita] = useState('Contanti');
    const [contoDestinazione, setContoDestinazione] = useState('CASSA');
    
    const [intestatario, setIntestatario] = useState('');
    const [emettiRicevuta, setEmettiRicevuta] = useState('SI');
    const [annoRicevuta, setAnnoRicevuta] = useState(new Date().getFullYear().toString());
    const [numerazione, setNumerazione] = useState('');
    const [dataRicevuta, setDataRicevuta] = useState(todayStr); // YYYY-MM-DD
    
    const [codiceFiscale, setCodiceFiscale] = useState('');
    const [codiceFiscaleGenitore, setCodiceFiscaleGenitore] = useState('');
    const [partitaIva, setPartitaIva] = useState('');
    
    const [note, setNote] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (socio) {
                setIntestatario(`${socio.cognome} ${socio.nome}`);
                setCodiceFiscale(socio.codice_fiscale || '');
            } else {
                setIntestatario('');
                setCodiceFiscale('');
            }
            // Reset other fields as well to defaults if needed
            setModalita('Contanti');
            setContoDestinazione('CASSA');
            setEmettiRicevuta('SI');
            setAnnoRicevuta(new Date().getFullYear().toString());
            setDataRicevuta(todayStr);
            setCodiceFiscaleGenitore('');
            setPartitaIva('');
            setNote('');
            setNumerazione(`Numerazione alternativa - N. 001/25 ( PRED )`);
        }
    }, [isOpen, socio, todayStr]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        const payload = {
            importo: totale,
            modalita_pagamento: modalita,
            conto_destinazione: contoDestinazione,
            intestatario: intestatario,
            data_pagamento: dataRicevuta,
            data_ricevuta: dataRicevuta,
            codice_fiscale: codiceFiscale,
            codice_fiscale_genitore: codiceFiscaleGenitore,
            partita_iva: partitaIva,
            note: note,
            emetti_ricevuta: emettiRicevuta,
            anno_ricevuta: annoRicevuta,
            numerazione_ricevuta: numerazione,
            quote: cart.map(i => `${i.description || i.name} (x${i.qty})`).join(', ')
        };
        onConfirm(payload);
    };

    return (
        <div className="gpm-overlay">
            <div className="gpm-modal">
                <div className="gpm-header">
                    <div className="gpm-title">
                        <Euro size={20} strokeWidth={2}/> Conferma
                    </div>
                    <button className="gpm-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <div className="gpm-body">
                    
                    <div className="gpm-top-section">
                        <div className="gpm-field-group">
                            <label>Totale</label>
                            <div className="gpm-totale-box">
                                € {parseFloat(totale).toFixed(2).replace('.', ',')}
                            </div>
                        </div>

                        <div className="gpm-field-group" style={{ flex: 2 }}>
                            <label>Modalità di pagamento</label>
                            <div className="gpm-payment-methods">
                                <button className={`gpm-method-btn ${modalita === 'Contanti' ? 'active' : ''}`} onClick={() => setModalita('Contanti')}>
                                    <Coins size={16}/> Contanti
                                </button>
                                <button className={`gpm-method-btn ${modalita === 'POS' ? 'active' : ''}`} onClick={() => setModalita('POS')}>
                                    <CreditCard size={16}/> POS
                                </button>
                                <button className={`gpm-method-btn ${modalita === 'Assegno' ? 'active' : ''}`} onClick={() => setModalita('Assegno')}>
                                    <Banknote size={16}/> Assegno
                                </button>
                                <button className={`gpm-method-btn ${modalita === 'Bonifico' ? 'active' : ''}`} onClick={() => setModalita('Bonifico')}>
                                    <Landmark size={16}/> Bonifico
                                </button>
                            </div>
                        </div>

                        <div className="gpm-field-group">
                            <label>Conto di destinazione</label>
                            <select 
                                className="gpm-select" 
                                value={contoDestinazione} 
                                onChange={(e) => setContoDestinazione(e.target.value)}
                            >
                                <option value="CASSA">CASSA</option>
                                <option value="BANCA">BANCA</option>
                            </select>
                        </div>
                    </div>

                    <div className="gpm-divider"></div>

                    <div className="gpm-field-group full-width" style={{ marginTop: '20px' }}>
                        <label>Intestatario</label>
                        <input 
                            type="text" 
                            className="gpm-input" 
                            value={intestatario} 
                            onChange={(e) => setIntestatario(e.target.value)}
                        />
                    </div>

                    <div className="gpm-row-4">
                        <div className="gpm-field-group">
                            <label>Emetti ricevuta</label>
                            <select className="gpm-select" value={emettiRicevuta} onChange={(e) => setEmettiRicevuta(e.target.value)}>
                                <option value="SI">SI</option>
                                <option value="NO">NO</option>
                            </select>
                        </div>
                        <div className="gpm-field-group">
                            <label>Anno ricevuta</label>
                            <select className="gpm-select" value={annoRicevuta} onChange={(e) => setAnnoRicevuta(e.target.value)}>
                                <option value="2024">2024</option>
                                <option value="2025">2025</option>
                                <option value="2026">2026</option>
                                <option value="2027">2027</option>
                            </select>
                        </div>
                        <div className="gpm-field-group" style={{ flex: 2 }}>
                            <label>Numerazione</label>
                            <select className="gpm-select" value={numerazione} onChange={(e) => setNumerazione(e.target.value)}>
                                <option value="Numerazione alternativa - N. 001/25 ( PRED )">Numerazione alternativa - N. 001/25 ( PRED )</option>
                                <option value="Standard">Standard</option>
                            </select>
                        </div>
                        <div className="gpm-field-group">
                            <label>Data ricevuta</label>
                            <input 
                                type="date" 
                                className="gpm-input" 
                                value={dataRicevuta} 
                                onChange={(e) => setDataRicevuta(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="gpm-row-3">
                        <div className="gpm-field-group">
                            <label>Codice fiscale intestatario</label>
                            <input 
                                type="text" 
                                className="gpm-input" 
                                value={codiceFiscale} 
                                onChange={(e) => setCodiceFiscale(e.target.value)}
                            />
                        </div>
                        <div className="gpm-field-group">
                            <label>Codice fiscale genitore</label>
                            <input 
                                type="text" 
                                className="gpm-input" 
                                value={codiceFiscaleGenitore} 
                                onChange={(e) => setCodiceFiscaleGenitore(e.target.value)}
                            />
                        </div>
                        <div className="gpm-field-group">
                            <label>Partita IVA</label>
                            <input 
                                type="text" 
                                className="gpm-input" 
                                value={partitaIva} 
                                onChange={(e) => setPartitaIva(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="gpm-field-group full-width" style={{ marginTop: '15px' }}>
                        <label>Note</label>
                        <textarea 
                            className="gpm-textarea" 
                            rows={3} 
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </div>

                </div>
                <div className="gpm-footer">
                    <button className="gpm-submit-btn" onClick={handleConfirm}>
                        <Check size={18} strokeWidth={2}/> Genera pagamento
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GeneraPagamentoModal;