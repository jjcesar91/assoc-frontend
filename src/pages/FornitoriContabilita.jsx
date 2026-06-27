import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Truck } from 'lucide-react';
import { useSocieta } from '../data/SocietaContext';
import { useConfirm } from '../components/ConfirmModal';
import FornitoreModal from './FornitoreModal';
import './Soci.css';

const FornitoriContabilita = () => {
    const { selectedSocietaId } = useSocieta();
    const confirm = useConfirm();
    const [fornitori, setFornitori] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentFornitore, setCurrentFornitore] = useState(null);
    const [filters, setFilters] = useState({
        denominazione: '',
        comune: '',
    });

    useEffect(() => {
        setIsModalOpen(false);
        setCurrentFornitore(null);
        if (selectedSocietaId) {
            fetchFornitori();
        } else {
            setFornitori([]);
            setLoading(false);
        }
    }, [selectedSocietaId]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchFornitori = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/payments/api/fornitori?societa_id=${selectedSocietaId}`);
            if (res.ok) setFornitori(await res.json());
        } catch (err) {
            console.error('Error fetching fornitori', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (data) => {
        try {
            const url = data.id ? `/payments/api/fornitori/${data.id}` : '/payments/api/fornitori';
            const method = data.id ? 'PUT' : 'POST';
            const payload = data.id ? data : { ...data, societa_id: selectedSocietaId };
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                await fetchFornitori();
                setIsModalOpen(false);
            }
        } catch (err) {
            console.error('Error saving fornitore', err);
        }
    };

    const handleDelete = async (id) => {
        if (!await confirm('Sei sicuro di voler eliminare questo fornitore?')) return;
        try {
            await fetch(`/payments/api/fornitori/${id}`, { method: 'DELETE' });
            fetchFornitori();
        } catch (err) {
            console.error('Error deleting fornitore', err);
        }
    };

    const filtered = fornitori.filter(f => {
        if (filters.denominazione && !f.denominazione.toLowerCase().includes(filters.denominazione.toLowerCase())) return false;
        if (filters.comune && !(f.comune || '').toLowerCase().includes(filters.comune.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="soci-full-container">
            <div className="main-content">

                {/* Toolbar / Filtri */}
                <div className="toolbar-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '12px' }}>

                        <div style={{ display: 'flex', flexDirection: 'column', flex: 2, minWidth: '200px' }}>
                            <label style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Denominazione</label>
                            <input
                                className="md-input"
                                placeholder="Cerca denominazione..."
                                value={filters.denominazione}
                                onChange={(e) => setFilters(f => ({ ...f, denominazione: e.target.value }))}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '150px' }}>
                            <label style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Comune</label>
                            <input
                                className="md-input"
                                placeholder="Filtra per comune..."
                                value={filters.comune}
                                onChange={(e) => setFilters(f => ({ ...f, comune: e.target.value }))}
                            />
                        </div>

                        <div className="actions-group">
                            <button
                                className="btn-contained"
                                style={{ backgroundColor: 'var(--success-color)' }}
                                onClick={() => { setCurrentFornitore(null); setIsModalOpen(true); }}
                            >
                                <Plus size={18} /> Nuovo fornitore
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tabella */}
                <div className="table-card">
                    <div className="table-responsive">
                        <table className="md-table">
                            <thead>
                                <tr>
                                    <th>Denominazione</th>
                                    <th>Codice fiscale / P.IVA</th>
                                    <th>Email / PEC</th>
                                    <th>Telefono</th>
                                    <th>Comune</th>
                                    <th style={{ textAlign: 'right' }}>Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                                            Caricamento...
                                        </td>
                                    </tr>
                                ) : filtered.map(f => (
                                    <tr key={f.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{
                                                    width: '40px', height: '40px', borderRadius: '50%',
                                                    backgroundColor: 'var(--success-container)', color: 'var(--success)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    flexShrink: 0,
                                                }}>
                                                    <Truck size={20} />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 500 }}>{f.denominazione}</div>
                                                    {f.indirizzo && (
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{f.indirizzo}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            {f.codice_fiscale && <div style={{ fontSize: '0.85rem' }}>{f.codice_fiscale}</div>}
                                            {f.partita_iva && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>P.IVA {f.partita_iva}</div>}
                                            {!f.codice_fiscale && !f.partita_iva && <span style={{ color: 'var(--text-secondary)' }}>—</span>}
                                        </td>
                                        <td>
                                            {f.email && <div style={{ fontSize: '0.85rem' }}>{f.email}</div>}
                                            {f.pec && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>PEC: {f.pec}</div>}
                                            {!f.email && !f.pec && <span style={{ color: 'var(--text-secondary)' }}>—</span>}
                                        </td>
                                        <td style={{ fontSize: '0.9rem' }}>{f.telefono || <span style={{ color: 'var(--text-secondary)' }}>—</span>}</td>
                                        <td style={{ fontSize: '0.9rem' }}>
                                            {f.comune ? `${f.comune}${f.cap ? ` (${f.cap})` : ''}` : <span style={{ color: 'var(--text-secondary)' }}>—</span>}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                                <button
                                                    className="btn-icon-small"
                                                    title="Modifica"
                                                    onClick={() => { setCurrentFornitore(f); setIsModalOpen(true); }}
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    className="btn-icon-small"
                                                    title="Elimina"
                                                    style={{ color: 'var(--danger-color)' }}
                                                    onClick={() => handleDelete(f.id)}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {!loading && filtered.length === 0 && (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                                            Nessun fornitore trovato
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            <FornitoreModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                fornitore={currentFornitore}
            />
        </div>
    );
};

export default FornitoriContabilita;

