// Licenza d'uso di una società (Backoffice → tab Registrazione).

export const PIANI = [
    { value: 'free',     label: 'Free',     badge: 'badge-info' },
    { value: 'pro',      label: 'Pro',      badge: 'badge-primary' },
    { value: 'advanced', label: 'Advanced', badge: 'badge-success' },
];

export const STATI = [
    { value: 'attiva',  label: 'Attiva',  badge: 'badge-success' },
    { value: 'sospesa', label: 'Sospesa', badge: 'badge-warning' },
    { value: 'scaduta', label: 'Scaduta', badge: 'badge-danger' },
];

export const ANNI_ASSOCIATIVI = [
    { value: 'solare',         label: 'Solare (1 gennaio – 31 dicembre)' },
    { value: 'sportivo',       label: 'Sportivo (1 settembre – 31 agosto)' },
    { value: 'personalizzato', label: 'Personalizzato' },
];

export const pianoInfo = (value) => PIANI.find(p => p.value === value) || PIANI[0];
export const statoInfo = (value) => STATI.find(s => s.value === value) || STATI[0];

const or = (v) => (v && String(v).trim()) || '—';

const annoAssociativoText = (l) => {
    if (l.anno_associativo_tipo === 'personalizzato') {
        const [gg, mm] = (l.anno_associativo_inizio || '').split('-');
        return gg && mm ? `Personalizzato: dal ${gg}/${mm}` : 'Personalizzato';
    }
    return ANNI_ASSOCIATIVI.find(a => a.value === l.anno_associativo_tipo)?.label || '—';
};

const indirizzoText = (l) => {
    const citta = [l.cap, l.comune].filter(Boolean).join(' ');
    const conProvincia = l.provincia ? `${citta}${citta ? ' ' : ''}(${l.provincia})` : citta;
    const parts = [l.indirizzo, conProvincia].filter(p => p && p.trim());
    return parts.length ? parts.join(', ') : '—';
};

const referenteText = (l) => {
    if (!l.referente_nome && !l.referente_telefono) return '—';
    return [l.referente_nome, l.referente_telefono].filter(Boolean).join(' — ');
};

// Riepilogo testuale dei dati di registrazione, nel formato usato via email.
export function formatRiepilogoRegistrazione(l) {
    return [
        `Associazione: ${or(l.associazione)}`,
        `Tipologia: ${or(l.tipologia)}`,
        `Email: ${or(l.email)}`,
        `Indirizzo: ${indirizzoText(l)}`,
        `Anno associativo: ${annoAssociativoText(l)}`,
        `Affiliazioni: ${or(l.affiliazioni)}`,
        `Presidente: ${or(l.presidente)}`,
        `Telefono associazione: ${or(l.telefono)}`,
        `Referente: ${referenteText(l)}`,
    ].join('\n');
}
