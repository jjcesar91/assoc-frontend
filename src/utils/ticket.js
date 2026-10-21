// Ticket di assistenza: etichette e opzioni condivise da Assistenza e Backoffice → Ticket
// (stati e regole lato server in services/users/utils/ticket.js)

export const STATI_TICKET = [
    { value: 'aperto',            label: 'Aperto',                labelCliente: 'In attesa del supporto', badge: 'badge-warning' },
    { value: 'in_lavorazione',    label: 'In lavorazione',        labelCliente: 'In lavorazione',         badge: 'badge-primary' },
    { value: 'in_attesa_cliente', label: 'In attesa del cliente', labelCliente: 'In attesa di tua risposta', badge: 'badge-info' },
    { value: 'risolto',           label: 'Risolto',               labelCliente: 'Risolto',                badge: 'badge-success' },
    { value: 'chiuso',            label: 'Chiuso',                labelCliente: 'Chiuso',                 badge: 'badge-success' },
];

export const CATEGORIE_TICKET = [
    { value: 'tecnico',        label: 'Problema tecnico' },
    { value: 'amministrativo', label: 'Amministrativo / fatturazione' },
    { value: 'funzionalita',   label: 'Richiesta di funzionalità' },
    { value: 'altro',          label: 'Altro' },
];

export const PRIORITA_TICKET = [
    { value: 'bassa',   label: 'Bassa',   badge: 'badge-info' },
    { value: 'normale', label: 'Normale', badge: 'badge-info' },
    { value: 'alta',    label: 'Alta',    badge: 'badge-warning' },
    { value: 'urgente', label: 'Urgente', badge: 'badge-danger' },
];

export const ORDINAMENTI_TICKET = [
    { value: 'ultimo_messaggio', label: 'Ultimo messaggio' },
    { value: 'creazione',        label: 'Data creazione' },
];

export const MAX_OGGETTO = 150;
export const MAX_TESTO = 5000;

export const statoTicket = (value) => STATI_TICKET.find(s => s.value === value) || STATI_TICKET[0];
export const categoriaLabel = (value) => CATEGORIE_TICKET.find(c => c.value === value)?.label || value;
export const prioritaTicket = (value) => PRIORITA_TICKET.find(p => p.value === value) || PRIORITA_TICKET[1];

// Query della lista dai filtri { stato, ordina, dir, q, non_letti, pagina }
export const queryLista = (filtri, extra = {}) => {
    const params = new URLSearchParams();
    Object.entries({ ...extra, ...filtri }).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined && v !== false) params.set(k, v === true ? '1' : String(v));
    });
    return params.toString();
};

export const FILTRI_DEFAULT = { stato: '', ordina: 'ultimo_messaggio', dir: 'desc', pagina: 1 };
