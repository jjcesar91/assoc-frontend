import React, { useState, useEffect } from 'react';
import { X, User } from 'lucide-react';
import './SocioModal.css';
import { getPasswordValidationErrors } from '../utils/passwordValidation';

const ROLE_OPTIONS_SUPERUSER = [
    { value: 'user',      label: 'Utente' },
    { value: 'admin',     label: 'Amministratore' },
    { value: 'superuser', label: 'Superuser' },
];

const ROLE_OPTIONS_ADMIN = [
    { value: 'user',  label: 'Utente' },
    { value: 'admin', label: 'Amministratore' },
];

const EMPTY = {
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    confirmEmail: '',
    nome: '',
    cognome: '',
    telefono: '',
    role: 'user',
};

const UtenteModal = ({ isOpen, onClose, utente, onSave }) => {
    const currentRole = localStorage.getItem('user_role') || 'user';
    const ROLE_OPTIONS = currentRole === 'superuser' ? ROLE_OPTIONS_SUPERUSER : ROLE_OPTIONS_ADMIN;
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (!isOpen) return;
        if (utente) {
            setForm({
                username:        utente.username || '',
                password:        '',
                confirmPassword: '',
                email:           utente.email    || '',
                confirmEmail:    utente.email    || '',
                nome:            utente.nome     || '',
                cognome:         utente.cognome  || '',
                telefono:        utente.telefono || '',
                role:            utente.role     || 'user',
            });
        } else {
            setForm(EMPTY);
        }
        setErrors({});
    }, [isOpen, utente]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        setErrors((prev) => {
            const next = { ...prev, [name]: undefined };
            if (name === 'password') next.confirmPassword = undefined;
            if (name === 'confirmPassword') next.password = undefined;
            return next;
        });
    };

    const validate = () => {
        const e = {};
        if (!form.username.trim()) e.username = 'Campo obbligatorio';
        if (!isEdit) {
            if (!form.password) e.password = 'Campo obbligatorio';
            if (!form.email.trim()) e.email = 'Campo obbligatorio';
            if (form.email && form.email !== form.confirmEmail) e.confirmEmail = 'Le email non coincidono';
        }
        if (form.password) {
            const passwordErrors = getPasswordValidationErrors(form.password);
            if (passwordErrors.length > 0) e.password = passwordErrors.join('. ');
        }
        if (form.password && form.password !== form.confirmPassword) e.confirmPassword = 'Le password non coincidono';
        return e;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }
        const payload = {
            username: form.username,
            nome:     form.nome,
            cognome:  form.cognome,
            telefono: form.telefono,
            role:     form.role,
        };
        if (!isEdit) {
            payload.email    = form.email;
            payload.password = form.password;
        }
        if (utente?.id) payload.id = utente.id;
        onSave(payload);
    };

    const isEdit = !!utente;

    return (
        <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: '72px' }}>
            <div
                className="modal-card socio-modal"
                style={{ maxWidth: '720px', width: '95%', maxHeight: 'calc(100vh - 88px)', display: 'flex', flexDirection: 'column' }}
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
                        <User size={20} style={{ color: '#10b981' }} />
                        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#111827' }}>
                            {isEdit ? `Modifica utente – ${utente.username}` : 'Nuovo utente'}
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
                    <form id="utente-form" onSubmit={handleSubmit} noValidate>
                        <div className="md-form-grid-custom">

                            {/* Username */}
                            <div className="form-group grid-span-12">
                                <label className="field-label">Username {!isEdit && '*'}</label>
                                <input
                                    name="username"
                                    className="md-input"
                                    placeholder="Username"
                                    value={form.username}
                                    onChange={handleChange}
                                    readOnly={isEdit}
                                    style={isEdit ? { backgroundColor: '#f3f4f6', color: '#6b7280', cursor: 'default' } : {}}
                                />
                                {errors.username && <div style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '4px' }}>{errors.username}</div>}
                            </div>

                            {/* Password – solo in creazione */}
                            {!isEdit && (<>
                            <div className="form-group grid-span-6">
                                <label className="field-label">Password *</label>
                                <input
                                    name="password"
                                    type="password"
                                    className={`md-input ${errors.password ? 'input-error' : ''}`}
                                    placeholder="Password"
                                    value={form.password}
                                    onChange={handleChange}
                                    autoComplete="new-password"
                                />
                                {errors.password && <div style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '4px' }}>{errors.password}</div>}
                            </div>

                            <div className="form-group grid-span-6">
                                <label className="field-label">Conferma password</label>
                                <input
                                    name="confirmPassword"
                                    type="password"
                                    className={`md-input ${errors.confirmPassword ? 'input-error' : ''}`}
                                    placeholder="Password"
                                    value={form.confirmPassword}
                                    onChange={handleChange}
                                    autoComplete="new-password"
                                />
                                {errors.confirmPassword && <div style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '4px' }}>{errors.confirmPassword}</div>}
                            </div>

                            {/* Email – solo in creazione */}
                            <div className="form-group grid-span-6">
                                <label className="field-label">Email *</label>
                                <input
                                    name="email"
                                    type="email"
                                    className={`md-input ${errors.email ? 'input-error' : ''}`}
                                    placeholder="Email"
                                    value={form.email}
                                    onChange={handleChange}
                                />
                                {errors.email && <div style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '4px' }}>{errors.email}</div>}
                            </div>

                            <div className="form-group grid-span-6">
                                <label className="field-label">Conferma email</label>
                                <input
                                    name="confirmEmail"
                                    type="email"
                                    className={`md-input ${errors.confirmEmail ? 'input-error' : ''}`}
                                    placeholder="Conferma Email"
                                    value={form.confirmEmail}
                                    onChange={handleChange}
                                />
                                {errors.confirmEmail && <div style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '4px' }}>{errors.confirmEmail}</div>}
                            </div>
                            </>)}

                            {/* Nome */}
                            <div className="form-group grid-span-6">
                                <label className="field-label">Nome</label>
                                <input
                                    name="nome"
                                    className="md-input"
                                    placeholder="Nome"
                                    value={form.nome}
                                    onChange={handleChange}
                                />
                            </div>

                            {/* Cognome */}
                            <div className="form-group grid-span-6">
                                <label className="field-label">Cognome</label>
                                <input
                                    name="cognome"
                                    className="md-input"
                                    placeholder="Cognome"
                                    value={form.cognome}
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

                            {/* Ruolo */}
                            <div className="form-group grid-span-6">
                                <label className="field-label">Ruolo</label>
                                <select
                                    name="role"
                                    className="md-select"
                                    value={form.role}
                                    onChange={handleChange}
                                >
                                    {ROLE_OPTIONS.map(r => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </select>
                            </div>

                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="modal-footer-custom">
                    <button className="btn-save-full" form="utente-form" type="submit">
                        ✓ Salva informazioni utente
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UtenteModal;
