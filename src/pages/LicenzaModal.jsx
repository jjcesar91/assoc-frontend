import React, { useState, useEffect, useCallback } from 'react';
import { X, ScrollText, Building2, ShieldCheck } from 'lucide-react';
import LicenzaForm from './LicenzaForm';
import LicenzaSocietaTab from './LicenzaSocietaTab';
import LicenzaAmministratoriTab from './LicenzaAmministratoriTab';
import { pianoInfo, statoInfo } from '../data/licenze';
import './SocioModal.css';

const TABS = [
    { id: 'licenza',         label: 'Licenza',         Icon: ScrollText },
    { id: 'societa',         label: 'Società',         Icon: Building2 },
    { id: 'amministratori',  label: 'Amministratori',  Icon: ShieldCheck },
];

// Modal di una licenza (Backoffice → Licenze). Il parent lo monta con
// key={licenzaId}: lo stato riparte da zero a ogni apertura.
// onChanged(): l'elenco licenze va ricaricato (piano, stato, società, amministratori).
const LicenzaModal = ({ licenzaId, onClose, onChanged, initialTab = 'licenza', initialLink = null }) => {
    const [licenza, setLicenza] = useState(null);
    const [activeTab, setActiveTab] = useState(initialTab);

    const load = useCallback(() => fetch(`/users/api/licenze/${licenzaId}`)
        .then(r => (r.ok ? r.json() : null))
        .then(data => { if (data) setLicenza(data); })
        .catch(() => {}), [licenzaId]);

    useEffect(() => { load(); }, [load]);

    const changed = () => { load(); onChanged?.(); };

    const piano = licenza ? pianoInfo(licenza.piano) : null;
    const stato = licenza ? statoInfo(licenza.stato) : null;

    return (
        <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: '48px' }}>
            <div className="modal-card modal-xl socio-modal" style={{ width: '95%', maxHeight: 'calc(100vh - 72px)' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border-color)', backgroundColor: '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <ScrollText size={20} style={{ color: 'var(--primary)' }} />
                        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {licenza ? (licenza.associazione || `Licenza #${licenza.id}`) : 'Licenza'}
                        </h2>
                        {piano && <span className={`badge ${piano.badge}`}>{piano.label}</span>}
                        {stato && <span className={`badge ${stato.badge}`}>{stato.label}</span>}
                    </div>
                    <button onClick={onClose} title="Chiudi" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px', display: 'flex', borderRadius: '4px' }}>
                        <X size={22} />
                    </button>
                </div>

                <div className="modal-tabs-header">
                    {TABS.map(tab => {
                        const TabIcon = tab.Icon;
                        const count = tab.id === 'societa' && licenza ? (licenza.societa || []).length : undefined;
                        return (
                            <button key={tab.id} className={`modal-tab-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                                <TabIcon size={16} /><span style={{ marginLeft: '8px' }}>{tab.label}</span>
                                {count !== undefined && <span className="tab-badge">{count}</span>}
                            </button>
                        );
                    })}
                </div>

                <div style={{ padding: '24px', backgroundColor: '#fff', overflowY: 'auto', flex: 1 }}>
                    {!licenza ? (
                        <div style={{ color: 'var(--text-secondary)' }}>Caricamento licenza…</div>
                    ) : activeTab === 'licenza' ? (
                        <div style={{ maxWidth: '900px' }}>
                            <LicenzaForm key={licenza.updatedAt} licenza={licenza} onSaved={changed} />
                        </div>
                    ) : activeTab === 'societa' ? (
                        <LicenzaSocietaTab licenza={licenza} onChanged={changed} />
                    ) : (
                        <LicenzaAmministratoriTab licenza={licenza} initialLink={initialLink} onChanged={onChanged} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default LicenzaModal;
