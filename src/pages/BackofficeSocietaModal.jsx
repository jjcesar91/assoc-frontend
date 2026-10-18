import React, { useState, useEffect } from 'react';
import { X, Building2, Users, ClipboardList, KeyRound } from 'lucide-react';
import ResetLinkBox from '../components/ResetLinkBox';
import LicenzaForm from './LicenzaForm';
import { useAlert } from '../components/AlertModal';
import SocietaAnagrafica from './SocietaAnagrafica';
import Utenti from './Utenti';
import { formatDateTimeIT } from '../utils/dateUtils';
import './SocioModal.css';


const TABS = [
    { id: 'anagrafica',    label: 'Anagrafica',    Icon: Building2 },
    { id: 'utenti',        label: 'Utenti',        Icon: Users },
    { id: 'registrazione', label: 'Registrazione', Icon: ClipboardList },
];

const InfoRow = ({ label, children }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{label}</div>
        <div style={{ fontSize: '0.95rem' }}>{children}</div>
    </div>
);

// Amministratori della società con la generazione del link "imposta password".
// initialLink: link appena creato in fase di iscrizione ({ userId, token, expiresAt, email }).
const AmministratoriLinks = ({ societaId, initialLink }) => {
    const showAlert = useAlert();
    const [admins, setAdmins] = useState(null);
    const [links, setLinks] = useState(initialLink ? { [initialLink.userId]: initialLink } : {});
    const [generating, setGenerating] = useState(null);

    useEffect(() => {
        let cancelled = false;
        fetch(`/auth/api/admin/users?societaId=${societaId}`)
            .then(r => r.ok ? r.json() : [])
            .then(list => { if (!cancelled) setAdmins(list.filter(u => u.role === 'admin')); })
            .catch(() => { if (!cancelled) setAdmins([]); });
        return () => { cancelled = true; };
    }, [societaId]);

    const handleGenerate = async (user) => {
        setGenerating(user.id);
        try {
            const res = await fetch(`/auth/api/admin/users/${user.id}/password-reset-link`, { method: 'POST' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) { showAlert(data.error || 'Errore nella generazione del link', 'Errore'); return; }
            setLinks(prev => ({ ...prev, [user.id]: { userId: user.id, token: data.token, expiresAt: data.expiresAt, email: data.email } }));
        } catch {
            showAlert('Errore di rete', 'Errore');
        } finally {
            setGenerating(null);
        }
    };

    if (admins === null) return <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Caricamento amministratori…</div>;
    if (admins.length === 0) return <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Nessun amministratore: crealo dal tab Utenti.</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {admins.map(u => (
                <div key={u.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                        <div>
                            <div style={{ fontWeight: 500, textTransform: 'uppercase' }}>{[u.cognome, u.nome].filter(Boolean).join(' ') || '—'}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{u.email}</div>
                        </div>
                        <button
                            type="button"
                            className="btn-contained"
                            disabled={generating === u.id}
                            onClick={() => handleGenerate(u)}
                            style={{ backgroundColor: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                            <KeyRound size={16} /> {links[u.id] ? 'Genera nuovo link' : 'Genera link imposta password'}
                        </button>
                    </div>
                    {links[u.id] && <ResetLinkBox token={links[u.id].token} expiresAt={links[u.id].expiresAt} email={links[u.id].email} />}
                </div>
            ))}
        </div>
    );
};

// Modal Backoffice di una società registrata: anagrafica, utenti, dati di registrazione.
// Il parent lo monta con key={societa.id}: lo stato riparte da zero a ogni apertura.
// onLicenzaSaved(licenza): aggiorna la colonna Piano dell'elenco Iscrizioni.
const BackofficeSocietaModal = ({ societa, onClose, onSaved, onLicenzaSaved, initialTab = 'anagrafica', initialLink = null }) => {
    const [activeTab, setActiveTab] = useState(initialTab);

    if (!societa) return null;

    return (
        <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: '48px' }}>
            <div
                className="modal-card modal-xl socio-modal"
                style={{ width: '95%', maxHeight: 'calc(100vh - 72px)' }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '16px 24px', borderBottom: '1px solid var(--border-color)', backgroundColor: '#fff',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Building2 size={20} style={{ color: 'var(--primary)' }} />
                        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {societa.denominazione || `Società #${societa.id}`}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        title="Chiudi"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px', display: 'flex', alignItems: 'center', borderRadius: '4px' }}
                        onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--surface-1)'}
                        onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <X size={22} />
                    </button>
                </div>

                <div className="modal-tabs-header">
                    {TABS.map(tab => {
                        const TabIcon = tab.Icon;
                        return (
                            <button
                                key={tab.id}
                                className={`modal-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <TabIcon size={16} />
                                <span style={{ marginLeft: '8px' }}>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                <div style={{ padding: '24px', backgroundColor: '#fff', overflowY: 'auto', flex: 1 }}>
                    {activeTab === 'anagrafica' && (
                        <SocietaAnagrafica societa={societa} embedded onSaved={onSaved} />
                    )}

                    {activeTab === 'utenti' && (
                        <Utenti societaId={societa.id} />
                    )}

                    {activeTab === 'registrazione' && (
                        <div style={{ maxWidth: '900px' }}>
                            <InfoRow label="ID società">{societa.id}</InfoRow>
                            <InfoRow label="Data registrazione">{societa.createdAt ? formatDateTimeIT(societa.createdAt) : '–'}</InfoRow>
                            <InfoRow label="Ultimo aggiornamento">{societa.updatedAt ? formatDateTimeIT(societa.updatedAt) : '–'}</InfoRow>
                            <div style={{ marginTop: '16px' }}>
                                <LicenzaForm societaId={societa.id} onSaved={onLicenzaSaved} />
                            </div>
                            <div style={{ marginTop: '24px' }}>
                                <div style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '12px' }}>Accesso amministratori</div>
                                <AmministratoriLinks societaId={societa.id} initialLink={initialLink} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BackofficeSocietaModal;
