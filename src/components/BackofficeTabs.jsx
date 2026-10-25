import React from 'react';
import './BackofficeTabs.css';

// Schede del Backoffice (stesso modello di revisio): una barra di schede sopra un
// pannello alla volta; la scheda attiva si legge con useSchedaAttiva.
// tabs: [{ id, label, icon?, badge?: 'personalizzato' | 'modificato' }]

const BADGE_TITLE = {
    personalizzato: 'Testo personalizzato',
    modificato: 'Modifiche non salvate',
};

const BackofficeTabs = ({ tabs, attiva, onSeleziona, label }) => (
    <div className="bo-tabs" role="tablist" aria-label={label}>
        {tabs.map(t => (
            <button
                key={t.id}
                type="button"
                role="tab"
                id={`scheda-${t.id}`}
                aria-selected={t.id === attiva}
                aria-controls={`pannello-${t.id}`}
                className={`bo-tab${t.id === attiva ? ' bo-tab--attiva' : ''}`}
                onClick={() => onSeleziona(t.id)}
            >
                {t.icon && <t.icon size={15} />}
                {t.label}
                {t.badge && <span className={`bo-tab-dot bo-tab-dot--${t.badge}`} title={BADGE_TITLE[t.badge]} aria-label={BADGE_TITLE[t.badge]} />}
            </button>
        ))}
    </div>
);

// Pannello di una scheda: resta montato quando è nascosto, così le modifiche non
// salvate non si perdono cambiando scheda
export const BackofficeTabPanel = ({ id, attiva, children }) => (
    <div role="tabpanel" id={`pannello-${id}`} aria-labelledby={`scheda-${id}`} hidden={id !== attiva}>
        {children}
    </div>
);

export default BackofficeTabs;
