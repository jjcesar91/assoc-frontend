import React, { createContext, useContext, useState } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';

const AlertContext = createContext(null);

const COLORS = {
    error:   '#f44336',
    warning: '#ff9800',
    info:    '#2196f3',
    success: '#4caf50',
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
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 10000,
                }}>
                    <div style={{
                        background: '#fff', color: '#1f2937', borderRadius: 10,
                        width: 420, maxWidth: '92vw',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
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
                        <div style={{ padding: '20px 24px', fontSize: '0.95rem', lineHeight: 1.5 }}>
                            {state.message}
                        </div>
                        <div style={{
                            padding: '12px 24px', display: 'flex', justifyContent: 'flex-end',
                            borderTop: '1px solid #f0f0f0',
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
