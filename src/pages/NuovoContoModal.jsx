import React, { useState, useEffect } from 'react';
import { Wallet, X, Check } from 'lucide-react';
import './ContoModal.css';

const MODALITA_OPTIONS = ['Contanti', 'POS', 'Assegno', 'Bonifico'];

const EMPTY_FORM = {
    descrizione: '',
    modalita_pagamento: [],
    saldo_iniziale: '0',
    saldo_iniziale_data: new Date().toISOString().split('T')[0],
};

// Creazione di un nuovo conto: a differenza della modifica, qui si registra
// anche il saldo di apertura (e la data a cui si riferisce), oltre a poter
// selezionare più modalità di pagamento associate al conto.
const NuovoContoModal = ({ isOpen, onClose, onSave }) => {
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setForm({ ...EMPTY_FORM });
            setError(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const toggleModalita = (m) => {
        setForm(prev => ({
            ...prev,
            modalita_pagamento: prev.modalita_pagamento.includes(m)
                ? prev.modalita_pagamento.filter(x => x !== m)
                : [...prev.modalita_pagamento, m],
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.descrizione.trim()) {
            setError('La descrizione è obbligatoria.');
            return;
        }
        setError(null);
        setSaving(true);
        try {
            await onSave({
                descrizione: form.descrizione.trim(),
                modalita_pagamento: form.modalita_pagamento,
                saldo_iniziale: form.saldo_iniziale === '' ? 0 : parseFloat(String(form.saldo_iniziale).replace(',', '.')) || 0,
                saldo_iniziale_data: form.saldo_iniziale_data || null,
            });
        } catch (err) {
            setError(err.message || 'Errore nel salvataggio del conto');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="conto-modal-overlay">
            <div className="conto-modal">
                <div className="conto-modal-header">
                    <h2><Wallet size={20} /> Nuovo Conto</h2>
                    <button className="close-btn" onClick={onClose} title="Chiudi">✕</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="conto-modal-body">

                        <div className="conto-modal-field">
                            <label>Descrizione *</label>
                            <input
                                className="md-input"
                                placeholder="Es. Cassa Principale"
                                value={form.descrizione}
                                onChange={(e) => setForm(prev => ({ ...prev, descrizione: e.target.value }))}
                                required
                                autoFocus
                            />
                        </div>

                        <div className="conto-modal-field">
                            <label>Modalità di pagamento</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '4px' }}>
                                {MODALITA_OPTIONS.map(m => (
                                    <label key={m} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={form.modalita_pagamento.includes(m)}
                                            onChange={() => toggleModalita(m)}
                                            style={{ width: 16, height: 16 }}
                                        />
                                        {m}
                                    </label>
                                ))}
                            </div>
                            <div className="field-hint">
                                Puoi selezionare più modalità: verranno proposte come scelta quando questo conto
                                viene usato per registrare un pagamento o emettere una ricevuta.
                                {form.modalita_pagamento.includes('Bonifico') && (
                                    <> Salvando con <strong>Bonifico</strong> tra le modalità, potrai configurare
                                    IBAN e istruzioni di pagamento dall'elenco conti.</>
                                )}
                            </div>
                        </div>

                        <div className="conto-modal-field" style={{ display: 'flex', gap: '16px' }}>
                            <div style={{ flex: 1 }}>
                                <label>Saldo iniziale</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    className="md-input"
                                    value={form.saldo_iniziale}
                                    onChange={(e) => { if (/^\d*[.,]?\d*$/.test(e.target.value)) setForm(prev => ({ ...prev, saldo_iniziale: e.target.value })); }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label>Data saldo iniziale</label>
                                <input
                                    type="date"
                                    className="md-input"
                                    value={form.saldo_iniziale_data}
                                    onChange={(e) => setForm(prev => ({ ...prev, saldo_iniziale_data: e.target.value }))}
                                />
                            </div>
                        </div>

                        {error && (
                            <div style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</div>
                        )}

                    </div>

                    <div className="conto-modal-footer">
                        <button type="button" className="btn-contained" style={{ backgroundColor: 'var(--danger-color)' }} onClick={onClose} disabled={saving}>
                            <X size={16} /> Annulla
                        </button>
                        <button type="submit" className="btn-contained" style={{ backgroundColor: 'var(--success-color)' }} disabled={saving}>
                            <Check size={16} /> {saving ? 'Salvataggio…' : 'Crea conto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NuovoContoModal;
