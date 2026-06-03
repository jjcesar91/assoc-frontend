import React, { useState, useEffect } from 'react';
import { Truck, X, Check } from 'lucide-react';
import CityAutocomplete from '../components/CityAutocomplete';
import './FornitoreModal.css';

const emptyForm = {
    denominazione: '',
    codice_fiscale: '',
    partita_iva: '',
    codice_sdi: '',
    pec: '',
    email: '',
    telefono: '',
    indirizzo: '',
    comune: '',
    cap: '',
};

const FornitoreModal = ({ isOpen, onClose, onSave, fornitore }) => {
    const [formData, setFormData] = useState(emptyForm);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isOpen) {
            setFormData(fornitore ? { ...emptyForm, ...fornitore } : { ...emptyForm });
            setErrors({});
        }
    }, [isOpen, fornitore]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        const finalValue = name === 'codice_fiscale' ? value.toUpperCase() : value;
        setFormData(prev => ({ ...prev, [name]: finalValue }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    };

    const handleComuneSelect = (comuneObj) => {
        setFormData(prev => ({ ...prev, cap: comuneObj.cap || prev.cap }));
    };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const validate = () => {
        const errs = {};
        if (!formData.denominazione || !formData.denominazione.trim()) {
            errs.denominazione = 'La denominazione è obbligatoria.';
        }
        if (formData.codice_fiscale && formData.codice_fiscale.trim().length > 0) {
            const cfClean = formData.codice_fiscale.trim().toUpperCase();
            const cfPersona = /^[A-Z]{6}\d{2}[A-EHLMPRST]\d{2}[A-Z]\d{3}[A-Z]$/;
            const cfAzienda = /^\d{11}$/;
            if (!cfPersona.test(cfClean) && !cfAzienda.test(cfClean)) {
                errs.codice_fiscale = 'Codice fiscale non valido.';
            }
        }
        if (formData.partita_iva && formData.partita_iva.trim().length > 0) {
            if (!/^\d{11}$/.test(formData.partita_iva.trim())) {
                errs.partita_iva = 'Partita IVA non valida (11 cifre).';
            }
        }
        if (formData.codice_sdi && formData.codice_sdi.trim().length > 0) {
            if (!/^[A-Z0-9]{6,7}$/i.test(formData.codice_sdi.trim())) {
                errs.codice_sdi = 'Codice SDI non valido (6-7 caratteri alfanumerici).';
            }
        }
        if (formData.pec && formData.pec.trim().length > 0) {
            if (!emailRegex.test(formData.pec.trim())) {
                errs.pec = 'Indirizzo PEC non valido.';
            }
        }
        if (formData.email && formData.email.trim().length > 0) {
            if (!emailRegex.test(formData.email.trim())) {
                errs.email = 'Indirizzo email non valido.';
            }
        }
        if (formData.telefono && formData.telefono.trim().length > 0) {
            if (!/^[\d\s\+\-\/\.]{4,20}$/.test(formData.telefono.trim())) {
                errs.telefono = 'Numero di telefono non valido.';
            }
        }
        if (formData.cap && formData.cap.trim().length > 0) {
            if (!/^\d{5}$/.test(formData.cap.trim())) {
                errs.cap = 'CAP non valido (5 cifre).';
            }
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const inputStyle = (field) => errors[field]
        ? { borderColor: 'var(--danger-color)', backgroundColor: '#fff5f5' }
        : {};

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validate()) return;
        const payload = { ...formData };
        if (payload.codice_fiscale) payload.codice_fiscale = payload.codice_fiscale.trim().toUpperCase();
        if (payload.partita_iva) payload.partita_iva = payload.partita_iva.trim();
        if (payload.codice_sdi) payload.codice_sdi = payload.codice_sdi.trim().toUpperCase();
        onSave(payload);
    };

    return (
        <div className="fornitore-modal-overlay">
            <div className="fornitore-modal">
                <div className="fornitore-modal-header">
                    <h2><Truck size={20} /> Fornitore</h2>
                    <button className="close-btn" onClick={onClose} title="Chiudi">✕</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="fornitore-modal-body">

                        {/* Denominazione */}
                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                                Denominazione
                            </label>
                            <input
                                className="md-input"
                                name="denominazione"
                                placeholder="Denominazione"
                                value={formData.denominazione}
                                onChange={handleChange}
                                style={inputStyle('denominazione')}
                                autoFocus
                            />
                            {errors.denominazione && <div style={{ color: 'var(--danger-color)', fontSize: '0.8rem', marginTop: '4px' }}>{errors.denominazione}</div>}
                        </div>

                        {/* CF, P.IVA, SDI, PEC */}
                        <div className="fornitore-form-row">
                            <div className="fornitore-form-field" style={{ minWidth: '160px' }}>
                                <label>Codice fiscale</label>
                                <input
                                    className="md-input"
                                    name="codice_fiscale"
                                    placeholder="Codice fiscale"
                                    value={formData.codice_fiscale}
                                    onChange={handleChange}
                                    style={inputStyle('codice_fiscale')}
                                    maxLength={16}
                                />
                                {errors.codice_fiscale && <div style={{ color: 'var(--danger-color)', fontSize: '0.8rem', marginTop: '4px' }}>{errors.codice_fiscale}</div>}
                            </div>
                            <div className="fornitore-form-field" style={{ minWidth: '140px' }}>
                                <label>Partita IVA</label>
                                <input
                                    className="md-input"
                                    name="partita_iva"
                                    placeholder="Partita IVA"
                                    value={formData.partita_iva}
                                    onChange={handleChange}
                                    style={inputStyle('partita_iva')}
                                    maxLength={11}
                                />
                                {errors.partita_iva && <div style={{ color: 'var(--danger-color)', fontSize: '0.8rem', marginTop: '4px' }}>{errors.partita_iva}</div>}
                            </div>
                            <div className="fornitore-form-field" style={{ minWidth: '160px' }}>
                                <label>Codice SDI (es. 000000)</label>
                                <input
                                    className="md-input"
                                    name="codice_sdi"
                                    placeholder="Codice destinatario"
                                    value={formData.codice_sdi}
                                    onChange={handleChange}
                                    style={inputStyle('codice_sdi')}
                                    maxLength={7}
                                />
                                {errors.codice_sdi && <div style={{ color: 'var(--danger-color)', fontSize: '0.8rem', marginTop: '4px' }}>{errors.codice_sdi}</div>}
                            </div>
                            <div className="fornitore-form-field" style={{ minWidth: '140px' }}>
                                <label>PEC</label>
                                <input
                                    className="md-input"
                                    name="pec"
                                    placeholder="PEC"
                                    value={formData.pec}
                                    onChange={handleChange}
                                    style={inputStyle('pec')}
                                />
                                {errors.pec && <div style={{ color: 'var(--danger-color)', fontSize: '0.8rem', marginTop: '4px' }}>{errors.pec}</div>}
                            </div>
                        </div>

                        {/* Email, Telefono */}
                        <div className="fornitore-form-row">
                            <div className="fornitore-form-field">
                                <label>Email</label>
                                <input
                                    className="md-input"
                                    name="email"
                                    placeholder="Email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    style={inputStyle('email')}
                                />
                                {errors.email && <div style={{ color: 'var(--danger-color)', fontSize: '0.8rem', marginTop: '4px' }}>{errors.email}</div>}
                            </div>
                            <div className="fornitore-form-field">
                                <label>Telefono</label>
                                <input
                                    className="md-input"
                                    name="telefono"
                                    placeholder="Telefono"
                                    value={formData.telefono}
                                    onChange={handleChange}
                                    style={inputStyle('telefono')}
                                />
                                {errors.telefono && <div style={{ color: 'var(--danger-color)', fontSize: '0.8rem', marginTop: '4px' }}>{errors.telefono}</div>}
                            </div>
                        </div>

                        {/* Indirizzo, Comune, CAP */}
                        <div className="fornitore-form-row">
                            <div className="fornitore-form-field" style={{ flex: 2, minWidth: '200px' }}>
                                <label>Indirizzo</label>
                                <input
                                    className="md-input"
                                    name="indirizzo"
                                    placeholder="Indirizzo"
                                    value={formData.indirizzo}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="fornitore-form-field" style={{ flex: 2, minWidth: '160px' }}>
                                <label>Comune</label>
                                <CityAutocomplete
                                    name="comune"
                                    value={formData.comune}
                                    onChange={handleChange}
                                    onSelect={handleComuneSelect}
                                />
                            </div>
                            <div className="fornitore-form-field" style={{ flex: 1, minWidth: '90px', maxWidth: '110px' }}>
                                <label>Cap</label>
                                <input
                                    className="md-input"
                                    name="cap"
                                    placeholder="Cap"
                                    value={formData.cap}
                                    onChange={handleChange}
                                    style={inputStyle('cap')}
                                    maxLength={5}
                                />
                                {errors.cap && <div style={{ color: 'var(--danger-color)', fontSize: '0.8rem', marginTop: '4px' }}>{errors.cap}</div>}
                            </div>
                        </div>

                    </div>

                    <div className="fornitore-modal-footer">
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

export default FornitoreModal;
