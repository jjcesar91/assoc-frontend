import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, ChevronDown, Lock } from 'lucide-react';
import { getVisibleMenu } from './menuConfig';
import { useSocieta } from '../data/SocietaContext';
import { usePianoLicenza, MESSAGGIO_PIANO } from '../data/pianoLicenza';
import './Sidebar.css';

// Menu laterale. contesto (società e anno) e preferiti arrivano dal Layout e sono
// mostrati solo su mobile, dove la barra superiore non ha spazio (vedi Sidebar.css).
const Sidebar = ({ isOpen, onClose, bannerHeight = 0, contesto, preferiti }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const visibleMenu = getVisibleMenu();
    const { selectedSocietaId } = useSocieta();
    const piano = usePianoLicenza(selectedSocietaId);

    // Il gruppo che contiene la pagina corrente parte aperto
    const gruppoCorrente = visibleMenu.find(item => item.children?.some(c => c.path === location.pathname))?.id;
    const [openGroups, setOpenGroups] = React.useState(() => (gruppoCorrente ? { [gruppoCorrente]: true } : {}));
    React.useEffect(() => {
        if (isOpen && gruppoCorrente) setOpenGroups(prev => (prev[gruppoCorrente] ? prev : { ...prev, [gruppoCorrente]: true }));
    }, [isOpen, gruppoCorrente]);

    // Esc chiude il menu
    React.useEffect(() => {
        if (!isOpen) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    const toggleGroup = (id) => setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));

    const handleNavigation = (path) => {
        navigate(path);
        onClose();
    };

    return (
        <>
            {isOpen && <div className="sidebar-overlay" onClick={onClose} style={{ top: bannerHeight }}></div>}
            <nav className={`sidebar ${isOpen ? 'open' : ''}`} style={{ top: bannerHeight }} aria-label="Menu principale" aria-hidden={!isOpen}>
                <div className="sidebar-header">
                    <h2>Menu</h2>
                    <button className="icon-btn sidebar-chiudi" onClick={onClose} aria-label="Chiudi il menu"><X size={22} /></button>
                </div>
                <div className="sidebar-content">
                    {contesto && <div className="sidebar-solo-mobile">{contesto}</div>}
                    {preferiti && <div className="sidebar-solo-mobile">{preferiti}</div>}

                    {visibleMenu.map(item => {
                        const aperto = !!openGroups[item.id];
                        const gruppoAttivo = item.id === gruppoCorrente;
                        return (
                            <React.Fragment key={item.id}>
                                {item.children ? (
                                    <>
                                        <button
                                            type="button"
                                            className={`sidebar-item ${gruppoAttivo && !aperto ? 'sidebar-item--gruppo-attivo' : ''} ${item.superuserOnly ? 'sidebar-item--reserved' : ''}`}
                                            onClick={() => toggleGroup(item.id)}
                                            aria-expanded={aperto}
                                        >
                                            <item.Icon size={20} />
                                            <span>{item.label}</span>
                                            <ChevronDown size={18} className={`sidebar-chevron${aperto ? ' sidebar-chevron--aperto' : ''}`} />
                                        </button>
                                        {aperto && (
                                            <div className="sidebar-sub-menu">
                                                {item.children.map(child => (
                                                    <button
                                                        type="button"
                                                        key={child.id}
                                                        className={`sidebar-sub-item ${location.pathname === child.path ? 'active' : ''}`}
                                                        aria-current={location.pathname === child.path ? 'page' : undefined}
                                                        onClick={() => handleNavigation(child.path)}
                                                    >
                                                        {child.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                ) : item.feature && piano.bloccata(item.feature) ? (
                                    // Funzionalità non inclusa nel piano: visibile ma non selezionabile
                                    <div className="sidebar-item sidebar-item--disabled" title={MESSAGGIO_PIANO(piano.info)} aria-disabled="true">
                                        <item.Icon size={20} />
                                        <span>{item.label}</span>
                                        <Lock size={14} style={{ marginLeft: 'auto' }} />
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        className={`sidebar-item ${location.pathname === item.path ? 'active' : ''} ${item.superuserOnly ? 'sidebar-item--reserved' : ''}`}
                                        aria-current={location.pathname === item.path ? 'page' : undefined}
                                        onClick={() => handleNavigation(item.path)}
                                    >
                                        <item.Icon size={20} />
                                        <span>{item.label}</span>
                                    </button>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </nav>
        </>
    );
};

export default Sidebar;
