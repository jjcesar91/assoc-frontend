import React, { useState, useEffect } from 'react';
import { Plus, Activity, Pencil, Trash2 } from 'lucide-react';
import { useSocieta } from '../data/SocietaContext';
import { useConfirm } from '../components/ConfirmModal';
import AttivitaConfigurazioneModal from './AttivitaConfigurazioneModal';
import './AttivitaStrutture.css';

export const COLORI = [
    { value: 'ROSSO',        label: 'ROSSO',        bg: 'var(--danger)', text: '#fff' },
    { value: 'VERDE',        label: 'VERDE',        bg: 'var(--success)', text: '#fff' },
    { value: 'BLU',          label: 'BLU',          bg: 'var(--primary)', text: '#fff' },
    { value: 'VERDE CHIARO', label: 'VERDE CHIARO', bg: 'var(--success)', text: '#fff' },
    { value: 'CELESTE',      label: 'CELESTE',      bg: 'var(--primary)', text: '#fff' },
    { value: 'ARANCIO',      label: 'ARANCIO',      bg: 'var(--warning)', text: '#fff' },
    { value: 'VIOLA',        label: 'VIOLA',        bg: 'var(--primary)', text: '#fff' },
    { value: 'GIALLO',       label: 'GIALLO',       bg: 'var(--warning)', text: '#333' },
    { value: 'GRIGIO',       label: 'GRIGIO',       bg: 'var(--text-secondary)', text: '#fff' },
    { value: 'ROSA',         label: 'ROSA',         bg: 'var(--primary)', text: '#fff' },
    { value: 'FUCSIA',       label: 'FUCSIA',       bg: 'var(--primary)', text: '#fff' },
];

const getColoreStyle = (valore) => {
    const c = COLORI.find(c => c.value === valore);
    return c ? { backgroundColor: c.bg, color: c.text } : { backgroundColor: 'var(--text-tertiary)', color: '#fff' };
};

const AttivitaConfigurazione = () => {
    const { selectedSocietaId } = useSocieta();
    const confirm = useConfirm();
    const [attivita, setAttivita] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filterDescrizione, setFilterDescrizione] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentAttivita, setCurrentAttivita] = useState(null);

    useEffect(() => {
        setIsModalOpen(false);
        setCurrentAttivita(null);
        if (selectedSocietaId) {
            fetchAttivita();
        } else {
            setAttivita([]);
        }
    }, [selectedSocietaId]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchAttivita = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ societaId: selectedSocietaId });
            if (filterDescrizione) params.set('descrizione', filterDescrizione);
            const res = await fetch(`/activities/api/attivita?${params}`);
            if (res.ok) setAttivita(await res.json());
        } catch (e) {
            console.error('Errore caricamento attività', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (data) => {
        const url = data.id ? `/activities/api/attivita/${data.id}` : '/activities/api/attivita';
        const method = data.id ? 'PUT' : 'POST';
        const body = data.id ? data : { ...data, societaId: selectedSocietaId };
        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (res.ok) {
                fetchAttivita();
                setIsModalOpen(false);
            }
        } catch (e) {
            console.error('Errore salvataggio attività', e);
        }
    };

    const handleDelete = async (id) => {
        if (!await confirm('Eliminare questo tipo attività?')) return;
        try {
            await fetch(`/activities/api/attivita/${id}`, { method: 'DELETE' });
            fetchAttivita();
        } catch (e) {
            console.error('Errore eliminazione attività', e);
        }
    };

    const filtered = attivita.filter(a =>
        !filterDescrizione || a.descrizione.toLowerCase().includes(filterDescrizione.toLowerCase())
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
                            onClick={() => { setCurrentAttivita(null); setIsModalOpen(true); }}
                        >
                            <Plus size={16} /> Nuovo tipo attività
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="strutture-table-card">
                        <table className="strutture-table">
                        <thead>
                            <tr style={{ backgroundColor: 'var(--success)' }}>
                                <th>Descrizione</th>
                                <th>Colore</th>
                                <th>Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan="3" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                                        Caricamento...
                                    </td>
                                </tr>
                            )}
                            {!loading && filtered.length === 0 && (
                                <tr>
                                    <td colSpan="3" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                                        Nessun tipo attività trovato
                                    </td>
                                </tr>
                            )}
                            {!loading && filtered.map(a => (
                                <tr key={a.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div className="icon-circle">
                                                <Activity size={18} />
                                            </div>
                                            <span style={{ fontWeight: 500 }}>{a.descrizione}</span>
                                        </div>
                                    </td>
                                    <td>
                                        {a.colore && (
                                            <span className="colore-badge" style={getColoreStyle(a.colore)}>
                                                {a.colore}
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <button
                                                className="btn-icon btn-icon-warning"
                                                title="Modifica"
                                                onClick={() => { setCurrentAttivita(a); setIsModalOpen(true); }}
                                            >
                                                <Pencil size={15} />
                                            </button>
                                            <button
                                                className="btn-icon btn-icon-danger"
                                                title="Elimina"
                                                onClick={() => handleDelete(a.id)}
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

            <AttivitaConfigurazioneModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                attivita={currentAttivita}
                colori={COLORI}
            />
        </div>
    );
};

export default AttivitaConfigurazione;
