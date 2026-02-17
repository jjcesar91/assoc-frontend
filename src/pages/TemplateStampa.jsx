import React, { useState, useEffect } from 'react';
import { useSocieta } from '../data/SocietaContext';
import { Save, Upload } from 'lucide-react';

const TemplateStampa = () => {
    const { selectedSocietaId, societaList, fetchSocieta } = useSocieta();
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [currentLogoPath, setCurrentLogoPath] = useState(null);
    const [footerText, setFooterText] = useState('');

    useEffect(() => {
        if (selectedSocietaId && societaList.length > 0) {
            const societa = societaList.find(s => s.id == selectedSocietaId);
            if (societa) {
               setCurrentLogoPath(societa.logo_path || null);
               setFooterText(societa.footer_text || '');
            } else {
                setCurrentLogoPath(null);
                setFooterText('');
            }
        }
    }, [selectedSocietaId, societaList]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        if (!selectedSocietaId) return;

        setLoading(true);
        setMessage(null);

        try {
            // Upload Logo
            if (selectedFile) {
                const formData = new FormData();
                formData.append('logo', selectedFile);

                const logoResponse = await fetch(`/users/api/societa/${selectedSocietaId}/logo`, {
                    method: 'POST',
                    body: formData
                });

                if (!logoResponse.ok) {
                    const err = await logoResponse.json();
                     throw new Error('Errore caricamento logo: ' + (err.error || err.message));
                }
            }

            // Update Footer Text
            const updateResponse = await fetch(`/users/api/societa/${selectedSocietaId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ footer_text: footerText })
            });

            if (!updateResponse.ok) {
                const err = await updateResponse.json();
                throw new Error('Errore salvataggio dati: ' + (err.error || err.message));
            }

            // Success
            setMessage({ type: 'success', text: 'Template salvato con successo' });
            fetchSocieta();
            // Reset URL only if file was selected, but keep file selection cleared after save
            if (selectedFile) {
                // If backend returns updated path we could use it, but fetchSocieta should handle it eventually
                // But for immediate feedback, we might want to refetch explicitly or just trust the reload
            }
            setSelectedFile(null);
            setPreviewUrl(null);

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
            <h2 style={{ marginBottom: '24px', fontSize: '1.2rem', fontWeight: 600, color: '#333' }}>Template di Stampa</h2>
            
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }}>
                {/* Logo Section */}
                <div>
                     <label style={{ display: 'block', fontSize: '0.95rem', marginBottom: '15px', color: '#333', fontWeight: '600', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Logo Intestazione</label>
                     
                     <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start', marginBottom: '15px' }}>
                        {/* Current Logo */}
                        <div>
                            <span style={{ display: 'block', fontSize: '0.8rem', marginBottom: '5px', color: '#666' }}>Attuale</span>
                            {currentLogoPath ? (
                                <div style={{ border: '1px solid #ddd', padding: '10px', display: 'inline-block', borderRadius: '4px', backgroundColor: '#fafafa' }}>
                                    <img 
                                        src={`/users/${currentLogoPath}`} 
                                        alt="Logo Società" 
                                        style={{ maxWidth: '200px', maxHeight: '100px', objectFit: 'contain' }} 
                                        onError={(e) => {e.target.onerror = null; e.target.src = 'https://via.placeholder.com/200x50?text=Image+Not+Found'}}
                                    />
                                </div>
                            ) : (
                                <div style={{ color: '#999', fontStyle: 'italic', padding: '10px', border: '1px dashed #ddd', borderRadius: '4px' }}>Nessun logo caricato</div>
                            )}
                        </div>

                        {/* New Logo Preview */}
                        {previewUrl && (
                             <div>
                                <span style={{ display: 'block', fontSize: '0.8rem', marginBottom: '5px', color: '#666' }}>Anteprima Nuovo</span>
                                <div style={{ border: '1px solid #2e7d32', padding: '10px', display: 'inline-block', borderRadius: '4px', backgroundColor: '#fafafa' }}>
                                    <img src={previewUrl} alt="Preview" style={{ maxWidth: '200px', maxHeight: '100px', objectFit: 'contain' }} />
                                </div>
                            </div>
                        )}
                     </div>

                    <div>
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleFileChange}
                            className="md-input"
                            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                        />
                    </div>
                </div>

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
                    onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
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
                    <Upload size={18} style={{ transform: 'rotate(45deg)' }} /> Annulla
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

export default TemplateStampa;
