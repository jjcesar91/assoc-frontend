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
    const [saldoIniziale, setSaldoIniziale] = useState('0');
    const [saldoInizialeData, setSaldoInizialeData] = useState('');

    // Amministratori della società (admin) e superuser modificano il saldo iniziale anche
    // quando è già impostato; ogni modifica è registrata nello storico (visibile dalla
    // riga del saldo in Prima Nota). Se non è mai stato impostato, chiunque può inserirlo.
    const isAmministratore = ['admin', 'superuser'].includes(localStorage.getItem('user_role') || '');
    const saldoGiaImpostato = !!(conto?.saldo_iniziale_data)
        || (conto?.saldo_iniziale != null && Number(conto.saldo_iniziale) !== 0);
    const saldoBloccato = saldoGiaImpostato && !isAmministratore;

    useEffect(() => {
        if (isOpen) {
            setDescrizione(conto?.descrizione || '');
            setModalita(conto?.modalita_pagamento || []);
            setSaldoIniziale(conto?.saldo_iniziale != null ? String(conto.saldo_iniziale) : '0');
            setSaldoInizialeData(conto?.saldo_iniziale_data || '');
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
            // Se il saldo è bloccato (già impostato e utente non superuser) si
            // rispediscono i valori originali, senza applicare modifiche.
            saldo_iniziale: saldoBloccato
                ? (conto?.saldo_iniziale != null ? Number(conto.saldo_iniziale) : 0)
                : (saldoIniziale === '' ? 0 : parseFloat(String(saldoIniziale).replace(',', '.')) || 0),
            saldo_iniziale_data: saldoBloccato
                ? (conto?.saldo_iniziale_data || null)
                : (saldoInizialeData || null),
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

                        <div className="conto-modal-field" style={{ display: 'flex', gap: '16px' }}>
                            <div style={{ flex: 1 }}>
                                <label>Saldo iniziale</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    className="md-input"
                                    value={saldoIniziale}
                                    onChange={(e) => { if (/^\d*[.,]?\d*$/.test(e.target.value)) setSaldoIniziale(e.target.value); }}
                                    disabled={saldoBloccato}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label>Data saldo iniziale</label>
                                <input
                                    type="date"
                                    className="md-input"
                                    value={saldoInizialeData}
                                    onChange={(e) => setSaldoInizialeData(e.target.value)}
                                    disabled={saldoBloccato}
                                />
                            </div>
                        </div>
                        {saldoBloccato && (
                            <div className="field-hint">
                                Il saldo iniziale e la relativa data sono già stati impostati:
                                solo un <strong>amministratore</strong> della società può modificarli.
                            </div>
                        )}
                        {saldoGiaImpostato && !saldoBloccato && (
                            <div className="field-hint">
                                Le modifiche al saldo iniziale vengono registrate con data, ora e autore.
                            </div>
                        )}

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
