import React from 'react';
import { X, Star } from 'lucide-react';
import { MENU_STRUCTURE, getVisibleMenu } from './menuConfig';

export { MENU_STRUCTURE };

const FavoritesModal = ({ isOpen, onClose, favorites, onToggleFavorite }) => {
    if (!isOpen) return null;

    return (
        <>
            <div
                style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 200,
                }}
                onClick={onClose}
            />
            <div style={{
                position: 'fixed', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'var(--surface-color, #fff)',
                color: 'var(--text-primary, rgba(0,0,0,0.87))',
                borderRadius: '8px', padding: '24px',
                minWidth: '340px', maxWidth: '480px', width: '90%',
                maxHeight: '80vh', overflowY: 'auto',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)', zIndex: 201,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary, rgba(0,0,0,0.87))' }}>Preferiti</h2>
                    <button
                        onClick={onClose}
                        style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '4px', color: 'var(--text-secondary, rgba(0,0,0,0.54))' }}
                    >
                        <X size={20} />
                    </button>
                </div>
                <div>
                    {getVisibleMenu().map(item => (
                        <div key={item.id}>
                            {/* Riga voce principale */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '8px 4px', borderBottom: '1px solid #f0f0f0',
                            }}>
                                <item.Icon size={18} style={{ color: 'var(--primary-color, #1976d2)', flexShrink: 0 }} />
                                <span style={{ fontWeight: 500, fontSize: '0.95rem', flex: 1, color: 'var(--text-primary, rgba(0,0,0,0.87))' }}>{item.label}</span>
                                {/* Stella solo per voci senza sottomenu */}
                                {!item.children && (
                                    <button
                                        onClick={() => onToggleFavorite(item.id, item.label, item.path, item.id)}
                                        title={favorites[item.id] ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
                                        style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '4px' }}
                                    >
                                        <Star
                                            size={18}
                                            fill={favorites[item.id] ? '#f59e0b' : 'none'}
                                            stroke={favorites[item.id] ? '#f59e0b' : '#9ca3af'}
                                        />
                                    </button>
                                )}
                            </div>
                            {/* Sottovoci */}
                            {item.children && item.children.map(child => (
                                <div key={child.id} style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '6px 4px 6px 32px',
                                    borderBottom: '1px solid #f9f9f9',
                                }}>
                                    <span style={{ flex: 1, fontSize: '0.9rem', color: 'var(--text-secondary, rgba(0,0,0,0.54))' }}>{child.label}</span>
                                    <button
                                        onClick={() => onToggleFavorite(child.id, child.label, child.path, item.id)}
                                        title={favorites[child.id] ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
                                        style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '4px' }}
                                    >
                                        <Star
                                            size={18}
                                            fill={favorites[child.id] ? '#f59e0b' : 'none'}
                                            stroke={favorites[child.id] ? '#f59e0b' : '#9ca3af'}
                                        />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
};

export default FavoritesModal;
