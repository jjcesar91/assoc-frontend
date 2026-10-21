import React from 'react';
import { X } from 'lucide-react';
import { listinoDi, etichettaFormula, formatEuro } from '../utils/listino';

// Scelta della formula del listino quando si aggiunge un abbonamento al carrello
const SceltaFormulaModal = ({ product, onSelect, onClose }) => {
    if (!product) return null;
    const listino = listinoDi(product);
    return (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
            <div className="modal-card" style={{ width: '440px', maxWidth: '92%', padding: 0 }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border-color)' }}>
                    <div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Scegli la formula</div>
                        <div style={{ fontWeight: 600 }}>{product.description}</div>
                    </div>
                    <button type="button" onClick={onClose} title="Chiudi" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}>
                        <X size={20} />
                    </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px 20px 20px' }}>
                    {listino.map(f => (
                        <button
                            key={f.id || 'unica'}
                            type="button"
                            className="btn-outlined"
                            data-testid="formula"
                            onClick={() => onSelect(f)}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '10px 14px', textAlign: 'left' }}
                        >
                            <span>{etichettaFormula(f)}</span>
                            <strong>{formatEuro(f.prezzo)}</strong>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SceltaFormulaModal;
