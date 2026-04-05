import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Home, Briefcase, Settings, ChevronDown, List, User, FileText, ShoppingBag, CreditCard } from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isSocietaOpen, setIsSocietaOpen] = React.useState(false);
    const [isModulisticaOpen, setIsModulisticaOpen] = React.useState(false);
    const [isPagamentiOpen, setIsPagamentiOpen] = React.useState(false);

    const handleNavigation = (path) => {
        navigate(path);
        onClose(); // Close sidebar on mobile/small screens or arguably always
    };

    return (
        <>
            {isOpen && <div className="sidebar-overlay" onClick={onClose}></div>}
            <div className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <h2>Menu</h2>
                    <button className="icon-btn" onClick={onClose}><X size={24} /></button>
                </div>
                <div className="sidebar-content">
                    <div className="sidebar-item" onClick={() => setIsSocietaOpen(!isSocietaOpen)}>
                        <Briefcase size={20} />
                        <span>Società</span>
                        <ChevronDown size={16} style={{ marginLeft: 'auto', transform: isSocietaOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </div>
                    
                    {isSocietaOpen && (
                        <div className="sidebar-sub-menu">
                            <div 
                                className={`sidebar-sub-item ${location.pathname === '/societa/anagrafica' ? 'active' : ''}`}
                                onClick={() => handleNavigation('/societa/anagrafica')}
                            >
                                <span>Anagrafica</span>
                            </div>
                            <div 
                                className={`sidebar-sub-item ${location.pathname === '/societa/anno-contabile' ? 'active' : ''}`}
                                onClick={() => handleNavigation('/societa/anno-contabile')}
                            >
                                <span>Anno contabile</span>
                            </div>
                            <div 
                                className={`sidebar-sub-item ${location.pathname === '/societa/comunicazioni' ? 'active' : ''}`}
                                onClick={() => handleNavigation('/societa/comunicazioni')}
                            >
                                <span>Comunicazioni</span>
                            </div>
                            <div 
                                className={`sidebar-sub-item ${location.pathname === '/societa/impostazioni' ? 'active' : ''}`}
                                onClick={() => handleNavigation('/societa/impostazioni')}
                            >
                                <span>Impostazioni</span>
                            </div>
                        </div>
                    )}

                    <div className="sidebar-item" onClick={() => handleNavigation('/soci')}>
                        <User size={20} />
                        <span>Soci</span>
                    </div>

                    <div className="sidebar-item" onClick={() => handleNavigation('/prodotti')}>
                        <ShoppingBag size={20} />
                        <span>Prodotti</span>
                    </div>

                    <div className="sidebar-item" onClick={() => setIsPagamentiOpen(!isPagamentiOpen)}>
                        <CreditCard size={20} />
                        <span>Pagamenti</span>
                        <ChevronDown size={16} style={{ marginLeft: 'auto', transform: isPagamentiOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </div>

                    {isPagamentiOpen && (
                        <div className="sidebar-sub-menu">
                            <div 
                                className={`sidebar-sub-item ${location.pathname === '/pagamenti' ? 'active' : ''}`}
                                onClick={() => handleNavigation('/pagamenti')}
                            >
                                <span>Lista pagamenti</span>
                            </div>
                            <div 
                                className={`sidebar-sub-item ${location.pathname === '/pagamenti/conti' ? 'active' : ''}`}
                                onClick={() => handleNavigation('/pagamenti/conti')}
                            >
                                <span>Conti</span>
                            </div>
                        </div>
                    )}

                    <div className="sidebar-item" onClick={() => setIsModulisticaOpen(!isModulisticaOpen)}>
                        <FileText size={20} />
                        <span>Modulistica</span>
                        <ChevronDown size={16} style={{ marginLeft: 'auto', transform: isModulisticaOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </div>

                    {isModulisticaOpen && (
                        <div className="sidebar-sub-menu">
                             <div 
                                className={`sidebar-sub-item ${location.pathname === '/modulistica' ? 'active' : ''}`}
                                onClick={() => handleNavigation('/modulistica')}
                            >
                                <span>Moduli</span>
                            </div>
                            <div 
                                className={`sidebar-sub-item ${location.pathname === '/modulistica/template' ? 'active' : ''}`}
                                onClick={() => handleNavigation('/modulistica/template')}
                            >
                                <span>Template di Stampa</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default Sidebar;
