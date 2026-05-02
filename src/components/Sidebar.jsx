import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, ChevronDown } from 'lucide-react';
import { getVisibleMenu } from './menuConfig';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose, bannerHeight = 0 }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [openGroups, setOpenGroups] = React.useState({});

    const toggleGroup = (id) => setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));

    const handleNavigation = (path) => {
        navigate(path);
        onClose();
    };

    const visibleMenu = getVisibleMenu();

    return (
        <>
            {isOpen && <div className="sidebar-overlay" onClick={onClose} style={{ top: bannerHeight }}></div>}
            <div className={`sidebar ${isOpen ? 'open' : ''}`} style={{ top: bannerHeight }}>
                <div className="sidebar-header">
                    <h2>Menu</h2>
                    <button className="icon-btn" onClick={onClose}><X size={24} /></button>
                </div>
                <div className="sidebar-content">
                    {visibleMenu.map(item => (
                        <React.Fragment key={item.id}>
                            {item.children ? (
                                <>
                                    <div className="sidebar-item" onClick={() => toggleGroup(item.id)}>
                                        <item.Icon size={20} />
                                        <span>{item.label}</span>
                                        <ChevronDown size={16} style={{ marginLeft: 'auto', transform: openGroups[item.id] ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                    </div>
                                    {openGroups[item.id] && (
                                        <div className="sidebar-sub-menu">
                                            {item.children.map(child => (
                                                <div
                                                    key={child.id}
                                                    className={`sidebar-sub-item ${location.pathname === child.path ? 'active' : ''}`}
                                                    onClick={() => handleNavigation(child.path)}
                                                >
                                                    <span>{child.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div
                                    className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
                                    onClick={() => handleNavigation(item.path)}
                                >
                                    <item.Icon size={20} />
                                    <span>{item.label}</span>
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </>
    );
};

export default Sidebar;
