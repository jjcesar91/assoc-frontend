import React, { useState, useEffect } from 'react';
import { useSocieta } from '../data/SocietaContext';
import { Save, X } from 'lucide-react';

const SocietaComunicazioni = () => {
    const { selectedSocietaId, societaList, fetchSocieta } = useSocieta();
    const [formData, setFormData] = useState({
        alias_sms: '',
        alias_email: '',
        smtp_host: '',
        smtp_port: '',
        smtp_user: '',
        smtp_password: '',
        smtp_secure: false
    });
    const [smtpAbilitato, setSmtpAbilitato] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const hasCustomSmtp = (societa) =>
        !!(societa && societa.smtp_host && societa.smtp_user && societa.smtp_password);

    useEffect(() => {
        if (selectedSocietaId && societaList.length > 0) {
            const societa = societaList.find(s => s.id == selectedSocietaId);
            if (societa) {
                setFormData({
                    alias_sms: societa.alias_sms || '',
                    alias_email: societa.alias_email || '',
                    smtp_host: societa.smtp_host || '',
                    smtp_port: societa.smtp_port || '',
                    smtp_user: societa.smtp_user || '',
                    smtp_password: societa.smtp_password || '',
                    smtp_secure: societa.smtp_secure || false
                });
                setSmtpAbilitato(hasCustomSmtp(societa));
            }
        }
    }, [selectedSocietaId, societaList]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleToggleSmtp = (e) => {
        const abilitato = e.target.checked;
        setSmtpAbilitato(abilitato);
        if (!abilitato) {
            // Pulisce i campi SMTP visivamente quando si disabilita
            setFormData(prev => ({
                ...prev,
                smtp_host: '',
                smtp_port: '',
                smtp_user: '',
                smtp_password: '',
                smtp_secure: false
            }));
        }
    };

    const handleSave = async () => {
        if (!selectedSocietaId) return;
        setLoading(true);
        setMessage(null);
        try {
            let payload = { ...formData };

            if (!smtpAbilitato) {
                // Cancella SMTP personalizzato → il sistema userà quello di default
                payload = {
                    ...payload,
                    smtp_host: null,
                    smtp_port: null,
                    smtp_user: null,
                    smtp_password: null,
                    smtp_secure: false
                };
            } else {
                payload.smtp_port = formData.smtp_port === '' ? null : parseInt(formData.smtp_port, 10);
            }

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
        if (selectedSocietaId && societaList.length > 0) {
            const societa = societaList.find(s => s.id == selectedSocietaId);
            if (societa) {
                setFormData({
                    alias_sms: societa.alias_sms || '',
                    alias_email: societa.alias_email || '',
                    smtp_host: societa.smtp_host || '',
                    smtp_port: societa.smtp_port || '',
                    smtp_user: societa.smtp_user || '',
                    smtp_password: societa.smtp_password || '',
                    smtp_secure: societa.smtp_secure || false
                });
                setSmtpAbilitato(hasCustomSmtp(societa));
            }
        }
    };

    if (!selectedSocietaId) {
        return <div style={{ padding: '20px' }}>Seleziona una società per visualizzare i dettagli.</div>;
    }

    const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: '4px', outline: 'none', transition: 'border-color 0.3s' };
    const labelStyle = { display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: '#555' };
    const sectionHeaderStyle = { fontSize: '1rem', fontWeight: 500, color: '#333', marginBottom: '16px', borderBottom: '1px solid #eee', paddingBottom: '8px' };

    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginBottom: '24px', fontSize: '1.2rem', fontWeight: 600, color: '#333' }}>Comunicazioni</h2>
            
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
                
                {/* Section Alias */}
                <div>
                    <h3 style={sectionHeaderStyle}>Alias</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <label style={labelStyle}>Alias SMS</label>
                            <input 
                                style={inputStyle}
                                className="md-input"
                                name="alias_sms"
                                value={formData.alias_sms}
                                onChange={handleChange}
                                placeholder="Nome mittente SMS"
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Alias Email (Nome Mittente)</label>
                            <input 
                                style={inputStyle}
                                className="md-input"
                                name="alias_email"
                                value={formData.alias_email}
                                onChange={handleChange}
                                placeholder="Nome visualizzato nelle email inviate"
                            />
                        </div>
                    </div>
                </div>

                {/* Section SMTP */}
                <div>
                    <h3 style={sectionHeaderStyle}>
                        Parametri SMTP
                    </h3>

                    {/* Toggle abilitazione SMTP personalizzato */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '20px',
                        padding: '12px 16px',
                        backgroundColor: smtpAbilitato ? '#e8f5e9' : '#f5f5f5',
                        borderRadius: '6px',
                        border: `1px solid ${smtpAbilitato ? '#a5d6a7' : '#e0e0e0'}`,
                        transition: 'all 0.2s'
                    }}>
                        <input
                            type="checkbox"
                            id="smtp_abilitato"
                            checked={smtpAbilitato}
                            onChange={handleToggleSmtp}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2e7d32' }}
                        />
                        <label htmlFor="smtp_abilitato" style={{ cursor: 'pointer', fontSize: '0.95rem', fontWeight: 500, color: smtpAbilitato ? '#2e7d32' : '#555', userSelect: 'none' }}>
                            Usa SMTP personalizzato (sovrascrive il server di default)
                        </label>
                        {!smtpAbilitato && (
                            <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#888' }}>
                                Verrà utilizzato il server SMTP di default
                            </span>
                        )}
                    </div>

                    <div style={{ opacity: smtpAbilitato ? 1 : 0.45, pointerEvents: smtpAbilitato ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '16px' }}>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={labelStyle}>Host SMTP</label>
                                <input 
                                    style={{ ...inputStyle, backgroundColor: smtpAbilitato ? 'white' : '#f9f9f9' }}
                                    className="md-input"
                                    name="smtp_host"
                                    value={formData.smtp_host}
                                    onChange={handleChange}
                                    placeholder="es. smtp.miodominio.com"
                                    disabled={!smtpAbilitato}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Porta SMTP</label>
                                <input 
                                    type="number"
                                    style={{ ...inputStyle, backgroundColor: smtpAbilitato ? 'white' : '#f9f9f9' }}
                                    className="md-input"
                                    name="smtp_port"
                                    value={formData.smtp_port}
                                    onChange={handleChange}
                                    placeholder="es. 587"
                                    disabled={!smtpAbilitato}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '16px' }}>
                            <div>
                                <label style={labelStyle}>Utente SMTP</label>
                                <input 
                                    style={{ ...inputStyle, backgroundColor: smtpAbilitato ? 'white' : '#f9f9f9' }}
                                    className="md-input"
                                    name="smtp_user"
                                    value={formData.smtp_user}
                                    onChange={handleChange}
                                    autoComplete="off"
                                    disabled={!smtpAbilitato}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Password SMTP</label>
                                <input 
                                    type="password"
                                    style={{ ...inputStyle, backgroundColor: smtpAbilitato ? 'white' : '#f9f9f9' }}
                                    className="md-input"
                                    name="smtp_password"
                                    value={formData.smtp_password}
                                    onChange={handleChange}
                                    autoComplete="off"
                                    disabled={!smtpAbilitato}
                                />
                            </div>
                        </div>

                        <div style={{ paddingBottom: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', cursor: smtpAbilitato ? 'pointer' : 'default', fontSize: '0.9rem', color: '#333' }}>
                                <input
                                    type="checkbox"
                                    name="smtp_secure"
                                    checked={formData.smtp_secure}
                                    onChange={handleChange}
                                    disabled={!smtpAbilitato}
                                    style={{ marginRight: '8px', width: '16px', height: '16px' }}
                                />
                                Usa connessione sicura (SSL/TLS)
                            </label>
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

export default SocietaComunicazioni;
