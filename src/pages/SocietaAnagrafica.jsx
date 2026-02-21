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
        tipo_associazione: '',
        associazione_riferimento: '',
        cognome_rappr_legale: '',
        nome_rappr_legale: '',
        alias_sms: '',
        alias_email: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        if (selectedSocietaId && societaList.length > 0) {
            const societa = societaList.find(s => s.id == selectedSocietaId);
            if (societa) {
                // Map backend fields to form fields if they differ, or just spread if they match
                // We need to check what the backend returns for a societa.
                // Assuming the backend returns keys similar to what we want or we map them.
                // Let's assume standard snake_case or whatever the backend uses.
                // For now, I'll populate with what I have and user can edit.
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
                    tipo_associazione: societa.tipo_associazione || '',
                    associazione_riferimento: societa.associazione_riferimento || '',
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
        setFormData(prev => {
            const updated = { ...prev, [name]: value };
            // Reset dependent dropdown when parent changes
            if (name === 'tipo_associazione') {
                updated.associazione_riferimento = '';
            }
            return updated;
        });
    };

    const handleSave = async () => {
        if (!selectedSocietaId) return;
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
                // Update form data with the response just in case backend modified/sanitized it
                setFormData(prev => ({
                    ...prev,
                    tipo_associazione: updatedSocieta.tipo_associazione || formData.tipo_associazione,
                    associazione_riferimento: updatedSocieta.associazione_riferimento || formData.associazione_riferimento
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
                    tipo_associazione: societa.tipo_associazione || '',
                    associazione_riferimento: societa.associazione_riferimento || '',
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
                        <input className="md-input" name="codice_sdi" value={formData.codice_sdi} onChange={handleChange} style={{ width: '100%', padding: '8px 12px' }} />
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
                             onChange={(val) => setFormData(prev => ({ ...prev, comune: val }))} 
                             style={{ marginTop: 0, width: '100%' }} 
                         />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: '#555' }}>Cap</label>
                        <input className="md-input" name="cap" value={formData.cap} onChange={handleChange} style={{ width: '100%', padding: '8px 12px' }} />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: '#555' }}>Tipo Associazione</label>
                        <select 
                            className="md-input" 
                            name="tipo_associazione" 
                            value={formData.tipo_associazione} 
                            onChange={handleChange} 
                            style={{ width: '100%', padding: '8px 12px' }}
                        >
                            <option value="">Seleziona...</option>
                            {TIPO_ASSOCIAZIONE_OPTIONS.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: '#555' }}>Scegli Associazione</label>
                        <select 
                            className="md-input" 
                            name="associazione_riferimento" 
                            value={formData.associazione_riferimento} 
                            onChange={handleChange} 
                            style={{ width: '100%', padding: '8px 12px' }}
                            disabled={!formData.tipo_associazione}
                        >
                            <option value="">Seleziona...</option>
                            {formData.tipo_associazione && ASSOCIAZIONE_OPTIONS[formData.tipo_associazione]?.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
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
