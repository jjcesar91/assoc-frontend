import React, { useState, useEffect, useRef } from 'react';
import { Plus, ChevronDown, FilePlus2, Link2, Check } from 'lucide-react';

// Link della pagina pubblica di registrazione dell'ambiente corrente (dev / prod / prod2)
const linkRegistrazione = () => `${window.location.origin}/registrazione`;

// Pulsante "Nuova licenza" con menu: creazione manuale (wizard) oppure copia del
// link di registrazione da inviare a chi deve registrarsi da solo.
const NuovaLicenzaMenu = ({ onCrea, style }) => {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', esc);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', esc);
        };
    }, [open]);

    const copia = async () => {
        const link = linkRegistrazione();
        try {
            await navigator.clipboard.writeText(link);
        } catch {
            // Clipboard non disponibile: copia manuale
            window.prompt?.('Copia il link di registrazione:', link);
        }
        setCopied(true);
        setTimeout(() => { setCopied(false); setOpen(false); }, 1500);
    };

    const itemStyle = {
        display: 'flex', alignItems: 'flex-start', gap: '10px', width: '100%',
        padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer',
        textAlign: 'left', fontSize: '0.9rem', color: 'var(--text-primary)',
    };

    return (
        <div ref={ref} style={{ position: 'relative', ...style }}>
            <button
                className="btn-contained"
                style={{ backgroundColor: 'var(--success-color)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={() => setOpen(o => !o)}
                aria-haspopup="menu"
                aria-expanded={open}
            >
                <Plus size={18} /> Nuova licenza <ChevronDown size={16} />
            </button>
            {open && (
                <div
                    role="menu"
                    style={{
                        position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 20, minWidth: '300px',
                        backgroundColor: 'var(--surface)', border: '1px solid var(--border-color)',
                        borderRadius: '8px', boxShadow: 'var(--shadow-3, 0 8px 24px rgba(0,0,0,0.12))', overflow: 'hidden',
                    }}
                >
                    <button role="menuitem" style={itemStyle} onClick={() => { setOpen(false); onCrea(); }}
                        onMouseOver={e => { e.currentTarget.style.backgroundColor = 'var(--surface-2)'; }}
                        onMouseOut={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                        <FilePlus2 size={18} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '1px' }} />
                        <span>
                            <strong>Crea licenza</strong>
                            <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Inserisci tu i dati ricevuti dal cliente</span>
                        </span>
                    </button>
                    <button role="menuitem" style={{ ...itemStyle, borderTop: '1px solid var(--border-color)' }} onClick={copia}
                        onMouseOver={e => { e.currentTarget.style.backgroundColor = 'var(--surface-2)'; }}
                        onMouseOut={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                        {copied
                            ? <Check size={18} style={{ color: 'var(--success)', flexShrink: 0, marginTop: '1px' }} />
                            : <Link2 size={18} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '1px' }} />}
                        <span>
                            <strong>{copied ? 'Link copiato' : 'Copia link di registrazione'}</strong>
                            <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                {linkRegistrazione()} — da inviare a chi si registra da solo
                            </span>
                        </span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default NuovaLicenzaMenu;
