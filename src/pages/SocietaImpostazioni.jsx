import React, { useState, useEffect } from 'react';
import { useSocieta } from '../data/SocietaContext';
import { Save, X, Upload } from 'lucide-react';

const SocietaImpostazioni = () => {
    const { selectedSocietaId, societaList, fetchSocieta } = useSocieta();
    const [formData, setFormData] = useState({
        quota_tesseramento_unico: false
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [currentLogoPath, setCurrentLogoPath] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        if (selectedSocietaId && societaList.length > 0) {
            const societa = societaList.find(s => s.id == selectedSocietaId);
            if (societa) {
                setFormData({
                    quota_tesseramento_unico: societa.quota_tesseramento_unico || false
                });
                setCurrentLogoPath(societa.logo_path || null);
            }
        }
    }, [selectedSocietaId, societaList]);

    const handleCancel = () => {
        if (selectedSocietaId && societaList.length > 0) {
            const societa = societaList.find(s => s.id == selectedSocietaId);
            if (societa) {
                setFormData({
                    quota_tesseramento_unico: societa.quota_tesseramento_unico || false
                });
            }
        }
        setSelectedFile(null);
        setPreviewUrl(null);
    };

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
                setSelectedFile(null);
                setPreviewUrl(null);
            }

            const response = await fetch(`/users/api/societa/${selectedSocietaId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (response.ok) {
                setMessage({ type: 'success', text: 'Impostazioni salvate con successo' });
                fetchSocieta();
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

    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginBottom: '24px', fontSize: '1.2rem', fontWeight: 600, color: '#333' }}>Impostazioni Società</h2>

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
                {/* Logo Intestazione */}
                <div>
                    <label style={{ display: 'block', fontSize: '0.95rem', marginBottom: '15px', color: '#333', fontWeight: '600', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Logo Intestazione</label>
                    <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '10px' }}>Il logo verrà mostrato in alto a sinistra nel template di stampa della modulistica e nelle ricevute.</p>
                    <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start', marginBottom: '15px' }}>
                        <div>
                            <span style={{ display: 'block', fontSize: '0.8rem', marginBottom: '5px', color: '#666' }}>Attuale</span>
                            {currentLogoPath ? (
                                <div style={{ border: '1px solid #ddd', padding: '10px', display: 'inline-block', borderRadius: '4px', backgroundColor: '#fafafa' }}>
                                    <img
                                        src={`/users/${currentLogoPath}`}
                                        alt="Logo Società"
                                        style={{ maxWidth: '200px', maxHeight: '100px', objectFit: 'contain' }}
                                        onError={(e) => { e.target.onerror = null; e.target.src = ''; }}
                                    />
                                </div>
                            ) : (
                                <div style={{ color: '#999', fontStyle: 'italic', padding: '10px', border: '1px dashed #ddd', borderRadius: '4px' }}>Nessun logo caricato</div>
                            )}
                        </div>
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
                            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                        />
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '12px', color: '#555', fontWeight: 600 }}>
                        Iscrizioni e Tesseramento
                    </label>
                    <div
                        onClick={() => setFormData(prev => ({ ...prev, quota_tesseramento_unico: !prev.quota_tesseramento_unico }))}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '14px',
                            padding: '12px 18px',
                            border: `2px solid ${formData.quota_tesseramento_unico ? '#1976d2' : '#ddd'}`,
                            borderRadius: '8px',
                            backgroundColor: formData.quota_tesseramento_unico ? '#e3f2fd' : '#fafafa',
                            cursor: 'pointer',
                            userSelect: 'none',
                            transition: 'all 0.15s ease',
                            minWidth: '320px'
                        }}
                    >
                        <div style={{
                            width: '42px',
                            height: '24px',
                            borderRadius: '12px',
                            backgroundColor: formData.quota_tesseramento_unico ? '#1976d2' : '#ccc',
                            position: 'relative',
                            flexShrink: 0,
                            transition: 'background-color 0.15s ease'
                        }}>
                            <div style={{
                                width: '18px',
                                height: '18px',
                                borderRadius: '50%',
                                backgroundColor: 'white',
                                position: 'absolute',
                                top: '3px',
                                left: formData.quota_tesseramento_unico ? '21px' : '3px',
                                transition: 'left 0.15s ease',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                            }} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: formData.quota_tesseramento_unico ? '#1565c0' : '#333' }}>
                                Quota associativa e Tesseramento Unico
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#888', marginTop: '2px' }}>
                                {formData.quota_tesseramento_unico ? 'Attivo' : 'Non attivo'}
                            </div>
                        </div>
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

export default SocietaImpostazioni;
