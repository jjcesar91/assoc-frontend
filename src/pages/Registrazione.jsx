import React, { useState } from 'react';
import { Eye, EyeOff, Check, LogIn, ClipboardList } from 'lucide-react';
import LoginBrandPanel from '../components/LoginBrandPanel';
import { useBranding } from '../data/branding';
import { getPasswordValidationErrors } from '../utils/passwordValidation';
import { ANNI_ASSOCIATIVI } from '../data/licenze';
import '../Login.css';
import './Registrazione.css';

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY = {
    associazione: '', codice_fiscale: '', tipologia: 'ASD', email: '', telefono: '',
    indirizzo: '', cap: '', comune: '', provincia: '',
    anno_associativo_tipo: 'solare', anno_associativo_inizio: '01-01',
    affiliazioni: '', presidente_nome: '', presidente_cognome: '',
    referente_nome: '', referente_telefono: '',
    password: '', password_conferma: '', privacy: false,
    website: '', // campo trappola anti-bot (nascosto)
};

const REQUIRED = {
    associazione: 'Associazione', codice_fiscale: 'Codice fiscale', email: 'Email',
    telefono: 'Telefono associazione', indirizzo: 'Indirizzo', cap: 'CAP', comune: 'Comune',
    provincia: 'Provincia', presidente_nome: 'Nome del presidente', presidente_cognome: 'Cognome del presidente',
};

const Field = ({ label, required, error, span = 1, children }) => (
    <div className="reg-field" style={{ gridColumn: `span ${span}` }}>
        <label className="form-label">{label}{required && ' *'}</label>
        {children}
        {error && <div className="reg-error">{error}</div>}
    </div>
);

// Pagina pubblica: registrazione di una nuova associazione (licenza Free in attesa
// di attivazione + prima società + utente amministratore).
const Registrazione = () => {
    const { branding } = useBranding();
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);
    const [serverError, setServerError] = useState('');
    const [done, setDone] = useState(false);

    const set = (name) => (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setForm(f => ({ ...f, [name]: value }));
        setErrors(er => ({ ...er, [name]: undefined }));
        setServerError('');
    };
    const input = (name, props = {}) => (
        <input className="form-input reg-input" value={form[name]} onChange={set(name)} {...props} />
    );

    const validate = () => {
        const e = {};
        Object.entries(REQUIRED).forEach(([k, label]) => { if (!String(form[k]).trim()) e[k] = `${label}: campo obbligatorio`; });
        if (form.email && !EMAIL.test(form.email.trim())) e.email = 'Email non valida';
        const pwdErrors = getPasswordValidationErrors(form.password);
        if (pwdErrors.length) e.password = pwdErrors.join('. ');
        if (form.password !== form.password_conferma) e.password_conferma = 'Le password non coincidono';
        if (!form.privacy) e.privacy = 'È necessario accettare l\'informativa privacy';
        return e;
    };

    const handleSubmit = async (ev) => {
        ev.preventDefault();
        const e = validate();
        setErrors(e);
        if (Object.keys(e).length) {
            document.querySelector('.reg-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        setSaving(true);
        setServerError('');
        try {
            const res = await fetch('/users/api/public/registrazione', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    email: form.email.trim().toLowerCase(),
                    anno_associativo_inizio: form.anno_associativo_tipo === 'personalizzato' ? form.anno_associativo_inizio : null,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setDone(true);
                window.scrollTo({ top: 0 });
            } else {
                setServerError(data.error || 'Registrazione non riuscita, riprova più tardi.');
            }
        } catch {
            setServerError('Errore di rete, riprova.');
        } finally {
            setSaving(false);
        }
    };

    const [gg, mm] = form.anno_associativo_inizio.split('-');

    return (
        <div className="login-page reg-page">
            <LoginBrandPanel branding={branding} icon={<ClipboardList size={48} strokeWidth={1.5} />} />

            <div className="login-form-panel reg-form-panel">
                <div className="login-card reg-card">
                    {done ? (
                        <>
                            <div className="login-card-header">
                                <h2 className="login-card-title">Registrazione inviata</h2>
                                <p className="login-card-subtitle">
                                    Grazie! La tua richiesta è stata registrata con il piano <strong>Free</strong>.
                                    Potrai accedere con l'email <strong>{form.email.trim().toLowerCase()}</strong> e la password
                                    scelta non appena la licenza sarà attivata.
                                </p>
                            </div>
                            <button className="login-button" type="button" onClick={() => window.location.assign('/login')}>
                                <LogIn size={18} /> Vai al login
                            </button>
                        </>
                    ) : (
                        <form onSubmit={handleSubmit} noValidate>
                            <div className="login-card-header">
                                <h2 className="login-card-title">Registra la tua associazione</h2>
                                <p className="login-card-subtitle">I campi con * sono obbligatori. Dopo l'invio la licenza dovrà essere attivata.</p>
                            </div>

                            {/* Campo trappola per i bot: nascosto agli utenti */}
                            <input type="text" name="website" value={form.website} onChange={set('website')} tabIndex={-1} autoComplete="off" className="reg-honeypot" aria-hidden="true" />

                            <div className="reg-section">Associazione</div>
                            <div className="reg-grid">
                                <Field label="Associazione" required error={errors.associazione} span={2}>{input('associazione')}</Field>
                                <Field label="Tipologia" required>
                                    <select className="form-input reg-input" value={form.tipologia} onChange={set('tipologia')}>
                                        <option value="ASD">ASD</option>
                                        <option value="APS">APS</option>
                                    </select>
                                </Field>
                                <Field label="Codice fiscale" required error={errors.codice_fiscale}>{input('codice_fiscale', { style: { textTransform: 'uppercase' } })}</Field>
                                <Field label="Email" required error={errors.email}>{input('email', { type: 'email', autoComplete: 'email' })}</Field>
                                <Field label="Telefono associazione" required error={errors.telefono}>{input('telefono', { type: 'tel' })}</Field>
                            </div>

                            <div className="reg-section">Indirizzo</div>
                            <div className="reg-grid">
                                <Field label="Via e numero civico" required error={errors.indirizzo} span={3}>{input('indirizzo')}</Field>
                                <Field label="CAP" required error={errors.cap}>{input('cap', { maxLength: 10, inputMode: 'numeric' })}</Field>
                                <Field label="Comune" required error={errors.comune}>{input('comune')}</Field>
                                <Field label="Provincia" required error={errors.provincia}>{input('provincia', { maxLength: 30, placeholder: 'es. TV' })}</Field>
                            </div>

                            <div className="reg-section">Attività</div>
                            <div className="reg-grid">
                                <Field label="Anno associativo" required span={form.anno_associativo_tipo === 'personalizzato' ? 2 : 3}>
                                    <select className="form-input reg-input" value={form.anno_associativo_tipo} onChange={set('anno_associativo_tipo')}>
                                        {ANNI_ASSOCIATIVI.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                                    </select>
                                </Field>
                                {form.anno_associativo_tipo === 'personalizzato' && (
                                    <Field label="Dal (giorno / mese)">
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <select className="form-input reg-input" value={gg} onChange={e => setForm(f => ({ ...f, anno_associativo_inizio: `${e.target.value}-${mm}` }))}>
                                                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                            <select className="form-input reg-input" value={mm} onChange={e => setForm(f => ({ ...f, anno_associativo_inizio: `${gg}-${e.target.value}` }))}>
                                                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                        </div>
                                    </Field>
                                )}
                                <Field label="Affiliazioni" span={3}>{input('affiliazioni', { placeholder: 'es. EPS: UISP, Federazioni: FIGC' })}</Field>
                            </div>

                            <div className="reg-section">Persone di riferimento</div>
                            <div className="reg-grid">
                                <Field label="Nome del presidente" required error={errors.presidente_nome}>{input('presidente_nome')}</Field>
                                <Field label="Cognome del presidente" required error={errors.presidente_cognome}>{input('presidente_cognome')}</Field>
                                <div />
                                <Field label="Referente (nome e cognome)">{input('referente_nome')}</Field>
                                <Field label="Telefono referente">{input('referente_telefono', { type: 'tel' })}</Field>
                            </div>

                            <div className="reg-section">Accesso al gestionale</div>
                            <p className="reg-hint">Email e password saranno le credenziali dell'amministratore della licenza.</p>
                            <div className="reg-grid">
                                {[
                                    ['password', 'Password'],
                                    ['password_conferma', 'Conferma password'],
                                ].map(([name, label]) => (
                                    <Field key={name} label={label} required error={errors[name]} span={name === 'password' ? 2 : 1}>
                                        <div className="input-wrapper">
                                            <input
                                                className="form-input form-input--password reg-input"
                                                type={showPassword ? 'text' : 'password'}
                                                value={form[name]}
                                                onChange={set(name)}
                                                autoComplete="new-password"
                                            />
                                            <button type="button" className="password-toggle" onClick={() => setShowPassword(v => !v)} tabIndex={-1} aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}>
                                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </Field>
                                ))}
                            </div>
                            <p className="reg-hint">Almeno 14 caratteri, con una maiuscola, una minuscola, un numero e un carattere speciale.</p>

                            <label className="reg-privacy">
                                <input type="checkbox" checked={form.privacy} onChange={set('privacy')} />
                                <span>Ho letto e accetto l'informativa sul trattamento dei dati personali *</span>
                            </label>
                            {errors.privacy && <div className="reg-error">{errors.privacy}</div>}

                            {serverError && <div className="login-message login-message--error" style={{ marginTop: '12px' }}>{serverError}</div>}

                            <button className="login-button" type="submit" disabled={saving} style={{ marginTop: '16px' }}>
                                {saving ? <span className="login-spinner" /> : <Check size={18} />}
                                {saving ? 'Invio in corso…' : 'Registrati'}
                            </button>
                            <p className="reg-hint" style={{ textAlign: 'center', marginTop: '12px' }}>
                                Hai già un account? <a href="/login">Accedi</a>
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Registrazione;
