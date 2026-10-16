import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, Check, LogIn } from 'lucide-react';
import { getPasswordValidationErrors } from '../utils/passwordValidation';
import '../Login.css';

// Il token arriva nel frammento dell'URL (/reset-password#t=...): il frammento non
// viene mai inviato al server, quindi non compare nei log né nel Referer.
const readTokenFromHash = () => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    return params.get('t') || '';
};

// Pagina pubblica: impostazione/reimpostazione password tramite link monouso.
const ResetPassword = () => {
    const [token] = useState(readTokenFromHash);
    const [status, setStatus] = useState(token ? 'checking' : 'invalid'); // checking | ready | invalid | done
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        // Toglie il token dalla barra degli indirizzi e dalla cronologia
        if (window.location.hash) {
            window.history.replaceState(null, '', window.location.pathname);
        }
        // Nessun Referer verso eventuali risorse esterne della pagina
        const meta = document.createElement('meta');
        meta.name = 'referrer';
        meta.content = 'no-referrer';
        document.head.appendChild(meta);
        return () => { document.head.removeChild(meta); };
    }, []);

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        fetch('/auth/api/password-reset/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
        })
            .then(async r => {
                if (cancelled) return;
                if (r.ok) {
                    const data = await r.json();
                    setEmail(data.email || '');
                    setStatus('ready');
                } else {
                    setStatus('invalid');
                }
            })
            .catch(() => { if (!cancelled) setStatus('invalid'); });
        return () => { cancelled = true; };
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errors = getPasswordValidationErrors(password);
        if (errors.length > 0) { setError(errors.join('. ')); return; }
        if (password !== confirm) { setError('Le password non coincidono'); return; }
        setError('');
        setSaving(true);
        try {
            const res = await fetch('/auth/api/password-reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setStatus('done');
            } else {
                setError(data.error || 'Impossibile impostare la password');
            }
        } catch {
            setError('Errore di rete, riprova');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-brand">
                <div className="login-brand-inner">
                    <div className="login-brand-icon"><Lock size={48} strokeWidth={1.5} /></div>
                    <h1 className="login-brand-title">Gestionale</h1>
                    <p className="login-brand-subtitle">Portale di gestione associazioni</p>
                </div>
            </div>

            <div className="login-form-panel">
                <div className="login-card">
                    <div className="login-card-header">
                        <h2 className="login-card-title">
                            {status === 'done' ? 'Password impostata' : 'Imposta la tua password'}
                        </h2>
                        <p className="login-card-subtitle">
                            {status === 'checking' && 'Verifica del link in corso…'}
                            {status === 'ready' && <>Account: <strong>{email}</strong></>}
                            {status === 'invalid' && 'Questo link non è valido, è già stato usato oppure è scaduto. Chiedi un nuovo link a chi te l\'ha inviato.'}
                            {status === 'done' && 'Ora puoi accedere al portale con la tua email e la nuova password.'}
                        </p>
                    </div>

                    {status === 'ready' && (
                        <form className="login-form" onSubmit={handleSubmit}>
                            {/* Campo email nascosto: aiuta i password manager ad associare la password all'account */}
                            <input type="email" value={email} autoComplete="username" readOnly hidden />
                            {[
                                { label: 'Nuova password', value: password, set: setPassword },
                                { label: 'Conferma password', value: confirm, set: setConfirm },
                            ].map(({ label, value, set }) => (
                                <div className="form-group" key={label}>
                                    <label className="form-label">{label}</label>
                                    <div className="input-wrapper">
                                        <Lock size={16} className="input-icon" />
                                        <input
                                            className="form-input form-input--password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={value}
                                            onChange={e => { set(e.target.value); setError(''); }}
                                            autoComplete="new-password"
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="password-toggle"
                                            onClick={() => setShowPassword(v => !v)}
                                            tabIndex={-1}
                                            aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                            ))}

                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                                Almeno 14 caratteri, con una maiuscola, una minuscola, un numero e un carattere speciale.
                            </p>

                            {error && <div className="login-message login-message--error">{error}</div>}

                            <button className="login-button" type="submit" disabled={saving}>
                                {saving ? <span className="login-spinner" /> : <Check size={18} />}
                                {saving ? 'Salvataggio…' : 'Imposta password'}
                            </button>
                        </form>
                    )}

                    {(status === 'done' || status === 'invalid') && (
                        <div className="login-form">
                            <button className="login-button" type="button" onClick={() => window.location.replace('/login')}>
                                <LogIn size={18} /> Vai al login
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
