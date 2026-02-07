import React, { useState, useEffect } from 'react';
import './Soci.css';
import SocioModal from './SocioModal';
import AdvancedSearchSidebar from '../components/AdvancedSearchSidebar';
import { Search, Plus, Filter, User, Mail, CreditCard, Menu, Bell, Settings, MoreVertical, Zap, QrCode, FileSpreadsheet, Check, X, Calendar, ListOrdered, Star, Tag, ClipboardList, RefreshCw } from 'lucide-react';

const Soci = ({ onLogout }) => {
    const [soci, setSoci] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showActionsMenu, setShowActionsMenu] = useState(false);

    useEffect(() => {
        fetchSoci();
    }, []);

    const fetchSoci = async () => {
        try {
            const response = await fetch('/users/api/soci');
            const data = await response.json();
            if (Array.isArray(data)) {
                setSoci(data);
            }
        } catch (error) {
            console.error('Error fetching soci:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSocio = async (formData) => {
        try {
            // Need to set a dummy user_id because the backend requires it.
            // In a real app we might create a user account first or handle it differently.
            const payload = {
                ...formData,
                user_id: 99999 + Math.floor(Math.random() * 100000) // Temporary Hack for DB constraint
            };
            
            const response = await fetch('/users/api/soci', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setShowModal(false);
                fetchSoci();
            } else {
                const err = await response.json();
                alert('Errore creazione: ' + (err.error || err.message));
            }
        } catch (error) {
            alert('Errore di rete');
        }
    };

    return (
        <div className="soci-full-container">
            {/* AppBar */}
            <div className="app-bar">
                <div style={{display:'flex', alignItems:'center', gap:'16px'}}>
                    <button className="icon-btn"><Menu size={24}/></button>
                    <h1>Gestione Soci</h1>
                </div>
                <div className="app-bar-actions">
                    <button className="icon-btn"><Search size={24}/></button>
                    <button className="icon-btn"><Bell size={24}/></button>
                    <button className="icon-btn" onClick={onLogout}><Settings size={24}/></button>
                </div>
            </div>

            <div className="main-content">
                {/* Filters Toolbar */}
                <div className="toolbar-card" style={{display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'stretch'}}>
                    <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '12px'}}>
                        
                        {/* Cognome */}
                        <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '120px'}}>
                            <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Cognome</label>
                            <input className="md-input" placeholder="Cognome" style={{width: '100%', padding: '6px 12px'}} />
                        </div>
                        
                        {/* Nome */}
                        <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '120px'}}>
                            <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Nome</label>
                            <input className="md-input" placeholder="Nome" style={{width: '100%', padding: '6px 12px'}} />
                        </div>

                        {/* Iscritto */}
                        <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '100px'}}>
                            <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Iscritto</label>
                            <select className="md-select" style={{width: '100%', padding: '6px 12px'}}>
                                <option value="">TUTTI</option>
                                <option value="1">SI</option>
                                <option value="0">NO</option>
                            </select>
                        </div>

                        {/* Cert. medico */}
                        <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '120px'}}>
                            <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Cert. medico</label>
                            <select className="md-select" style={{width: '100%', padding: '6px 12px'}}>
                                <option value="">TUTTI</option>
                                <option value="2">VALIDO</option>
                                <option value="1">IN SCADENZA</option>
                                <option value="0">SCADUTO</option>
                            </select>
                        </div>

                        {/* Pagamenti */}
                        <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '120px'}}>
                            <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Pagamenti</label>
                            <select className="md-select" style={{width: '100%', padding: '6px 12px'}}>
                                <option value="">TUTTI</option>
                                <option value="0">REGOLARI</option>
                                <option value="1">NON REGOLARI</option>
                            </select>
                        </div>

                        {/* Liste */}
                        <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '120px'}}>
                            <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Liste</label>
                            <select className="md-select" style={{width: '100%', padding: '6px 12px'}}>
                                <option value="">TUTTI</option>
                                <option value="4614">Aerobica</option>
                                <option value="4356">THAI BOXE</option>
                                <option value="4257">U13</option>
                            </select>
                        </div>

                         {/* Accesso tornello (Hidden as per request) */}
                         <div style={{display:'none', flexDirection:'column', borderRight: '1px solid black', paddingRight: '15px'}}>
                            <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Accesso tornello</label>
                            <select className="md-select" style={{width: '110px'}}>
                                <option value="">TUTTI</option>
                                <option value="1">ABILITATO</option>
                                <option value="0">NON ABILITATO</option>
                            </select>
                        </div>
                        
                        {/* Ricerca Avanzata Button */}
                         <button 
                            className="btn-contained" 
                            style={{backgroundColor:'#17a2b8', height: '35px', display:'flex', alignItems:'center', gap:'8px', fontSize:'0.9rem', padding: '0 12px'}}
                            onClick={() => setShowAdvancedSearch(true)}
                         >
                            <Search size={14}/> Ricerca avanzata
                        </button>

                         {/* Altre azioni Dropdown */}
                        <div style={{position:'relative'}}>
                             <button 
                                className="btn-contained" 
                                style={{backgroundColor: 'var(--primary-color)', height: '35px', display:'flex', alignItems:'center', gap:'8px', fontSize:'0.9rem', padding: '0 12px'}} 
                                onClick={() => setShowActionsMenu(!showActionsMenu)}
                             >
                                <Zap size={14}/> Altre azioni
                            </button>
                            {showActionsMenu && (
                                <>
                                <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, zIndex: 9}} onClick={() => setShowActionsMenu(false)}></div>
                                <div style={{
                                    position: 'absolute', right: 0, top: '100%', marginTop: '4px',
                                    backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '4px',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 10, minWidth: '240px',
                                    padding: '8px 0', display:'flex', flexDirection:'column'
                                }}>
                                    <div style={{padding: '8px 16px', fontSize:'0.75rem', fontWeight:'bold', color:'#333', backgroundColor:'#f8f9fa'}}>Azioni sui soci filtrati</div>
                                    <button className="dropdown-item-custom"><Mail size={16}/> Invia comunicazione</button>
                                    <button className="dropdown-item-custom"><QrCode size={16}/> Stampa tessere</button>
                                    <button className="dropdown-item-custom"><FileSpreadsheet size={16}/> Esporta Excel</button>
                                    <button className="dropdown-item-custom"><Check size={16}/> Iscrizione diretta</button>
                                    <button className="dropdown-item-custom"><X size={16}/> Revoca iscrizione</button>
                                    <button className="dropdown-item-custom"><Calendar size={16}/> Accetta come soci</button>
                                    <button className="dropdown-item-custom"><ListOrdered size={16}/> Imposta livello</button>
                                    <button className="dropdown-item-custom"><Star size={16}/> Imposta valutazione</button>
                                    <button className="dropdown-item-custom"><Tag size={16}/> Aggiungi a lista</button>
                                    <button className="dropdown-item-custom"><X size={16}/> Rimuovi da lista</button>
                                    <button className="dropdown-item-custom"><ClipboardList size={16}/> Associa scadenzario</button>
                                    <div style={{height:'1px', backgroundColor:'#e9ecef', margin:'4px 0'}}></div>
                                    <div style={{padding: '8px 16px', fontSize:'0.75rem', fontWeight:'bold', color:'#333', backgroundColor:'#f8f9fa'}}>Altre azioni</div>
                                    <button className="dropdown-item-custom"><Tag size={16}/> Gestione liste</button>
                                    <button className="dropdown-item-custom" style={{display:'none'}}><FileSpreadsheet size={16}/> Carica anagrafiche da Excel</button>
                                    <button className="dropdown-item-custom" style={{display:'none'}}><RefreshCw size={16}/> Rielabora whitelist</button>
                                    {/* Accessi hidden */}
                                </div>
                                </>
                            )}
                        </div>

                        {/* Nuovo Socio Button (Green) */}
                        <button 
                            className="btn-contained" 
                            style={{backgroundColor: 'var(--success-color)', height: '35px', display:'flex', alignItems:'center', gap:'8px', fontSize:'0.9rem', padding: '0 12px'}} 
                            onClick={() => setShowModal(true)}
                        >
                            <Plus size={14}/> Nuovo socio
                        </button>

                    </div>
                </div>

                {/* Data Table */}
                <div className="table-card">
                    <div className="table-responsive">
                        <table className="md-table">
                            <thead>
                                <tr>
                                    <th style={{width: '60px'}}></th> {/* Avatar */}
                                    <th>Nominativo</th>
                                    <th>Dati di nascita</th>
                                    <th>Stato Iscrizione</th>
                                    <th>Certificato Medico</th>
                                    <th>Contatti</th>
                                    <th style={{textAlign:'right'}}>Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {soci.map(socio => (
                                    <tr key={socio.id}>
                                        <td>
                                            <div style={{
                                                width:'40px', height:'40px', borderRadius:'50%', 
                                                backgroundColor:'#e3f2fd', color:'#1976d2',
                                                display:'flex', alignItems:'center', justifyContent:'center'
                                            }}>
                                                <User size={20}/>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{fontWeight: 500}}>{socio.cognome} {socio.nome}</div>
                                            <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
                                                Livello: {socio.livello}
                                            </div>
                                        </td>
                                        <td>
                                            {socio.data_nascita}
                                        </td>
                                        <td>
                                            <span className={`chip ${socio.is_active ? 'iscritto' : 'non-iscritto'}`}>
                                                {socio.is_active ? 'ISCRITTO' : 'NON ISCRITTO'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`chip ${!socio.scadenza_certificato ? 'warning' : 'info'}`}>
                                                {socio.scadenza_certificato || 'MANCANTE'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{fontSize: '0.875rem'}}>{socio.telefono}</div>
                                        </td>
                                        <td style={{textAlign:'right'}}>
                                            <button className="btn-icon-small" title="Invia Email"><Mail size={18}/></button>
                                            <button className="btn-icon-small" title="Pagamenti"><CreditCard size={18}/></button>
                                            <button className="btn-icon-small"><MoreVertical size={18}/></button>
                                        </td>
                                    </tr>
                                ))}
                                {soci.length === 0 && (
                                    <tr>
                                        <td colSpan="7" style={{textAlign:'center', padding:'32px', color:'var(--text-secondary)'}}>
                                            Nessun socio trovato
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>



            {showModal && <SocioModal onClose={() => setShowModal(false)} onSave={handleCreateSocio} />}
            
            <AdvancedSearchSidebar 
                isOpen={showAdvancedSearch} 
                onClose={() => setShowAdvancedSearch(false)} 
            />
        </div>
    );
};

export default Soci;
