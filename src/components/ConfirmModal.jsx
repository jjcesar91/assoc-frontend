import React, { createContext, useContext, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmContext = createContext(null);

export const ConfirmProvider = ({ children }) => {
    const [state, setState] = useState({ open: false, message: '', title: '' });
    const resolveRef = useRef(null);

    const confirm = (message, title = 'Conferma') =>
        new Promise((resolve) => {
            resolveRef.current = resolve;
            setState({ open: true, message, title });
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
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 9999,
                }}>
                    <div style={{
                        background: '#fff', color: '#1f2937', borderRadius: 10,
                        width: 400, maxWidth: '92vw',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
                        overflow: 'hidden',
                    }}>
                        {/* Header */}
                        <div style={{
                            background: '#f44336', color: '#fff',
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
                        <div style={{ padding: '20px 24px', fontSize: '0.95rem', lineHeight: 1.5 }}>
                            {state.message}
                        </div>
                        {/* Footer */}
                        <div style={{
                            padding: '12px 24px', display: 'flex', justifyContent: 'flex-end',
                            gap: 10, borderTop: '1px solid #f0f0f0',
                        }}>
                            <button
                                onClick={() => handleAnswer(false)}
                                style={{
                                    padding: '8px 20px', borderRadius: 6, border: '1px solid #d1d5db',
                                    background: '#f9fafb', color: '#374151', cursor: 'pointer',
                                    fontWeight: 500, fontSize: '0.9rem',
                                }}
                            >
                                Annulla
                            </button>
                            <button
                                onClick={() => handleAnswer(true)}
                                style={{
                                    padding: '8px 20px', borderRadius: 6, border: 'none',
                                    background: '#f44336', color: '#fff', cursor: 'pointer',
                                    fontWeight: 600, fontSize: '0.9rem',
                                }}
                            >
                                Elimina
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
