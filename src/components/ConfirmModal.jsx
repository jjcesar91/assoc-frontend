import React, { createContext, useContext, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmContext = createContext(null);

export const ConfirmProvider = ({ children }) => {
    const [state, setState] = useState({ open: false, message: '', title: '', confirmLabel: 'Elimina', confirmColor: 'var(--danger)' });
    const resolveRef = useRef(null);

    const confirm = (message, title = 'Conferma', { confirmLabel = 'Elimina', confirmColor = 'var(--danger)' } = {}) =>
        new Promise((resolve) => {
            resolveRef.current = resolve;
            setState({ open: true, message, title, confirmLabel, confirmColor });
        });

    const handleAnswer = (answer) => {
        setState(s => ({ ...s, open: false }));
        resolveRef.current?.(answer);
    };

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            {state.open && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(16,24,40,0.45)', backdropFilter: 'blur(2px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 'var(--z-overlay)', padding: 16,
                }}>
                    <div style={{
                        background: 'var(--surface)', color: 'var(--text-primary)', borderRadius: 'var(--radius-lg)',
                        width: 420, maxWidth: '92vw',
                        boxShadow: 'var(--shadow-modal)',
                        overflow: 'hidden',
                    }}>
                        {/* Header */}
                        <div style={{
                            background: state.confirmColor, color: '#fff',
                            padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10,
                        }}>
                            <AlertTriangle size={20} />
                            <span style={{ fontWeight: 600, fontSize: '1rem', flex: 1 }}>{state.title}</span>
                            <button
                                onClick={() => handleAnswer(false)}
                                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 2, display: 'flex' }}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        {/* Body */}
                        <div style={{ padding: '20px 24px', fontSize: '0.9375rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                            {state.message}
                        </div>
                        {/* Footer */}
                        <div style={{
                            padding: '12px 24px', display: 'flex', justifyContent: 'flex-end',
                            gap: 10, borderTop: '1px solid var(--border-color)', background: 'var(--surface-1)',
                        }}>
                            <button
                                onClick={() => handleAnswer(false)}
                                className="btn-secondary btn-sm"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={() => handleAnswer(true)}
                                style={{
                                    padding: '8px 20px', borderRadius: 'var(--radius-sm)', border: 'none',
                                    background: state.confirmColor, color: '#fff', cursor: 'pointer',
                                    fontWeight: 600, fontSize: '0.9rem',
                                }}
                            >
                                {state.confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
};

export const useConfirm = () => {
    const ctx = useContext(ConfirmContext);
    if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
    return ctx;
};
