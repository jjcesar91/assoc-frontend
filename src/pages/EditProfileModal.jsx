import React, { useState, useEffect } from 'react';
import './EditProfileModal.css';

const EditProfileModal = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState({
        username: '',
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
                    username: data.username || '',
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
        
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage({ type: 'error', text: 'Le password non coincidono' });
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
                 setTimeout(() => setMessage({ type: '', text: '' }), 3000);
            } else {
                const err = await response.json();
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
                                <label>Username</label>
                                <input 
                                    type="text" 
                                    value={formData.username} 
                                    readOnly 
                                    className="modal-input readonly"
                                />
                            </div>
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
                                    onChange={(e) => setPasswordData({...passwordData, oldPassword: e.target.value})}
                                    className="modal-input"
                                    placeholder="Vecchia password"
                                />
                            </div>
                            <div className="form-group">
                                <label>Nuova Password</label>
                                <input 
                                    type="password" 
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                                    className="modal-input"
                                    placeholder="Nuova password"
                                />
                            </div>
                            <div className="form-group">
                                <label>Conferma Nuova Password</label>
                                <input 
                                    type="password" 
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                                    className="modal-input"
                                    placeholder="Conferma nuova password"
                                />
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
