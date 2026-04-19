import React, { useState, useEffect } from 'react';
import { X, Flag } from 'lucide-react';

const AreaModal = ({ isOpen, onClose, onSave, area }) => {
    const [descrizione, setDescrizione] = useState('');

    useEffect(() => {
        if (isOpen) setDescrizione(area?.descrizione || '');
    }, [isOpen, area]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!descrizione.trim()) return;
        onSave(area ? { ...area, descrizione } : { descrizione });
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 600 }}>
            <div className="modal-box" style={{ maxWidth: '480px' }}>
                <div className="modal-header modal-header-blue">
                    <Flag size={20} />
                    <span>Area</span>
                    <button className="modal-header-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <div className="modal-body">
                    <div className="form-field">
                        <label>Descrizione</label>
                        <input
                            className="form-input"
                            type="text"
                            value={descrizione}
                            onChange={e => setDescrizione(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>
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

export default AreaModal;
