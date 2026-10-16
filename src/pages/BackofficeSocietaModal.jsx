import React, { useState } from 'react';
import { X, Building2, Users, ClipboardList } from 'lucide-react';
import SocietaAnagrafica from './SocietaAnagrafica';
import Utenti from './Utenti';
import { formatDateTimeIT } from '../utils/dateUtils';
import './SocioModal.css';

// Tipo abbonamento mostrato finché non esiste l'entità abbonamenti.
export const ABBONAMENTO_DEFAULT = 'Gratuito';

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

// Modal Backoffice di una società registrata: anagrafica, utenti, dati di registrazione.
const BackofficeSocietaModal = ({ societa, onClose, onSaved }) => {
    // Il parent monta il modal con key={societa.id}: il tab riparte da Anagrafica a ogni apertura.
    const [activeTab, setActiveTab] = useState('anagrafica');

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
                        <div style={{ maxWidth: '720px' }}>
                            <InfoRow label="ID società">{societa.id}</InfoRow>
                            <InfoRow label="Data registrazione">{societa.createdAt ? formatDateTimeIT(societa.createdAt) : '–'}</InfoRow>
                            <InfoRow label="Ultimo aggiornamento">{societa.updatedAt ? formatDateTimeIT(societa.updatedAt) : '–'}</InfoRow>
                            <InfoRow label="Tipo abbonamento">
                                <span className="badge badge-info">{ABBONAMENTO_DEFAULT}</span>
                            </InfoRow>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BackofficeSocietaModal;
