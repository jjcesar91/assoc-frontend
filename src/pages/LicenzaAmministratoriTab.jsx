import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus, KeyRound, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';
import ResetLinkBox from '../components/ResetLinkBox';
import { useAlert } from '../components/AlertModal';
import { useConfirm } from '../components/ConfirmModal';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPTY = { email: '', nome: '', cognome: '', telefono: '' };

// Tab Amministratori della licenza: persone con accesso admin a tutte le società
// della licenza. initialLink: link appena generato (es. creazione da Backoffice).
// onChanged(): aggiorna il conteggio nell'elenco licenze.
const LicenzaAmministratoriTab = ({ licenza, initialLink = null, onChanged }) => {
    const showAlert = useAlert();
    const confirm = useConfirm();
    const [admins, setAdmins] = useState(null);
    const [links, setLinks] = useState(initialLink ? { [initialLink.email]: initialLink } : {});
    const [busy, setBusy] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY);

    const societaIds = (licenza.societa || []).map(s => s.id);

    const load = useCallback(() => fetch(`/auth/api/admin/licenze/${licenza.id}/amministratori`)
        .then(r => (r.ok ? r.json() : []))
        .then(setAdmins)
        .catch(() => setAdmins([])), [licenza.id]);

    useEffect(() => { load(); }, [load]);

    const post = async (body) => {
        const res = await fetch(`/auth/api/admin/licenze/${licenza.id}/amministratori`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...body, societaIds }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Operazione non riuscita');
        return data;
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        const email = form.email.trim().toLowerCase();
        if (!EMAIL.test(email)) { showAlert('Email non valida', 'Errore'); return; }
        setBusy('add');
        try {
            const data = await post({ ...form, email });
            if (data.token) setLinks(prev => ({ ...prev, [data.email]: { token: data.token, expiresAt: data.expiresAt, email: data.email } }));
            setForm(EMPTY);
            setShowForm(false);
            await load();
            onChanged?.();
        } catch (err) {
            showAlert(err.message, 'Errore');
        } finally {
            setBusy(null);
        }
    };

    // Persona che non copre tutte le società (es. società aggiunta prima del provisioning)
    const handleEstendi = async (admin) => {
        setBusy(admin.email);
        try {
            await post({ email: admin.email });
            await load();
        } catch (err) {
            showAlert(err.message, 'Errore');
        } finally {
            setBusy(null);
        }
    };

    const handleLink = async (admin) => {
        setBusy(admin.email);
        try {
            const res = await fetch(`/auth/api/admin/users/${admin.userIds[0]}/password-reset-link`, { method: 'POST' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) { showAlert(data.error || 'Errore nella generazione del link', 'Errore'); return; }
            setLinks(prev => ({ ...prev, [admin.email]: { token: data.token, expiresAt: data.expiresAt, email: admin.email } }));
        } catch {
            showAlert('Errore di rete', 'Errore');
        } finally {
            setBusy(null);
        }
    };

    const handleRemove = async (admin) => {
        const ok = await confirm(`Rimuovere ${admin.email} dagli amministratori? Perderà l'accesso a tutte le società della licenza.`, 'Rimuovi amministratore', { confirmLabel: 'Rimuovi' });
        if (!ok) return;
        setBusy(admin.email);
        try {
            const res = await fetch(`/auth/api/admin/licenze/${licenza.id}/amministratori?email=${encodeURIComponent(admin.email)}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                showAlert(data.error || 'Rimozione non riuscita', 'Errore');
                return;
            }
            await load();
            onChanged?.();
        } catch {
            showAlert('Errore di rete', 'Errore');
        } finally {
            setBusy(null);
        }
    };

    if (admins === null) return <div style={{ color: 'var(--text-secondary)' }}>Caricamento amministratori…</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Gli amministratori accedono a tutte le società della licenza, con una sola password. Deve restarne almeno uno.
                </div>
                {!showForm && (
                    <button className="btn-contained" style={{ backgroundColor: 'var(--success-color)', display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => setShowForm(true)}>
                        <UserPlus size={16} /> Aggiungi amministratore
                    </button>
                )}
            </div>

            {admins.length === 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', marginBottom: '12px', borderRadius: '8px', backgroundColor: 'var(--danger-container)', color: 'var(--on-danger-container)' }}>
                    <AlertTriangle size={18} /> Questa licenza non ha amministratori: aggiungine uno.
                </div>
            )}

            {showForm && (
                <form onSubmit={handleAdd} className="table-card" style={{ padding: '16px', marginBottom: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                        {[['email', 'Email *', 'email'], ['nome', 'Nome'], ['cognome', 'Cognome'], ['telefono', 'Telefono', 'tel']].map(([k, label, type]) => (
                            <div key={k}>
                                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>{label}</label>
                                <input className="md-input" type={type || 'text'} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} style={{ width: '100%' }} />
                            </div>
                        ))}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                        Se la persona ha già un account nel gestionale mantiene la sua password; altrimenti riceverai un link per fargliela impostare.
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                        <button type="button" className="btn-outlined" onClick={() => { setShowForm(false); setForm(EMPTY); }}>Annulla</button>
                        <button type="submit" className="btn-contained" disabled={busy === 'add'} style={{ backgroundColor: 'var(--success)' }}>Aggiungi</button>
                    </div>
                </form>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {admins.map(a => {
                    const mancanti = societaIds.filter(id => !a.societaIds.includes(id)).length;
                    return (
                        <div key={a.email} className="table-card" style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                                <div>
                                    <div style={{ fontWeight: 500, textTransform: 'uppercase' }}>{[a.cognome, a.nome].filter(Boolean).join(' ') || '—'}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        {a.email}{a.telefono ? ` · ${a.telefono}` : ''}
                                        {!a.attivo && <span className="badge badge-danger" style={{ marginLeft: '8px' }}>Disattivato</span>}
                                    </div>
                                    {mancanti > 0 && (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--warning)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <AlertTriangle size={14} /> Non accede a {mancanti} {mancanti === 1 ? 'società' : 'società'} della licenza
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {mancanti > 0 && (
                                        <button className="btn-outlined" disabled={busy === a.email} onClick={() => handleEstendi(a)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                            <RefreshCw size={15} /> Estendi a tutte le società
                                        </button>
                                    )}
                                    <button className="btn-contained" disabled={busy === a.email} onClick={() => handleLink(a)} style={{ backgroundColor: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                        <KeyRound size={15} /> {links[a.email] ? 'Nuovo link' : 'Link imposta password'}
                                    </button>
                                    <button
                                        className="btn-outlined"
                                        disabled={busy === a.email || admins.length <= 1}
                                        title={admins.length <= 1 ? 'Deve restare almeno un amministratore' : 'Rimuovi'}
                                        onClick={() => handleRemove(a)}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--danger)' }}
                                    >
                                        <Trash2 size={15} /> Rimuovi
                                    </button>
                                </div>
                            </div>
                            {links[a.email] && (
                                <div style={{ marginTop: '12px' }}>
                                    <ResetLinkBox token={links[a.email].token} expiresAt={links[a.email].expiresAt} email={a.email} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default LicenzaAmministratoriTab;
