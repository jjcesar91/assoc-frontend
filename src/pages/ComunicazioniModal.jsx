import React, { useState, useEffect } from 'react';
import { X, Bell } from 'lucide-react';
import { useAlert } from '../components/AlertModal';
import './SocioModal.css';
import './Soci.css';

// Elenco canonico dei tipi di notifica configurabili per un admin.
// La `key` deve corrispondere al `tipo` usato dal backend (internal/admin-emails).
// Aggiungere qui una voce per ogni nuova notifica destinata agli amministratori.
export const NOTIFICHE_TIPI = [
    {
        key: 'ricevuta_caricata',
        label: 'Quietanza caricata',
        descrizione: 'Un socio carica la quietanza di pagamento di una ricevuta.',
    },
    {
        key: 'nuovo_ordine',
        label: 'Nuova ricevuta',
        descrizione: 'Un socio crea una nuova ricevuta.',
    },
];

// Una notifica è abilitata se le preferenze sono null (tutte attive) oppure
// se la chiave non è esplicitamente impostata a false.
const isEnabled = (prefs, key) => !prefs || prefs[key] !== false;

const ComunicazioniModal = ({ isOpen, onClose, utente }) => {
    const showAlert = useAlert();
    const [prefs, setPrefs] = useState({}); // mappa { key: boolean }
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isOpen || !utente) return;
        setLoading(true);
        const token = localStorage.getItem('token');
        fetch(`/auth/api/admin/users/${utente.id}/comunicazioni`, {
            headers: { 'Authorization': `Bearer ${token}` },
        })
            .then(r => r.json())
            .then(data => {
                const stored = data.comunicazioni; // null oppure { key: bool }
                const next = {};
                NOTIFICHE_TIPI.forEach(t => { next[t.key] = isEnabled(stored, t.key); });
                setPrefs(next);
            })
            .catch(err => console.error('Errore caricamento comunicazioni', err))
            .finally(() => setLoading(false));
    }, [isOpen, utente]);

    const handleToggle = (key) => {
        setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = async () => {
        setSaving(true);
        const token = localStorage.getItem('token');
        try {
            // Se tutte le notifiche sono abilitate salviamo null (nessuna restrizione)
            const allEnabled = NOTIFICHE_TIPI.every(t => prefs[t.key] !== false);
            const payload = allEnabled
                ? null
                : NOTIFICHE_TIPI.reduce((acc, t) => ({ ...acc, [t.key]: prefs[t.key] !== false }), {});
            await fetch(`/auth/api/admin/users/${utente.id}/comunicazioni`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ comunicazioni: payload }),
            });
            onClose(true);
        } catch (err) {
            console.error('Errore salvataggio comunicazioni', err);
            showAlert('Errore di rete', 'Errore');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const utenteLabel = utente?.email || [utente?.cognome, utente?.nome].filter(Boolean).join(' ') || '';

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
                    borderBottom: '1px solid var(--border-color)',
                    backgroundColor: '#fff',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Bell size={20} style={{ color: 'var(--success)' }} />
                        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            Comunicazioni – {utenteLabel}
                        </h2>
                    </div>
                    <button
                        onClick={() => onClose(false)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px', display: 'flex', alignItems: 'center', borderRadius: '4px' }}
                        onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--surface-1)'}
                        onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px', backgroundColor: '#fff' }}>
                    <p style={{ marginTop: 0, marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Seleziona quali notifiche email deve ricevere questo amministratore.
                    </p>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                            Caricamento...
                        </div>
                    ) : (
                        <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                            {NOTIFICHE_TIPI.map((t, idx) => (
                                <div
                                    key={t.key}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '16px',
                                        padding: '14px 20px',
                                        backgroundColor: idx % 2 === 1 ? 'var(--surface-1)' : '#fff',
                                        borderBottom: idx < NOTIFICHE_TIPI.length - 1 ? '1px solid var(--border-color)' : 'none',
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 500, fontSize: '0.95rem' }}>{t.label}</div>
                                        {t.descrizione && (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                {t.descrizione}
                                            </div>
                                        )}
                                    </div>
                                    <ToggleSwitch
                                        checked={prefs[t.key] !== false}
                                        onChange={() => handleToggle(t.key)}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="modal-footer-custom">
                    <button
                        className="btn-save-full"
                        onClick={handleSave}
                        disabled={saving || loading}
                    >
                        {saving ? 'Salvataggio...' : '✓ Salva comunicazioni'}
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
            backgroundColor: checked ? 'var(--success)' : 'var(--danger)',
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

export default ComunicazioniModal;
