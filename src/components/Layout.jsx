import React, { useState, useEffect } from 'react';
import { Menu, LogOut, User, Edit } from 'lucide-react';
import Sidebar from './Sidebar';
import { useSocieta } from '../data/SocietaContext';
import { useAnno } from '../data/AnnoContext';
import EditProfileModal from '../pages/EditProfileModal'; // Assuming we can reuse this, or move it to components

const Layout = ({ children, onLogout, title }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { societaList, selectedSocietaId, setSelectedSocietaId } = useSocieta();
    const { annoOptions, selectedAnno, setSelectedAnno, formatAnnoLabel } = useAnno();
    
    // User menu state
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [showEditProfileModal, setShowEditProfileModal] = useState(false);

    useEffect(() => {
        // Fetch current user info
        const fetchMe = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const response = await fetch('/auth/api/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setCurrentUser(data);
                }
            } catch (e) {
                console.error("Failed to fetch user", e);
            }
        };
        fetchMe();
    }, []);

    return (
        <div className="layout-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            
            {/* AppBar */}
            <div className="app-bar" style={{
                height: '64px', 
                backgroundColor: 'var(--primary-color)', 
                color: 'white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '0 16px',
                flexShrink: 0
            }}>
                <div style={{display:'flex', alignItems:'center', gap:'16px'}}>
                    <button className="icon-btn profile-btn" onClick={() => setSidebarOpen(true)} style={{ color: 'white' }}>
                        <Menu size={24}/>
                    </button>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 500, margin: 0 }}>{title}</h1>
                </div>
                <div className="app-bar-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '8px' }}>
                        <select
                            className="md-select"
                            style={{ padding: '8px', borderRadius: '4px', border: 'none', backgroundColor: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
                            value={selectedSocietaId}
                            onChange={(e) => setSelectedSocietaId(e.target.value)}
                        >
                            {societaList.map(s => (
                                <option key={s.id} value={s.id} style={{color: 'black'}}>{s.denominazione}</option>
                            ))}
                        </select>
                        <select
                            className="md-select"
                            style={{ padding: '8px', borderRadius: '4px', border: 'none', backgroundColor: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
                            value={selectedAnno ?? ''}
                            onChange={(e) => setSelectedAnno(parseInt(e.target.value, 10))}
                        >
                            {annoOptions.map(anno => (
                                <option key={anno} value={anno} style={{color: 'black'}}>{formatAnnoLabel(anno)}</option>
                            ))}
                        </select>
                    </div>
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
                                            color: '#d32f2f'
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

            <div className="content-area" style={{ flex: 1, overflow: 'auto', padding: '16px', backgroundColor: '#f5f5f5' }}>
                {children}
            </div>

            {showEditProfileModal && (
                <EditProfileModal isOpen={showEditProfileModal} onClose={() => setShowEditProfileModal(false)} />
            )}
        </div>
    );
};

export default Layout;
