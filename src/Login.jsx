import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, LogIn, Building2, UserRound, ArrowLeft } from 'lucide-react';
import './Login.css';

function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  // Quando la stessa email apre sia il gestionale sia l'Area Soci, chiediamo in
  // quale mondo entrare prima di emettere il token.
  const [roleChoice, setRoleChoice] = useState(false);

  const submitLogin = async (accessType) => {
    setMessage('');
    setLoading(true);
    try {
      const response = await fetch('/auth/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, ...(accessType && { accessType }) }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.requiresRoleChoice) {
          setRoleChoice(true);
          return;
        }
        onLoginSuccess(data.accessToken, data.refreshToken);
      } else {
        setMessage(data.message || data.error || 'Credenziali non valide');
      }
    } catch (error) {
      console.error('Login error:', error);
      setMessage('Errore di rete o server non raggiungibile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    submitLogin();
  };

  return (
    <div className="login-page">
      {/* Pannello branding */}
      <div className="login-brand">
        <div className="login-brand-inner">
          <div className="login-brand-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <h1 className="login-brand-title">Gestionale</h1>
          <p className="login-brand-subtitle">Portale di gestione associazioni</p>
          <div className="login-brand-features">
            <div className="login-brand-feature">Gestione soci e iscrizioni</div>
            <div className="login-brand-feature">Pagamenti e ricevute</div>
            <div className="login-brand-feature">Modulistica e comunicazioni</div>
          </div>
        </div>
      </div>

      {/* Pannello form */}
      <div className="login-form-panel">
        <div className="login-card">
          <div className="login-card-header">
            <h2 className="login-card-title">{roleChoice ? 'Come vuoi accedere?' : 'Accedi al portale'}</h2>
            <p className="login-card-subtitle">
              {roleChoice
                ? 'Questo account può accedere sia al gestionale sia all\'Area Soci.'
                : 'Inserisci le tue credenziali per continuare'}
            </p>
          </div>

          {roleChoice ? (
            <div className="login-form">
              <button
                type="button"
                className="login-button"
                disabled={loading}
                onClick={() => submitLogin('gestionale')}
              >
                <Building2 size={18} />
                Accedi al Gestionale
              </button>
              <button
                type="button"
                className="login-button login-button--secondary"
                disabled={loading}
                onClick={() => submitLogin('socio')}
              >
                <UserRound size={18} />
                Accedi all'Area Soci
              </button>
              {message && (
                <div className="login-message login-message--error">
                  {message}
                </div>
              )}
              <button
                type="button"
                className="login-back-btn"
                disabled={loading}
                onClick={() => { setRoleChoice(false); setMessage(''); }}
              >
                <ArrowLeft size={15} />
                Torna indietro
              </button>
            </div>
          ) : (
          <form className="login-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <div className="input-wrapper">
                <Mail size={16} className="input-icon" />
                <input
                  className="form-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@esempio.it"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  className="form-input form-input--password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Inserisci la password"
                  required
                  autoComplete="current-password"
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

            {message && (
              <div className="login-message login-message--error">
                {message}
              </div>
            )}

            <button className="login-button" type="submit" disabled={loading}>
              {loading ? (
                <span className="login-spinner" />
              ) : (
                <LogIn size={18} />
              )}
              {loading ? 'Accesso in corso…' : 'Accedi'}
            </button>
          </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
