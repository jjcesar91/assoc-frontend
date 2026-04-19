import { Briefcase, User, ShoppingBag, CreditCard, CalendarClock, BookOpen, FileText, Activity } from 'lucide-react';

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
export const MENU_STRUCTURE = [
    {
        id: 'societa',
        label: 'Società',
        Icon: Briefcase,
        children: [
            { id: 'societa-anagrafica',    label: 'Anagrafica',      path: '/societa/anagrafica' },
            { id: 'societa-anno',          label: 'Anno contabile',  path: '/societa/anno-contabile' },
            { id: 'societa-comunicazioni', label: 'Comunicazioni',   path: '/societa/comunicazioni' },
            { id: 'societa-impostazioni',  label: 'Impostazioni',    path: '/societa/impostazioni' },
        ],
    },
    { id: 'soci',         label: 'Soci',          Icon: User,          path: '/soci' },
    { id: 'prodotti',     label: 'Prodotti',       Icon: ShoppingBag,   path: '/prodotti' },
    {
        id: 'pagamenti',
        label: 'Pagamenti',
        Icon: CreditCard,
        children: [
            { id: 'pagamenti-lista',  label: 'Lista pagamenti', path: '/pagamenti' },
            { id: 'pagamenti-conti',  label: 'Conti',           path: '/pagamenti/conti' },
        ],
    },
    { id: 'scadenziario', label: 'Scadenziario',   Icon: CalendarClock, path: '/scadenziario' },
    {
        id: 'contabilita',
        label: 'Contabilità',
        Icon: BookOpen,
        children: [
            { id: 'contabilita-operazioni', label: 'Operazioni',           path: '/contabilita/operazioni' },
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
];
