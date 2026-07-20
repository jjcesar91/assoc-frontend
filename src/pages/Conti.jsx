import React, { useState, useEffect } from 'react';
import { useSocieta } from '../data/SocietaContext';
import { Plus, Edit2, Trash2, Banknote, CreditCard, Landmark, DollarSign, Star } from 'lucide-react';
import { useConfirm } from '../components/ConfirmModal';
import ContoBonificoModal from './ContoBonificoModal';
import ContoModal from './ContoModal';
import './Soci.css';

const API_GATEWAY = '/payments/api';

const Conti = () => {
    const { selectedSocietaId } = useSocieta();
    const confirm = useConfirm();
    const [conti, setConti] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Form state (solo creazione: le modifiche avvengono tramite modal)
    const [descrizione, setDescrizione] = useState('');
    const [modalita, setModalita] = useState('');

    // Modal dedicato per i conti di tipo Bonifico
    const [bonificoModalOpen, setBonificoModalOpen] = useState(false);
    const [bonificoConto, setBonificoConto] = useState(null);

    // Modal di modifica per i conti non bonifico
    const [contoModalOpen, setContoModalOpen] = useState(false);
    const [contoInModifica, setContoInModifica] = useState(null);

    const [error, setError] = useState(null);

    useEffect(() => {
        // Reset form al cambio società
        resetForm();
        setError(null);
        if (selectedSocietaId) {
            fetchConti();
        } else {
            setConti([]);
        }
    }, [selectedSocietaId]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchConti = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_GATEWAY}/conti?societa_id=${selectedSocietaId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Errore nel caricamento dei conti');
            const data = await res.json();
            setConti(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setDescrizione('');
        setModalita('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!selectedSocietaId) {
            setError('Selezionare una società');
            return;
        }

        const payload = {
            societa_id: selectedSocietaId,
            descrizione,
            modalita_pagamento: modalita
        };

        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`${API_GATEWAY}/conti`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Errore nel salvataggio del conto');
            
            resetForm();
            fetchConti(); // Refresh list
        } catch (err) {
            setError(err.message);
        }
    };

    const handleEdit = (conto) => {
        // I conti di tipo Bonifico si modificano tramite modal dedicato
        // (descrizione, IBAN e istruzioni di pagamento); gli altri con il modal generico.
        if (conto.modalita_pagamento?.toLowerCase() === 'bonifico') {
            setBonificoConto(conto);
            setBonificoModalOpen(true);
            return;
        }
        setContoInModifica(conto);
        setContoModalOpen(true);
    };

    const updateConto = async (conto, data) => {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_GATEWAY}/conti/${conto.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                societa_id: conto.societa_id,
                modalita_pagamento: conto.modalita_pagamento,
                ...data
            })
        });
        if (!res.ok) throw new Error('Errore nel salvataggio del conto');
    };

    const handleSaveBonifico = async (data) => {
        if (!bonificoConto) return;
        try {
            await updateConto(bonificoConto, data);
            setBonificoModalOpen(false);
            setBonificoConto(null);
            fetchConti();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleSaveConto = async (data) => {
        if (!contoInModifica) return;
        try {
            await updateConto(contoInModifica, data);
            setContoModalOpen(false);
            setContoInModifica(null);
            fetchConti();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleSetPredefinito = async (id) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_GATEWAY}/conti/${id}/predefinito`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Errore nell'impostazione del conto predefinito");
            fetchConti();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!await confirm('Sei sicuro di voler eliminare questo conto?')) return;
        
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_GATEWAY}/conti/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Errore nell'eliminazione del conto");
            fetchConti();
        } catch (err) {
            setError(err.message);
        }
    };

    const renderPaymentIcon = (modalita) => {
        switch(modalita?.toLowerCase()) {
            case 'contanti': return <Banknote size={18} />;
            case 'pos': return <CreditCard size={18} />;
            case 'bonifico': return <Landmark size={18} />;
            case 'assegno': return <DollarSign size={18} />;
            default: return <DollarSign size={18} />;
        }
    };

    return (
        <div className="soci-full-container">
            <div className="main-content">
                
                {error && <div style={{ backgroundColor: 'var(--danger-container)', color: 'var(--danger)', padding: '12px', borderRadius: '4px', marginBottom: '20px' }}>{error}</div>}
                
                {/* Form Nuovo/Modifica Conto */}
                <div className="toolbar-card" style={{display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'stretch', marginBottom: '24px'}}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
                        Aggiungi Conto
                    </h3>
                    
                    <form onSubmit={handleSubmit} style={{display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '16px'}}>
                        <div style={{display:'flex', flexDirection:'column', flex: 2, minWidth: '200px'}}>
                            <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Descrizione *</label>
                            <input 
                                className="md-input" 
                                placeholder="Es. Cassa Principale" 
                                style={{width: '100%'}} 
                                value={descrizione}
                                onChange={(e) => setDescrizione(e.target.value)}
                                required
                            />
                        </div>
                        
                        <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '150px'}}>
                            <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Modalità di Pagamento</label>
                            <select 
                                className="md-select" 
                                style={{width: '100%', padding: '10px 12px'}} 
                                value={modalita}
                                onChange={(e) => setModalita(e.target.value)}
                            >
                                <option value="">— nessuna —</option>
                                <option value="Contanti">Contanti</option>
                                <option value="POS">POS</option>
                                <option value="Assegno">Assegno</option>
                                <option value="Bonifico">Bonifico</option>
                            </select>
                        </div>

                        <div style={{display:'flex', gap:'8px'}}>
                            <button type="submit" className="btn-contained" style={{ height: '42px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Plus size={16} />
                                Crea
                            </button>
                        </div>
                    </form>
                </div>

                {/* Elenco Conti */}
                <div style={{ flex: 1, overflow: 'auto', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <table className="md-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--surface-1)', zIndex: 1, boxShadow: '0 1px 2px rgba(0,0,0,0.05)'}}>
                            <tr>
                                <th style={{ padding: '16px', fontWeight: '600', color: 'var(--text-secondary)' }}>Descrizione</th>
                                <th style={{ padding: '16px', fontWeight: '600', color: 'var(--text-secondary)' }}>Modalità</th>
                                <th style={{ padding: '16px', fontWeight: '600', color: 'var(--text-secondary)', textAlign: 'right' }}>Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="3" style={{textAlign:'center', padding:'24px', color:'var(--text-secondary)'}}>Caricamento in corso...</td></tr>
                            ) : conti.length === 0 ? (
                                <tr><td colSpan="3" style={{textAlign:'center', padding:'24px', color:'var(--text-secondary)'}}>Nessun conto trovato.</td></tr>
                            ) : (
                                conti.map(c => (
                                    <tr key={c.id} style={{ borderBottom: '1px solid #eee' }} className="hover-row">
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ fontWeight: '500', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {c.descrizione}
                                                {c.predefinito && (
                                                    <span title="Conto predefinito" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', backgroundColor: 'var(--success-container)', color: 'var(--success)', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '500' }}>
                                                        <Star size={12} fill="currentColor" />
                                                        Predefinito
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: c.modalita_pagamento ? 'var(--info-container)' : 'var(--surface-1)', color: c.modalita_pagamento ? 'var(--primary)' : 'var(--text-tertiary)', borderRadius: '16px', fontSize: '0.85rem', fontWeight: '500' }}>
                                                {renderPaymentIcon(c.modalita_pagamento)}
                                                {c.modalita_pagamento || '—'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                            {!c.predefinito && (
                                                <button className="btn-icon-small" title="Imposta come predefinito" onClick={() => handleSetPredefinito(c.id)}>
                                                    <Star size={18} />
                                                </button>
                                            )}
                                            <button className="btn-icon-small" title="Modifica" onClick={() => handleEdit(c)}>
                                                <Edit2 size={18} />
                                            </button>
                                            <button className="btn-icon-small" title="Elimina" onClick={() => handleDelete(c.id)} style={{ color: 'var(--danger)' }}>
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

            </div>

            <ContoBonificoModal
                isOpen={bonificoModalOpen}
                conto={bonificoConto}
                onClose={() => { setBonificoModalOpen(false); setBonificoConto(null); }}
                onSave={handleSaveBonifico}
            />

            <ContoModal
                isOpen={contoModalOpen}
                conto={contoInModifica}
                onClose={() => { setContoModalOpen(false); setContoInModifica(null); }}
                onSave={handleSaveConto}
            />
        </div>
    );
};

export default Conti;
