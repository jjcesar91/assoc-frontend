import React, { useState, useEffect } from 'react';
import { X, LayoutGrid } from 'lucide-react';
import { MENU_STRUCTURE } from '../components/menuConfig';
import { useAlert } from '../components/AlertModal';
import './SocioModal.css';
import './Soci.css';

const PAGE_SIZE = 15;

// Voci di menu esposte come funzionalità gestibili
// "amministrazione" viene inclusa ma viene nascosta agli utenti non-admin a lato Sidebar
const FEATURES = MENU_STRUCTURE.map(item => ({
    id: item.id,
    label: item.label.toUpperCase(),
}));

const FunzionalitaModal = ({ isOpen, onClose, utente }) => {
    const showAlert = useAlert();
    const [features, setFeatures] = useState(null); // null = tutte abilitate
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [filter, setFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        if (!isOpen || !utente) return;
        setFilter('');
        setCurrentPage(1);
        setLoading(true);
        const token = localStorage.getItem('token');
        fetch(`/auth/api/admin/users/${utente.id}/features`, {
            headers: { 'Authorization': `Bearer ${token}` },
        })
            .then(r => r.json())
            .then(data => {
                // null → tutte abilitate (array di tutti gli id)
                if (data.features === null || data.features === undefined) {
                    setFeatures(FEATURES.map(f => f.id));
                } else {
                    setFeatures(data.features);
                }
            })
            .catch(err => console.error('Errore caricamento funzionalità', err))
            .finally(() => setLoading(false));
    }, [isOpen, utente]);

    const handleToggle = (id) => {
        setFeatures(prev => {
            if (prev.includes(id)) return prev.filter(f => f !== id);
            return [...prev, id];
        });
    };

    const handleSave = async () => {
        setSaving(true);
        const token = localStorage.getItem('token');
        try {
            // Se tutte le voci sono abilitate salviamo null (nessuna restrizione)
            const allEnabled = FEATURES.every(f => features.includes(f.id));
            const payload = allEnabled ? null : features;
            await fetch(`/auth/api/admin/users/${utente.id}/features`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ features: payload }),
            });
            onClose();
        } catch (err) {
            console.error('Errore salvataggio funzionalità', err);
            showAlert('Errore di rete', 'Errore');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const isAdminLike = utente?.role === 'admin' || utente?.role === 'superuser';
    const filtered = FEATURES.filter(f => {
        if (f.id === 'amministrazione' && !isAdminLike) return false;
        return !filter || f.label.toLowerCase().includes(filter.toLowerCase());
    });
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const username = utente?.username || '';

    return (
        <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: '72px' }}>
            <div
                className="modal-card socio-modal"
                style={{ maxWidth: '640px', width: '95%', maxHeight: 'calc(100vh - 88px)', display: 'flex', flexDirection: 'column' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 24px',
                    borderBottom: '1px solid #e5e7eb',
                    backgroundColor: '#fff',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <LayoutGrid size={20} style={{ color: '#10b981' }} />
                        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#111827' }}>
                            Funzionalità utente – {username}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px', display: 'flex', alignItems: 'center', borderRadius: '4px' }}
                        onMouseOver={e => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                        onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px', backgroundColor: '#fff' }}>
                    {/* Filtro descrizione */}
                    <div style={{ marginBottom: '16px' }}>
                        <label className="field-label">Descrizione</label>
                        <input
                            className="md-input"
                            placeholder="Descrizione"
                            value={filter}
                            onChange={e => { setFilter(e.target.value); setCurrentPage(1); }}
                            style={{ width: '220px' }}
                        />
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                            Caricamento...
                        </div>
                    ) : (
                        <>
                            {/* Lista funzionalità */}
                            <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                                {paginated.map((feat, idx) => (
                                    <div
                                        key={feat.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '14px 20px',
                                            backgroundColor: idx % 2 === 1 ? '#f5f5f5' : '#fff',
                                            borderBottom: idx < paginated.length - 1 ? '1px solid var(--border-color)' : 'none',
                                        }}
                                    >
                                        <span style={{ fontWeight: 500, fontSize: '0.95rem', letterSpacing: '0.02em' }}>
                                            {feat.label}
                                        </span>
                                        <ToggleSwitch
                                            checked={features ? features.includes(feat.id) : true}
                                            onChange={() => handleToggle(feat.id)}
                                        />
                                    </div>
                                ))}
                                {paginated.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                                        Nessun risultato
                                    </div>
                                )}
                            </div>

                            {/* Paginazione */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '12px' }}>
                                <button className="pagination-btn" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>&lt;&lt;</button>
                                <button className="pagination-btn" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>&lt;</button>
                                <span className="pagination-current">{currentPage}</span>
                                <button className="pagination-btn" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>&gt;</button>
                                <button className="pagination-btn" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>&gt;&gt;</button>
                                <span style={{ marginLeft: '12px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                    Tot righe: <strong>{filtered.length}</strong>
                                </span>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="modal-footer-custom">
                    <button
                        className="btn-save-full"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? 'Salvataggio...' : '✓ Salva funzionalità'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ToggleSwitch = ({ checked, onChange }) => (
    <div
        onClick={onChange}
        style={{
            width: '44px', height: '24px', borderRadius: '12px',
            backgroundColor: checked ? '#4caf50' : '#e57373',
            position: 'relative', cursor: 'pointer', transition: 'background-color 0.2s',
            display: 'inline-block', flexShrink: 0,
        }}
    >
        <div style={{
            width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#fff',
            position: 'absolute', top: '3px',
            left: checked ? '23px' : '3px',
            transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
    </div>
);

export default FunzionalitaModal;
