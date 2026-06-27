import React, { useState, useEffect } from 'react';
import { Plus, Building2, Pencil, Trash2, Flag } from 'lucide-react';
import { useSocieta } from '../data/SocietaContext';
import { useConfirm } from '../components/ConfirmModal';
import StrutturaModal from './StrutturaModal';
import GestioneAreeModal from './GestioneAreeModal';
import './AttivitaStrutture.css';

export const COLORI = [
    { value: 'ROSSO',        label: 'ROSSO',        bg: 'var(--danger)', text: '#fff' },
    { value: 'VERDE',        label: 'VERDE',        bg: 'var(--success)', text: '#fff' },
    { value: 'BLU',          label: 'BLU',          bg: 'var(--primary)', text: '#fff' },
    { value: 'VERDE CHIARO', label: 'VERDE CHIARO', bg: 'var(--success)', text: '#fff' },
    { value: 'CELESTE',      label: 'CELESTE',      bg: 'var(--primary)', text: '#fff' },
    { value: 'ARANCIONE',    label: 'ARANCIONE',    bg: 'var(--warning)', text: '#fff' },
    { value: 'VIOLA',        label: 'VIOLA',        bg: 'var(--primary)', text: '#fff' },
    { value: 'GIALLO',       label: 'GIALLO',       bg: 'var(--warning)', text: '#333' },
    { value: 'GRIGIO',       label: 'GRIGIO',       bg: 'var(--text-secondary)', text: '#fff' },
    { value: 'ROSA',         label: 'ROSA',         bg: 'var(--primary)', text: '#fff' },
];

const getColoreStyle = (valore) => {
    const c = COLORI.find(c => c.value === valore);
    return c ? { backgroundColor: c.bg, color: c.text } : { backgroundColor: 'var(--text-tertiary)', color: '#fff' };
};

const AttivitaStrutture = () => {
    const { selectedSocietaId } = useSocieta();
    const confirm = useConfirm();
    const [strutture, setStrutture] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filterDescrizione, setFilterDescrizione] = useState('');

    const [isStrutturaModalOpen, setIsStrutturaModalOpen] = useState(false);
    const [currentStruttura, setCurrentStruttura] = useState(null);

    const [isGestioneAreeOpen, setIsGestioneAreeOpen] = useState(false);
    const [selectedStruttura, setSelectedStruttura] = useState(null);

    useEffect(() => {
        setIsStrutturaModalOpen(false);
        setIsGestioneAreeOpen(false);
        setCurrentStruttura(null);
        setSelectedStruttura(null);
        if (selectedSocietaId) {
            fetchStrutture();
        } else {
            setStrutture([]);
        }
    }, [selectedSocietaId]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchStrutture = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ societaId: selectedSocietaId });
            if (filterDescrizione) params.set('descrizione', filterDescrizione);
            const res = await fetch(`/activities/api/strutture?${params}`);
            if (res.ok) setStrutture(await res.json());
        } catch (e) {
            console.error('Errore caricamento strutture', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveStruttura = async (data) => {
        const url = data.id ? `/activities/api/strutture/${data.id}` : '/activities/api/strutture';
        const method = data.id ? 'PUT' : 'POST';
        const body = data.id ? data : { ...data, societaId: selectedSocietaId };
        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (res.ok) {
                fetchStrutture();
                setIsStrutturaModalOpen(false);
            }
        } catch (e) {
            console.error('Errore salvataggio struttura', e);
        }
    };

    const handleDeleteStruttura = async (id) => {
        if (!await confirm('Eliminare questa struttura e tutte le sue aree?')) return;
        try {
            await fetch(`/activities/api/strutture/${id}`, { method: 'DELETE' });
            fetchStrutture();
        } catch (e) {
            console.error('Errore eliminazione struttura', e);
        }
    };

    const filtered = strutture.filter(s =>
        !filterDescrizione || s.descrizione.toLowerCase().includes(filterDescrizione.toLowerCase())
    );

    return (
        <div className="strutture-container">
            <div className="strutture-main">
                {/* Toolbar */}
                <div className="strutture-toolbar">
                    <div className="strutture-toolbar-field">
                        <label>Descrizione</label>
                        <input
                            className="form-input"
                            type="text"
                            placeholder="Descrizione"
                            value={filterDescrizione}
                            onChange={e => setFilterDescrizione(e.target.value)}
                        />
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                        <button
                            className="btn-success"
                            onClick={() => { setCurrentStruttura(null); setIsStrutturaModalOpen(true); }}
                        >
                            <Plus size={16} /> Nuova struttura
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="strutture-table-card">
                    <table className="strutture-table">
                        <thead>
                            <tr>
                                <th>Descrizione</th>
                                <th>Colore</th>
                                <th>Numero aree censite</th>
                                <th>Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                                        Caricamento...
                                    </td>
                                </tr>
                            )}
                            {!loading && filtered.length === 0 && (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                                        Nessuna struttura trovata
                                    </td>
                                </tr>
                            )}
                            {!loading && filtered.map(struttura => (
                                <tr key={struttura.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div className="icon-circle">
                                                <Building2 size={18} />
                                            </div>
                                            <span style={{ fontWeight: 500 }}>{struttura.descrizione}</span>
                                        </div>
                                    </td>
                                    <td>
                                        {struttura.colore && (
                                            <span className="colore-badge" style={getColoreStyle(struttura.colore)}>
                                                {struttura.colore}
                                            </span>
                                        )}
                                    </td>
                                    <td>{struttura.numAree ?? 0}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <button
                                                className="btn-primary"
                                                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                                                onClick={() => { setSelectedStruttura(struttura); setIsGestioneAreeOpen(true); }}
                                            >
                                                <Flag size={14} /> Gestione aree
                                            </button>
                                            <button
                                                className="btn-icon btn-icon-warning"
                                                title="Modifica"
                                                onClick={() => { setCurrentStruttura(struttura); setIsStrutturaModalOpen(true); }}
                                            >
                                                <Pencil size={15} />
                                            </button>
                                            <button
                                                className="btn-icon btn-icon-danger"
                                                title="Elimina"
                                                onClick={() => handleDeleteStruttura(struttura.id)}
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <StrutturaModal
                isOpen={isStrutturaModalOpen}
                onClose={() => setIsStrutturaModalOpen(false)}
                onSave={handleSaveStruttura}
                struttura={currentStruttura}
                colori={COLORI}
            />

            <GestioneAreeModal
                isOpen={isGestioneAreeOpen}
                onClose={() => { setIsGestioneAreeOpen(false); fetchStrutture(); }}
                struttura={selectedStruttura}
            />
        </div>
    );
};

export default AttivitaStrutture;
