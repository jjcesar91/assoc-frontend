import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const AttivitaConfigurazioneModal = ({ isOpen, onClose, onSave, attivita, colori }) => {
    const [form, setForm] = useState({ descrizione: '', colore: '' });

    useEffect(() => {
        if (isOpen) {
            setForm({
                descrizione: attivita?.descrizione || '',
                colore: attivita?.colore || '',
            });
        }
    }, [isOpen, attivita]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!form.descrizione.trim()) return;
        onSave(attivita ? { ...form, id: attivita.id } : form);
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 500 }}>
            <div className="modal-box">
                {/* Header */}
                <div className="modal-header modal-header-green">
                    <span>Tipo Attività</span>
                    <button className="modal-header-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="modal-body">
                    <div className="form-field">
                        <label>Descrizione</label>
                        <input
                            className="form-input"
                            type="text"
                            value={form.descrizione}
                            onChange={e => setForm({ ...form, descrizione: e.target.value })}
                            autoFocus
                        />
                    </div>
                    <div className="form-field">
                        <label>
                            <span
                                className="colore-badge"
                                style={(() => {
                                    const c = colori.find(c => c.value === form.colore);
                                    return c
                                        ? { backgroundColor: c.bg, color: c.text }
                                        : { backgroundColor: 'var(--primary)', color: '#fff' };
                                })()}
                            >
                                Colore
                            </span>
                        </label>
                        <select
                            className="form-select"
                            value={form.colore}
                            onChange={e => setForm({ ...form, colore: e.target.value })}
                        >
                            <option value=""></option>
                            {colori.map(c => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button className="btn-danger" onClick={onClose}>
                        <X size={15} /> Annulla
                    </button>
                    <button className="btn-success" onClick={handleSubmit}>
                        ✓ Salva
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AttivitaConfigurazioneModal;
