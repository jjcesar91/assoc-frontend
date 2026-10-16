import React, { useState, useRef } from 'react';
import { Copy, Check } from 'lucide-react';
import { formatDateTimeIT } from '../utils/dateUtils';

// Link di impostazione password: il token va nel frammento (#t=...) così non
// viene mai inviato al server né nell'header Referer. L'origine è quella
// dell'ambiente corrente (dev / prod / prod2).
const buildResetLink = (token) => `${window.location.origin}/reset-password#t=${encodeURIComponent(token)}`;

// Box con il link copiabile e la scadenza.
const ResetLinkBox = ({ token, expiresAt, email }) => {
    const [copied, setCopied] = useState(false);
    const inputRef = useRef(null);
    const link = buildResetLink(token);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(link);
        } catch {
            // Fallback (contesti non sicuri / permessi negati): seleziona il testo
            inputRef.current?.select();
            document.execCommand?.('copy');
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px 16px', backgroundColor: 'var(--surface-1)' }}>
            <div style={{ fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Link per impostare la password{email ? <> di <strong>{email}</strong></> : null}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
                <input
                    ref={inputRef}
                    className="md-input"
                    readOnly
                    value={link}
                    onFocus={e => e.target.select()}
                    style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.8rem' }}
                />
                <button
                    type="button"
                    className="btn-contained"
                    onClick={handleCopy}
                    style={{ backgroundColor: copied ? 'var(--success)' : 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                >
                    {copied ? <><Check size={16} /> Copiato</> : <><Copy size={16} /> Copia</>}
                </button>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Monouso, valido fino al {expiresAt ? formatDateTimeIT(expiresAt) : '–'}. Generando un nuovo link questo smette di funzionare.
                Non viene salvato: copialo ora.
            </div>
        </div>
    );
};

export default ResetLinkBox;
