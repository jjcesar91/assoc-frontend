import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Key, Trash2, X, UserCheck, LayoutGrid } from 'lucide-react';
import { useSocieta } from '../data/SocietaContext';
import { useConfirm } from '../components/ConfirmModal';
import { useAlert } from '../components/AlertModal';
import UtenteModal from './UtenteModal';
import FunzionalitaModal from './FunzionalitaModal';
import './SocioModal.css';
import './Soci.css';
import { getPasswordValidationErrors } from '../utils/passwordValidation';

const PAGE_SIZE = 15;

const ROLE_LABEL = {
    superuser: 'Superuser',
    admin:     'Amministratore',
    user:      'Utente',
    socio:     'Socio',
};

const formatDateTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.toLocaleDateString('it-IT')} - ${d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
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

const Utenti = () => {
    const { selectedSocietaId, societaList } = useSocieta();
    const confirm = useConfirm();
    const showAlert = useAlert();

    const [utenti, setUtenti] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [selectedUtente, setSelectedUtente] = useState(null);
    const [showResetPwdModal, setShowResetPwdModal] = useState(false);
    const [resetTarget, setResetTarget] = useState(null);
    const [newPwd, setNewPwd] = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    const [pwdError, setPwdError] = useState({});

    const [showFunzionalitaModal, setShowFunzionalitaModal] = useState(false);
    const [funzionalitaTarget, setFunzionalitaTarget] = useState(null);

    const [filters, setFilters] = useState({ username: '', cognome: '', nome: '', email: '' });
    const [currentPage, setCurrentPage] = useState(1);

    const societaNome = (() => {
        const s = societaList?.find(s => s.id == selectedSocietaId);
        return s ? (s.ragione_sociale || s.nome || '') : '';
    })();

    const fetchUtenti = useCallback(async () => {
        if (!selectedSocietaId) { setUtenti([]); setLoading(false); return; }
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/auth/api/admin/users?societaId=${selectedSocietaId}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (res.ok) setUtenti(await res.json());
        } catch (e) {
            console.error('Errore caricamento utenti', e);
        } finally {
            setLoading(false);
        }
    }, [selectedSocietaId]);

    useEffect(() => { fetchUtenti(); }, [fetchUtenti]);

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setCurrentPage(1);
    };

    const filtered = utenti.filter(u => {
        if (u.role === 'superuser') return false;
        if (filters.username && !(u.username || '').toLowerCase().includes(filters.username.toLowerCase())) return false;
        if (filters.cognome  && !(u.cognome  || '').toLowerCase().includes(filters.cognome.toLowerCase()))  return false;
        if (filters.nome     && !(u.nome     || '').toLowerCase().includes(filters.nome.toLowerCase()))     return false;
        if (filters.email    && !(u.email    || '').toLowerCase().includes(filters.email.toLowerCase()))    return false;
        return true;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const handleSave = async (payload) => {
        const isEdit = !!payload.id;
        const token = localStorage.getItem('token');
        const url = isEdit ? `/auth/api/admin/users/${payload.id}` : '/auth/api/admin/users';
        const method = isEdit ? 'PUT' : 'POST';
        // Associa la società selezionata (obbligatorio per tutti tranne superuser)
        if (payload.role !== 'superuser') {
            if (!selectedSocietaId) {
                showAlert('Seleziona una società prima di creare l\'utente.', 'Società mancante', 'warning');
                return;
            }
            payload.societaId = selectedSocietaId;
        } else {
            payload.societaId = null;
        }
        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                setShowModal(false);
                fetchUtenti();
            } else {
                const err = await res.json();
                showAlert(err.error || err.message, 'Errore');
            }
        } catch (e) {
            console.error(e);
            showAlert('Errore di rete', 'Errore');
        }
    };

    const handleToggleAttivo = async (utente) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/auth/api/admin/users/${utente.id}/toggle-attivo`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (res.ok) {
                const updated = await res.json();
                setUtenti(prev => prev.map(u => u.id === updated.id ? updated : u));
            }
        } catch (e) {
            console.error('Errore toggle attivo', e);
        }
    };

    const handleDelete = async (utente) => {
        const ok = await confirm(`Sei sicuro di voler eliminare l'utente "${utente.username}"?`, 'Elimina utente');
        if (!ok) return;
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/auth/api/admin/users/${utente.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (res.ok) fetchUtenti();
        } catch (e) {
            console.error('Errore eliminazione utente', e);
        }
    };

    const handleImpersonate = async (utente) => {
        const ok = await confirm(`Vuoi accedere come "${utente.username}"? La tua sessione admin verrà salvata.`, 'Impersona utente', { confirmLabel: 'Impersona', confirmColor: '#1976d2' });
        if (!ok) return;
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/auth/api/admin/users/${utente.id}/impersonate`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                // Salva i permessi admin prima di sovrascriverli
                localStorage.setItem('impersonate_admin_token', token);
                localStorage.setItem('impersonate_admin_refresh_token', localStorage.getItem('refresh_token') || '');
                localStorage.setItem('impersonate_admin_role', localStorage.getItem('user_role') || 'admin');
                localStorage.setItem('impersonate_admin_features', localStorage.getItem('user_features') || 'null');
                localStorage.setItem('token', data.accessToken);
                localStorage.removeItem('refresh_token');
                // Carica le features dell'utente impersonato
                try {
                    const meRes = await fetch('/auth/api/me', { headers: { 'Authorization': `Bearer ${data.accessToken}` } });
                    if (meRes.ok) {
                        const meData = await meRes.json();
                        localStorage.setItem('user_role', meData.role || 'user');
                        localStorage.setItem('user_features', JSON.stringify(meData.features ?? null));
                    }
                } catch { /* ignora */ }
                window.location.href = '/soci';
            } else {
                const err = await res.json();
                showAlert(err.error || err.message, 'Errore impersonazione');
            }
        } catch (e) {
            console.error('Errore impersonazione', e);
            showAlert('Errore di rete', 'Errore');
        }
    };

    const handleOpenResetPwd = (utente) => {
        setResetTarget(utente);
        setNewPwd('');
        setConfirmPwd('');
        setPwdError({});
        setShowResetPwdModal(true);
    };

    const handleResetPassword = async () => {
        const nextErrors = {};
        if (!newPwd) {
            nextErrors.newPwd = 'Inserisci la nuova password';
        } else {
            const passwordErrors = getPasswordValidationErrors(newPwd);
            if (passwordErrors.length > 0) {
                nextErrors.newPwd = passwordErrors.join('. ');
            }
        }
        if (newPwd !== confirmPwd) {
            nextErrors.confirmPwd = 'Le password non coincidono';
        }
        setPwdError(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;

        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/auth/api/admin/users/${resetTarget.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    username: resetTarget.username,
                    email: resetTarget.email,
                    password: newPwd,
                }),
            });

            if (res.ok) {
                setShowResetPwdModal(false);
                setPwdError({});
                fetchUtenti();
                return;
            }

            const err = await res.json();
            setPwdError({ newPwd: err.error || err.message || 'Errore aggiornamento password' });
        } catch (e) {
            console.error(e);
            setPwdError({ newPwd: 'Errore di rete' });
        }
    };

    return (
        <div className="soci-full-container">
            <div className="main-content">
                {/* Filters */}
                <div className="toolbar-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '12px' }}>
                        {[
                            { field: 'username', label: 'Username',  placeholder: 'Username' },
                            { field: 'cognome',  label: 'Cognome',   placeholder: 'Cognome' },
                            { field: 'nome',     label: 'Nome',      placeholder: 'Nome' },
                            { field: 'email',    label: 'Email',     placeholder: 'Email' },
                        ].map(({ field, label, placeholder }) => (
                            <div key={field} style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '120px' }}>
                                <label style={{ fontSize: '0.85rem', marginBottom: '4px' }}>{label}</label>
                                <input
                                    className="md-input"
                                    placeholder={placeholder}
                                    style={{ width: '100%', padding: '6px 12px' }}
                                    value={filters[field]}
                                    onChange={e => handleFilterChange(field, e.target.value)}
                                />
                            </div>
                        ))}

                        <button
                            className="btn-contained"
                            style={{ backgroundColor: 'var(--success-color)', height: '35px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', padding: '0 12px', marginLeft: 'auto' }}
                            onClick={() => { setSelectedUtente(null); setShowModal(true); }}
                        >
                            <Plus size={14} /> Nuovo utente
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="table-card">
                    <div className="table-responsive">
                        <table className="md-table">
                            <thead>
                                <tr>
                                    <th>Username</th>
                                    <th>Email</th>
                                    <th>Data creazione</th>
                                    <th>Stato</th>
                                    <th>Livello</th>
                                    <th style={{ textAlign: 'right' }}>Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                                            Caricamento...
                                        </td>
                                    </tr>
                                ) : paginated.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                                            Nessun utente trovato
                                        </td>
                                    </tr>
                                ) : paginated.map(u => (
                                    <tr key={u.id}>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{u.username}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                                {[u.cognome, u.nome].filter(Boolean).join(' ')}
                                            </div>
                                        </td>
                                        <td>
                                            <a href={`mailto:${u.email}`} style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>
                                                {u.email}
                                            </a>
                                        </td>
                                        <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                            {formatDateTime(u.createdAt)}
                                        </td>
                                        <td>
                                            <ToggleSwitch
                                                checked={u.attivo !== false}
                                                onChange={() => handleToggleAttivo(u)}
                                            />
                                        </td>
                                        <td>
                                            <span style={{ fontSize: '0.85rem' }}>
                                                {ROLE_LABEL[u.role] || u.role || 'Utente'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            {u.role !== 'admin' && u.role !== 'socio' && (
                                            <button
                                                className="btn-icon-small"
                                                title="Funzionalità"
                                                style={{ backgroundColor: '#7b1fa2', color: '#fff', borderRadius: '4px', padding: '5px 8px' }}
                                                onClick={() => { setFunzionalitaTarget(u); setShowFunzionalitaModal(true); }}
                                            >
                                                <LayoutGrid size={16} />
                                            </button>
                                            )}
                                            <button
                                                className="btn-icon-small"
                                                title="Impersona"
                                                style={{ backgroundColor: '#1976d2', color: '#fff', borderRadius: '4px', padding: '5px 8px', marginLeft: '4px' }}
                                                onClick={() => handleImpersonate(u)}
                                            >
                                                <UserCheck size={16} />
                                            </button>
                                            <button
                                                className="btn-icon-small"
                                                title="Modifica"
                                                style={{ backgroundColor: '#ffc107', color: '#fff', borderRadius: '4px', padding: '5px 8px', marginLeft: '4px' }}
                                                onClick={() => { setSelectedUtente(u); setShowModal(true); }}
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                className="btn-icon-small"
                                                title="Reimposta password"
                                                style={{ backgroundColor: '#9e9e9e', color: '#fff', borderRadius: '4px', padding: '5px 8px', marginLeft: '4px' }}
                                                onClick={() => handleOpenResetPwd(u)}
                                            >
                                                <Key size={16} />
                                            </button>
                                            <button
                                                className="btn-icon-small"
                                                title="Elimina utente"
                                                style={{ backgroundColor: '#e53935', color: '#fff', borderRadius: '4px', padding: '5px 8px', marginLeft: '4px' }}
                                                onClick={() => handleDelete(u)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination footer */}
                    {!loading && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderTop: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <button className="pagination-btn" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>&lt;&lt;</button>
                                <button className="pagination-btn" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>&lt;</button>
                                <span className="pagination-current">{currentPage}</span>
                                <button className="pagination-btn" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>&gt;</button>
                                <button className="pagination-btn" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>&gt;&gt;</button>
                                <span style={{ marginLeft: '12px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                    Tot righe: <strong>{filtered.length}</strong>
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* New/Edit modal */}
            <UtenteModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                utente={selectedUtente}
                onSave={handleSave}
            />

            {/* Funzionalità modal */}
            <FunzionalitaModal
                isOpen={showFunzionalitaModal}
                onClose={() => setShowFunzionalitaModal(false)}
                utente={funzionalitaTarget}
            />

            {/* Reset password modal */}
            {showResetPwdModal && (
                <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: '72px' }}>
                    <div
                        className="modal-card socio-modal"
                        style={{ maxWidth: '480px', width: '95%', display: 'flex', flexDirection: 'column' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '16px 24px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#fff',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Key size={20} style={{ color: '#10b981' }} />
                                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#111827' }}>
                                    Reimposta password – {resetTarget?.username}
                                </h2>
                            </div>
                            <button
                                onClick={() => setShowResetPwdModal(false)}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px', display: 'flex', alignItems: 'center', borderRadius: '4px' }}
                                onMouseOver={e => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <X size={22} />
                            </button>
                        </div>
                        {/* Body */}
                        <div style={{ padding: '24px', backgroundColor: '#fff' }}>
                            <div className="md-form-grid-custom">
                                <div className="form-group grid-span-12">
                                    <label className="field-label">Nuova password *</label>
                                    <input
                                        type="password"
                                        className={`md-input ${pwdError.newPwd ? 'input-error' : ''}`}
                                        value={newPwd}
                                        onChange={e => {
                                            setNewPwd(e.target.value);
                                            setPwdError(prev => ({ ...prev, newPwd: undefined }));
                                        }}
                                        autoComplete="new-password"
                                    />
                                    {pwdError.newPwd && (
                                        <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '4px' }}>{pwdError.newPwd}</div>
                                    )}
                                </div>
                                <div className="form-group grid-span-12">
                                    <label className="field-label">Conferma password *</label>
                                    <input
                                        type="password"
                                        className={`md-input ${pwdError.confirmPwd ? 'input-error' : ''}`}
                                        value={confirmPwd}
                                        onChange={e => {
                                            setConfirmPwd(e.target.value);
                                            setPwdError(prev => ({ ...prev, confirmPwd: undefined }));
                                        }}
                                        autoComplete="new-password"
                                    />
                                    {pwdError.confirmPwd && (
                                        <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '4px' }}>{pwdError.confirmPwd}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                        {/* Footer */}
                        <div className="modal-footer-custom">
                            <button className="btn-save-full" onClick={handleResetPassword}>
                                ✓ Salva nuova password
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Utenti;
