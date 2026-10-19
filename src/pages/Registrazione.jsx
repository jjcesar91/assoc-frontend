import React, { useState, useEffect, useRef, useCallback } from 'react';
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

const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

// Carica una sola volta lo script di Cloudflare Turnstile
let turnstileScript = null;
const loadTurnstile = () => {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (!turnstileScript) {
        turnstileScript = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = TURNSTILE_SRC;
            s.async = true;
            s.onload = () => resolve(window.turnstile);
            s.onerror = () => { turnstileScript = null; reject(new Error('Turnstile non caricato')); };
            document.head.appendChild(s);
        });
    }
    return turnstileScript;
};

const Field = ({ name, label, required, error, span = 1, children }) => (
    <div className={`reg-field${error ? ' reg-field--error' : ''}`} data-field={name} style={{ gridColumn: `span ${span}` }}>
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

    // Sessione anti-CSRF e Turnstile (chiave pubblica per ambiente, null = disattivato)
    const [csrfToken, setCsrfToken] = useState('');
    const [siteKey, setSiteKey] = useState(null);
    const [turnstileToken, setTurnstileToken] = useState('');
    const turnstileRef = useRef(null);
    const widgetId = useRef(null);

    const loadSessione = useCallback(() => fetch('/users/api/public/registrazione/sessione', { credentials: 'same-origin' })
        .then(r => (r.ok ? r.json() : Promise.reject(new Error('sessione'))))
        .then(d => { setCsrfToken(d.csrfToken); setSiteKey(d.turnstileSiteKey || null); })
        .catch(() => setServerError('Impossibile preparare il modulo: ricarica la pagina.')), []);

    useEffect(() => { loadSessione(); }, [loadSessione]);

    useEffect(() => {
        if (!siteKey || done || !turnstileRef.current) return undefined;
        let cancelled = false;
        loadTurnstile().then(ts => {
            if (cancelled || !turnstileRef.current || widgetId.current !== null) return;
            widgetId.current = ts.render(turnstileRef.current, {
                sitekey: siteKey,
                action: 'registrazione', // verificata dal server insieme all'hostname
                language: 'it',
                callback: (t) => { setTurnstileToken(t); setErrors(er => ({ ...er, turnstile: undefined })); },
                'expired-callback': () => setTurnstileToken(''),
                'error-callback': () => setTurnstileToken(''),
            });
        }).catch(() => setServerError('Verifica anti-bot non disponibile: controlla la connessione e ricarica la pagina.'));
        return () => {
            cancelled = true;
            if (widgetId.current !== null && window.turnstile) {
                window.turnstile.remove(widgetId.current);
                widgetId.current = null;
            }
        };
    }, [siteKey, done]);

    const resetTurnstile = () => {
        setTurnstileToken('');
        if (widgetId.current !== null && window.turnstile) window.turnstile.reset(widgetId.current);
    };

    const scrollToError = () => setTimeout(() => {
        document.querySelector('.reg-field--error, .reg-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);

    const set = (name) => (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setForm(f => ({ ...f, [name]: value }));
        setErrors(er => ({ ...er, [name]: undefined }));
        setServerError('');
    };
    const cls = (name) => `form-input reg-input${errors[name] ? ' reg-input--error' : ''}`;
    const input = (name, props = {}) => (
        <input className={cls(name)} value={form[name]} onChange={set(name)} aria-invalid={!!errors[name]} {...props} />
    );

    const validate = () => {
        const e = {};
        Object.entries(REQUIRED).forEach(([k, label]) => { if (!String(form[k]).trim()) e[k] = `${label}: campo obbligatorio`; });
        if (form.email && !EMAIL.test(form.email.trim())) e.email = 'Email non valida';
        const pwdErrors = getPasswordValidationErrors(form.password);
        if (pwdErrors.length) e.password = pwdErrors.join('. ');
        if (form.password !== form.password_conferma) e.password_conferma = 'Le password non coincidono';
        if (!form.privacy) e.privacy = 'È necessario accettare l\'informativa privacy';
        if (siteKey && !turnstileToken) e.turnstile = 'Completa la verifica anti-bot';
        return e;
    };

    const handleSubmit = async (ev) => {
        ev.preventDefault();
        const e = validate();
        setErrors(e);
        if (Object.keys(e).length) { scrollToError(); return; }
        setSaving(true);
        setServerError('');
        try {
            const res = await fetch('/users/api/public/registrazione', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
                body: JSON.stringify({
                    ...form,
                    email: form.email.trim().toLowerCase(),
                    anno_associativo_inizio: form.anno_associativo_tipo === 'personalizzato' ? form.anno_associativo_inizio : null,
                    turnstileToken,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setDone(true);
                window.scrollTo({ top: 0 });
                return;
            }
            // I dati inseriti restano nel form: si evidenzia il campo e si rigenera
            // quanto serve per un nuovo invio (token monouso / sessione scaduta).
            resetTurnstile();
            if (data.code === 'CSRF') loadSessione();
            if (data.field) {
                setErrors(er => ({ ...er, [data.field]: data.error }));
                scrollToError();
            } else if (data.code === 'TURNSTILE') {
                setErrors(er => ({ ...er, turnstile: data.error }));
                scrollToError();
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
                                <Field name="associazione" label="Associazione" required error={errors.associazione} span={2}>{input('associazione')}</Field>
                                <Field name="tipologia" label="Tipologia" required error={errors.tipologia}>
                                    <select className={cls('tipologia')} value={form.tipologia} onChange={set('tipologia')}>
                                        <option value="ASD">ASD</option>
                                        <option value="APS">APS</option>
                                    </select>
                                </Field>
                                <Field name="codice_fiscale" label="Codice fiscale" required error={errors.codice_fiscale}>{input('codice_fiscale', { style: { textTransform: 'uppercase' } })}</Field>
                                <Field name="email" label="Email" required error={errors.email}>{input('email', { type: 'email', autoComplete: 'email' })}</Field>
                                <Field name="telefono" label="Telefono associazione" required error={errors.telefono}>{input('telefono', { type: 'tel' })}</Field>
                            </div>

                            <div className="reg-section">Indirizzo</div>
                            <div className="reg-grid">
                                <Field name="indirizzo" label="Via e numero civico" required error={errors.indirizzo} span={3}>{input('indirizzo')}</Field>
                                <Field name="cap" label="CAP" required error={errors.cap}>{input('cap', { maxLength: 10, inputMode: 'numeric' })}</Field>
                                <Field name="comune" label="Comune" required error={errors.comune}>{input('comune')}</Field>
                                <Field name="provincia" label="Provincia" required error={errors.provincia}>{input('provincia', { maxLength: 30, placeholder: 'es. TV' })}</Field>
                            </div>

                            <div className="reg-section">Attività</div>
                            <div className="reg-grid">
                                <Field name="anno_associativo_tipo" label="Anno associativo" required error={errors.anno_associativo_tipo} span={form.anno_associativo_tipo === 'personalizzato' ? 2 : 3}>
                                    <select className={cls('anno_associativo_tipo')} value={form.anno_associativo_tipo} onChange={set('anno_associativo_tipo')}>
                                        {ANNI_ASSOCIATIVI.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                                    </select>
                                </Field>
                                {form.anno_associativo_tipo === 'personalizzato' && (
                                    <Field name="anno_associativo_inizio" label="Dal (giorno / mese)" error={errors.anno_associativo_inizio}>
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
                                <Field name="affiliazioni" label="Affiliazioni" error={errors.affiliazioni} span={3}>{input('affiliazioni', { placeholder: 'es. EPS: UISP, Federazioni: FIGC' })}</Field>
                            </div>

                            <div className="reg-section">Persone di riferimento</div>
                            <div className="reg-grid">
                                <Field name="presidente_nome" label="Nome del presidente" required error={errors.presidente_nome}>{input('presidente_nome')}</Field>
                                <Field name="presidente_cognome" label="Cognome del presidente" required error={errors.presidente_cognome}>{input('presidente_cognome')}</Field>
                                <div />
                                <Field name="referente_nome" label="Referente (nome e cognome)" error={errors.referente_nome}>{input('referente_nome')}</Field>
                                <Field name="referente_telefono" label="Telefono referente" error={errors.referente_telefono}>{input('referente_telefono', { type: 'tel' })}</Field>
                            </div>

                            <div className="reg-section">Accesso al gestionale</div>
                            <p className="reg-hint">Email e password saranno le credenziali dell'amministratore della licenza.</p>
                            <div className="reg-grid">
                                {[
                                    ['password', 'Password'],
                                    ['password_conferma', 'Conferma password'],
                                ].map(([name, label]) => (
                                    <Field key={name} name={name} label={label} required error={errors[name]} span={name === 'password' ? 2 : 1}>
                                        <div className="input-wrapper">
                                            <input
                                                className={`form-input form-input--password reg-input${errors[name] ? ' reg-input--error' : ''}`}
                                                aria-invalid={!!errors[name]}
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

                            {siteKey && (
                                <div className={`reg-turnstile${errors.turnstile ? ' reg-field--error' : ''}`}>
                                    <div ref={turnstileRef} />
                                    {errors.turnstile && <div className="reg-error">{errors.turnstile}</div>}
                                </div>
                            )}

                            <label className={`reg-privacy${errors.privacy ? ' reg-field--error' : ''}`}>
                                <input type="checkbox" checked={form.privacy} onChange={set('privacy')} />
                                <span>Ho letto e accetto l'informativa sul trattamento dei dati personali *</span>
                            </label>
                            {errors.privacy && <div className="reg-error">{errors.privacy}</div>}

                            {serverError && <div className="login-message login-message--error" style={{ marginTop: '12px' }}>{serverError}</div>}

                            <button className="login-button" type="submit" disabled={saving || !csrfToken} style={{ marginTop: '16px' }}>
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
