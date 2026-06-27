import React, { createContext, useContext, useState } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';

const AlertContext = createContext(null);

const COLORS = {
    error:   'var(--danger)',
    warning: 'var(--warning)',
    info:    'var(--info)',
    success: 'var(--success)',
};

export const AlertProvider = ({ children }) => {
    const [state, setState] = useState({ open: false, message: '', title: '', type: 'error' });

    const showAlert = (message, title, type = 'error') => {
        setState({
            open: true,
            message,
            title: title || (type === 'warning' ? 'Attenzione' : 'Errore'),
            type,
        });
    };

    const handleClose = () => setState(s => ({ ...s, open: false }));

    const color = COLORS[state.type] || COLORS.error;
    const Icon = state.type === 'info' || state.type === 'success' ? Info : AlertTriangle;

    return (
        <AlertContext.Provider value={showAlert}>
            {children}
            {state.open && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(16,24,40,0.45)', backdropFilter: 'blur(2px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 'var(--z-toast)', padding: 16,
                }}>
                    <div style={{
                        background: 'var(--surface)', color: 'var(--text-primary)', borderRadius: 'var(--radius-lg)',
                        width: 420, maxWidth: '92vw',
                        boxShadow: 'var(--shadow-modal)',
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            background: color, color: '#fff',
                            padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10,
                        }}>
                            <Icon size={20} />
                            <span style={{ fontWeight: 600, fontSize: '1rem', flex: 1 }}>{state.title}</span>
                            <button
                                onClick={handleClose}
                                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 2, display: 'flex' }}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ padding: '20px 24px', fontSize: '0.9375rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                            {state.message}
                        </div>
                        <div style={{
                            padding: '12px 24px', display: 'flex', justifyContent: 'flex-end',
                            borderTop: '1px solid var(--border-color)', background: 'var(--surface-1)',
                        }}>
                            <button
                                onClick={handleClose}
                                style={{
                                    padding: '8px 28px', borderRadius: 6, border: 'none',
                                    background: color, color: '#fff', cursor: 'pointer',
                                    fontWeight: 600, fontSize: '0.9rem',
                                }}
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AlertContext.Provider>
    );
};

export const useAlert = () => {
    const ctx = useContext(AlertContext);
    if (!ctx) throw new Error('useAlert must be used within AlertProvider');
    return ctx;
};
