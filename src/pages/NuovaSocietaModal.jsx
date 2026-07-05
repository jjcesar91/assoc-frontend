import React, { useState, useEffect } from 'react';
import { X, Building2, Calendar, Settings, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import './SocioModal.css';

const TIPO_OPTIONS = ['ASD', 'APS'];

const EMPTY = {
    denominazione: '',
    codice_fiscale: '',
    partita_iva: '',
    email: '',
    telefono: '',
    tipo_associazione: 'ASD',
    // Anno contabile
    tipo_anno_associativo: 'solare',
    data_inizio_anno_associativo: '01-01',
    // Impostazioni
    quota_tesseramento_unico: false,
};

const MONTHS = [
    { val: '01', label: 'Gennaio' }, { val: '02', label: 'Febbraio' }, { val: '03', label: 'Marzo' },
    { val: '04', label: 'Aprile' }, { val: '05', label: 'Maggio' }, { val: '06', label: 'Giugno' },
    { val: '07', label: 'Luglio' }, { val: '08', label: 'Agosto' }, { val: '09', label: 'Settembre' },
    { val: '10', label: 'Ottobre' }, { val: '11', label: 'Novembre' }, { val: '12', label: 'Dicembre' }
];

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

const STEPS = [
    { key: 'dati', label: 'Dati società', icon: Building2 },
    { key: 'anno', label: 'Anno contabile', icon: Calendar },
    { key: 'impostazioni', label: 'Impostazioni', icon: Settings },
];

const NuovaSocietaModal = ({ isOpen, onClose, onSave }) => {
    const [step, setStep] = useState(0);
    const [form, setForm] = useState(EMPTY);
    const [customDay, setCustomDay] = useState('01');
    const [customMonth, setCustomMonth] = useState('01');
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setStep(0);
            setForm(EMPTY);
            setCustomDay('01');
            setCustomMonth('01');
            setLogoFile(null);
            setLogoPreview(null);
            setErrors({});
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        const UPPERCASE_FIELDS = ['codice_fiscale', 'denominazione'];
        const finalValue = UPPERCASE_FIELDS.includes(name) ? value.toUpperCase() : value;
        setForm(prev => ({ ...prev, [name]: finalValue }));
        setErrors(prev => ({ ...prev, [name]: undefined }));
    };

    // --- Anno contabile ---
    const handleTypeChange = (e) => {
        const type = e.target.value;
        let newData = form.data_inizio_anno_associativo;
        if (type === 'solare') newData = '01-01';
        else if (type === 'associativo') newData = '01-09';
        else newData = `${customDay}-${customMonth}`;
        setForm(prev => ({ ...prev, tipo_anno_associativo: type, data_inizio_anno_associativo: newData }));
    };

    const handleDatePartChange = (part, value) => {
        const d = part === 'day' ? value : customDay;
        const m = part === 'month' ? value : customMonth;
        if (part === 'day') setCustomDay(value); else setCustomMonth(value);
        setForm(prev => ({ ...prev, data_inizio_anno_associativo: `${d}-${m}` }));
    };

    // --- Logo ---
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const validateStep0 = () => {
        const e = {};
        if (!form.denominazione.trim()) e.denominazione = 'Campo obbligatorio';
        if (!form.codice_fiscale.trim()) e.codice_fiscale = 'Campo obbligatorio';
        return e;
    };

    const goNext = () => {
        if (step === 0) {
            const errs = validateStep0();
            if (Object.keys(errs).length > 0) { setErrors(errs); return; }
        }
        setStep(s => Math.min(s + 1, STEPS.length - 1));
    };

    const goBack = () => setStep(s => Math.max(s - 1, 0));

    const handleSubmit = async () => {
        const errs = validateStep0();
        if (Object.keys(errs).length > 0) { setStep(0); setErrors(errs); return; }
        setSaving(true);
        try {
            await onSave(form, logoFile);
        } finally {
            setSaving(false);
        }
    };

    const isLastStep = step === STEPS.length - 1;

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
                    borderBottom: '1px solid var(--border-color)',
                    backgroundColor: '#fff',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Building2 size={20} style={{ color: 'var(--success)' }} />
                        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            Nuova società
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px', display: 'flex', alignItems: 'center', borderRadius: '4px' }}
                        onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--surface-1)'}
                        onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Stepper */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '16px 24px',
                    borderBottom: '1px solid var(--border-color)',
                    backgroundColor: 'var(--surface-1)',
                }}>
                    {STEPS.map((s, i) => {
                        const StepIcon = s.icon;
                        const done = i < step;
                        const active = i === step;
                        return (
                            <React.Fragment key={s.key}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{
                                        width: '30px', height: '30px', borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        backgroundColor: active ? 'var(--primary)' : done ? 'var(--success)' : 'var(--surface-2, #e8e8e8)',
                                        color: (active || done) ? '#fff' : 'var(--text-secondary)',
                                        flexShrink: 0,
                                        transition: 'all 0.15s ease',
                                    }}>
                                        {done ? <Check size={16} /> : <StepIcon size={16} />}
                                    </div>
                                    <span style={{
                                        fontSize: '0.82rem',
                                        fontWeight: active ? 600 : 500,
                                        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {s.label}
                                    </span>
                                </div>
                                {i < STEPS.length - 1 && (
                                    <div style={{ flex: 1, height: '2px', minWidth: '16px', backgroundColor: i < step ? 'var(--success)' : 'var(--border-color)', margin: '0 4px' }} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px', backgroundColor: '#fff' }}>

                    {/* STEP 0 — Dati società */}
                    {step === 0 && (
                        <div className="md-form-grid-custom">
                            <div className="form-group grid-span-12">
                                <label className="field-label">Denominazione *</label>
                                <input
                                    name="denominazione"
                                    className="md-input"
                                    placeholder="Ragione sociale / denominazione"
                                    value={form.denominazione}
                                    onChange={handleChange}
                                />
                                {errors.denominazione && <div style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: '4px' }}>{errors.denominazione}</div>}
                            </div>

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
                                {errors.codice_fiscale && <div style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: '4px' }}>{errors.codice_fiscale}</div>}
                            </div>

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
                    )}

                    {/* STEP 1 — Anno contabile */}
                    {step === 1 && (
                        <div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 0, marginBottom: '20px' }}>
                                Definisci la scadenza dell'anno contabile della società. Potrà essere modificata in seguito finché non saranno emesse ricevute.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: '#555' }}>Scadenza anno contabile</label>
                                    <div style={{ position: 'relative' }}>
                                        <select
                                            className="md-input"
                                            name="tipo_anno_associativo"
                                            value={form.tipo_anno_associativo}
                                            onChange={handleTypeChange}
                                            style={{ width: '100%', padding: '8px 12px', appearance: 'none', backgroundColor: 'white', cursor: 'pointer' }}
                                        >
                                            <option value="solare">Anno Solare (01/01 - 31/12)</option>
                                            <option value="associativo">Anno Sportivo (01/09 - 31/08)</option>
                                            <option value="personalizzato">Personalizzato</option>
                                        </select>
                                        <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M1 1L5 5L9 1" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {form.tipo_anno_associativo === 'personalizzato' && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: '#555' }}>Inizio Anno Associativo</label>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <div style={{ flex: 1, position: 'relative' }}>
                                                <select
                                                    className="md-input"
                                                    value={customDay}
                                                    onChange={(e) => handleDatePartChange('day', e.target.value)}
                                                    style={{ width: '100%', padding: '8px 12px', appearance: 'none', backgroundColor: 'white', cursor: 'pointer' }}
                                                >
                                                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                                </select>
                                                <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M1 1L5 5L9 1" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </div>
                                            </div>
                                            <div style={{ flex: 2, position: 'relative' }}>
                                                <select
                                                    className="md-input"
                                                    value={customMonth}
                                                    onChange={(e) => handleDatePartChange('month', e.target.value)}
                                                    style={{ width: '100%', padding: '8px 12px', appearance: 'none', backgroundColor: 'white', cursor: 'pointer' }}
                                                >
                                                    {MONTHS.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                                                </select>
                                                <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M1 1L5 5L9 1" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 2 — Impostazioni */}
                    {step === 2 && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                            {/* Logo Intestazione */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.95rem', marginBottom: '12px', color: '#333', fontWeight: '600', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Logo Intestazione</label>
                                <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '10px' }}>Il logo verrà mostrato in alto a sinistra nel template di stampa della modulistica e nelle ricevute.</p>
                                {logoPreview && (
                                    <div style={{ marginBottom: '12px' }}>
                                        <span style={{ display: 'block', fontSize: '0.8rem', marginBottom: '5px', color: '#666' }}>Anteprima</span>
                                        <div style={{ border: '1px solid var(--success)', padding: '10px', display: 'inline-block', borderRadius: '4px', backgroundColor: 'var(--surface-1)' }}>
                                            <img src={logoPreview} alt="Preview" style={{ maxWidth: '200px', maxHeight: '100px', objectFit: 'contain' }} />
                                        </div>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>

                            {/* Iscrizioni e Tesseramento */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '12px', color: '#555', fontWeight: 600 }}>
                                    Iscrizioni e Tesseramento
                                </label>
                                <div
                                    onClick={() => setForm(prev => ({ ...prev, quota_tesseramento_unico: !prev.quota_tesseramento_unico }))}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '14px',
                                        padding: '12px 18px',
                                        border: `2px solid ${form.quota_tesseramento_unico ? 'var(--primary)' : '#ddd'}`,
                                        borderRadius: '8px',
                                        backgroundColor: form.quota_tesseramento_unico ? 'var(--info-container)' : 'var(--surface-1)',
                                        cursor: 'pointer',
                                        userSelect: 'none',
                                        transition: 'all 0.15s ease',
                                        minWidth: '320px'
                                    }}
                                >
                                    <div style={{
                                        width: '42px',
                                        height: '24px',
                                        borderRadius: '12px',
                                        backgroundColor: form.quota_tesseramento_unico ? 'var(--primary)' : '#ccc',
                                        position: 'relative',
                                        flexShrink: 0,
                                        transition: 'background-color 0.15s ease'
                                    }}>
                                        <div style={{
                                            width: '18px',
                                            height: '18px',
                                            borderRadius: '50%',
                                            backgroundColor: 'white',
                                            position: 'absolute',
                                            top: '3px',
                                            left: form.quota_tesseramento_unico ? '21px' : '3px',
                                            transition: 'left 0.15s ease',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                                        }} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: form.quota_tesseramento_unico ? 'var(--primary-hover)' : '#333' }}>
                                            Quota associativa e Tesseramento Unico
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: '#888', marginTop: '2px' }}>
                                            {form.quota_tesseramento_unico ? 'Attivo' : 'Non attivo'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="modal-footer-custom" style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                    {step > 0 ? (
                        <button
                            type="button"
                            className="btn-outlined"
                            onClick={goBack}
                            disabled={saving}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                            <ChevronLeft size={18} /> Indietro
                        </button>
                    ) : <span />}

                    {isLastStep ? (
                        <button
                            type="button"
                            className="btn-save-full"
                            onClick={handleSubmit}
                            disabled={saving}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                            {saving ? 'Salvataggio...' : <><Check size={18} /> Crea società</>}
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="btn-save-full"
                            onClick={goNext}
                            disabled={saving}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                            Avanti <ChevronRight size={18} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NuovaSocietaModal;
