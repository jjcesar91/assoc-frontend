import React, { useState, useEffect, useMemo } from 'react';
import { useSocieta } from '../data/SocietaContext';
import { Plus, Edit2, Trash2, Banknote, CreditCard, Landmark, DollarSign, Star } from 'lucide-react';
import { useConfirm } from '../components/ConfirmModal';
import ContoBonificoModal from './ContoBonificoModal';
import ContoModal from './ContoModal';
import NuovoContoModal from './NuovoContoModal';
import './Soci.css';

const API_GATEWAY = '/payments/api';

const Conti = () => {
    const { selectedSocietaId } = useSocieta();
    const confirm = useConfirm();
    const [conti, setConti] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filtri di ricerca (in tempo reale, come nelle altre schermate di elenco)
    const [filterDescrizione, setFilterDescrizione] = useState('');
    const [filterModalita, setFilterModalita] = useState('TUTTE');

    // Modal di creazione
    const [nuovoContoModalOpen, setNuovoContoModalOpen] = useState(false);

    // Modal dedicato per i conti di tipo Bonifico
    const [bonificoModalOpen, setBonificoModalOpen] = useState(false);
    const [bonificoConto, setBonificoConto] = useState(null);

    // Modal di modifica (descrizione + modalità)
    const [contoModalOpen, setContoModalOpen] = useState(false);
    const [contoInModifica, setContoInModifica] = useState(null);

    const [error, setError] = useState(null);

    useEffect(() => {
        setFilterDescrizione('');
        setFilterModalita('TUTTE');
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

    // Tutte le modalità effettivamente in uso, per popolare il filtro.
    const modalitaDisponibili = useMemo(() => {
        const s = new Set(conti.flatMap(c => c.modalita_pagamento || []));
        return [...s].sort();
    }, [conti]);

    const filteredConti = useMemo(() => conti.filter(c => {
        if (filterDescrizione && !c.descrizione.toLowerCase().includes(filterDescrizione.toLowerCase())) return false;
        if (filterModalita !== 'TUTTE' && !(c.modalita_pagamento || []).includes(filterModalita)) return false;
        return true;
    }), [conti, filterDescrizione, filterModalita]);

    const handleCreateConto = async (data) => {
        if (!selectedSocietaId) {
            setError('Selezionare una società');
            throw new Error('Selezionare una società');
        }
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_GATEWAY}/conti`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ societa_id: selectedSocietaId, ...data })
        });
        if (!res.ok) throw new Error('Errore nel salvataggio del conto');
        setNuovoContoModalOpen(false);
        fetchConti();
    };

    const handleEdit = (conto) => {
        setContoInModifica(conto);
        setContoModalOpen(true);
    };

    const handleConfigBonifico = (conto) => {
        setBonificoConto(conto);
        setBonificoModalOpen(true);
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
        switch (modalita?.toLowerCase()) {
            case 'contanti': return <Banknote size={14} />;
            case 'pos': return <CreditCard size={14} />;
            case 'bonifico': return <Landmark size={14} />;
            case 'assegno': return <DollarSign size={14} />;
            default: return <DollarSign size={14} />;
        }
    };

    return (
        <div className="soci-full-container">
            <div className="main-content">

                {error && <div style={{ backgroundColor: 'var(--danger-container)', color: 'var(--danger)', padding: '12px', borderRadius: '4px', marginBottom: '20px' }}>{error}</div>}

                {/* Filtri + Crea */}
                <div className="toolbar-card" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 2, minWidth: '220px' }}>
                        <label style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Descrizione</label>
                        <input
                            className="md-input"
                            placeholder="Cerca per descrizione..."
                            style={{ width: '100%' }}
                            value={filterDescrizione}
                            onChange={(e) => setFilterDescrizione(e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '160px' }}>
                        <label style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Modalità</label>
                        <select
                            className="md-select"
                            style={{ width: '100%', padding: '10px 12px' }}
                            value={filterModalita}
                            onChange={(e) => setFilterModalita(e.target.value)}
                        >
                            <option value="TUTTE">Tutte</option>
                            {modalitaDisponibili.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                        <button
                            className="btn-contained"
                            style={{ height: '42px', display: 'flex', alignItems: 'center', gap: '8px' }}
                            onClick={() => setNuovoContoModalOpen(true)}
                        >
                            <Plus size={16} />
                            Crea
                        </button>
                    </div>
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
                            ) : filteredConti.length === 0 ? (
                                <tr><td colSpan="3" style={{textAlign:'center', padding:'24px', color:'var(--text-secondary)'}}>Nessun conto trovato.</td></tr>
                            ) : (
                                filteredConti.map(c => {
                                    const modalitaList = c.modalita_pagamento || [];
                                    const hasBonifico = modalitaList.some(m => m?.toLowerCase() === 'bonifico');
                                    return (
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
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                    {modalitaList.length > 0 ? modalitaList.map(m => (
                                                        <div key={m} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: 'var(--info-container)', color: 'var(--primary)', borderRadius: '16px', fontSize: '0.85rem', fontWeight: '500' }}>
                                                            {renderPaymentIcon(m)}
                                                            {m}
                                                        </div>
                                                    )) : (
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: 'var(--surface-1)', color: 'var(--text-tertiary)', borderRadius: '16px', fontSize: '0.85rem', fontWeight: '500' }}>
                                                            —
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                {!c.predefinito && (
                                                    <button className="btn-icon-small" title="Imposta come predefinito" onClick={() => handleSetPredefinito(c.id)}>
                                                        <Star size={18} />
                                                    </button>
                                                )}
                                                {hasBonifico && (
                                                    <button className="btn-icon-small" title="Configura Bonifico (IBAN e istruzioni)" onClick={() => handleConfigBonifico(c)}>
                                                        <Landmark size={18} />
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
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

            </div>

            <NuovoContoModal
                isOpen={nuovoContoModalOpen}
                onClose={() => setNuovoContoModalOpen(false)}
                onSave={handleCreateConto}
            />

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
