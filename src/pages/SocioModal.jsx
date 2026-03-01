import React, { useState, useEffect } from 'react';
import { X, User, Tag, CreditCard, Calendar, Activity, Monitor, Mail, Coins, Check, AlertTriangle, MessageSquare } from 'lucide-react';
import CodiceFiscale from 'codice-fiscale-js';
import CityAutocomplete from '../components/CityAutocomplete';
import ComunicazioneModal from '../components/ComunicazioneModal';
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
    const [warningMessage, setWarningMessage] = useState(null);
    const [highlightCF, setHighlightCF] = useState(false);
    const [emailError, setEmailError] = useState(null);
    const [haCertificato, setHaCertificato] = useState(false);
    const [showComunicazioneModal, setShowComunicazioneModal] = useState(false);
    const [comunicazioni, setComunicazioni] = useState([]);

    // Effect to clear highlight
    useEffect(() => {
        if (highlightCF) {
            const timer = setTimeout(() => setHighlightCF(false), 2000); // 2 seconds pulse
            return () => clearTimeout(timer);
        }
    }, [highlightCF]);

    // Validate Email Live
    useEffect(() => {
        const email = formData.email;
        if (!email) {
            setEmailError(null);
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setEmailError('Formato email non valido');
        } else {
            setEmailError(null);
        }
    }, [formData.email]);

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
            
            // Set Checkbox state based on date existence
            setHaCertificato(!!socioData.scadenza_certificato);
        }
    }, [socioData]);

    // Calculate if socio is minor
    const isMinorenne = React.useMemo(() => {
        if (!formData.data_nascita) return false;
        
        let birthDate;
        // Robust parsing to align with existing logic
        if (typeof formData.data_nascita === 'string' && formData.data_nascita.includes('-')) {
            const parts = formData.data_nascita.split('-');
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1; // Month is 0-indexed in Date
            const d = parseInt(parts[2], 10);
            birthDate = new Date(y, m, d);
        } else {
            birthDate = new Date(formData.data_nascita);
        }

        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age < 18;
    }, [formData.data_nascita]);

    const fetchComunicazioni = async () => {
        if (!formData.id) return;
        try {
            const response = await fetch(`/users/api/soci/${formData.id}/comunicazioni`);
            if (response.ok) {
                const data = await response.json();
                setComunicazioni(data);
            }
        } catch (error) {
            console.error('Error fetching comunicazioni:', error);
        }
    };

    useEffect(() => {
        if (activeTab === 'Comunicazioni' && formData.id) {
            fetchComunicazioni();
        }
    }, [activeTab, formData.id]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        // Handle Certificate Flag
        if (name === 'ha_certificato') {
            setHaCertificato(checked);
            if (!checked) {
                // Clear date if unchecked
                setFormData(prev => ({ ...prev, scadenza_certificato: '' }));
            }
            return;
        }

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // Case 1: Compute Codice Fiscale from fields
    useEffect(() => {
        const { nome, cognome, sesso, data_nascita, luogo_nascita } = formData;
        
        // This effect should strictly run when these specific fields change
        // We only auto-calculate if we have enough info to attempt a calculation
        if (nome && cognome && sesso && data_nascita && luogo_nascita) {
            try {
                // Robust Date Parsing (avoid Timezone offsets from new Date(string))
                // Expecting YYYY-MM-DD from input type="date"
                let day, month, year;
                if (typeof data_nascita === 'string' && data_nascita.includes('-')) {
                    const parts = data_nascita.split('-');
                    year = parseInt(parts[0], 10);
                    month = parseInt(parts[1], 10);
                    day = parseInt(parts[2], 10);
                } else {
                    const dateVal = new Date(data_nascita);
                    if (isNaN(dateVal.getTime())) return;
                    day = dateVal.getDate();
                    month = dateVal.getMonth() + 1;
                    year = dateVal.getFullYear();
                }

                const cf = new CodiceFiscale({
                    name: nome.trim(),
                    surname: cognome.trim(),
                    gender: sesso,
                    day,
                    month,
                    year,
                    birthplace: luogo_nascita.trim()
                });
                
                // Update only if different to avoid infinite loops
                if (cf.code && cf.code !== formData.codice_fiscale) {
                    console.log("Auto-updating CF to:", cf.code);
                    setFormData(prev => ({ ...prev, codice_fiscale: cf.code }));
                    // Clear warning if we successfully auto-generated a valid one based on current data
                    setWarningMessage(null); 
                    setHighlightCF(true);
                }
            } catch (e) {
                // Invalid data for calculation (e.g. City not found in library DB), ignore but log
                console.warn("Skipping CF auto-calc:", e.message);
            }
        }
    }, [formData.nome, formData.cognome, formData.sesso, formData.data_nascita, formData.luogo_nascita]);

    // Case 2: Validate/Fill fields from Codice Fiscale
    useEffect(() => {
        const { codice_fiscale, nome, cognome, sesso, data_nascita, luogo_nascita } = formData;
        
        // Requirement: "Sono valorizzati ALMENO Nome e Cognome"
        if (!nome || !cognome) return; 
        
        // Fix: If explicitly empty or too short, show error instead of returning silently.
        // But we usually don't want to spam error if the user is just starting to type (e.g. length < 16 but > 0)
        // However, the request asks for "Validazione" when modified.
        // If I delete a char, length becomes 15. The previous code had "if (length !== 16) return;" so it skipped the try/catch logic completely.
        
        if (!codice_fiscale) {
            setWarningMessage(null); // Just empty, no error yet
            return;
        }

        try {
            const cf = new CodiceFiscale(codice_fiscale);
            
            // Extract info from CF
            // Library exposes 'birthday' (Date), 'birthplace' (Object with .nome) and 'gender'
            const cfDate = cf.birthday || cf.birthDate;
            const cfGender = cf.gender;
            
            // Determine Place Name safely
            let cfPlaceName = null;
            if (cf.birthplace) {
                if (typeof cf.birthplace === 'object' && cf.birthplace.nome) cfPlaceName = cf.birthplace.nome;
                else if (typeof cf.birthplace === 'string') cfPlaceName = cf.birthplace;
            } else if (cf.birthPlace) { // Fallback for older versions/typos
                if (typeof cf.birthPlace === 'object' && cf.birthPlace.name) cfPlaceName = cf.birthPlace.name;
                else if (typeof cf.birthPlace === 'string') cfPlaceName = cf.birthPlace;
            }

            const updates = {};
            const conflicts = [];

            // 1. Check/Fill Gender
            if (cfGender) {
                if (!sesso) {
                    updates.sesso = cfGender;
                } else if (sesso !== cfGender) {
                    conflicts.push(`Il campo Sesso (${sesso}) non corrisponde a quello nel CF (${cfGender})`);
                }
            }

            // 2. Check/Fill Date
            if (cfDate) {
                const y = cfDate.getFullYear();
                const m = String(cfDate.getMonth() + 1).padStart(2, '0');
                const d = String(cfDate.getDate()).padStart(2, '0');
                const cfDateStr = `${y}-${m}-${d}`;

                if (!data_nascita) {
                    updates.data_nascita = cfDateStr;
                } else if (data_nascita !== cfDateStr) {
                    conflicts.push(`La Data di Nascita (${data_nascita}) non corrisponde a quella nel CF (${cfDateStr})`);
                }
            }

            // 3. Check/Fill Place
            if (cfPlaceName) {
                const currentPlace = (luogo_nascita || '').trim().toUpperCase();
                const derivedPlace = cfPlaceName.toUpperCase();
                
                if (!luogo_nascita) {
                    updates.luogo_nascita = cfPlaceName; 
                } else if (currentPlace !== derivedPlace) {
                    // Check if one contains the other (lenient match)
                    if (!currentPlace.includes(derivedPlace) && !derivedPlace.includes(currentPlace)) {
                        conflicts.push(`Il Luogo di Nascita (${luogo_nascita}) non corrisponde a quello nel CF (${cfPlaceName})`);
                    }
                }
            }

            // 4. Check Consistency of Name/Surname with CF Code
            // We cannot strictly "deduce" name from CF, but we can verify if the CF code matches what we expect from Name/Surname + calculated demographics
            // If we have all fields, Case 1 would overwrite this.
            // But if we have partial fields (e.g. valid Sesso/Data/Luogo but wrong Name for that CF), we detect it here.
            
            // To do this properly without re-implementing logic, we can try to generate a CF with the current metadata + keys
            // If the user provided CF doesn't match the one generated using the User's Name/Surname + Deduced Data, 
            // it implies the Name/Surname are inconsistent with the CF (assuming Sesso/Data/Luogo match because we just checked/filled them).
            
            if (nome && cognome && (sesso || updates.sesso) && (data_nascita || updates.data_nascita) && (luogo_nascita || updates.luogo_nascita)) {
                try {
                     const checkDate = new Date(data_nascita || updates.data_nascita);
                     const checkCF = new CodiceFiscale({
                        name: nome,
                        surname: cognome,
                        gender: sesso || updates.sesso,
                        day: checkDate.getDate(),
                        month: checkDate.getMonth() + 1,
                        year: checkDate.getFullYear(),
                        birthplace: luogo_nascita || updates.luogo_nascita
                     });
                     
                     // If the CF we calculate from the data (existing + derived) is different from the input CF
                     if (checkCF.code !== codice_fiscale) {
                         // The issue could be just Name or Surname, since we validated the others
                         // Or it could be the Check character
                         // We just issue a general inconsistency warning regarding identity
                         conflicts.push(`Il CF inserito non è coerente con Nome e Cognome specificati`);
                     }
                } catch(e) {
                    // ignore calculation errors
                }
            }

            if (conflicts.length > 0) {
                setWarningMessage(conflicts.join('; '));
            } else {
                setWarningMessage(null);
                if (Object.keys(updates).length > 0) {
                    setFormData(prev => ({ ...prev, ...updates }));
                }
            }

        } catch (e) {
            console.error("CF Validation Error:", e);
            let msg = e.message || 'Errore generico';
            
            // Translate common library errors
            if (msg.includes('check digit')) msg = 'Carattere di controllo errato';
            else if (msg.includes('length')) msg = 'Lunghezza non valida (deve essere 16 caratteri)';
            else if (msg.includes('Invalid characters')) msg = 'Caratteri non validi';
            else if (msg.includes('Provided input is not a valid Codice Fiscale') || msg.includes('Formato non valido')) {
                // Manual check for better error detail when library is generic
                if (codice_fiscale.length !== 16) {
                    msg = `Lunghezza errata (${codice_fiscale.length}/16)`;
                } else if (!/^[A-Z0-9]+$/i.test(codice_fiscale)) {
                    msg = 'Contiene caratteri non validi (ammessi solo lettere e numeri)';
                } else {
                     // Try to calculate expected CF to see if it's a mismatch
                     if (nome && cognome && sesso && data_nascita && luogo_nascita) {
                        try {
                            // Extract date parts
                            let d, m, y;
                            if (typeof data_nascita === 'string' && data_nascita.includes('-')) {
                                const parts = data_nascita.split('-');
                                y = parseInt(parts[0], 10);
                                m = parseInt(parts[1], 10);
                                d = parseInt(parts[2], 10);
                            } else {
                                const dt = new Date(data_nascita);
                                d = dt.getDate(); m = dt.getMonth() + 1; y = dt.getFullYear();
                            }

                            const expectedCF = new CodiceFiscale({
                                name: nome.trim(),
                                surname: cognome.trim(),
                                gender: sesso,
                                day: d, month: m, year: y,
                                birthplace: luogo_nascita.trim()
                            });

                            if (expectedCF.code !== codice_fiscale) {
                                // Analyze diff
                                const inputCF = codice_fiscale.toUpperCase();
                                const exp = expectedCF.code;
                                
                                // Check Surname (first 3)
                                if (inputCF.substring(0,3) !== exp.substring(0,3)) msg = 'Il CF non corrisponde al Cognome';
                                // Check Name (next 3)
                                else if (inputCF.substring(3,6) !== exp.substring(3,6)) msg = 'Il CF non corrisponde al Nome';
                                // Check Year/Month/Day/Gender (next 5)
                                else if (inputCF.substring(6,11) !== exp.substring(6,11)) msg = 'Il CF non corrisponde ai dati di nascita/sesso';
                                // Check Place (next 4)
                                else if (inputCF.substring(11,15) !== exp.substring(11,15)) msg = 'Il CF non corrisponde al Luogo di nascita';
                                // Check Checksum (last char)
                                else if (inputCF.substring(15) !== exp.substring(15)) msg = 'Carattere di controllo errato';
                                else msg = 'Formato e Consistenza non validi';
                            }
                        } catch (calcErr) {
                           msg = 'Formato non valido (e dati anagrafici insufficienti per ricalcolo)';  
                        }
                     } else {
                         msg = 'Formato struttura errato';
                     }
                }
            }
            else if (msg.includes('constructor')) msg = 'Errore interno (libreria non caricata)';
            
            setWarningMessage(`Codice Fiscale non valido: ${msg}`);
        }

    }, [formData.codice_fiscale, formData.nome, formData.cognome, formData.sesso, formData.data_nascita, formData.luogo_nascita]); 
    // ^ Added dependencies so it re-runs validation if fields change but CF doesn't (to show conflict)
    // However, if fields change, Case 1 runs and updates CF.
    // If Case 1 runs, it sets CF to "Correct" one. Then Case 2 runs. "Correct" CF matches. No conflict. 
    // Does this defeat the purpose of showing "Conflict"?
    // "Se erano già valorizzati, mostra un messaggio di errore...".
    // If I change Date => Case 1 updates CF => Case 2 sees match.
    // Conflict only happens if Case 1 FAILS to run (missing fields) OR if the user manually overrides CF to be wrong.
    
    // Wait, the Requirement says: 
    // "Sono valorizzati ALMENO Nome e Cognome e viene modificato il codice fiscale"
    // So Case 2 is primarily when CF changes.
    // The addition of other dependencies here allows "On Open" validation if CF is already there.

    const handleEmailBlur = async () => {
        if (!formData.email) return;

        try {
            const response = await fetch('/users/api/soci/check-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: formData.email,
                    excludeId: formData.id || null
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.exists) {
                    alert(`L'email ${formData.email} è già usata da ${result.nome} ${result.cognome}`);
                }
            }
        } catch (e) {
            console.error("Email check failed", e);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const tabs = [
        { id: 'Anagrafica', icon: <User size={18}/>, label: 'Anagrafica' },
        // { id: 'Liste', icon: <Tag size={18}/>, label: 'Liste' },
        { id: 'Pagamenti', icon: <CreditCard size={18}/>, label: 'Pagamenti', count: 0 },
        { id: 'Attività', icon: <Activity size={18}/>, label: 'Attività', count: 0 },
        // { id: 'Deskalo', icon: <Monitor size={18}/>, label: 'Deskalo' },
        { id: 'Comunicazioni', icon: <Mail size={18}/>, label: 'Comunicazioni' },
        // { id: 'Crediti', icon: <Coins size={18}/>, label: 'Crediti' }
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
                
                {warningMessage && (
                    <div style={{
                        backgroundColor: '#fee2e2', 
                        border: '1px solid #ef4444', 
                        color: '#b91c1c', 
                        padding: '12px', 
                        margin: '16px 24px 0', 
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        fontSize: '14px'
                    }}>
                        <AlertTriangle size={20} />
                        <span>{warningMessage}</span>
                    </div>
                )}

                {/* Content Area */}
                <div className="modal-content-area" style={{flex: 1, overflowY: 'auto', padding: '24px', backgroundColor: '#fff'}}>
                    
                    {activeTab === 'Anagrafica' && (
                        <form id="socioForm" onSubmit={handleSubmit}>
                            <div className="md-form-grid-custom">
                                
                                {/* Row 1 */}
                                <div className="form-group grid-span-3">
                                    <label className="field-label">Nome *</label>
                                    <input className="md-input" name="nome" value={formData.nome} onChange={handleChange} required />
                                </div>
                                <div className="form-group grid-span-3">
                                    <label className="field-label">Cognome *</label>
                                    <input className="md-input" name="cognome" value={formData.cognome} onChange={handleChange} required />
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
                                    <div style={{position: 'relative', display: 'flex', alignItems: 'center'}}>
                                        <input 
                                            className="md-input" 
                                            type="date" 
                                            name="data_nascita" 
                                            value={formData.data_nascita} 
                                            onChange={handleChange} 
                                            required 
                                            style={{width: '100%', paddingRight: '35px'}}
                                        />
                                        <Calendar 
                                            size={18} 
                                            style={{position: 'absolute', right: '10px', color: '#6b7280', cursor: 'pointer', zIndex: 5}} 
                                            onClick={(e) => e.currentTarget.previousElementSibling.showPicker?.()} 
                                        />
                                    </div>
                                </div>

                                {/* Row 2 */}
                                <div className="form-group grid-span-2">
                                    <label className="field-label">Luogo di nascita *</label>
                                    <CityAutocomplete 
                                        name="luogo_nascita" 
                                        value={formData.luogo_nascita} 
                                        onChange={handleChange} 
                                        style={{width: '100%'}} 
                                        required
                                    />
                                </div>
                                <div className="form-group grid-span-2">
                                    <label className="field-label">Codice Fiscale *</label>
                                    <input 
                                        className="md-input" 
                                        name="codice_fiscale" 
                                        value={formData.codice_fiscale} 
                                        onChange={handleChange} 
                                        required 
                                        style={{
                                            transition: 'all 0.5s ease',
                                            borderColor: highlightCF ? '#22c55e' : undefined,
                                            backgroundColor: highlightCF ? '#dcfce7' : undefined,
                                            boxShadow: highlightCF ? '0 0 0 2px rgba(34, 197, 94, 0.2)' : undefined
                                        }}
                                    />
                                </div>
                                <div className="form-group grid-span-3">
                                    <label className="field-label">Email *</label>
                                    <input 
                                        className="md-input" 
                                        type="email" 
                                        name="email" 
                                        value={formData.email} 
                                        onChange={handleChange} 
                                        onBlur={handleEmailBlur} 
                                        required 
                                        style={emailError ? { borderColor: '#ef4444' } : {}}
                                    />
                                    {emailError && <span style={{color: '#ef4444', fontSize: '11px', marginTop: '2px'}}>{emailError}</span>}
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
                                    <label className="field-label">Comune</label>
                                    <CityAutocomplete 
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

                                {/* Row 4 - Parents (Visible only if Minor) */}
                                {isMinorenne && (
                                    <>
                                        <div className="grid-span-12" style={{ marginTop: '16px', marginBottom: '8px', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px', color: '#4b5563', fontWeight: '500' }}>
                                            Dati Tutore / Genitore
                                        </div>
                                        <div className="form-group grid-span-4">
                                            <label className="field-label">Codice fiscale genitore</label>
                                            <input className="md-input" name="cf_genitore" placeholder="Codice fiscale" value={formData.cf_genitore} onChange={handleChange} />
                                        </div>
                                        <div className="form-group grid-span-4">
                                            <label className="field-label">Nome genitore</label>
                                            <input className="md-input" name="nome_genitore" placeholder="Nome genitore" value={formData.nome_genitore} onChange={handleChange} />
                                        </div>
                                        <div className="form-group grid-span-4">
                                            <label className="field-label">Cognome genitore</label>
                                            <input className="md-input" name="cognome_genitore" placeholder="Cognome genitore" value={formData.cognome_genitore} onChange={handleChange} />
                                        </div>
                                        <div className="form-group grid-span-6">
                                            <label className="field-label">Recapito 1 genitore</label>
                                            <input className="md-input" name="recapito_2" placeholder="Recapito 1" value={formData.recapito_2} onChange={handleChange} />
                                        </div>
                                        <div className="form-group grid-span-6">
                                            <label className="field-label">Recapito 2 genitore</label>
                                            <input className="md-input" name="recapito_3" placeholder="Recapito 2" value={formData.recapito_3} onChange={handleChange} />
                                        </div>
                                    </>
                                )}

                                {/* Row 5 - Tessere */}
                                <div className="form-group grid-span-2">
                                    <label className="field-label" style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', minHeight: '20px'}}>
                                        <input 
                                            type="checkbox" 
                                            name="ha_certificato" 
                                            checked={haCertificato} 
                                            onChange={handleChange} 
                                            style={{width: 'auto', margin: 0}}
                                        />
                                        Ha certificato
                                    </label>
                                    <div style={{position: 'relative', display: 'flex', alignItems: 'center'}}>
                                        <input 
                                            className="md-input" 
                                            type="date" 
                                            name="scadenza_certificato" 
                                            value={formData.scadenza_certificato} 
                                            onChange={handleChange} 
                                            disabled={!haCertificato}
                                            style={{
                                                width: '100%', 
                                                paddingRight: '35px',
                                                backgroundColor: !haCertificato ? '#f3f4f6' : undefined,
                                                color: !haCertificato ? '#9ca3af' : undefined
                                            }}
                                        />
                                        <Calendar 
                                            size={18} 
                                            style={{
                                                position: 'absolute', 
                                                right: '10px', 
                                                color: haCertificato ? '#6b7280' : '#d1d5db',
                                                cursor: haCertificato ? 'pointer' : 'default',
                                                zIndex: 5
                                            }}
                                            onClick={(e) => haCertificato && e.currentTarget.previousElementSibling.showPicker?.()} 
                                        />
                                    </div>
                                </div>
                                <div className="form-group grid-span-2">
                                    <label className="field-label" style={{marginBottom: '6px', minHeight: '20px', display: 'flex', alignItems: 'center'}}>Socio/Tesserato</label>
                                    <select className="md-select" name="livello" value={formData.livello} onChange={handleChange}>
                                        <option value="ND">ND</option>
                                        <option value="Socio">Socio</option>
                                        <option value="Tesserato">Tesserato</option>
                                    </select>
                                </div>
                                
                                {/* Row 6 - Note and Extra */}
                                <div className="form-group grid-span-12" style={{gridRow: 'span 2'}}>
                                    <label className="field-label" style={{color: 'var(--success-color)', fontWeight:'bold'}}>Note</label>
                                    <textarea className="md-input" name="note" placeholder="Note" style={{height:'120px', resize:'none'}} value={formData.note} onChange={handleChange}></textarea>
                                </div>
                            </div>
                        </form>
                    )}
                    
                    {activeTab === 'Comunicazioni' && (
                        isEditMode ? (
                            <div style={{padding: '24px'}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
                                    <h3 style={{margin: 0, fontSize: '1.2rem', fontWeight: 600, color: '#111827'}}>Comunicazioni</h3>
                                    <button 
                                        className="btn-save-full" 
                                        style={{width: 'auto', padding: '8px 16px', backgroundColor: '#10b981'}}
                                        onClick={() => setShowComunicazioneModal(true)}
                                    >
                                        <Mail size={18} style={{marginRight: '8px'}}/>
                                        Nuova Comunicazione
                                    </button>
                                </div>
                                
                                <div style={{
                                    backgroundColor: '#fff', 
                                    border: '1px solid #e5e7eb', 
                                    borderRadius: '8px', 
                                    overflow: 'hidden'
                                }}>
                                    {comunicazioni.length > 0 ? (
                                        <div style={{display: 'flex', flexDirection: 'column'}}>
                                            <div style={{
                                                display: 'grid', 
                                                gridTemplateColumns: '150px 80px 80px 1fr 120px', 
                                                padding: '12px 16px', 
                                                background: '#f9fafb', 
                                                borderBottom: '1px solid #e5e7eb', 
                                                fontWeight: 600, 
                                                fontSize: '0.85rem', 
                                                color: '#6b7280',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.025em'
                                            }}>
                                                <div>Data</div>
                                                <div>Tipo</div>
                                                <div>Stato</div>
                                                <div>Oggetto / Contenuto</div>
                                                <div>Mittente</div>
                                            </div>
                                            <div style={{maxHeight: '400px', overflowY: 'auto'}}>
                                            {comunicazioni.map((com) => (
                                                <div key={com.id} style={{
                                                    display: 'grid', 
                                                    gridTemplateColumns: '150px 80px 80px 1fr 120px', 
                                                    padding: '16px 16px', 
                                                    borderBottom: '1px solid #f3f4f6', 
                                                    fontSize: '0.9rem', 
                                                    alignItems: 'center',
                                                    backgroundColor: 'white'
                                                }}>
                                                    <div style={{
                                                        color: '#111827', 
                                                        fontSize: '0.85rem',
                                                        display: 'flex',
                                                        flexDirection: 'column'
                                                    }}>
                                                        <span>{new Date(com.data_invio || com.createdAt).toLocaleDateString()}</span>
                                                        <span style={{color: '#9ca3af', fontSize: '0.75rem'}}>{new Date(com.data_invio || com.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                    </div>
                                                    <div>
                                                        <span style={{
                                                            padding: '2px 8px', 
                                                            borderRadius: '9999px', 
                                                            fontSize: '0.7rem', 
                                                            fontWeight: 600,
                                                            backgroundColor: com.tipo === 'EMAIL' ? '#eff6ff' : '#fdf2f8',
                                                            color: com.tipo === 'EMAIL' ? '#2563eb' : '#db2777',
                                                            display: 'inline-block',
                                                            border: `1px solid ${com.tipo === 'EMAIL' ? '#dbeafe' : '#fce7f3'}`
                                                        }}>
                                                            {com.tipo}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            color: com.isInviato ? '#059669' : '#d97706',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 500
                                                        }}>
                                                            {com.isInviato ? <Check size={14} strokeWidth={2.5} /> : <Activity size={14} />} {com.isInviato ? 'Inviato' : 'In attesa'}
                                                        </span>
                                                    </div>
                                                    <div style={{
                                                        whiteSpace: 'nowrap', 
                                                        overflow: 'hidden', 
                                                        textOverflow: 'ellipsis', 
                                                        paddingRight: '16px',
                                                        color: '#374151',
                                                        display: 'flex',
                                                        alignItems: 'center'
                                                    }}>
                                                        {com.tipo === 'EMAIL' && com.oggetto ? (
                                                            <div style={{maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600, color: '#111827', marginRight: '6px'}} title={com.oggetto}>{com.oggetto}</div>
                                                        ) : null}
                                                        <div style={{
                                                            color: '#6b7280', 
                                                            fontSize: '0.85rem',
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            flex: 1
                                                        }} title={com.testo ? com.testo.replace(/<[^>]+>/g, '') : ''}>
                                                            {com.tipo === 'EMAIL' && com.oggetto ? '- ' : ''}
                                                            {com.testo ? com.testo.replace(/<[^>]+>/g, '') : ''}
                                                        </div>
                                                    </div>
                                                    <div style={{fontSize: '0.85rem', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                                        {com.mittente_nome || 'Sistema'}
                                                    </div>
                                                </div>
                                            ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{padding: '60px 20px', textAlign: 'center', color: '#9ca3af', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                                            <div style={{backgroundColor: '#f3f4f6', padding: '16px', borderRadius: '50%', marginBottom: '16px'}}>
                                                <Mail size={32} />
                                            </div>
                                            <p style={{margin: 0, fontWeight: 500}}>Nessuna comunicazione inviata</p>
                                            <p style={{margin: '8px 0 0 0', fontSize: '0.9rem', maxWidth: '300px'}}>Utilizza il pulsante "Nuova Comunicazione" per inviare email o SMS a questo socio.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div style={{padding: '24px', textAlign: 'center', color: '#6b7280'}}>
                                Devi prima salvare il socio per inviare comunicazioni.
                            </div>
                        )
                    )}

                    {activeTab !== 'Anagrafica' && activeTab !== 'Comunicazioni' && (
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

            {showComunicazioneModal && (
                 <ComunicazioneModal 
                    onClose={() => setShowComunicazioneModal(false)}
                    socioId={formData.id}
                    onSave={() => {
                        fetchComunicazioni();
                    }}
                 />
            )}
        </div>
    );
};

export default SocioModal;
