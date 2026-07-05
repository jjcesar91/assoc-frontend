import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Building2, Shuffle } from 'lucide-react';
import { useSocieta } from '../data/SocietaContext';
import NuovaSocietaModal from './NuovaSocietaModal';
import { useAlert } from '../components/AlertModal';
import './Prodotti.css';

const TIPO_OPTIONS = ['ASD', 'APS'];

const NOMI_DUMMY = [
    'Aquile', 'Leoni', 'Tigri', 'Falchi', 'Lupi', 'Aquilotti', 'Pantere', 'Draghi', 'Condor', 'Smeraldi',
    'Stelle', 'Fulmini', 'Tornado', 'Tuoni', 'Venti', 'Fuochi', 'Onde', 'Monti', 'Pini', 'Querce',
];

const CITTA_DUMMY = [
    'Roma', 'Milano', 'Napoli', 'Torino', 'Bologna', 'Firenze', 'Venezia', 'Genova', 'Palermo', 'Bari',
    'Catania', 'Verona', 'Brescia', 'Padova', 'Trieste', 'Taranto', 'Messina', 'Prato', 'Parma', 'Modena',
];

const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rndInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const generaDatiCasuali = () => {
    const tipo = rnd(TIPO_OPTIONS);
    const nome = rnd(NOMI_DUMMY);
    const citta = rnd(CITTA_DUMMY);
    const num = rndInt(1, 9999);
    const denominazione = `${tipo} ${nome} ${citta} ${String(num).padStart(4, '0')}`;

    // Codice fiscale fittizio a 11 cifre (formato CF associazione)
    const cf = Array.from({ length: 11 }, () => rndInt(0, 9)).join('');
    // Partita IVA fittizea a 11 cifre
    const piva = Array.from({ length: 11 }, () => rndInt(0, 9)).join('');

    const prefissi = ['02', '06', '010', '011', '051', '055', '081', '090', '091', '099'];
    const telefono = `${rnd(prefissi)}${rndInt(1000000, 9999999)}`;
    const email = `info@${nome.toLowerCase()}${citta.toLowerCase()}${num}.it`;

    return { denominazione, codice_fiscale: cf, partita_iva: piva, email, telefono, tipo_associazione: tipo };
};

const SuperuserSocieta = () => {
    const { fetchSocieta } = useSocieta();
    const showAlert = useAlert();
    const [societa, setSocieta] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [filters, setFilters] = useState({
        denominazione: '',
        tipo_associazione: '',
    });

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/users/api/societa');
            if (res.ok) setSocieta(await res.json());
        } catch (e) {
            console.error('Errore caricamento società', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleGeneraCasuale = async () => {
        const dati = generaDatiCasuali();
        await handleCreate(dati);
    };

    const handleCreate = async (data, logoFile) => {
        try {
            const res = await fetch('/users/api/societa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (res.ok) {
                // Upload del logo (se fornito nel wizard): richiede l'id appena creato
                if (logoFile) {
                    try {
                        const created = await res.json();
                        const fd = new FormData();
                        fd.append('logo', logoFile);
                        await fetch(`/users/api/societa/${created.id}/logo`, {
                            method: 'POST',
                            body: fd,
                        });
                    } catch (logoErr) {
                        console.error('Errore caricamento logo società', logoErr);
                    }
                }
                setIsModalOpen(false);
                fetchAll();
                fetchSocieta(); // aggiorna il selettore società nel layout
            } else {
                const err = await res.json();
                showAlert(err.error || err.message, 'Errore');
            }
        } catch (e) {
            console.error('Errore creazione società', e);
            showAlert('Errore di rete', 'Errore');
        }
    };

    const filtered = societa.filter(s => {
        if (filters.denominazione && !(s.denominazione || '').toLowerCase().includes(filters.denominazione.toLowerCase())) return false;
        if (filters.tipo_associazione && s.tipo_associazione !== filters.tipo_associazione) return false;
        return true;
    });

    return (
        <div className="prodotti-full-container">
            <div className="main-content">
                {/* Toolbar / Filtri */}
                <div className="toolbar-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 2, minWidth: '200px' }}>
                            <label style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Denominazione</label>
                            <input
                                className="md-input"
                                placeholder="Denominazione"
                                value={filters.denominazione}
                                onChange={e => setFilters(f => ({ ...f, denominazione: e.target.value }))}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '160px' }}>
                            <label style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Tipo</label>
                            <select
                                className="md-select"
                                value={filters.tipo_associazione}
                                onChange={e => setFilters(f => ({ ...f, tipo_associazione: e.target.value }))}
                            >
                                <option value="">Tutti</option>
                                {TIPO_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="actions-group" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                                className="btn-contained"
                                style={{ backgroundColor: 'var(--primary)' }}
                                onClick={handleGeneraCasuale}
                                title="Crea una società con dati casuali per test"
                            >
                                <Shuffle size={18} /> Genera casuale
                            </button>
                            <button
                                className="btn-contained"
                                style={{ backgroundColor: 'var(--success-color)' }}
                                onClick={() => setIsModalOpen(true)}
                            >
                                <Plus size={18} /> Nuova società
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
                                    <th>Tipo</th>
                                    <th>Codice fiscale</th>
                                    <th>Email</th>
                                    <th>Telefono</th>
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
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                                            Nessuna società trovata
                                        </td>
                                    </tr>
                                ) : filtered.map(s => (
                                    <tr key={s.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{
                                                    width: '40px', height: '40px', borderRadius: '50%',
                                                    backgroundColor: 'var(--info-container)', color: 'var(--primary)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    flexShrink: 0,
                                                }}>
                                                    <Building2 size={20} />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 500 }}>{s.denominazione}</div>
                                                    {s.partita_iva && (
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                            P.IVA {s.partita_iva}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ fontSize: '0.875rem' }}>{s.tipo_associazione || '–'}</td>
                                        <td style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>{s.codice_fiscale || '–'}</td>
                                        <td style={{ fontSize: '0.875rem' }}>
                                            {s.email
                                                ? <a href={`mailto:${s.email}`} style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>{s.email}</a>
                                                : '–'}
                                        </td>
                                        <td style={{ fontSize: '0.875rem' }}>{s.telefono || '–'}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                                <button
                                                    className="btn-icon-small"
                                                    title="Modifica in Anagrafica"
                                                    onClick={() => {
                                                        // Naviga all'anagrafica della società selezionata
                                                        localStorage.setItem('selectedSocietaId', s.id);
                                                        window.location.href = '/societa/anagrafica';
                                                    }}
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer conteggio */}
                    {!loading && (
                        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            Tot righe: <strong>{filtered.length}</strong>
                        </div>
                    )}
                </div>
            </div>

            <NuovaSocietaModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleCreate}
            />
        </div>
    );
};

export default SuperuserSocieta;
