import React, { useState, useEffect } from 'react';
import './EditProfileModal.css';
import { getPasswordValidationErrors } from '../utils/passwordValidation';

const EditProfileModal = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState({
        nome: '',
        cognome: '',
        email: '',
        telefono: ''
    });

    const [passwordData, setPasswordData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordErrors, setPasswordErrors] = useState({});

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (isOpen) {
            fetchProfile();
        }
    }, [isOpen]);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            // Adding cache: 'no-store' to prevent caching issues
            const response = await fetch('/auth/api/me', {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                cache: 'no-store'
            });
            if (response.ok) {
                const data = await response.json();
                console.log('Profile data fetched:', data); // Debug log
                setFormData({
                    nome: data.nome || '',
                    cognome: data.cognome || '',
                    email: data.email || '',
                    telefono: data.telefono || ''
                });
            } else {
                setMessage({ type: 'error', text: 'Error fetching profile' });
            }
        } catch (error) {
            console.error('Fetch profile error:', error);
            setMessage({ type: 'error', text: 'Network error' });
        } finally {
            setLoading(false);
        }
    };

    const handleInfoSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/auth/api/me', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                 // Update local state or refetch?
                 // const updated = await response.json();
                 setMessage({ type: 'success', text: 'Informazioni aggiornate con successo' });
                 setTimeout(() => setMessage({ type: '', text: '' }), 3000);
            } else {
                const err = await response.json();
                setMessage({ type: 'error', text: err.error || 'Errore aggiornamento' });
            }
        } catch (error) {
             setMessage({ type: 'error', text: 'Errore di rete' });
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });
        const nextErrors = {};

        if (!passwordData.oldPassword) {
            nextErrors.oldPassword = 'Inserisci la password attuale';
        }

        const newPasswordErrors = getPasswordValidationErrors(passwordData.newPassword);
        if (newPasswordErrors.length > 0) {
            nextErrors.newPassword = newPasswordErrors.join('. ');
        }
        
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            nextErrors.confirmPassword = 'Le password non coincidono';
        }

        setPasswordErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/auth/api/password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    oldPassword: passwordData.oldPassword,
                    newPassword: passwordData.newPassword
                })
            });

            if (response.ok) {
                 setMessage({ type: 'success', text: 'Password aggiornata con successo' });
                 setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
                 setPasswordErrors({});
                 setTimeout(() => setMessage({ type: '', text: '' }), 3000);
            } else {
                const err = await response.json();
                setPasswordErrors((prev) => ({ ...prev, newPassword: err.error || 'Errore aggiornamento password' }));
                setMessage({ type: 'error', text: err.error || 'Errore aggiornamento password' });
            }
        } catch (error) {
             setMessage({ type: 'error', text: 'Errore di rete' });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="profile-modal-overlay">
            <div className="profile-modal-content">
                <button className="profile-modal-close" onClick={onClose}>&times;</button>
                
                {message.text && (
                    <div className={`profile-modal-alert ${message.type}`}>
                        {message.text}
                    </div>
                )}

                <div className="profile-modal-grid">
                    {/* INFORMAZIONI PERSONALI */}
                    <div className="profile-card">
                        <div className="card-header info-header">
                            <h3>INFORMAZIONI PERSONALI</h3>
                        </div>
                        <form onSubmit={handleInfoSubmit} className="profile-form">
                            <div className="form-group">
                                <label>Nome</label>
                                <input 
                                    type="text" 
                                    value={formData.nome} 
                                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                                    className="modal-input"
                                    placeholder="Nome"
                                />
                            </div>
                            <div className="form-group">
                                <label>Cognome</label>
                                <input 
                                    type="text" 
                                    value={formData.cognome} 
                                    onChange={(e) => setFormData({...formData, cognome: e.target.value})} 
                                    className="modal-input"
                                    placeholder="Cognome"
                                />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input 
                                    type="email" 
                                    value={formData.email} 
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    className="modal-input" 
                                    placeholder="Email"
                                />
                            </div>
                            <div className="form-group">
                                <label>Telefono</label>
                                <input 
                                    type="text" 
                                    value={formData.telefono} 
                                    onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                                    className="modal-input"
                                    placeholder="Telefono" 
                                />
                            </div>
                            <button type="submit" className="modal-submit-btn info-btn">
                                ✓ Aggiorna informazioni
                            </button>
                        </form>
                    </div>

                    {/* PASSWORD */}
                    <div className="profile-card">
                        <div className="card-header password-header">
                            <h3>PASSWORD</h3>
                        </div>
                        <form onSubmit={handlePasswordSubmit} className="profile-form">
                            <div className="form-group">
                                <label>Vecchia password</label>
                                <input 
                                    type="password" 
                                    value={passwordData.oldPassword}
                                    onChange={(e) => {
                                        setPasswordData({...passwordData, oldPassword: e.target.value});
                                        setPasswordErrors((prev) => ({ ...prev, oldPassword: undefined }));
                                    }}
                                    className={`modal-input ${passwordErrors.oldPassword ? 'input-error' : ''}`}
                                    placeholder="Vecchia password"
                                />
                                {passwordErrors.oldPassword && <div className="field-error">{passwordErrors.oldPassword}</div>}
                            </div>
                            <div className="form-group">
                                <label>Nuova Password</label>
                                <input 
                                    type="password" 
                                    value={passwordData.newPassword}
                                    onChange={(e) => {
                                        setPasswordData({...passwordData, newPassword: e.target.value});
                                        setPasswordErrors((prev) => ({ ...prev, newPassword: undefined }));
                                    }}
                                    className={`modal-input ${passwordErrors.newPassword ? 'input-error' : ''}`}
                                    placeholder="Nuova password"
                                />
                                {passwordErrors.newPassword && <div className="field-error">{passwordErrors.newPassword}</div>}
                            </div>
                            <div className="form-group">
                                <label>Conferma Nuova Password</label>
                                <input 
                                    type="password" 
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => {
                                        setPasswordData({...passwordData, confirmPassword: e.target.value});
                                        setPasswordErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                                    }}
                                    className={`modal-input ${passwordErrors.confirmPassword ? 'input-error' : ''}`}
                                    placeholder="Conferma nuova password"
                                />
                                {passwordErrors.confirmPassword && <div className="field-error">{passwordErrors.confirmPassword}</div>}
                            </div>
                            <button type="submit" className="modal-submit-btn password-btn">
                                ✓ Aggiorna password
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditProfileModal;
