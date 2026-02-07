import React, { useState } from 'react';
import { X, User } from 'lucide-react';
import CityAutocomplete from '../components/CityAutocomplete';

const SocioModal = ({ onClose, onSave }) => {
    const [formData, setFormData] = useState({
        // Anagrafica Base
        cognome: '',
        nome: '',
        sesso: '',
        data_nascita: '',
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
        data_scadenza_tesseramento: '',
        id_badge: '',
        
        // Backend Default
        is_active: true
    });

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

    return (
        <div className="modal-overlay">
            <div className="modal-card" style={{maxWidth: '1000px', width: '90%', maxHeight: '90vh'}}>
                <div className="modal-header">
                    <h3>Nuovo socio</h3>
                    <button className="modal-close-btn" onClick={onClose}><X size={24}/></button>
                </div>
                
                <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', height:'100%', overflow: 'hidden'}}>
                    <div className="modal-body" style={{padding:'24px', overflowY: 'auto'}}>
                        
                        {/* Section Header - Removed Anagrafica label as requested */}


                        <div className="md-form-grid" style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '20px',
                            rowGap: '20px'
                        }}>
                            
                            {/* Row 1 */}
                            <div className="form-group" style={{gridColumn: 'span 1'}}>
                                <label>Cognome *</label>
                                <input className="md-input" name="cognome" placeholder="Cognome" value={formData.cognome} onChange={handleChange} required />
                            </div>
                            <div className="form-group" style={{gridColumn: 'span 1'}}>
                                <label>Nome *</label>
                                <input className="md-input" name="nome" placeholder="Nome" value={formData.nome} onChange={handleChange} required />
                            </div>
                            <div className="form-group" style={{gridColumn: 'span 1'}}>
                                <label>Sesso *</label>
                                <select className="md-select" name="sesso" value={formData.sesso} onChange={handleChange} required>
                                    <option value="">Seleziona</option>
                                    <option value="M">Maschio</option>
                                    <option value="F">Femmina</option>
                                </select>
                            </div>
                            <div className="form-group" style={{gridColumn: 'span 1'}}>
                                <label>Data nascita *</label>
                                <input className="md-input" type="date" name="data_nascita" value={formData.data_nascita} onChange={handleChange} required />
                            </div>

                            {/* Row 2 */}
                             <div style={{gridColumn: 'span 1'}}>
                                <CityAutocomplete 
                                    label="Luogo di nascita" 
                                    name="luogo_nascita" 
                                    value={formData.luogo_nascita} 
                                    onChange={handleChange} 
                                    required
                                />
                            </div>
                             <div className="form-group" style={{gridColumn: 'span 1'}}>
                                <label>Codice Fiscale *</label>
                                <input className="md-input" name="codice_fiscale" placeholder="Codice fiscale" value={formData.codice_fiscale} onChange={handleChange} required />
                            </div>
                             <div className="form-group" style={{gridColumn: 'span 1'}}>
                                <label>Email *</label>
                                <input className="md-input" type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
                            </div>
                             <div className="form-group" style={{gridColumn: 'span 1'}}>
                                <label>Telefono *</label>
                                <input className="md-input" name="telefono" placeholder="Telefono" value={formData.telefono} onChange={handleChange} required />
                            </div>

                             {/* Row 3 Address */}
                            <div className="form-group" style={{gridColumn: 'span 2'}}>
                                <label>Indirizzo</label>
                                <input className="md-input" name="indirizzo" placeholder="Indirizzo" value={formData.indirizzo} onChange={handleChange} />
                            </div>
                             <div style={{gridColumn: 'span 1'}}>
                                <CityAutocomplete 
                                    label="Comune" 
                                    name="comune" 
                                    value={formData.comune} 
                                    onChange={handleChange} 
                                />
                            </div>
                             <div className="form-group" style={{gridColumn: 'span 1'}}>
                                <label>Cap</label>
                                <input className="md-input" name="cap" placeholder="Cap" value={formData.cap} onChange={handleChange} />
                            </div>

                            {/* Row 4 Parents/Contacts */}
                             <div className="form-group" style={{gridColumn: 'span 1'}}>
                                <label>Codice fiscale genitore</label>
                                <input className="md-input" name="cf_genitore" placeholder="Codice fiscale" value={formData.cf_genitore} onChange={handleChange} />
                            </div>
                             <div className="form-group" style={{gridColumn: 'span 1'}}>
                                <label>Cognome genitore</label>
                                <input className="md-input" name="cognome_genitore" placeholder="Cognome genitore" value={formData.cognome_genitore} onChange={handleChange} />
                            </div>
                             <div className="form-group" style={{gridColumn: 'span 1'}}>
                                <label>Nome genitore</label>
                                <input className="md-input" name="nome_genitore" placeholder="Nome genitore" value={formData.nome_genitore} onChange={handleChange} />
                            </div>
                             <div className="form-group" style={{gridColumn: 'span 0.5'}}>
                                <label>Recapito 2</label>
                                <input className="md-input" name="recapito_2" placeholder="Recapito 2" value={formData.recapito_2} onChange={handleChange} />
                            </div>
                             <div className="form-group" style={{gridColumn: 'span 0.5'}}>
                                <label>Recapito 3</label>
                                <input className="md-input" name="recapito_3" placeholder="Recapito 3" value={formData.recapito_3} onChange={handleChange} />
                            </div>

                            {/* Row 5 Membership */}
                             <div className="form-group" style={{gridColumn: 'span 1'}}>
                                <label>Scadenza certificato</label>
                                <input className="md-input" type="date" name="scadenza_certificato" value={formData.scadenza_certificato} onChange={handleChange} />
                            </div>
                             <div className="form-group" style={{gridColumn: 'span 1'}}>
                                <label>Livello</label>
                                <select className="md-select" name="livello" value={formData.livello} onChange={handleChange}>
                                    <option value="ND">ND</option>
                                    <option value="Base">Base</option>
                                    <option value="Intermedio">Intermedio</option>
                                    <option value="Avanzato">Avanzato</option>
                                </select>
                            </div>
                             <div className="form-group" style={{gridColumn: 'span 1'}}>
                                <label>Valutazione</label>
                                <select className="md-select" name="valutazione" value={formData.valutazione} onChange={handleChange}>
                                    <option value="N.D.">N.D.</option>
                                    <option value="Ottimo">Ottimo</option>
                                    <option value="Buono">Buono</option>
                                </select>
                            </div>
                             <div className="form-group" style={{gridColumn: 'span 1'}}>
                                <label>Tessera società</label>
                                <input className="md-input" name="tessera_societa" placeholder="Tessera società" value={formData.tessera_societa} onChange={handleChange} />
                            </div>
                             <div className="form-group" style={{gridColumn: 'span 1'}}>
                                <label>Tessera federazione</label>
                                <input className="md-input" name="tessera_federazione" placeholder="Tessera federazione" value={formData.tessera_federazione} onChange={handleChange} />
                            </div>
                             <div className="form-group" style={{gridColumn: 'span 1'}}>
                                <label>Tessera EPS</label>
                                <input className="md-input" name="tessera_eps" placeholder="Tessera eps" value={formData.tessera_eps} onChange={handleChange} />
                            </div>

                            {/* Row 6 Notes - Full Width */}
                            <div className="form-group" style={{gridColumn: 'span 2', gridRow: 'span 2'}}>
                                <label>Note</label>
                                <textarea className="md-input" name="note" placeholder="Note" rows="4" style={{resize:'none'}} value={formData.note} onChange={handleChange}></textarea>
                            </div>
                            
                            {/* Row 6 Right - Redundant info mockup */}
                            <div className="form-group" style={{gridColumn: 'span 1'}}>
                                <label style={{color: 'var(--primary-color)', fontWeight: 'bold', textTransform:'uppercase'}}>Indirizzo</label>
                                <input className="md-input" disabled value={formData.indirizzo || 'INDIRIZZO'} style={{backgroundColor:'var(--bg-color)'}}/>
                            </div>
                            <div className="form-group" style={{gridColumn: 'span 1'}}>
                                <label style={{color: 'var(--primary-color)', fontWeight: 'bold', textTransform:'uppercase'}}>Luogo di nascita</label>
                                <input className="md-input" disabled value={formData.luogo_nascita || 'LUOGO DI NASCITA'} style={{backgroundColor:'var(--bg-color)'}}/>
                            </div>
                             <div className="form-group" style={{gridColumn: 'span 1'}}>
                                <label style={{color: 'var(--primary-color)', fontWeight: 'bold', textTransform:'uppercase'}}>Data di nascita</label>
                                <input className="md-input" disabled value={formData.data_nascita || 'DATA DI NASCITA'} style={{backgroundColor:'var(--bg-color)'}}/>
                            </div>

                            {/* Row 7 */}
                            <div className="form-group" style={{gridColumn: 'span 2'}}>
                                <label style={{color: 'var(--primary-color)', fontWeight: 'bold'}}>Data scadenza tesseramento</label>
                                <input className="md-input" type="date" name="data_scadenza_tesseramento" value={formData.data_scadenza_tesseramento} onChange={handleChange} />
                            </div>
                            <div className="form-group" style={{gridColumn: 'span 2'}}>
                                <label style={{color: 'var(--primary-color)', fontWeight: 'bold'}}>ID Badge</label>
                                <input className="md-input" name="id_badge" placeholder="ID BADGE" value={formData.id_badge} onChange={handleChange} />
                            </div>

                        </div>
                    </div>

                    <div className="modal-footer" style={{backgroundColor: 'var(--primary-color)', borderTop: 'none', justifyContent: 'center', padding: '16px'}}>
                        <button type="submit" className="btn-contained" style={{backgroundColor: 'transparent', boxShadow: 'none', fontSize: '1.1rem', display:'flex', alignItems:'center', gap:'8px'}}>
                             ✓ Inserisci socio
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SocioModal;
