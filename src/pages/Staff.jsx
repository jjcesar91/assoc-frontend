import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Shirt, Mail } from 'lucide-react';
import { useSocieta } from '../data/SocietaContext';
import StaffModal from './StaffModal';
import './Staff.css';

const Staff = () => {
    const { selectedSocietaId } = useSocieta();

    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filterCognome, setFilterCognome] = useState('');
    const [filterImpiegato, setFilterImpiegato] = useState('SI');
    const [copiedId, setCopiedId] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentStaff, setCurrentStaff] = useState(null);

    const fetchStaff = useCallback(async () => {
        if (!selectedSocietaId) { setStaffList([]); return; }
        setLoading(true);
        try {
            const params = new URLSearchParams({ societaId: selectedSocietaId });
            if (filterCognome) params.set('cognome', filterCognome);
            if (filterImpiegato === 'SI') params.set('attualmenteImpiegato', 'true');
            if (filterImpiegato === 'NO') params.set('attualmenteImpiegato', 'false');
            const res = await fetch(`/activities/api/staff?${params}`);
            if (res.ok) setStaffList(await res.json());
        } catch (e) {
            console.error('Errore caricamento staff', e);
        } finally {
            setLoading(false);
        }
    }, [selectedSocietaId, filterCognome, filterImpiegato]);

    useEffect(() => {
        setIsModalOpen(false);
        setCurrentStaff(null);
        fetchStaff();
    }, [selectedSocietaId]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSearch = (e) => {
        e.preventDefault();
        fetchStaff();
    };

    const handleSave = async (data) => {
        const url = data.id ? `/activities/api/staff/${data.id}` : '/activities/api/staff';
        const method = data.id ? 'PUT' : 'POST';
        const body = data.id ? data : { ...data, societaId: selectedSocietaId };
        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (res.ok) {
                fetchStaff();
                setIsModalOpen(false);
            }
        } catch (e) {
            console.error('Errore salvataggio staff', e);
        }
    };

    const handleToggleImpiegato = async (staff) => {
        try {
            const res = await fetch(`/activities/api/staff/${staff.id}/toggle-impiegato`, { method: 'PATCH' });
            if (res.ok) {
                const updated = await res.json();
                setStaffList(prev => prev.map(s => s.id === updated.id ? updated : s));
            }
        } catch (e) {
            console.error('Errore toggle impiegato', e);
        }
    };

    const handleCopyCF = (staff) => {
        if (!staff.codiceFiscale) return;
        navigator.clipboard.writeText(staff.codiceFiscale).then(() => {
            setCopiedId(staff.id);
            setTimeout(() => setCopiedId(null), 1500);
        });
    };

    const formatDate = (d) => {
        if (!d) return '';
        const [y, m, g] = d.split('-');
        return `${g}/${m}/${y}`;
    };

    return (
        <div className="staff-container">
            <div className="staff-main">
                {/* Toolbar */}
                <div className="staff-toolbar">
                    <form className="staff-toolbar-filters" onSubmit={handleSearch}>
                        <div className="staff-toolbar-field">
                            <label>Cognome</label>
                            <input
                                className="form-input"
                                type="text"
                                placeholder="Cognome"
                                value={filterCognome}
                                onChange={e => setFilterCognome(e.target.value)}
                            />
                        </div>
                        <div className="staff-toolbar-field">
                            <label>Attualmente impiegato</label>
                            <select
                                className="form-input"
                                value={filterImpiegato}
                                onChange={e => setFilterImpiegato(e.target.value)}
                            >
                                <option value="">Tutti</option>
                                <option value="SI">SI</option>
                                <option value="NO">NO</option>
                            </select>
                        </div>
                    </form>
                    <div className="staff-toolbar-actions">
                        <button className="btn-success" onClick={() => { setCurrentStaff(null); setIsModalOpen(true); }}>
                            <Plus size={16} /> Nuovo staff
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="staff-table-card">
                    <table className="staff-table">
                        <thead>
                            <tr>
                                <th>Cognome e nome</th>
                                <th>CF (Click per copiare)</th>
                                <th>Attualmente impiegato</th>
                                <th>Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan="4" className="staff-empty-cell">Caricamento...</td>
                                </tr>
                            )}
                            {!loading && staffList.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="staff-empty-cell">Nessuno staff trovato</td>
                                </tr>
                            )}
                            {!loading && staffList.map(s => (
                                <tr key={s.id}>
                                    <td>
                                        <div className="staff-name-cell">
                                            <div className="staff-icon-circle">
                                                <Shirt size={18} />
                                            </div>
                                            <div>
                                                <div className="staff-name">{s.cognome} {s.nome}</div>
                                                <div className="staff-sub">{s.descrizioneQualifica}{s.dataNascita ? ` - ${formatDate(s.dataNascita)}` : ''}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        {s.codiceFiscale ? (
                                            <button
                                                className={`cf-badge${copiedId === s.id ? ' copied' : ''}`}
                                                onClick={() => handleCopyCF(s)}
                                                title="Clicca per copiare"
                                            >
                                                {copiedId === s.id ? 'Copiato!' : s.codiceFiscale}
                                            </button>
                                        ) : <span className="staff-empty-value">—</span>}
                                    </td>
                                    <td>
                                        <button
                                            className={`staff-toggle${s.attualmenteImpiegato ? ' active' : ''}`}
                                            onClick={() => handleToggleImpiegato(s)}
                                            title={s.attualmenteImpiegato ? 'Attualmente impiegato' : 'Non impiegato'}
                                        />
                                    </td>
                                    <td>
                                        <button
                                            className="btn-icon btn-icon-warning"
                                            title="Apri scheda"
                                            onClick={() => { setCurrentStaff(s); setIsModalOpen(true); }}
                                        >
                                            <Mail size={15} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <StaffModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                staff={currentStaff}
                onSave={handleSave}
            />
        </div>
    );
};

export default Staff;
