import React, { useState, useEffect } from 'react';
import { useSocieta } from '../data/SocietaContext';
import { Save, X } from 'lucide-react';

const TemplateStampa = () => {
    const { selectedSocietaId, societaList, fetchSocieta } = useSocieta();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [footerText, setFooterText] = useState('');
    const [originalFooterText, setOriginalFooterText] = useState('');

    useEffect(() => {
        setMessage(null);
        if (selectedSocietaId && societaList.length > 0) {
            const societa = societaList.find(s => s.id == selectedSocietaId);
            const footer = societa ? (societa.footer_text || '') : '';
            setFooterText(footer);
            setOriginalFooterText(footer);
        }
    }, [selectedSocietaId, societaList]);

    const handleSave = async () => {
        if (!selectedSocietaId) return;

        setLoading(true);
        setMessage(null);

        try {
            const updateResponse = await fetch(`/users/api/societa/${selectedSocietaId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ footer_text: footerText })
            });

            if (!updateResponse.ok) {
                const err = await updateResponse.json();
                throw new Error('Errore salvataggio dati: ' + (err.error || err.message));
            }

            setMessage({ type: 'success', text: 'Template salvato con successo' });
            fetchSocieta();

        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: error.message || 'Errore di rete' });
        } finally {
            setLoading(false);
        }
    };

    if (!selectedSocietaId) {
        return <div style={{ padding: '20px' }}>Seleziona una società per gestire il template di stampa.</div>;
    }

    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginBottom: '24px', fontSize: '1.2rem', fontWeight: 600, color: '#333' }}>Footer</h2>
            
            {message && (
                <div style={{ 
                    padding: '10px', 
                    marginBottom: '20px', 
                    borderRadius: '4px', 
                    backgroundColor: message.type === 'success' ? 'var(--success-container)' : 'var(--danger-container)',
                    color: message.type === 'success' ? 'var(--success)' : 'var(--danger)'
                }}>
                    {message.text}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }}>
                {/* Footer Section */}
                <div>
                    <label style={{ display: 'block', fontSize: '0.95rem', marginBottom: '15px', color: '#333', fontWeight: '600', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Sottopagina (Footer)</label>
                    <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '10px' }}>Inserisci qui il testo che apparirà a piè pagina nei documenti generati.</p>
                    <textarea 
                        value={footerText || ''}
                        onChange={(e) => setFooterText(e.target.value)}
                        rows={5}
                        style={{ 
                            width: '100%', 
                            padding: '12px', 
                            border: '1px solid #ccc', 
                            borderRadius: '4px', 
                            fontFamily: 'inherit',
                            resize: 'vertical',
                            backgroundColor: 'white',
                            color: '#333'
                        }}
                        placeholder="Es. Sede Legale: Via Roma 1, Milano - P.IVA: 12345678901 - PEC: societa@pec.it"
                    />
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
                <button 
                    onClick={() => setFooterText(originalFooterText)}
                    style={{ 
                        padding: '10px 20px', 
                        borderRadius: '4px', 
                        border: 'none', 
                        backgroundColor: 'var(--danger)', 
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
                        backgroundColor: 'var(--success)', 
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

export default TemplateStampa;
