import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Users, AlertTriangle, Pencil, Trash2, Printer } from 'lucide-react';
import { useConfirm } from '../components/ConfirmModal';
import { useSocieta } from '../data/SocietaContext';
import CorsoModal from './CorsoModal';
import { computeScadenzaCertificatoStr } from '../utils/certificatoUtils';
import './Calendario.css';

const GIORNI = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];

// Colour map shared with AttivitaConfigurazione
const COLORE_BG = {
    'ROSSO': 'var(--danger)', 'VERDE': 'var(--success)', 'BLU': 'var(--primary)',
    'VERDE CHIARO': 'var(--success)', 'CELESTE': 'var(--primary)', 'ARANCIO': 'var(--warning)',
    'ARANCIONE': 'var(--warning)', 'VIOLA': 'var(--primary)', 'GIALLO': 'var(--warning)',
    'GRIGIO': 'var(--text-secondary)', 'ROSA': 'var(--primary)', 'FUCSIA': 'var(--primary)',
};
const COLORE_TEXT = { 'GIALLO': '#333' };

const getAttivitaStyle = (colore) => colore
    ? { backgroundColor: COLORE_BG[colore] || 'var(--text-tertiary)', color: COLORE_TEXT[colore] || '#fff' }
    : { backgroundColor: 'var(--text-tertiary)', color: '#fff' };

// Helpers stato scadenze
const todayTs = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const diffDays = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
    return Math.floor((d - todayTs()) / 86400000);
};
const getStatus = (dateStr, giorniAvviso = 30) => {
    const days = diffDays(dateStr);
    if (days === null || days < 0) return 'expired';
    if (days <= giorniAvviso) return 'warning';
    return 'ok';
};

// Single course card
const CorsoCard = ({ corso, onEdit, onDelete, onViewIscritti }) => {
    const techLabel = corso.staff
        ? `${corso.staff.cognome.toUpperCase()} ${corso.staff.nome.charAt(0).toUpperCase()}.`
        : 'N/A';
    const strutturaLabel = corso.struttura?.descrizione || 'ND';
    const areaLabel = corso.area?.descrizione?.toUpperCase() || 'AREA NON DEFINITA';
    const attivitaLabel = corso.attivita?.descrizione || '—';
    const attivitaStyle = getAttivitaStyle(corso.attivita?.colore);

    return (
        <div className="corso-card-wrapper">
            <div className="corso-card-area-label">{areaLabel}</div>
            <div className="corso-card" style={{ borderTop: `3px solid ${attivitaStyle.backgroundColor}` }}>
                <div className="corso-card-body">
                    <div className="corso-card-tech">{techLabel}</div>
                    <div className="corso-card-struttura">{strutturaLabel}</div>
                    <div className="corso-card-attivita">{attivitaLabel}</div>
                </div>
                <div className="corso-card-footer">
                    <span
                        className="corso-card-count"
                        style={{ cursor: 'pointer' }}
                        title="Visualizza iscritti"
                        onClick={(e) => { e.stopPropagation(); onViewIscritti(corso); }}
                    >
                        <Users size={14} /> <span>{corso._iscrittiCount ?? 0} / {corso.maxSoci}</span>
                    </span>
                    {(corso._warningCount > 0 || corso._expiredCount > 0) && (
                        <span
                            className="corso-card-warning"
                            style={{ cursor: 'pointer' }}
                            title="Soci in scadenza — visualizza iscritti"
                            onClick={(e) => { e.stopPropagation(); onViewIscritti(corso); }}
                        >
                            <AlertTriangle size={14} />
                            <span>{corso._warningCount ?? 0}</span>
                        </span>
                    )}
                    {corso._expiredCount > 0 && (
                        <span
                            className="corso-card-expired"
                            style={{ cursor: 'pointer' }}
                            title="Soci scaduti — visualizza iscritti"
                            onClick={(e) => { e.stopPropagation(); onViewIscritti(corso); }}
                        >
                            <AlertTriangle size={14} />
                            <span>{corso._expiredCount}</span>
                        </span>
                    )}
                    <span className="corso-card-actions">
                        <button className="corso-icon-btn" onClick={(e) => { e.stopPropagation(); onEdit(corso); }} title="Modifica">
                            <Pencil size={12} />
                        </button>
                        <button className="corso-icon-btn corso-icon-btn-danger" onClick={(e) => { e.stopPropagation(); onDelete(corso.id); }} title="Elimina">
                            <Trash2 size={12} />
                        </button>
                    </span>
                </div>
            </div>
        </div>
    );
};

const Calendario = () => {
    const { selectedSocietaId } = useSocieta();
    const confirm = useConfirm();
    const [corsi, setCorsi] = useState([]);
    const [attivita, setAttivita] = useState([]);
    const [strutture, setStrutture] = useState([]);
    const [staff, setStaff] = useState([]);
    const [abbonamenti, setAbbonamenti] = useState([]);
    const [loading, setLoading] = useState(false);

    const [filterTecnico, setFilterTecnico] = useState('');
    const [filterStruttura, setFilterStruttura] = useState('');
    const [filterAttivita, setFilterAttivita] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentCorso, setCurrentCorso] = useState(null);
    const [initialTab, setInitialTab] = useState('impostazioni');

    const fetchAll = useCallback(async () => {
        if (!selectedSocietaId) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({ societaId: selectedSocietaId });
            const staffParams = new URLSearchParams({ societaId: selectedSocietaId, attualmenteImpiegato: 'true' });
            const abbonamentiParams = new URLSearchParams({ societaId: selectedSocietaId, type: 'subscription' });
            const [
                corsiRes, attivitaRes, struttureRes, staffRes, abbonamentiRes,
                iscrizioniRes, sociRes, paymentsRes,
            ] = await Promise.all([
                fetch(`/activities/api/corsi?${params}`),
                fetch(`/activities/api/attivita?${params}`),
                fetch(`/activities/api/strutture?${params}`),
                fetch(`/activities/api/staff?${staffParams}`),
                fetch(`/products/api?${abbonamentiParams}`),
                fetch(`/activities/api/corsi/iscrizioni?${params}`),
                fetch(`/users/api/soci?societa_id=${selectedSocietaId}`),
                fetch(`/payments/api?societa_id=${selectedSocietaId}`),
            ]);

            if (attivitaRes.ok) setAttivita(await attivitaRes.json());
            if (struttureRes.ok) setStrutture(await struttureRes.json());
            if (staffRes.ok) setStaff(await staffRes.json());

            const abbonamentiData = abbonamentiRes.ok ? await abbonamentiRes.json() : [];
            setAbbonamenti(abbonamentiData);

            if (corsiRes.ok) {
                const corsiData = await corsiRes.json();

                // Costruisci mappe per calcolo stati
                const iscrizioni = iscrizioniRes.ok ? await iscrizioniRes.json() : [];
                const soci = sociRes.ok ? await sociRes.json() : [];
                const payments = paymentsRes.ok ? await paymentsRes.json() : [];

                const sociById = {};
                soci.forEach(s => { sociById[s.id] = s; });

                // payments by socio_id
                const paymentsBySocio = {};
                payments.forEach(p => {
                    if (!paymentsBySocio[p.socio_id]) paymentsBySocio[p.socio_id] = [];
                    paymentsBySocio[p.socio_id].push(p);
                });

                // iscrizioni by corsoId
                const iscrizioniByCorso = {};
                iscrizioni.forEach(i => {
                    if (!iscrizioniByCorso[i.corsoId]) iscrizioniByCorso[i.corsoId] = [];
                    iscrizioniByCorso[i.corsoId].push(i.socioId);
                });

                // map abbonamentoId → giorniAvvisoScadenza
                const giorniAvvisoMap = {};
                abbonamentiData.forEach(a => { giorniAvvisoMap[a.id] = a.giorniAvvisoScadenza ?? 30; });

                const enriched = corsiData.map(corso => {
                    const socioIds = iscrizioniByCorso[corso.id] || [];
                    const giorniAvviso = giorniAvvisoMap[corso.abbonamentoId] ?? 30;
                    let warningCount = 0;
                    let expiredCount = 0;
                    socioIds.forEach(socioId => {
                        const socio = sociById[socioId];
                        const certStatus = getStatus(computeScadenzaCertificatoStr(socio?.scadenza_certificato), giorniAvviso);
                        const abbPay = (paymentsBySocio[socioId] || [])
                            .filter(p => p.product_id === corso.abbonamentoId && p.data_scadenza_abbonamento)
                            .sort((a, b) => new Date(b.data_scadenza_abbonamento) - new Date(a.data_scadenza_abbonamento))[0];
                        const abbStatus = getStatus(abbPay?.data_scadenza_abbonamento, giorniAvviso);
                        const worst = (certStatus === 'expired' || abbStatus === 'expired') ? 'expired'
                            : (certStatus === 'warning' || abbStatus === 'warning') ? 'warning' : 'ok';
                        if (worst === 'expired') expiredCount++;
                        else if (worst === 'warning') warningCount++;
                    });
                    return { ...corso, _warningCount: warningCount, _expiredCount: expiredCount };
                });

                setCorsi(enriched);
            }
        } catch (e) {
            console.error('Errore caricamento calendario', e);
        } finally {
            setLoading(false);
        }
    }, [selectedSocietaId]);

    useEffect(() => {
        setIsModalOpen(false);
        setCurrentCorso(null);
        setFilterTecnico('');
        setFilterStruttura('');
        setFilterAttivita('');
        if (selectedSocietaId) {
            fetchAll();
        } else {
            setCorsi([]);
            setAttivita([]);
            setStrutture([]);
            setStaff([]);
            setAbbonamenti([]);
        }
    }, [selectedSocietaId]); // eslint-disable-line react-hooks/exhaustive-deps

    const filteredCorsi = corsi.filter(c => {
        if (filterTecnico && String(c.staffId) !== filterTecnico) return false;
        if (filterStruttura && String(c.strutturaId) !== filterStruttura) return false;
        if (filterAttivita && String(c.attivitaId) !== filterAttivita) return false;
        return true;
    });

    // Unique start times sorted ascending
    const timeSlots = [...new Set(filteredCorsi.map(c => c.oraInizio))].sort();

    const handleOpenModal = (corso = null) => {
        setCurrentCorso(corso);
        setInitialTab('impostazioni');
        setIsModalOpen(true);
    };

    const handleSave = async (data) => {
        const isNew = !data.id;
        const url = data.id ? `/activities/api/corsi/${data.id}` : '/activities/api/corsi';
        const method = data.id ? 'PUT' : 'POST';
        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, societaId: selectedSocietaId }),
            });
            if (res.ok) {
                const saved = await res.json();
                if (isNew) {
                    // Mantieni la modal aperta, passa alla tab iscritti
                    setCurrentCorso(saved);
                    setInitialTab('iscritti');
                } else {
                    setIsModalOpen(false);
                }
                fetchAll();
            }
        } catch (e) {
            console.error('Errore salvataggio corso', e);
        }
    };

    const handleDelete = async (id) => {
        if (!await confirm('Eliminare questo corso?')) return;
        try {
            const res = await fetch(`/activities/api/corsi/${id}`, { method: 'DELETE' });
            if (res.ok) fetchAll();
        } catch (e) {
            console.error('Errore eliminazione corso', e);
        }
    };

    return (
        <div className="calendario-container">
            {/* Toolbar */}
            <div className="calendario-toolbar">
                <div className="calendario-toolbar-filters">
                    <select
                        className="calendario-filter-select"
                        value={filterTecnico}
                        onChange={e => setFilterTecnico(e.target.value)}
                    >
                        <option value="">Qualsiasi tecnico</option>
                        {staff.map(s => (
                            <option key={s.id} value={s.id}>{s.cognome} {s.nome}</option>
                        ))}
                    </select>
                    <select
                        className="calendario-filter-select"
                        value={filterStruttura}
                        onChange={e => setFilterStruttura(e.target.value)}
                    >
                        <option value="">Qualsiasi struttura</option>
                        {strutture.map(s => (
                            <option key={s.id} value={s.id}>{s.descrizione}</option>
                        ))}
                    </select>
                    <select
                        className="calendario-filter-select"
                        value={filterAttivita}
                        onChange={e => setFilterAttivita(e.target.value)}
                    >
                        <option value="">Qualsiasi attività</option>
                        {attivita.map(a => (
                            <option key={a.id} value={a.id}>{a.descrizione}</option>
                        ))}
                    </select>
                </div>
                <div className="calendario-toolbar-actions">
                    <span className="calendario-toolbar-sep" />
                    <button className="calendario-btn-secondary">
                        <Printer size={15} /> Stampe
                    </button>
                    <button
                        className="calendario-btn-primary"
                        onClick={() => handleOpenModal()}
                        disabled={!selectedSocietaId}
                    >
                        <Plus size={15} /> Corso
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="calendario-scroll-wrapper">
                {/* Sticky day-of-week header */}
                <div className="calendario-day-header-row">
                    <div className="calendario-time-col-header" />
                    {GIORNI.map(g => (
                        <div key={g} className="calendario-day-header-cell">{g}</div>
                    ))}
                </div>

                {/* Content */}
                {loading && <div className="calendario-loading">Caricamento...</div>}
                {!loading && timeSlots.length === 0 && (
                    <div className="calendario-empty">
                        Nessun corso configurato.{' '}
                        <button className="calendario-link-btn" onClick={() => handleOpenModal()}>
                            Aggiungi il primo corso
                        </button>
                    </div>
                )}
                {timeSlots.map(time => {
                    const slotsForTime = filteredCorsi.filter(c => c.oraInizio === time);
                    return (
                        <div key={time} className="calendario-time-row">
                            <div className="calendario-time-badge-col">
                                <span className="calendario-time-badge">{time}</span>
                            </div>
                            {GIORNI.map((_, dayIdx) => {
                                const dayCorsi = slotsForTime.filter(c => c.giorno === dayIdx);
                                return (
                                    <div key={dayIdx} className="calendario-day-cell">
                                        {dayCorsi.map(c => (
                                            <CorsoCard
                                                key={c.id}
                                                corso={c}
                                                onEdit={handleOpenModal}
                                                onDelete={handleDelete}
                                                onViewIscritti={(c) => {
                                                    setCurrentCorso(c);
                                                    setInitialTab('iscritti');
                                                    setIsModalOpen(true);
                                                }}
                                            />
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            <CorsoModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); fetchAll(); }}
                onSave={handleSave}
                corso={currentCorso}
                attivita={attivita}
                strutture={strutture}
                staff={staff}
                abbonamenti={abbonamenti}
                societaId={selectedSocietaId}
                initialTab={initialTab}
            />
        </div>
    );
};

export default Calendario;
