import React, { useState, useEffect } from 'react';
import { X, Building2 } from 'lucide-react';
import './SocioModal.css';

const TIPO_OPTIONS = ['ASD', 'APS'];

const EMPTY = {
    denominazione: '',
    codice_fiscale: '',
    partita_iva: '',
    email: '',
    telefono: '',
    tipo_associazione: 'ASD',
};

const NuovaSocietaModal = ({ isOpen, onClose, onSave }) => {
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setForm(EMPTY);
            setErrors({});
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        setErrors(prev => ({ ...prev, [name]: undefined }));
    };

    const validate = () => {
        const e = {};
        if (!form.denominazione.trim()) e.denominazione = 'Campo obbligatorio';
        if (!form.codice_fiscale.trim()) e.codice_fiscale = 'Campo obbligatorio';
        return e;
    };

    const handleSubmit = async (ev) => {
        ev.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }
        setSaving(true);
        try {
            await onSave(form);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: '72px' }}>
            <div
                className="modal-card socio-modal"
                style={{ maxWidth: '640px', width: '95%', maxHeight: 'calc(100vh - 88px)', display: 'flex', flexDirection: 'column' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 24px',
                    borderBottom: '1px solid #e5e7eb',
                    backgroundColor: '#fff',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Building2 size={20} style={{ color: '#10b981' }} />
                        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#111827' }}>
                            Nuova società
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px', display: 'flex', alignItems: 'center', borderRadius: '4px' }}
                        onMouseOver={e => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                        onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px', backgroundColor: '#fff' }}>
                    <form id="nuova-societa-form" onSubmit={handleSubmit} noValidate>
                        <div className="md-form-grid-custom">

                            {/* Denominazione */}
                            <div className="form-group grid-span-12">
                                <label className="field-label">Denominazione *</label>
                                <input
                                    name="denominazione"
                                    className="md-input"
                                    placeholder="Ragione sociale / denominazione"
                                    value={form.denominazione}
                                    onChange={handleChange}
                                />
                                {errors.denominazione && <div style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '4px' }}>{errors.denominazione}</div>}
                            </div>

                            {/* Tipo associazione */}
                            <div className="form-group grid-span-6">
                                <label className="field-label">Tipo associazione</label>
                                <select
                                    name="tipo_associazione"
                                    className="md-select"
                                    value={form.tipo_associazione}
                                    onChange={handleChange}
                                >
                                    {TIPO_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>

                            {/* Codice fiscale */}
                            <div className="form-group grid-span-6">
                                <label className="field-label">Codice fiscale *</label>
                                <input
                                    name="codice_fiscale"
                                    className="md-input"
                                    placeholder="Codice fiscale"
                                    value={form.codice_fiscale}
                                    onChange={handleChange}
                                    style={{ textTransform: 'uppercase' }}
                                />
                                {errors.codice_fiscale && <div style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '4px' }}>{errors.codice_fiscale}</div>}
                            </div>

                            {/* Partita IVA */}
                            <div className="form-group grid-span-6">
                                <label className="field-label">Partita IVA</label>
                                <input
                                    name="partita_iva"
                                    className="md-input"
                                    placeholder="Partita IVA"
                                    value={form.partita_iva}
                                    onChange={handleChange}
                                />
                            </div>

                            {/* Email */}
                            <div className="form-group grid-span-6">
                                <label className="field-label">Email</label>
                                <input
                                    name="email"
                                    type="email"
                                    className="md-input"
                                    placeholder="Email"
                                    value={form.email}
                                    onChange={handleChange}
                                />
                            </div>

                            {/* Telefono */}
                            <div className="form-group grid-span-6">
                                <label className="field-label">Telefono</label>
                                <input
                                    name="telefono"
                                    className="md-input"
                                    placeholder="Telefono"
                                    value={form.telefono}
                                    onChange={handleChange}
                                />
                            </div>

                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="modal-footer-custom">
                    <button className="btn-save-full" form="nuova-societa-form" type="submit" disabled={saving}>
                        {saving ? 'Salvataggio...' : '✓ Crea società'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NuovaSocietaModal;
