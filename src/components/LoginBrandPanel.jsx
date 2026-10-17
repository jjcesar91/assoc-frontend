import React from 'react';
import { DEFAULT_TITLE, DEFAULT_SUBTITLE, assetUrl, sanitizeHtml } from '../data/branding';

const DefaultIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
);

const DEFAULT_FEATURES = ['Gestione soci e iscrizioni', 'Pagamenti e ricevute', 'Modulistica e comunicazioni'];

// Pannello di branding delle pagine pubbliche (login, imposta password) secondo
// la configurazione dell'ambiente. showDescription=false nasconde descrizione/elenco.
const LoginBrandPanel = ({ branding, icon, showDescription = true, style }) => {
    const logo = assetUrl(branding?.logo_path);
    const descrizione = sanitizeHtml(branding?.descrizione_html);

    return (
        <div className="login-brand" style={style}>
            <div className="login-brand-inner">
                {logo ? (
                    <img src={logo} alt="" className="login-brand-logo" />
                ) : (
                    <div className="login-brand-icon">{icon || <DefaultIcon />}</div>
                )}
                <h1 className="login-brand-title">{branding?.titolo || DEFAULT_TITLE}</h1>
                <p className="login-brand-subtitle">{branding?.sottotitolo || DEFAULT_SUBTITLE}</p>
                {showDescription && (descrizione ? (
                    <div className="login-brand-description" dangerouslySetInnerHTML={{ __html: descrizione }} />
                ) : (
                    <div className="login-brand-features">
                        {DEFAULT_FEATURES.map(f => <div key={f} className="login-brand-feature">{f}</div>)}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LoginBrandPanel;
