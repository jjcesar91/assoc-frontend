import React, { useState, useEffect } from 'react';
import { X, User, Tag, CreditCard, Calendar, Activity, Monitor, Mail, Coins, Check } from 'lucide-react';
import CityAutocomplete from '../components/CityAutocomplete';
import './SocioModal.css';

const SocioModal = ({ onClose, onSave, socioData }) => {
    // Determine if we are editing an existing scio or creating a new one
    const isEditMode = !!socioData;
    
    // Initial State - populate if editing
    const initialState = {
        // Anagrafica Base
        id: '',
        cognome: '',
        nome: '',
        sesso: '',
        data_nascita: '',
        
        // Row 2
        luogo_nascita: '',
        codice_fiscale: '',
        email: '',
        telefono: '',
        
        // Indirizzo
        indirizzo: '',
        comune: '',
        cap: '',

        // Genitore / Contatti Extra
        cf_genitore: '',
        cognome_genitore: '',
        nome_genitore: '',
        recapito_2: '',
        recapito_3: '',

        // Dati Societari
        scadenza_certificato: '',
        livello: 'ND',
        valutazione: 'N.D.',
        tessera_societa: '',
        tessera_federazione: '',
        tessera_eps: '',
        
        // Altro
        note: '',
        
        // Bottom Fields
        data_scadenza_tesseramento: '',
        id_badge: '',
        
        // Backend Default
        is_active: true
    };

    const [formData, setFormData] = useState(initialState);
    const [activeTab, setActiveTab] = useState('Anagrafica');

    // Populate data when socioData prop changes
    useEffect(() => {
        if (socioData) {
            setFormData(prev => ({
                ...prev,
                ...socioData,
                // Ensure nulls are strings for inputs
                cognome: socioData.cognome || '',
                nome: socioData.nome || '',
                sesso: socioData.sesso || '',
                data_nascita: socioData.data_nascita || '',
                luogo_nascita: socioData.luogo_nascita || '',
                codice_fiscale: socioData.codice_fiscale || '',
                email: socioData.user?.email || socioData.email || '',
                telefono: socioData.telefono || '',
                indirizzo: socioData.indirizzo || '',
                comune: socioData.comune || '',
                cap: socioData.cap || '',
                cf_genitore: socioData.cf_genitore || '',
                cognome_genitore: socioData.cognome_genitore || '',
                nome_genitore: socioData.nome_genitore || '',
                recapito_2: socioData.recapito_2 || '',
                recapito_3: socioData.recapito_3 || '',
                scadenza_certificato: socioData.scadenza_certificato || '',
                livello: socioData.livello || 'ND',
                valutazione: socioData.valutazione || 'N.D.',
                tessera_societa: socioData.tessera_societa || '',
                tessera_federazione: socioData.tessera_federazione || '',
                tessera_eps: socioData.tessera_eps || '',
                note: socioData.note || '',
                data_scadenza_tesseramento: socioData.data_scadenza_tesseramento || '',
                id_badge: socioData.id_badge || ''
            }));
        }
    }, [socioData]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const tabs = [
        { id: 'Anagrafica', icon: <User size={18}/>, label: 'Anagrafica' },
        { id: 'Liste', icon: <Tag size={18}/>, label: 'Liste' },
        { id: 'Pagamenti', icon: <CreditCard size={18}/>, label: 'Pagamenti', count: 0 },
        { id: 'Scadenzari', icon: <Calendar size={18}/>, label: 'Scadenzari', count: 0 },
        { id: 'Attività', icon: <Activity size={18}/>, label: 'Attività', count: 0 },
        { id: 'Deskalo', icon: <Monitor size={18}/>, label: 'Deskalo' },
        { id: 'Comunicazioni', icon: <Mail size={18}/>, label: 'Comunicazioni' },
        { id: 'Crediti', icon: <Coins size={18}/>, label: 'Crediti' }
    ];

    return (
        <div className="modal-overlay">
            <div className="modal-card socio-modal" style={{maxWidth: '1200px', width: '95%', maxHeight: '95vh', display: 'flex', flexDirection: 'column'}}>
                
                {/* Tabs Header */}
                <div className="modal-tabs-header">
                    {isEditMode ? (
                        tabs.map(tab => (
                            <button 
                                key={tab.id} 
                                className={`modal-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.icon}
                                <span style={{marginLeft: '8px'}}>{tab.label}</span>
                                {tab.count !== undefined && <span className="tab-badge">{tab.count}</span>}
                            </button>
                        ))
                    ) : (
                        <div style={{padding: '10px 16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: '#4b5563'}}>
                            <User size={18}/>
                            <span>Nuovo Socio</span>
                        </div>
                    )}
                    <button className="modal-close-icon" onClick={onClose}><X size={24}/></button>
                </div>
                
                {/* Content Area */}
                <div className="modal-content-area" style={{flex: 1, overflowY: 'auto', padding: '24px', backgroundColor: '#fff'}}>
                    
                    {activeTab === 'Anagrafica' && (
                        <form id="socioForm" onSubmit={handleSubmit}>
                            <div className="md-form-grid-custom">
                                
                                {/* Row 1 */}
                                <div className="form-group grid-span-3">
                                    <label className="field-label">Cognome *</label>
                                    <input className="md-input" name="cognome" value={formData.cognome} onChange={handleChange} required />
                                </div>
                                <div className="form-group grid-span-3">
                                    <label className="field-label">Nome *</label>
                                    <input className="md-input" name="nome" value={formData.nome} onChange={handleChange} required />
                                </div>
                                <div className="form-group grid-span-2">
                                    <label className="field-label">Sesso *</label>
                                    <select className="md-select" name="sesso" value={formData.sesso} onChange={handleChange} required>
                                        <option value="">Seleziona</option>
                                        <option value="M">MASCHIO</option>
                                        <option value="F">FEMMINA</option>
                                    </select>
                                </div>
                                <div className="form-group grid-span-4">
                                    <label className="field-label">Data nascita *</label>
                                    <input className="md-input" type="date" name="data_nascita" value={formData.data_nascita} onChange={handleChange} required />
                                </div>

                                {/* Row 2 */}
                                <div className="form-group grid-span-2">
                                    <CityAutocomplete 
                                        label="Luogo di nascita" 
                                        name="luogo_nascita" 
                                        value={formData.luogo_nascita} 
                                        onChange={handleChange} 
                                        style={{width: '100%'}} 
                                        required
                                    />
                                </div>
                                <div className="form-group grid-span-2">
                                    <label className="field-label">Codice Fiscale *</label>
                                    <input className="md-input" name="codice_fiscale" value={formData.codice_fiscale} onChange={handleChange} required />
                                </div>
                                <div className="form-group grid-span-3">
                                    <label className="field-label">Email *</label>
                                    <input className="md-input" type="email" name="email" value={formData.email} onChange={handleChange} required />
                                </div>
                                <div className="form-group grid-span-5">
                                    <label className="field-label">Telefono *</label>
                                    <input className="md-input" name="telefono" value={formData.telefono} onChange={handleChange} required />
                                </div>

                                {/* Row 3 - Indirizzo */}
                                <div className="form-group grid-span-7">
                                    <label className="field-label">Indirizzo</label>
                                    <input className="md-input" name="indirizzo" placeholder="VIA..." value={formData.indirizzo} onChange={handleChange} />
                                </div>
                                <div className="form-group grid-span-3">
                                    <CityAutocomplete 
                                        label="Comune" 
                                        name="comune" 
                                        value={formData.comune} 
                                        onChange={handleChange} 
                                        style={{width: '100%'}} 
                                    />
                                </div>
                                <div className="form-group grid-span-2">
                                    <label className="field-label">Cap</label>
                                    <input className="md-input" name="cap" value={formData.cap} onChange={handleChange} />
                                </div>

                                {/* Row 4 - Parents */}
                                <div className="form-group grid-span-2">
                                    <label className="field-label">Codice fiscale genitore</label>
                                    <input className="md-input" name="cf_genitore" placeholder="Codice fiscale" value={formData.cf_genitore} onChange={handleChange} />
                                </div>
                                <div className="form-group grid-span-2">
                                    <label className="field-label">Cognome genitore</label>
                                    <input className="md-input" name="cognome_genitore" placeholder="Cognome genitore" value={formData.cognome_genitore} onChange={handleChange} />
                                </div>
                                <div className="form-group grid-span-2">
                                    <label className="field-label">Nome genitore</label>
                                    <input className="md-input" name="nome_genitore" placeholder="Nome genitore" value={formData.nome_genitore} onChange={handleChange} />
                                </div>
                                <div className="form-group grid-span-2">
                                    <label className="field-label">Recapito 2</label>
                                    <input className="md-input" name="recapito_2" placeholder="Recapito 2" value={formData.recapito_2} onChange={handleChange} />
                                </div>
                                <div className="form-group grid-span-2">
                                    <label className="field-label">Recapito 3</label>
                                    <input className="md-input" name="recapito_3" placeholder="Recapito 3" value={formData.recapito_3} onChange={handleChange} />
                                </div>

                                {/* Row 5 - Tessere */}
                                <div className="form-group grid-span-2">
                                    <label className="field-label">Scadenza certificato</label>
                                    <input className="md-input" type="date" name="scadenza_certificato" value={formData.scadenza_certificato} onChange={handleChange} />
                                </div>
                                <div className="form-group grid-span-2">
                                    <label className="field-label">Livello</label>
                                    <select className="md-select" name="livello" value={formData.livello} onChange={handleChange}>
                                        <option value="ND">ND</option>
                                        <option value="Socio">Socio</option>
                                    </select>
                                </div>
                                <div className="form-group grid-span-2">
                                    <label className="field-label">Valutazione</label>
                                    <select className="md-select" name="valutazione" value={formData.valutazione} onChange={handleChange}>
                                        <option value="N.D.">N.D.</option>
                                        <option value="Ottimo">Ottimo</option>
                                    </select>
                                </div>
                                <div className="form-group grid-span-2">
                                    <label className="field-label">Tessera società</label>
                                    <input className="md-input" name="tessera_societa" value={formData.tessera_societa} onChange={handleChange} />
                                </div>
                                <div className="form-group grid-span-2">
                                    <label className="field-label">Tessera federazione</label>
                                    <input className="md-input" name="tessera_federazione" placeholder="Tessera federazione" value={formData.tessera_federazione} onChange={handleChange} />
                                </div>
                                <div className="form-group grid-span-2">
                                    <label className="field-label">Tessera EPS</label>
                                    <input className="md-input" name="tessera_eps" placeholder="Tessera eps" value={formData.tessera_eps} onChange={handleChange} />
                                </div>

                                {/* Row 6 - Note and Extra */}
                                <div className="form-group grid-span-4" style={{gridRow: 'span 2'}}>
                                    <label className="field-label" style={{color: 'var(--success-color)', fontWeight:'bold'}}>Note</label>
                                    <textarea className="md-input" name="note" placeholder="Note" style={{height:'120px', resize:'none'}} value={formData.note} onChange={handleChange}></textarea>
                                </div>

                                {/* Extra Fields block */}
                                <div className="grid-span-8 extra-fields-grid">
                                    
                                    {/* Placeholders from image */}
                                    <div className="form-group">
                                        <label className="field-label uppercase">INDIRIZZO</label>
                                        <input className="md-input" disabled value="11/04/2025" />
                                    </div>
                                    <div className="form-group">
                                        <label className="field-label uppercase">LUOGO DI NASCITA</label>
                                        <input className="md-input" disabled value="LUOGO DI NASCITA" />
                                    </div>
                                    <div className="form-group">
                                        <label className="field-label uppercase">DATA DI NASCITA</label>
                                        <input className="md-input" disabled value="DATA DI NASCITA" />
                                    </div>

                                    {/* Actual fields */}
                                    <div className="form-group">
                                        <label className="field-label" style={{color:'var(--success-color)', fontWeight:'bold'}}>Data scadenza tesseramento</label>
                                        <input className="md-input" type="date" name="data_scadenza_tesseramento" value={formData.data_scadenza_tesseramento} onChange={handleChange} />
                                    </div>
                                    <div className="form-group">
                                        <label className="field-label" style={{color:'var(--success-color)', fontWeight:'bold'}}>ID Badge</label>
                                        <input className="md-input" name="id_badge" placeholder="ID BADGE" value={formData.id_badge} onChange={handleChange} />
                                    </div>
                                    <div className="form-group">
                                        {/* Empty placeholder */}
                                    </div>
                                </div>
                            </div>
                        </form>
                    )}
                    
                    {activeTab !== 'Anagrafica' && (
                        <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100%', color:'#aaa'}}>
                             Contenuto placeholder per {activeTab}
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="modal-footer-custom">
                    <button className="btn-save-full" onClick={handleSubmit}>
                        <Check size={20} />
                        Aggiorna informazioni socio
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SocioModal;
