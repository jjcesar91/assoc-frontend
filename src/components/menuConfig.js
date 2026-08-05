import { Briefcase, User, ShoppingBag, CreditCard, CalendarClock, BookOpen, FileText, Activity, ShieldCheck, Mail } from 'lucide-react';

/**
 * Unica sorgente di verità per la struttura del menu laterale.
 * Usata da Sidebar.jsx e FavoritesModal.jsx.
 *
 * Struttura:
 *   id        – identificatore univoco
 *   label     – etichetta visibile
 *   Icon      – componente icona lucide-react
 *   path      – (solo voci senza children) percorso di navigazione
 *   children  – (opzionale) array di sottovoci { id, label, path }
 */
/** Restituisce le voci di menu visibili per l'utente corrente */
export const getVisibleMenu = () => {
    const role = localStorage.getItem('user_role') || 'user';
    let featuresRaw;
    try { featuresRaw = JSON.parse(localStorage.getItem('user_features')); } catch { featuresRaw = null; }
    // superuser e admin vedono tutto inclusa l'amministrazione
    if (role === 'superuser') return MENU_STRUCTURE.map(item => ({
        ...item,
        children: item.children, // superuser vede tutti i children
    }));
    if (role === 'admin') return MENU_STRUCTURE.map(item => ({
        ...item,
        children: item.children?.filter(c => !c.superuserOnly),
    }));
    // null = nessuna restrizione, array = solo quelle abilitate
    return MENU_STRUCTURE.filter(item => {
        if (item.id === 'amministrazione') return false;
        if (featuresRaw === null || featuresRaw === undefined) return true;
        return featuresRaw.includes(item.id);
    });
};

export const MENU_STRUCTURE = [
    {
        id: 'societa',
        label: 'Impostazioni',
        Icon: Briefcase,
        children: [
            { id: 'societa-anagrafica',     label: 'Anagrafica',      path: '/societa/anagrafica' },
            { id: 'societa-anno',           label: 'Anno contabile',  path: '/societa/anno-contabile' },
            { id: 'societa-impostazioni',   label: 'Società',         path: '/societa/impostazioni' },
            { id: 'ricevute-conti',         label: 'Conti',           path: '/ricevute/conti' },
            { id: 'ricevute-comunicazioni', label: 'Comunicazioni',   path: '/ricevute/comunicazioni' },
        ],
    },
    { id: 'soci',         label: 'Soci',          Icon: User,          path: '/soci' },
    { id: 'prodotti',     label: 'Prodotti',       Icon: ShoppingBag,   path: '/prodotti' },
    {
        id: 'attivita',
        label: 'Attività',
        Icon: Activity,
        children: [
            { id: 'attivita-calendario',     label: 'Calendario',     path: '/attivita/calendario' },
            { id: 'attivita-configurazione', label: 'Tipo Attività', path: '/attivita/configurazione' },
            { id: 'attivita-tecnici',        label: 'Staff',          path: '/attivita/tecnici' },
            { id: 'attivita-strutture',      label: 'Strutture',      path: '/attivita/strutture' },
        ],
    },
    {
        id: 'ricevute',
        label: 'Ricevute',
        Icon: CreditCard,
        children: [
            { id: 'ricevute-lista',    label: 'Lista ricevute', path: '/ricevute' },
            { id: 'ricevute-template', label: 'Footer',         path: '/ricevute/template' },
        ],
    },
    { id: 'scadenziario', label: 'Scadenziario',   Icon: CalendarClock, path: '/scadenziario' },
    {
        id: 'comunicazioni',
        label: 'Comunicazioni',
        Icon: Mail,
        children: [
            { id: 'comunicazioni-automazioni', label: 'Automazioni', path: '/comunicazioni/automazioni' },
        ],
    },
    {
        id: 'contabilita',
        label: 'Contabilità',
        Icon: BookOpen,
        children: [
            { id: 'contabilita-operazioni', label: 'Prima Nota',           path: '/contabilita/operazioni' },
            { id: 'contabilita-gruppi',     label: 'Gruppi / Sottogruppi', path: '/contabilita/gruppi' },
            { id: 'contabilita-fornitori',  label: 'Fornitori',            path: '/contabilita/fornitori' },
        ],
    },
    {
        id: 'modulistica',
        label: 'Modulistica',
        Icon: FileText,
        children: [
            { id: 'modulistica-moduli',    label: 'Moduli',             path: '/modulistica' },
            { id: 'modulistica-template',  label: 'Template di Stampa', path: '/modulistica/template' },
        ],
    },
    {
        id: 'amministrazione',
        label: 'Amministrazione',
        Icon: ShieldCheck,
        children: [
            { id: 'amministrazione-utenti',  label: 'Utenti',  path: '/amministrazione/utenti' },
            { id: 'amministrazione-societa', label: 'Società', path: '/amministrazione/societa', superuserOnly: true },
            { id: 'societa-comunicazioni',   label: 'Parametri SMTP', path: '/societa/comunicazioni', superuserOnly: true },
        ],
    },
];
