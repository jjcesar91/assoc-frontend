import React, { useState, useEffect } from 'react';
import { useSocieta } from '../data/SocietaContext';
import { Save, X } from 'lucide-react';
import CityAutocomplete from '../components/CityAutocomplete';
// Import existing UI components if available, otherwise style inline or reuse classes from App.css

const TIPO_ASSOCIAZIONE_OPTIONS = ['EPS', 'DSA', 'Federazioni'];

const ASSOCIAZIONE_OPTIONS = {
    'EPS': ['ASCI', 'AICS', 'ASC', 'ASI', 'NCS LIBERTAS', 'CSAIN', 'CSEN', 'CSI', 'ENDAS', 'MPS', 'OPES', 'PGS', 'UISP', 'US ACLI'],
    'DSA': ['FIGB', 'FICSF', 'FID', 'FIGEST', 'FIPAP', 'FIPT', 'FIRatf', 'FSI', 'FISO', 'FITDS', 'FITETREC ANTE', 'FITw', 'FIWuK'],
    'Federazioni': ['ACI', 'AeCI', 'CUSI', 'FASI', 'FCI', 'FCrI', 'FEDERKOMBAT', 'FGI', 'FIB', 'FIBA', 'FIBS', 'FIC', 'FICK', 'FICr', 'FIDAF', 'FIDAL', 'FIDASC', 'FIDESM', 'FIG', 'FIGC', 'FIGH', 'FIGS', 'FIH', 'FIJLKAM', 'FIM', 'FIN', 'FIP', 'FIPAV', 'FIPE', 'FIPM', 'FIPSAS', 'FIR', 'FIS', 'FISE', 'FISG', 'FISI', 'FISR', 'FISSW', 'FITA', 'FITArco', 'FITAV', 'FITET', 'FITP', 'FITRI', 'FIV', 'FMI', 'FMSI', 'UITS']
};

const SocietaAnagrafica = () => {
    const { selectedSocietaId, societaList, fetchSocieta } = useSocieta();
    const [formData, setFormData] = useState({
        denominazione: '',
        codice_fiscale: '',
        partita_iva: '',
        codice_sdi: '',
        pec: '',
        email: '',
        telefono: '',
        indirizzo: '',
        comune: '',
        cap: '',
        affiliazioni: [],
        tipo_associazione: 'ASD',
        cognome_rappr_legale: '',
        nome_rappr_legale: '',
        alias_sms: '',
        alias_email: ''
    });
    const [tempAffiliazione, setTempAffiliazione] = useState({ tipo: '', nome: '' });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (selectedSocietaId && societaList.length > 0) {
            const societa = societaList.find(s => s.id == selectedSocietaId);
            if (societa) {
                setFormData({
                    denominazione: societa.denominazione || '',
                    codice_fiscale: societa.codice_fiscale || '',
                    partita_iva: societa.partita_iva || '',
                    codice_sdi: societa.codice_sdi || '',
                    pec: societa.pec || '',
                    email: societa.email || '',
                    telefono: societa.telefono || '',
                    indirizzo: societa.indirizzo || '',
                    comune: societa.comune || '',
                    cap: societa.cap || '',
                    affiliazioni: societa.affiliazioni || [],
                    tipo_associazione: societa.tipo_associazione || 'ASD',
                    cognome_rappr_legale: societa.cognome_rappr_legale || '',
                    nome_rappr_legale: societa.nome_rappr_legale || '',
                    alias_sms: societa.alias_sms || '',
                    alias_email: societa.alias_email || ''
                });
            }
        }
    }, [selectedSocietaId, societaList]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        const UPPERCASE_FIELDS = ['codice_fiscale', 'codice_sdi', 'denominazione', 'indirizzo', 'cognome_rappr_legale', 'nome_rappr_legale'];
        let finalValue = UPPERCASE_FIELDS.includes(name) ? value.toUpperCase() : value;
        if (name === 'codice_sdi') finalValue = finalValue.replace(/[^A-Z0-9]/g, '').slice(0, 7);
        setFormData(prev => ({ ...prev, [name]: finalValue }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    };

    const handleAddAffiliazione = (e) => {
        e.preventDefault(); // Prevent form submission if inside a form tag
        if (tempAffiliazione.tipo && tempAffiliazione.nome) {
            const exists = formData.affiliazioni.some(a => a.tipo === tempAffiliazione.tipo && a.nome === tempAffiliazione.nome);
            if (!exists) {
                setFormData(prev => ({
                    ...prev,
                    affiliazioni: [...prev.affiliazioni, { ...tempAffiliazione }]
                }));
                // Reset ONLY nome if you want to keep type, but usually better to reset both or keeps type as user might add multiple from same type.
                // Request says "Selection multiple... removing previously selected".
                // I'll reset name only to facilitate adding multiple from same type, but let's just reset both to be clean
                setTempAffiliazione({ tipo: '', nome: '' }); 
            }
        }
    };

    const handleRemoveAffiliazione = (index) => {
        setFormData(prev => ({
            ...prev,
            affiliazioni: prev.affiliazioni.filter((_, i) => i !== index)
        }));
    };

    const handleSave = async () => {
        if (!selectedSocietaId) return;
        const validationErrors = {};
        if (formData.codice_sdi && formData.codice_sdi.trim().length > 0) {
            if (!/^[A-Z0-9]{6,7}$/.test(formData.codice_sdi.trim())) {
                validationErrors.codice_sdi = 'Codice SDI non valido (6-7 caratteri alfanumerici).';
            }
        }
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        setErrors({});
        setLoading(true);
        setMessage(null);
        try {
            const response = await fetch(`/users/api/societa/${selectedSocietaId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const updatedSocieta = await response.json();
                setMessage({ type: 'success', text: 'Dati salvati con successo' });
                document.querySelector('.content-area')?.scrollTo({ top: 0, behavior: 'smooth' });
                // Update form data with the response
                setFormData(prev => ({
                    ...prev,
                    affiliazioni: updatedSocieta.affiliazioni || formData.affiliazioni
                }));
                fetchSocieta(); // Refresh list/context
            } else {
                const err = await response.json();
                setMessage({ type: 'error', text: 'Errore durante il salvataggio: ' + (err.error || err.message) });
            }
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Errore di rete' });
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        // Reset form to current societa values
        if (selectedSocietaId && societaList.length > 0) {
            const societa = societaList.find(s => s.id == selectedSocietaId);
            if (societa) {
                 setFormData({
                    denominazione: societa.denominazione || '',
                    codice_fiscale: societa.codice_fiscale || '',
                    partita_iva: societa.partita_iva || '',
                    codice_sdi: societa.codice_sdi || '',
                    pec: societa.pec || '',
                    email: societa.email || '',
                    telefono: societa.telefono || '',
                    indirizzo: societa.indirizzo || '',
                    comune: societa.comune || '',
                    cap: societa.cap || '',
                    affiliazioni: societa.affiliazioni || [],
                    tipo_associazione: societa.tipo_associazione || 'ASD',
                    cognome_rappr_legale: societa.cognome_rappr_legale || '',
                    nome_rappr_legale: societa.nome_rappr_legale || '',
                    alias_sms: societa.alias_sms || '',
                    alias_email: societa.alias_email || ''
                });
            }
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginBottom: '24px', fontSize: '1.2rem', fontWeight: 600, color: '#333' }}>Anagrafica Società</h2>
            
            {message && (
                <div style={{ 
                    padding: '10px', 
                    marginBottom: '20px', 
                    borderRadius: '4px', 
                    backgroundColor: message.type === 'success' ? '#e8f5e9' : '#ffebee',
                    color: message.type === 'success' ? '#2e7d32' : '#c62828'
                }}>
                    {message.text}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                {/* Denominazione */}
                <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: '#555' }}>Denominazione</label>
                    <input 
                        className="md-input" 
                        name="denominazione"
                        value={formData.denominazione}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '8px 12px' }}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '20px', flexWrap: 'wrap' }}>
                     <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: '#555' }}>Codice fiscale</label>
                        <input className="md-input" name="codice_fiscale" value={formData.codice_fiscale} onChange={handleChange} style={{ width: '100%', padding: '8px 12px' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: '#555' }}>Partita IVA</label>
                        <input className="md-input" name="partita_iva" value={formData.partita_iva} onChange={handleChange} style={{ width: '100%', padding: '8px 12px' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: '#555' }}>Codice SDI (es. 000000)</label>
                        <input
                            className="md-input"
                            name="codice_sdi"
                            value={formData.codice_sdi}
                            onChange={handleChange}
                            maxLength={7}
                            style={{ width: '100%', padding: '8px 12px', ...(errors.codice_sdi ? { borderColor: 'var(--danger-color)', backgroundColor: '#fff5f5' } : {}) }}
                        />
                        {errors.codice_sdi && <div style={{ color: 'var(--danger-color)', fontSize: '0.8rem', marginTop: '4px' }}>{errors.codice_sdi}</div>}
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: '#555' }}>PEC</label>
                        <input className="md-input" name="pec" value={formData.pec} onChange={handleChange} style={{ width: '100%', padding: '8px 12px' }} />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: '#555' }}>Email</label>
                        <input className="md-input" name="email" value={formData.email} onChange={handleChange} style={{ width: '100%', padding: '8px 12px' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: '#555' }}>Telefono</label>
                        <input className="md-input" name="telefono" value={formData.telefono} onChange={handleChange} style={{ width: '100%', padding: '8px 12px' }} />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: '#555' }}>Indirizzo</label>
                        <input className="md-input" name="indirizzo" value={formData.indirizzo} onChange={handleChange} style={{ width: '100%', padding: '8px 12px' }} />
                    </div>
                    <div>
                         {/* Comune with Autocomplete */}
                         <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: '#555' }}>Comune</label>
                         {/* Remove the extra relative div wrapper and let CityAutocomplete handle it or wrap tightly */}
                         <CityAutocomplete
                             value={formData.comune}
                             onChange={(e) => setFormData(prev => ({ ...prev, comune: e.target.value.toUpperCase() }))}
                             onSelect={(c) => setFormData(prev => ({ ...prev, comune: c.nome.toUpperCase(), cap: c.cap || prev.cap }))}
                             style={{ marginTop: 0, width: '100%' }} 
                         />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: '#555' }}>Cap</label>
                        <input className="md-input" name="cap" value={formData.cap} onChange={handleChange} style={{ width: '100%', padding: '8px 12px' }} />
                    </div>
                </div>

                {/* Tipo Associazione */}
                <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: '#555' }}>Tipo Associazione</label>
                    <select
                        className="md-input"
                        name="tipo_associazione"
                        value={formData.tipo_associazione}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '8px 12px' }}
                    >
                        <option value="ASD">Associazione Sportiva Dilettantistica (ASD)</option>
                        <option value="APS">Associazione di Promozione Sociale (APS)</option>
                    </select>
                </div>

                {/* Affiliazioni Section */}
                <div style={{ border: '1px solid #eee', padding: '16px', borderRadius: '4px' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '12px', color: '#333', fontWeight: 600 }}>Affiliazioni</label>
                    
                    {/* List of selected affiliations */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                        {formData.affiliazioni && formData.affiliazioni.length > 0 ? (
                            formData.affiliazioni.map((aff, index) => (
                                <div key={index} style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '6px', 
                                    padding: '4px 8px', 
                                    backgroundColor: '#e3f2fd', 
                                    color: '#1565c0', 
                                    borderRadius: '16px', 
                                    fontSize: '0.85rem' 
                                }}>
                                    <span>{aff.tipo}: <strong>{aff.nome}</strong></span>
                                    <button 
                                        onClick={() => handleRemoveAffiliazione(index)}
                                        style={{ border: 'none', background: 'transparent', color: '#d32f2f', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div style={{ color: '#777', fontSize: '0.85rem', fontStyle: 'italic' }}>Nessuna affiliazione selezionata</div>
                        )}
                    </div>

                    {/* Add new affiliation form */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px', color: '#555' }}>Tipo</label>
                            <select 
                                className="md-input" 
                                value={tempAffiliazione.tipo} 
                                onChange={(e) => setTempAffiliazione({ tipo: e.target.value, nome: '' })} 
                                style={{ width: '100%', padding: '6px 8px' }}
                            >
                                <option value="">Seleziona Tipo...</option>
                                {TIPO_ASSOCIAZIONE_OPTIONS.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px', color: '#555' }}>Affiliazione</label>
                            <select 
                                className="md-input" 
                                value={tempAffiliazione.nome} 
                                onChange={(e) => setTempAffiliazione(prev => ({ ...prev, nome: e.target.value }))} 
                                style={{ width: '100%', padding: '6px 8px' }}
                                disabled={!tempAffiliazione.tipo}
                            >
                                <option value="">Seleziona...</option>
                                {tempAffiliazione.tipo && ASSOCIAZIONE_OPTIONS[tempAffiliazione.tipo]?.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                        <button 
                            type="button"
                            onClick={handleAddAffiliazione}
                            disabled={!tempAffiliazione.tipo || !tempAffiliazione.nome}
                            style={{ 
                                padding: '8px 16px', 
                                backgroundColor: (!tempAffiliazione.tipo || !tempAffiliazione.nome) ? '#ccc' : '#1976d2', 
                                color: 'white', 
                                border: 'none', 
                                borderRadius: '4px', 
                                cursor: (!tempAffiliazione.tipo || !tempAffiliazione.nome) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            Aggiungi
                        </button>
                    </div>
                </div>

                <div style={{ height: '1px', backgroundColor: '#eee', margin: '10px 0' }}></div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: '#555' }}>Cognome Rappr. legale</label>
                        <input className="md-input" name="cognome_rappr_legale" value={formData.cognome_rappr_legale} onChange={handleChange} style={{ width: '100%', padding: '8px 12px' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: '#555' }}>Nome Rappr. legale</label>
                        <input className="md-input" name="nome_rappr_legale" value={formData.nome_rappr_legale} onChange={handleChange} style={{ width: '100%', padding: '8px 12px' }} />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: '#555' }}>Alias SMS</label>
                        <input className="md-input" name="alias_sms" value={formData.alias_sms} onChange={handleChange} style={{ width: '100%', padding: '8px 12px' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: '#555' }}>Alias Email</label>
                        <input className="md-input" name="alias_email" value={formData.alias_email} onChange={handleChange} style={{ width: '100%', padding: '8px 12px' }} />
                    </div>
                </div>

            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
                <button 
                    onClick={handleCancel}
                    style={{ 
                        padding: '10px 20px', 
                        borderRadius: '4px', 
                        border: 'none', 
                        backgroundColor: '#d32f2f', 
                        color: 'white', 
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <X size={18} /> Annulla
                </button>
                <button 
                    onClick={handleSave}
                    disabled={loading}
                    style={{ 
                        padding: '10px 24px', 
                        borderRadius: '4px', 
                        border: 'none', 
                        backgroundColor: '#2e7d32', 
                        color: 'white', 
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        opacity: loading ? 0.7 : 1
                    }}
                >
                    <Save size={18} /> Salva
                </button>
            </div>
        </div>
    );
};

export default SocietaAnagrafica;
