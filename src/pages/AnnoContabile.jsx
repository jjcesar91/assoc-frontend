import React, { useState, useEffect } from 'react';
import { useSocieta } from '../data/SocietaContext';
import { Save, X, Calendar } from 'lucide-react';

const AnnoContabile = () => {
    
    const { selectedSocietaId, societaList, fetchSocieta } = useSocieta();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const [formData, setFormData] = useState({
        tipo_anno_associativo: 'solare', // Default to Anno Solare
        data_inizio_anno_associativo: ''
    });

    useEffect(() => {
        if (selectedSocietaId && societaList.length > 0) {
            const societa = societaList.find(s => s.id == selectedSocietaId);
            if (societa) {
                setFormData({
                    tipo_anno_associativo: societa.tipo_anno_associativo || 'solare',
                    data_inizio_anno_associativo: societa.data_inizio_anno_associativo || ''
                });
            }
        }
    }, [selectedSocietaId, societaList]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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
                setMessage({ type: 'success', text: 'Dati salvati con successo' });
                fetchSocieta(); // Refresh context
            } else {
                const err = await response.json();
                setMessage({ type: 'error', text: 'Errore: ' + (err.error || err.message) });
            }
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Errore di rete' });
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        // Reset to initial state from context
        if (selectedSocietaId && societaList.length > 0) {
            const societa = societaList.find(s => s.id == selectedSocietaId);
            if (societa) {
                setFormData({
                    tipo_anno_associativo: societa.tipo_anno_associativo || 'solare',
                    data_inizio_anno_associativo: societa.data_inizio_anno_associativo || ''
                });
            }
        }
        setMessage(null);
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginBottom: '24px', fontSize: '1.2rem', fontWeight: 600, color: '#333' }}>Anno Contabile</h2>

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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: '#555' }}>Scadenza anno associativo</label>
                    <div style={{ position: 'relative' }}>
                        <select 
                            className="md-input" 
                            name="tipo_anno_associativo" 
                            value={formData.tipo_anno_associativo} 
                            onChange={handleChange}
                            style={{ width: '100%', padding: '8px 12px', appearance: 'none', backgroundColor: 'white' }}
                        >
                            <option value="solare">Anno Solare (01/01 - 31/12)</option>
                            <option value="sportivo">Anno Sportivo (01/09 - 31/08)</option>
                            <option value="personalizzato">Personalizzato</option>
                        </select>
                        <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 1L5 5L9 1" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                    </div>
                </div>

                {formData.tipo_anno_associativo === 'personalizzato' && (
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: '#555' }}>Inizio Anno Associativo</label>
                        <div style={{position: 'relative', display: 'flex', alignItems: 'center'}}>
                            <input 
                                type="date" 
                                className="md-input" 
                                name="data_inizio_anno_associativo" 
                                value={formData.data_inizio_anno_associativo} 
                                onChange={handleChange} 
                                style={{ width: '100%', paddingRight: '35px', padding: '8px 12px 8px 12px' }} 
                            />
                            <Calendar 
                                size={18} 
                                style={{position: 'absolute', right: '10px', color: '#6b7280', cursor: 'pointer', zIndex: 5}} 
                                onClick={(e) => {
                                    const input = e.currentTarget.previousElementSibling;
                                    if(input && input.showPicker) input.showPicker();
                                    else if(input) input.focus();
                                }} 
                            />
                        </div>
                    </div>
                )}
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

export default AnnoContabile;
