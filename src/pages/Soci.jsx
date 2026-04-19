import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Soci.css';
import SocioModal from './SocioModal';
import EditProfileModal from './EditProfileModal';
import ComunicazioneModal from '../components/ComunicazioneModal';
import AdvancedSearchSidebar from '../components/AdvancedSearchSidebar';
import { useSocieta } from '../data/SocietaContext';
import { useAnno, getAnnoDateRange } from '../data/AnnoContext';
import { Search, Plus, Filter, User, Mail, CreditCard, Menu, Bell, Settings, MoreVertical, Zap, QrCode, FileSpreadsheet, Check, X, Calendar, ListOrdered, Star, Tag, ClipboardList, RefreshCw, Euro, LogOut, Edit } from 'lucide-react';

const Soci = ({ onLogout }) => {
    const { selectedSocietaId, societaList } = useSocieta();
    const { selectedAnno } = useAnno();
    const [soci, setSoci] = useState([]);
    const [quotaPaymentCFs, setQuotaPaymentCFs] = useState(new Set());
    const [pastQuotaPaymentCFs, setPastQuotaPaymentCFs] = useState(new Set());
    const [tessCurrentCFs, setTessCurrentCFs] = useState(new Set());
    const [tessAnyPastCFs, setTessAnyPastCFs] = useState(new Set());
    const [showModal, setShowModal] = useState(false);
    const [showEditProfileModal, setShowEditProfileModal] = useState(false);
    const [showComunicazioneModal, setShowComunicazioneModal] = useState(false);
    const [selectedSocio, setSelectedSocio] = useState(null);
    const [comunicazioneSocioId, setComunicazioneSocioId] = useState(null);
    const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    const location = useLocation();
    const navigate = useNavigate();
    const [hasOpenedFromUrl, setHasOpenedFromUrl] = useState(false);

    useEffect(() => {
        if (soci && soci.length > 0 && !hasOpenedFromUrl) {
            const params = new URLSearchParams(location.search);
            const apriSocioId = params.get('apriSocioPath');
            if (apriSocioId) {
                const socioDaAprire = soci.find(s => s.id.toString() === apriSocioId);
                if (socioDaAprire) {
                    setSelectedSocio(socioDaAprire);
                    setShowModal(true);
                    setHasOpenedFromUrl(true);
                }
            }
        }
    }, [soci, location.search, hasOpenedFromUrl]);
    

    // Fetch pagamenti quota_associativa per la società e filtra per anno selezionato
    useEffect(() => {
        const fetchQuotaPayments = async () => {
            if (!selectedSocietaId || !selectedAnno) return;
            const societa = societaList.find(s => s.id == selectedSocietaId);
            const { start, end } = getAnnoDateRange(selectedAnno, societa);
            try {
                const response = await fetch(`/payments/api?societa_id=${selectedSocietaId}`);
                if (!response.ok) return;
                const data = await response.json();
                const iscrPagamenti = data.filter(p =>
                    p.quote_types && p.quote_types.split(',').includes('quota_associativa') && p.codice_fiscale
                );
                const currCfs = new Set(
                    iscrPagamenti
                        .filter(p => {
                            if (!p.data_pagamento) return false;
                            const d = new Date(p.data_pagamento);
                            return d >= start && d <= end;
                        })
                        .map(p => p.codice_fiscale.toUpperCase())
                );
                const pastCfs = new Set(
                    iscrPagamenti
                        .filter(p => {
                            if (!p.data_pagamento) return false;
                            const d = new Date(p.data_pagamento);
                            return d < start;
                        })
                        .map(p => p.codice_fiscale.toUpperCase())
                );
                setQuotaPaymentCFs(currCfs);
                setPastQuotaPaymentCFs(pastCfs);

                // Tesseramento
                const tessPagamenti = data.filter(p =>
                    p.quote_types && p.quote_types.split(',').includes('tesseramento') && p.codice_fiscale
                );
                const tessCurrentSet = new Set(
                    tessPagamenti
                        .filter(p => {
                            if (!p.data_pagamento) return false;
                            const d = new Date(p.data_pagamento);
                            return d >= start && d <= end;
                        })
                        .map(p => p.codice_fiscale.toUpperCase())
                );
                const tessAnyPastSet = new Set(
                    tessPagamenti
                        .filter(p => {
                            if (!p.data_pagamento) return false;
                            const d = new Date(p.data_pagamento);
                            return d < start;
                        })
                        .map(p => p.codice_fiscale.toUpperCase())
                );
                setTessCurrentCFs(tessCurrentSet);
                setTessAnyPastCFs(tessAnyPastSet);
            } catch (e) {
                console.error('Error fetching quota payments', e);
            }
        };
        fetchQuotaPayments();
    }, [selectedSocietaId, selectedAnno, societaList]);

    useEffect(() => {
        // Fetch current user info for the menu
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

    const [filters, setFilters] = useState({
        cognome: '',
        nome: '',
        iscritto: '',
        certMedico: '',
        pagamenti: '',
        lista: ''
    });

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const getCertStatus = (dateString) => {
        if (!dateString) return 'MISSING';
        const date = new Date(dateString);
        const today = new Date();
        const d = new Date(date); d.setHours(0,0,0,0);
        const t = new Date(today); t.setHours(0,0,0,0);
        
        if (d < t) return '0'; // Scaduto
        
        const diffTime = d - t;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 30) return '1'; // In scadenza
        return '2'; // Valido
    };

    const getTesseratoLabel = (socio) => {
        const cf = (socio.codice_fiscale || '').toUpperCase();
        if (tessCurrentCFs.has(cf)) return 'REGOLARE';
        // Se "Quota associativa e Tesseramento Unico" è attivo, ISCRITTO vale come REGOLARE
        const currentSocieta = societaList.find(s => s.id == selectedSocietaId);
        if (currentSocieta?.quota_tesseramento_unico && getIscrizioneLabel(socio) === 'ISCRITTO') return 'REGOLARE';
        if (tessAnyPastCFs.has(cf)) return 'SCADUTO';
        return 'NO';
    };

    const getIscrizioneLabel = (socio) => {
        // SOCIO: ha data ammissione libro soci
        if (socio.data_ammissione) return 'SOCIO';
        const cf = (socio.codice_fiscale || '').toUpperCase();
        // ISCRITTO: ha iscrizione per l'anno corrente o pagamento quota nell'anno corrente
        const hasCurrentIscrizione = (socio.iscrizioni || []).some(i => i.anno === selectedAnno);
        if (hasCurrentIscrizione || quotaPaymentCFs.has(cf)) return 'ISCRITTO';
        // SCADUTO: ha iscrizioni per anni precedenti o pagamenti di anni precedenti
        const hasPastIscrizione = (socio.iscrizioni || []).some(i => i.anno < selectedAnno);
        if (hasPastIscrizione || pastQuotaPaymentCFs.has(cf)) return 'SCADUTO';
        return 'NO';
    };

    const filteredSoci = soci.filter(socio => {
        if (filters.cognome && (!socio.cognome || !socio.cognome.toLowerCase().includes(filters.cognome.toLowerCase()))) return false;
        if (filters.nome && (!socio.nome || !socio.nome.toLowerCase().includes(filters.nome.toLowerCase()))) return false;
        
        if (filters.iscritto !== '') {
            const label = getIscrizioneLabel(socio);
            if (filters.iscritto === '1' && label !== 'ISCRITTO' && label !== 'SOCIO') return false;
            if (filters.iscritto === '0' && (label === 'ISCRITTO' || label === 'SOCIO')) return false;
        }

        if (filters.certMedico !== '') {
            const status = getCertStatus(socio.scadenza_certificato);
            if (status !== filters.certMedico) return false;
        }
        
        return true;
    });

    useEffect(() => {
        // Reset UI state e ricarica dati al cambio società
        setFilters({ cognome: '', nome: '', iscritto: '', certMedico: '', pagamenti: '', lista: '' });
        setShowModal(false);
        setShowEditProfileModal(false);
        setShowComunicazioneModal(false);
        setSelectedSocio(null);
        setComunicazioneSocioId(null);
        setShowAdvancedSearch(false);
        setHasOpenedFromUrl(false);
        if (selectedSocietaId) {
            fetchSoci();
        } else {
            setSoci([]);
        }
    }, [selectedSocietaId]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchSoci = async () => {
        if (!selectedSocietaId) return;
        try {
            const response = await fetch(`/users/api/soci?societa_id=${selectedSocietaId}`);
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

    const handleSaveSocio = async (formData) => {
        try {
            const isUpdate = !!formData.id;
            const url = isUpdate ? `/users/api/soci/${formData.id}` : '/users/api/soci';
            const method = isUpdate ? 'PUT' : 'POST';

            // Need to set a dummy user_id because the backend requires it for creation
            // In a real app we might create a user account first or handle it differently.
            const payload = {
                ...formData,
                user_id: !isUpdate ? 99999 + Math.floor(Math.random() * 100000) : (formData.user_id || 99999),
                societa_id: selectedSocietaId
            };
            
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setShowModal(false);
                fetchSoci();
            } else {
                const err = await response.json();
                alert('Errore salvataggio: ' + (err.error || err.message));
            }
        } catch (error) {
            console.error(error);
            alert('Errore di rete');
        }
    };

    const handleEditSocio = (socio) => {
        setSelectedSocio(socio);
        setShowModal(true);
    };

    const handleOpenComunicazione = (socioId) => {
        setComunicazioneSocioId(socioId);
        setShowComunicazioneModal(true);
    };

    return (
        <div className="soci-full-container">
            {/* AppBar removed, using Layout */}
            
            <div className="main-content">
                {/* Filters Toolbar */}
                <div className="toolbar-card" style={{display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'stretch'}}>
                    <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '12px'}}>
                        
                        {/* Cognome */}
                        <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '120px'}}>
                            <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Cognome</label>
                            <input 
                                className="md-input" 
                                placeholder="Cognome" 
                                style={{width: '100%', padding: '6px 12px'}} 
                                value={filters.cognome}
                                onChange={(e) => handleFilterChange('cognome', e.target.value)}
                            />
                        </div>
                        
                        {/* Nome */}
                        <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '120px'}}>
                            <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Nome</label>
                            <input 
                                className="md-input" 
                                placeholder="Nome" 
                                style={{width: '100%', padding: '6px 12px'}} 
                                value={filters.nome}
                                onChange={(e) => handleFilterChange('nome', e.target.value)}
                            />
                        </div>

                        {/* Iscritto */}
                        <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '100px'}}>
                            <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Iscritto</label>
                            <select 
                                className="md-select" 
                                style={{width: '100%', padding: '6px 12px'}}
                                value={filters.iscritto}
                                onChange={(e) => handleFilterChange('iscritto', e.target.value)}
                            >
                                <option value="">TUTTI</option>
                                <option value="1">SI</option>
                                <option value="0">NO</option>
                            </select>
                        </div>

                        {/* Cert. medico */}
                        <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '120px'}}>
                            <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Cert. medico</label>
                            <select 
                                className="md-select" 
                                style={{width: '100%', padding: '6px 12px'}}
                                value={filters.certMedico}
                                onChange={(e) => handleFilterChange('certMedico', e.target.value)}
                            >
                                <option value="">TUTTI</option>
                                <option value="MISSING">MANCANTE</option>
                                <option value="2">VALIDO</option>
                                <option value="1">IN SCADENZA</option>
                                <option value="0">SCADUTO</option>
                            </select>
                        </div>

                        {/* Pagamenti */}
                        <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '120px'}}>
                            <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Pagamenti</label>
                            <select 
                                className="md-select" 
                                style={{width: '100%', padding: '6px 12px'}}
                                value={filters.pagamenti}
                                onChange={(e) => handleFilterChange('pagamenti', e.target.value)}
                            >
                                <option value="">TUTTI</option>
                                <option value="0">REGOLARI</option>
                                <option value="1">NON REGOLARI</option>
                            </select>
                        </div>

                        {/* Liste */}
                        <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '120px'}}>
                            <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Liste</label>
                            <select 
                                className="md-select" 
                                style={{width: '100%', padding: '6px 12px'}}
                                value={filters.lista}
                                onChange={(e) => handleFilterChange('lista', e.target.value)}
                            >
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
                            onClick={() => { setSelectedSocio(null); setShowModal(true); }}
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
                                    <th style={{width: '60px'}}></th>
                                    <th>Nominativo</th>
                                    <th>Dati di nascita</th>
                                    <th>Socio</th>
                                    <th>Tesserato</th>
                                    <th>Certificato Medico</th>
                                    <th>Contatti</th>
                                    <th style={{textAlign:'right'}}>Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSoci.map(socio => (
                                    <tr key={socio.id}>
                                        <td>
                                            <div style={{
                                                width:'40px', height:'40px', borderRadius:'50%', 
                                                backgroundColor: socio.sesso === 'F' ? '#fce4ec' : '#e3f2fd',
                                                color: socio.sesso === 'F' ? '#e91e63' : '#1976d2',
                                                display:'flex', alignItems:'center', justifyContent:'center'
                                            }}>
                                                <User size={20}/>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{fontWeight: 500}}>{socio.cognome} {socio.nome}</div>
                                            <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
                                                Socio/Tesserato: {socio.livello}
                                            </div>
                                        </td>
                                        <td>
                                            {socio.data_nascita}
                                        </td>
                                        <td>
                                            {(() => {
                                                const label = getIscrizioneLabel(socio);
                                                const chipClass = {
                                                    'SOCIO': 'info',
                                                    'ISCRITTO': 'iscritto',
                                                    'SCADUTO': 'warning',
                                                    'NO': 'non-iscritto'
                                                }[label] || 'non-iscritto';
                                                return <span className={`chip ${chipClass}`}>{label}</span>;
                                            })()}
                                        </td>
                                        <td>
                                            {(() => {
                                                const label = getTesseratoLabel(socio);
                                                const chipClass = {
                                                    'REGOLARE': 'iscritto',
                                                    'SCADUTO': 'warning',
                                                    'NO': 'non-iscritto'
                                                }[label] || 'non-iscritto';
                                                return <span className={`chip ${chipClass}`}>{label}</span>;
                                            })()}
                                        </td>
                                        <td>
                                            {(() => {
                                                const status = getCertStatus(socio.scadenza_certificato);
                                                let color = 'inherit';
                                                let text = socio.scadenza_certificato;

                                                if (status === 'MISSING') {
                                                    color = 'var(--danger-color)';
                                                    text = 'MANCANTE';
                                                } else if (status === '0') {
                                                    color = 'var(--danger-color)';
                                                } else if (status === '1') {
                                                    color = 'var(--warning-color)';
                                                }
                                                
                                                return (
                                                    <span style={{ color: color, fontWeight: status === '2' ? 'normal' : 'bold' }}>
                                                        {text}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td>
                                            <div style={{fontSize: '0.875rem'}}>{socio.telefono}</div>
                                        </td>
                                        <td style={{textAlign:'right'}}>
                                            <button className="btn-icon-small" title="Modifica" onClick={() => handleEditSocio(socio)}><Edit size={18}/></button>
                                            <button 
                                                className="btn-icon-small" 
                                                title="Invia Email"
                                                onClick={() => handleOpenComunicazione(socio.id)}
                                            >
                                                <Mail size={18}/>
                                            </button>
                                            <button className="btn-icon-small" title="Nuovo pagamento" onClick={() => navigate('/nuovo-pagamento', { state: { socio } })}><Euro size={18}/></button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredSoci.length === 0 && (
                                    <tr>
                                        <td colSpan="8" style={{textAlign:'center', padding:'32px', color:'var(--text-secondary)'}}>
                                            Nessun socio trovato
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>



            {showModal && <SocioModal onClose={() => setShowModal(false)} onSave={handleSaveSocio} socioData={selectedSocio} />}
            
            {showComunicazioneModal && (
                <ComunicazioneModal
                    socioId={comunicazioneSocioId}
                    onClose={() => setShowComunicazioneModal(false)}
                    onSave={() => {
                        // Optionally refresh socio list or show success message
                    }}
                />
            )}

            <AdvancedSearchSidebar 
                isOpen={showAdvancedSearch} 
                onClose={() => setShowAdvancedSearch(false)} 
            />
            
            <EditProfileModal 
                isOpen={showEditProfileModal} 
                onClose={() => setShowEditProfileModal(false)} 
            />
        </div>
    );
};

export default Soci;
