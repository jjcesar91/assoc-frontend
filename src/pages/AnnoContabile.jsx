import React, { useState, useEffect } from 'react';
import { useSocieta } from '../data/SocietaContext';
import { Save, X, Calendar } from 'lucide-react';

const AnnoContabile = () => {
    
    const { selectedSocietaId, societaList, fetchSocieta } = useSocieta();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const [formData, setFormData] = useState({
        tipo_anno_associativo: 'solare', 
        data_inizio_anno_associativo: '01-01'
    });

    // Parsed day/month for the custom picker
    const [customDay, setCustomDay] = useState('01');
    const [customMonth, setCustomMonth] = useState('01');

    useEffect(() => {
        if (selectedSocietaId && societaList.length > 0) {
            const societa = societaList.find(s => s.id == selectedSocietaId);
            if (societa) {
                const tipo = societa.tipo_anno_associativo || 'solare';
                const data = societa.data_inizio_anno_associativo || '01-01';
                
                setFormData({
                    tipo_anno_associativo: tipo,
                    data_inizio_anno_associativo: data
                });

                if (tipo === 'personalizzato' && data) {
                    const parts = data.split('-');
                    if (parts.length === 2) {
                        setCustomDay(parts[0]);
                        setCustomMonth(parts[1]);
                    }
                }
            }
        }
    }, [selectedSocietaId, societaList]);

    // Update form data when type changes
    const handleTypeChange = (e) => {
        const type = e.target.value;
        let newData = formData.data_inizio_anno_associativo;
        
        if (type === 'solare') {
            newData = '01-01';
        } else if (type === 'associativo') {
            newData = '01-09'; // 1st September
        } else {
            // Keep current custom or default to 01-01
            newData = `${customDay}-${customMonth}`;
        }

        setFormData(prev => ({ 
            ...prev, 
            tipo_anno_associativo: type,
            data_inizio_anno_associativo: newData 
        }));
    };

    // Update custom date parts
    const handleDatePartChange = (part, value) => {
        const d = part === 'day' ? value : customDay;
        const m = part === 'month' ? value : customMonth;
        
        // Basic validation: ensure day is valid for month (simple implementation)
        // For simplicity, we trust user or perform basic clamp if needed.
        
        setCustomDay(part === 'day' ? value : customDay);
        setCustomMonth(part === 'month' ? value : customMonth);
        
        setFormData(prev => ({
            ...prev,
            data_inizio_anno_associativo: `${d}-${m}`
        }));
    };

    const handleSave = async () => {
        if (!selectedSocietaId) return;
        setLoading(true);
        setMessage(null);
        
        // Ensure data is consistent before sending
        let payloadData = formData.data_inizio_anno_associativo;
        if (formData.tipo_anno_associativo === 'solare') payloadData = '01-01';
        if (formData.tipo_anno_associativo === 'associativo') payloadData = '01-09';
        
        const payload = {
            ...formData,
            data_inizio_anno_associativo: payloadData
        };

        try {
            const response = await fetch(`/users/api/societa/${selectedSocietaId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Dati salvati con successo' });
                fetchSocieta(); 
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
        if (selectedSocietaId && societaList.length > 0) {
            const societa = societaList.find(s => s.id == selectedSocietaId);
            if (societa) {
                const tipo = societa.tipo_anno_associativo || 'solare';
                const data = societa.data_inizio_anno_associativo || '01-01';
                setFormData({
                    tipo_anno_associativo: tipo,
                    data_inizio_anno_associativo: data
                });
                if (tipo === 'personalizzato' && data) {
                    const parts = data.split('-');
                    if (parts.length === 2) {
                        setCustomDay(parts[0]);
                        setCustomMonth(parts[1]);
                    }
                }
            }
        }
        setMessage(null);
    };

    const months = [
        { val: '01', label: 'Gennaio' }, { val: '02', label: 'Febbraio' }, { val: '03', label: 'Marzo' },
        { val: '04', label: 'Aprile' }, { val: '05', label: 'Maggio' }, { val: '06', label: 'Giugno' },
        { val: '07', label: 'Luglio' }, { val: '08', label: 'Agosto' }, { val: '09', label: 'Settembre' },
        { val: '10', label: 'Ottobre' }, { val: '11', label: 'Novembre' }, { val: '12', label: 'Dicembre' }
    ];

    const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

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
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: '#555' }}>Scadenza anno contabile</label>
                    <div style={{ position: 'relative' }}>
                        <select 
                            className="md-input" 
                            name="tipo_anno_associativo" 
                            value={formData.tipo_anno_associativo} 
                            onChange={handleTypeChange}
                            style={{ width: '100%', padding: '8px 12px', appearance: 'none', backgroundColor: 'white' }}
                        >
                            <option value="solare">Anno Solare (01/01 - 31/12)</option>
                            <option value="associativo">Anno Sportivo (01/09 - 31/08)</option>
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
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <select 
                                    className="md-input" 
                                    value={customDay} 
                                    onChange={(e) => handleDatePartChange('day', e.target.value)}
                                    style={{ width: '100%', padding: '8px 12px', appearance: 'none', backgroundColor: 'white' }}
                                >
                                    {days.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1 1L5 5L9 1" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                            </div>
                            <div style={{ flex: 2, position: 'relative' }}>
                                <select 
                                    className="md-input" 
                                    value={customMonth} 
                                    onChange={(e) => handleDatePartChange('month', e.target.value)}
                                    style={{ width: '100%', padding: '8px 12px', appearance: 'none', backgroundColor: 'white' }}
                                >
                                    {months.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                                </select>
                                <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1 1L5 5L9 1" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                            </div>
                        </div>
                        {/* Preview of the stored string for debugging if needed 
                        <div style={{fontSize: '0.8em', color: '#888', marginTop: '4px'}}>
                            Salverà: {formData.data_inizio_anno_associativo} (DD-MM)
                        </div>
                        */}
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
