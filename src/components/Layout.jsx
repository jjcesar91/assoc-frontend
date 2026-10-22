import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, LogOut, User, Edit, Star, UserCheck, ArrowLeftCircle, AlertTriangle } from 'lucide-react';
import Sidebar from './Sidebar';
import { useSocieta } from '../data/SocietaContext';
import { useAnno } from '../data/AnnoContext';
import EditProfileModal from '../pages/EditProfileModal'; // Assuming we can reuse this, or move it to components
import FavoritesModal, { MENU_STRUCTURE } from './FavoritesModal';
import './Layout.css';

const favBtnStyle = {
    background: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '6px',
    padding: '5px',
    cursor: 'pointer',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0px',
    overflow: 'hidden',
    width: '30px',
    maxWidth: '30px',
    transition: 'max-width 0.28s ease, width 0.28s ease, padding 0.2s ease, gap 0.2s ease, background 0.15s',
    whiteSpace: 'nowrap',
};

const favBtnHoverStyle = {
    ...favBtnStyle,
    width: 'auto',
    maxWidth: '220px',
    padding: '5px 10px',
    gap: '6px',
    justifyContent: 'flex-start',
    background: 'rgba(255,255,255,0.28)',
};

const FavShortcutBtn = ({ fav, Icon, onClick }) => {
    const [hovered, setHovered] = useState(false);
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={hovered ? favBtnHoverStyle : favBtnStyle}
        >
            <Icon size={18} style={{ flexShrink: 0 }} />
            <span style={{
                fontSize: '0.82rem',
                fontWeight: 500,
                opacity: hovered ? 1 : 0,
                maxWidth: hovered ? '180px' : '0px',
                transition: 'opacity 0.2s ease, max-width 0.28s ease',
                overflow: 'hidden',
                letterSpacing: '0.01em',
            }}>
                {fav.label}
            </span>
        </button>
    );
};

const Layout = ({ children, onLogout, title }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { societaList, selectedSocietaId, setSelectedSocietaId, selectSocieta } = useSocieta();
    const { annoOptions, selectedAnno, setSelectedAnno, formatAnnoLabel, currentRefYear } = useAnno();
    const annoDiverso = selectedAnno != null && selectedAnno !== currentRefYear;
    const navigate = useNavigate();

    // Impersonazione
    const isImpersonating = !!localStorage.getItem('impersonate_admin_token');
    const handleStopImpersonate = () => {
        const adminToken = localStorage.getItem('impersonate_admin_token');
        const adminRefreshToken = localStorage.getItem('impersonate_admin_refresh_token') || '';
        const adminRole = localStorage.getItem('impersonate_admin_role') || 'admin';
        const adminFeatures = localStorage.getItem('impersonate_admin_features') || 'null';
        localStorage.setItem('token', adminToken);
        if (adminRefreshToken) {
            localStorage.setItem('refresh_token', adminRefreshToken);
        } else {
            localStorage.removeItem('refresh_token');
        }
        localStorage.setItem('user_role', adminRole);
        localStorage.setItem('user_features', adminFeatures);
        localStorage.removeItem('impersonate_admin_token');
        localStorage.removeItem('impersonate_admin_refresh_token');
        localStorage.removeItem('impersonate_admin_role');
        localStorage.removeItem('impersonate_admin_features');
        window.location.href = '/amministrazione/utenti';
    };

    // User menu state
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [showEditProfileModal, setShowEditProfileModal] = useState(false);

    // Preferiti
    const [favorites, setFavorites] = useState({});
    const [showFavoritesModal, setShowFavoritesModal] = useState(false);

    const getFavKey = (userId) => `header-favorites-${userId}`;

    const toggleFavorite = (itemId, label, path, parentId) => {
        if (!currentUser?.id) return;
        setFavorites(prev => {
            const next = { ...prev };
            if (next[itemId]) {
                delete next[itemId];
            } else {
                next[itemId] = { label, path, parentId };
            }
            localStorage.setItem(getFavKey(currentUser.id), JSON.stringify(next));
            return next;
        });
    };

    useEffect(() => {
        // Fetch current user info
        const fetchMe = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    onLogout?.();
                    navigate('/login', { replace: true });
                    return;
                }
                const response = await fetch('/auth/api/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setCurrentUser(data);
                    // Carica i preferiti specifici dell'utente corrente (o impersonato)
                    try {
                        const saved = JSON.parse(localStorage.getItem(`header-favorites-${data.id}`) || '{}');
                        setFavorites(saved);
                    } catch { setFavorites({}); }
                    return;
                }

                if (response.status === 401 || response.status === 403) {
                    onLogout?.();
                    navigate('/login', { replace: true });
                }
            } catch (e) {
                console.error("Failed to fetch user", e);
            }
        };
        fetchMe();
    }, [onLogout, navigate]);

    // Società e anno: nella barra su desktop, dentro il menu su mobile (vedi Layout.css)
    const contestoSelettori = (
        <div className="app-bar-contesto" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '8px' }}>
            {(currentUser?.role === 'superuser' || (Array.isArray(currentUser?.societaIds) && currentUser.societaIds.length > 1)) ? (
                <select
                    className="md-select"
                    style={{ padding: '8px', borderRadius: '4px', border: 'none', backgroundColor: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
                    value={selectedSocietaId}
                    onChange={(e) => (currentUser?.role === 'superuser' ? setSelectedSocietaId(e.target.value) : selectSocieta(e.target.value))}
                >
                    {[...societaList].sort((a, b) => (a.denominazione || '').localeCompare(b.denominazione || '', 'it', { sensitivity: 'base' })).map(s => (
                        <option key={s.id} value={s.id} style={{color: 'black'}}>{s.denominazione}</option>
                    ))}
                </select>
            ) : (
                <span style={{
                    padding: '8px 16px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    color: 'white',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    minWidth: '220px',
                    display: 'inline-block',
                    textAlign: 'center',
                }}>
                    {societaList.find(s => s.id == selectedSocietaId)?.denominazione || ''}
                </span>
            )}
            <div
                title={annoDiverso ? `Attenzione: stai operando su un anno associativo diverso da quello corrente (${formatAnnoLabel(currentRefYear)})` : undefined}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', ...(annoDiverso ? { padding: '2px 6px 2px 8px', borderRadius: '6px', backgroundColor: '#f59e0b', boxShadow: '0 0 0 2px rgba(245,158,11,0.4)' } : {}) }}
            >
                {annoDiverso && <AlertTriangle size={16} color="#7c2d12" strokeWidth={2.5} />}
                <select
                    className="md-select"
                    style={{ padding: '8px', paddingRight: '28px', minWidth: '130px', width: 'auto', borderRadius: '4px', border: 'none', backgroundColor: annoDiverso ? 'rgba(255,255,255,0.9)' : 'rgba(255, 255, 255, 0.2)', color: annoDiverso ? '#7c2d12' : 'white', fontWeight: annoDiverso ? 700 : 'normal' }}
                    value={selectedAnno ?? ''}
                    onChange={(e) => setSelectedAnno(parseInt(e.target.value, 10))}
                >
                    {annoOptions.map(anno => (
                        <option key={anno} value={anno} style={{color: 'black'}}>{formatAnnoLabel(anno)}</option>
                    ))}
                </select>
            </div>
        </div>
    );

    const puoCambiareSocieta = currentUser?.role === 'superuser' || (Array.isArray(currentUser?.societaIds) && currentUser.societaIds.length > 1);
    const societaOrdinate = [...societaList].sort((a, b) => (a.denominazione || '').localeCompare(b.denominazione || '', 'it', { sensitivity: 'base' }));

    // Versione per il menu su mobile: etichette, campi a tutta larghezza, sfondo chiaro
    const contestoMenu = (
        <div className="sidebar-contesto">
            <label className="sidebar-campo">
                <span>Società</span>
                {puoCambiareSocieta ? (
                    <select
                        className="md-select"
                        value={selectedSocietaId}
                        onChange={(e) => (currentUser?.role === 'superuser' ? setSelectedSocietaId(e.target.value) : selectSocieta(e.target.value))}
                    >
                        {societaOrdinate.map(s => <option key={s.id} value={s.id}>{s.denominazione}</option>)}
                    </select>
                ) : (
                    <strong className="sidebar-societa">{societaList.find(s => s.id == selectedSocietaId)?.denominazione || ''}</strong>
                )}
            </label>
            <label className={`sidebar-campo${annoDiverso ? ' sidebar-campo--avviso' : ''}`}>
                <span>Anno associativo</span>
                <select className="md-select" value={selectedAnno ?? ''} onChange={(e) => setSelectedAnno(parseInt(e.target.value, 10))}>
                    {annoOptions.map(anno => <option key={anno} value={anno}>{formatAnnoLabel(anno)}</option>)}
                </select>
                {annoDiverso && (
                    <small><AlertTriangle size={13} strokeWidth={2.5} /> Non è l'anno corrente ({formatAnnoLabel(currentRefYear)})</small>
                )}
            </label>
        </div>
    );

    // Preferiti dentro il menu su mobile: etichette sempre visibili, senza effetto hover
    const preferitiMobile = (
        <div className="sidebar-preferiti">
            {Object.entries(favorites).map(([id, fav]) => {
                const Icon = MENU_STRUCTURE.find(m => m.id === fav.parentId)?.Icon;
                if (!Icon) return null;
                return (
                    <button key={id} type="button" className="sidebar-preferito" onClick={() => { setSidebarOpen(false); navigate(fav.path); }}>
                        <Icon size={16} /> {fav.label}
                    </button>
                );
            })}
            <button type="button" className="sidebar-preferito sidebar-preferito--gestisci" onClick={() => { setSidebarOpen(false); setShowFavoritesModal(true); }}>
                <Star size={16} /> {Object.keys(favorites).length ? 'Gestisci' : 'Aggiungi preferiti'}
            </button>
        </div>
    );

    return (
        <div className="layout-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                bannerHeight={isImpersonating ? 40 : 0}
                contesto={contestoMenu}
                preferiti={preferitiMobile}
            />

            {/* Banner impersonazione */}
            {isImpersonating && (
                <div style={{
                    backgroundColor: 'var(--warning)',
                    color: 'white',
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    flexShrink: 0,
                    zIndex: 1200,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <UserCheck size={16} />
                        Stai operando come <strong style={{ marginLeft: '4px' }}>{currentUser?.email || '...'}</strong>
                        {currentUser?.nome || currentUser?.cognome
                            ? ` (${[currentUser.cognome, currentUser.nome].filter(Boolean).join(' ')})`
                            : ''}
                    </div>
                    <button
                        onClick={handleStopImpersonate}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            border: '1px solid rgba(255,255,255,0.5)',
                            borderRadius: '4px',
                            color: 'white',
                            padding: '4px 12px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        <ArrowLeftCircle size={14} /> Torna al tuo account
                    </button>
                </div>
            )}

            {/* AppBar */}
            <div className="app-bar" style={{
                height: '64px', 
                backgroundColor: 'var(--header-bg, var(--primary-color))',
                color: 'white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '0 16px',
                flexShrink: 0
            }}>
                <div className="app-bar-sinistra" style={{display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap'}}>
                    <button className="icon-btn profile-btn" onClick={() => setSidebarOpen(prev => !prev)} style={{ color: 'white' }} aria-label="Apri il menu" aria-expanded={sidebarOpen}>
                        <Menu size={24}/>
                    </button>
                    <h1 className="app-bar-titolo" style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: 'white' }}>{title}</h1>
                    {annoDiverso && (
                        // Solo mobile: l'avviso dell'anno diverso resta visibile anche con i selettori nel menu
                        <button type="button" className="app-bar-avviso-anno" onClick={() => setSidebarOpen(true)}
                            title={`Stai operando su ${formatAnnoLabel(selectedAnno)}, non sull'anno corrente`}>
                            <AlertTriangle size={14} strokeWidth={2.5} /> {formatAnnoLabel(selectedAnno)}
                        </button>
                    )}
                    {Object.entries(favorites).map(([id, fav]) => {
                        const parentItem = MENU_STRUCTURE.find(m => m.id === fav.parentId);
                        const Icon = parentItem?.Icon;
                        if (!Icon) return null;
                        return (
                            <span key={id} className="app-bar-preferiti"><FavShortcutBtn fav={fav} Icon={Icon} onClick={() => navigate(fav.path)} /></span>
                        );
                    })}
                    <button
                        className="app-bar-preferiti"
                        onClick={() => setShowFavoritesModal(true)}
                        title="Gestisci preferiti"
                        style={{
                            background: 'rgba(255,255,255,0.15)',
                            border: '1px solid rgba(255,255,255,0.4)',
                            borderRadius: '6px',
                            padding: '5px',
                            cursor: 'pointer',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Star size={16} />
                    </button>
                </div>
                <div className="app-bar-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {contestoSelettori}
                    <div style={{position:'relative'}}>
                        <button className="icon-btn profile-btn" onClick={() => setShowProfileMenu(!showProfileMenu)} style={{ color: 'white' }}>
                            <User size={24}/>
                        </button>
                        {showProfileMenu && (
                            <>
                                <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, zIndex: 109}} onClick={() => setShowProfileMenu(false)}></div>
                                <div style={{
                                    position: 'absolute', right: 0, top: '100%', marginTop: '4px',
                                    backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '4px',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 110, minWidth: '180px',
                                    padding: '8px 0', display:'flex', flexDirection:'column',
                                    color: '#333'
                                }}>
                                    {currentUser && (
                                        <div style={{padding: '8px 16px', borderBottom: '1px solid #eee', marginBottom: '4px'}}>
                                            <div style={{fontWeight: '500', fontSize: '0.9rem'}}>{currentUser.nome} {currentUser.cognome}</div>
                                            <div style={{fontSize: '0.75rem', color: '#666'}}>{currentUser.email}</div>
                                        </div>
                                    )}
                                    <button 
                                        onClick={() => { setShowProfileMenu(false); setShowEditProfileModal(true); }}
                                        style={{
                                            all: 'unset',
                                            padding: '10px 16px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            fontSize: '0.9rem',
                                            color: '#333'
                                        }}
                                        className="menu-item-hover"
                                    >
                                        <Edit size={16} /> Modifica profilo
                                    </button>
                                    <button 
                                        onClick={onLogout}
                                        style={{
                                            all: 'unset',
                                            padding: '10px 16px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            fontSize: '0.9rem',
                                            color: 'var(--danger)'
                                        }}
                                        className="menu-item-hover"
                                    >
                                        <LogOut size={16} /> Logout
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="content-area" style={{ flex: 1, overflow: 'auto', padding: '16px', backgroundColor: 'var(--bg)' }}>
                {children}
            </div>

            {showEditProfileModal && (
                <EditProfileModal isOpen={showEditProfileModal} onClose={() => setShowEditProfileModal(false)} />
            )}
            <FavoritesModal
                isOpen={showFavoritesModal}
                onClose={() => setShowFavoritesModal(false)}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
            />
        </div>
    );
};

export default Layout;
