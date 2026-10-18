import React, { useState, useEffect } from 'react';
import { X, Building2, Users } from 'lucide-react';
import SocietaAnagrafica from './SocietaAnagrafica';
import Utenti from './Utenti';
import './SocioModal.css';

const TABS = [
    { id: 'anagrafica', label: 'Anagrafica', Icon: Building2 },
    { id: 'utenti',     label: 'Utenti',     Icon: Users },
];

// Dettaglio di una società della licenza (Backoffice → Licenza → Società):
// anagrafica e utenti della società. onSaved(societa) dopo il salvataggio dell'anagrafica.
const SocietaDettaglioModal = ({ societaId, onClose, onSaved }) => {
    const [societa, setSocieta] = useState(null);
    const [activeTab, setActiveTab] = useState('anagrafica');

    useEffect(() => {
        let cancelled = false;
        fetch(`/users/api/societa/${societaId}`)
            .then(r => (r.ok ? r.json() : null))
            .then(data => { if (!cancelled) setSocieta(data); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [societaId]);

    return (
        <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: '64px' }}>
            <div className="modal-card modal-xl socio-modal" style={{ width: '95%', maxHeight: 'calc(100vh - 88px)' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border-color)', backgroundColor: '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Building2 size={20} style={{ color: 'var(--primary)' }} />
                        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {societa?.denominazione || 'Società'}
                        </h2>
                    </div>
                    <button onClick={onClose} title="Chiudi" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px', display: 'flex', borderRadius: '4px' }}>
                        <X size={22} />
                    </button>
                </div>
                <div className="modal-tabs-header">
                    {TABS.map(tab => {
                        const TabIcon = tab.Icon;
                        return (
                            <button key={tab.id} className={`modal-tab-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                                <TabIcon size={16} /><span style={{ marginLeft: '8px' }}>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
                <div style={{ padding: '24px', backgroundColor: '#fff', overflowY: 'auto', flex: 1 }}>
                    {!societa ? (
                        <div style={{ color: 'var(--text-secondary)' }}>Caricamento…</div>
                    ) : activeTab === 'anagrafica' ? (
                        <SocietaAnagrafica
                            societa={societa}
                            embedded
                            onSaved={updated => { setSocieta(s => ({ ...s, ...updated })); onSaved?.(updated); }}
                        />
                    ) : (
                        <Utenti societaId={societa.id} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default SocietaDettaglioModal;
