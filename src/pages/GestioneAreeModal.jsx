import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Flag } from 'lucide-react';
import { useConfirm } from '../components/ConfirmModal';
import AreaModal from './AreaModal';

const PAGE_SIZE = 10;

const GestioneAreeModal = ({ isOpen, onClose, struttura }) => {
    const [aree, setAree] = useState([]);
    const [filterDescrizione, setFilterDescrizione] = useState('');
    const [page, setPage] = useState(1);
    const confirm = useConfirm();

    const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
    const [currentArea, setCurrentArea] = useState(null);

    const fetchAree = useCallback(async () => {
        if (!struttura?.id) return;
        try {
            const params = new URLSearchParams();
            if (filterDescrizione) params.set('descrizione', filterDescrizione);
            const res = await fetch(`/activities/api/strutture/${struttura.id}/aree?${params}`);
            if (res.ok) {
                setAree(await res.json());
                setPage(1);
            }
        } catch (e) {
            console.error('Errore caricamento aree', e);
        }
    }, [struttura, filterDescrizione]);

    useEffect(() => {
        if (isOpen && struttura?.id) {
            setFilterDescrizione('');
            setPage(1);
            fetchAree();
        } else {
            setAree([]);
        }
    }, [isOpen, struttura]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!isOpen || !struttura) return null;

    // Client-side filter (search refines after fetch)
    const filtered = aree.filter(a =>
        !filterDescrizione || a.descrizione.toLowerCase().includes(filterDescrizione.toLowerCase())
    );
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const handleSaveArea = async (data) => {
        try {
            if (data.id) {
                await fetch(`/activities/api/aree/${data.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ descrizione: data.descrizione }),
                });
            } else {
                await fetch(`/activities/api/strutture/${struttura.id}/aree`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ descrizione: data.descrizione }),
                });
            }
            setIsAreaModalOpen(false);
            fetchAree();
        } catch (e) {
            console.error('Errore salvataggio area', e);
        }
    };

    const handleDeleteArea = async (id) => {
        if (!await confirm('Eliminare questa area?')) return;
        try {
            await fetch(`/activities/api/aree/${id}`, { method: 'DELETE' });
            fetchAree();
        } catch (e) {
            console.error('Errore eliminazione area', e);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 500 }}
            />

            {/* Modal */}
            <div style={{
                position: 'fixed', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 501, display: 'flex', flexDirection: 'column',
                background: 'var(--surface-color, #fff)',
                color: 'var(--text-primary, rgba(0,0,0,0.87))',
                borderRadius: '8px', overflow: 'hidden',
                boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
                minWidth: '500px', maxWidth: '680px', width: '90%',
                maxHeight: '85vh',
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '16px 20px', background: '#43a047', color: '#fff',
                    fontWeight: 600, fontSize: '1.1rem', flexShrink: 0,
                }}>
                    <Flag size={22} />
                    <span>Gestione aree</span>
                </div>

                {/* Toolbar */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color, #e0e0e0)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <label style={{ fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>Descrizione</label>
                            <input
                                className="form-input"
                                type="text"
                                placeholder="Descrizione"
                                value={filterDescrizione}
                                onChange={e => { setFilterDescrizione(e.target.value); setPage(1); }}
                            />
                        </div>
                        <button
                            className="btn-success"
                            onClick={() => { setCurrentArea(null); setIsAreaModalOpen(true); }}
                        >
                            <Plus size={15} /> Nuova area
                        </button>
                    </div>
                </div>

                {/* List */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {pageItems.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                            Nessuna area trovata
                        </div>
                    ) : (
                        pageItems.map(area => (
                            <div key={area.id} style={{
                                display: 'flex', alignItems: 'center',
                                padding: '12px 20px',
                                borderBottom: '1px solid var(--border-color, #e0e0e0)',
                            }}>
                                <span style={{ flex: 1, fontSize: '0.925rem' }}>{area.descrizione}</span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        className="btn-icon btn-icon-warning"
                                        title="Modifica"
                                        onClick={() => { setCurrentArea(area); setIsAreaModalOpen(true); }}
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        className="btn-icon btn-icon-danger"
                                        title="Elimina"
                                        onClick={() => handleDeleteArea(area.id)}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Pagination */}
                <div style={{
                    padding: '12px 20px',
                    borderTop: '1px solid var(--border-color, #e0e0e0)',
                    display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0,
                }}>
                    {[
                        { label: '<<', action: () => setPage(1), disabled: safePage === 1 },
                        { label: '<',  action: () => setPage(p => Math.max(1, p - 1)), disabled: safePage === 1 },
                    ].map(btn => (
                        <button key={btn.label} onClick={btn.action} disabled={btn.disabled} style={paginBtn(btn.disabled)}>
                            {btn.label}
                        </button>
                    ))}
                    <span style={{ padding: '4px 10px', background: 'var(--primary-color, #1976d2)', color: '#fff', borderRadius: '4px', fontSize: '0.875rem', fontWeight: 600 }}>
                        {safePage}
                    </span>
                    {[
                        { label: '>',  action: () => setPage(p => Math.min(totalPages, p + 1)), disabled: safePage === totalPages },
                        { label: '>>', action: () => setPage(totalPages), disabled: safePage === totalPages },
                    ].map(btn => (
                        <button key={btn.label} onClick={btn.action} disabled={btn.disabled} style={paginBtn(btn.disabled)}>
                            {btn.label}
                        </button>
                    ))}
                    <span style={{ marginLeft: '12px', fontSize: '0.875rem', color: 'var(--primary-color, #1976d2)', fontWeight: 500 }}>
                        Tot righe: {filtered.length}
                    </span>
                </div>

                {/* Footer */}
                <div style={{
                    background: '#f5f5f5', padding: '14px 20px',
                    display: 'flex', justifyContent: 'flex-end',
                    borderTop: '1px solid var(--border-color, #e0e0e0)', flexShrink: 0,
                }}>
                    <button className="btn-danger" onClick={onClose}>Chiudi</button>
                </div>
            </div>

            <AreaModal
                isOpen={isAreaModalOpen}
                onClose={() => setIsAreaModalOpen(false)}
                onSave={handleSaveArea}
                area={currentArea}
            />
        </>
    );
};

const paginBtn = (disabled) => ({
    padding: '4px 8px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    background: disabled ? '#f5f5f5' : '#fff',
    color: disabled ? '#bbb' : 'var(--text-primary)',
    cursor: disabled ? 'default' : 'pointer',
    fontSize: '0.875rem',
});

export default GestioneAreeModal;
