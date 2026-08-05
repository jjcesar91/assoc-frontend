import React, { useState, useEffect, useCallback } from 'react';
import { X, Users, UserPlus, Check, BookOpen, AlertTriangle } from 'lucide-react';
import { formatOrari } from '../utils/corsoUtils';
import './IscrizioneCorsoDopoModal.css';

const IscrizioneCorsoDopoModal = ({ isOpen, onClose, corsi, socio, societaId }) => {
    const [selectedCorsoId, setSelectedCorsoId] = useState('');
    const [iscritti, setIscritti] = useState([]);
    const [sociMap, setSociMap] = useState({});
    const [loading, setLoading] = useState(false);
    const [enrolling, setEnrolling] = useState(false);
    const [enrolled, setEnrolled] = useState(false);
    const [error, setError] = useState('');

    const selectedCorso = corsi.find(c => c.id === parseInt(selectedCorsoId, 10)) || null;

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            const defaultId = corsi.length === 1 ? String(corsi[0].id) : '';
            setSelectedCorsoId(defaultId);
            setIscritti([]);
            setSociMap({});
            setEnrolled(false);
            setError('');
        }
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-chiude dopo iscrizione riuscita per non bloccare il redirect
    useEffect(() => {
        if (!enrolled) return;
        const t = setTimeout(() => onClose(), 1800);
        return () => clearTimeout(t);
    }, [enrolled, onClose]);

    const fetchIscritti = useCallback(async () => {
        if (!selectedCorsoId) return;
        setLoading(true);
        try {
            const [iscrittiRes, sociRes] = await Promise.all([
                fetch(`/activities/api/corsi/${selectedCorsoId}/iscritti`),
                fetch(`/users/api/soci?societa_id=${societaId}`),
            ]);
            const iscrittiData = iscrittiRes.ok ? await iscrittiRes.json() : [];
            setIscritti(iscrittiData);
            if (sociRes.ok) {
                const soci = await sociRes.json();
                const map = {};
                soci.forEach(s => { map[s.id] = s; });
                setSociMap(map);
            }
            setEnrolled(iscrittiData.some(i => i.socioId === socio?.id));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [selectedCorsoId, societaId, socio?.id]);

    useEffect(() => {
        if (selectedCorsoId) {
            setEnrolled(false);
            setError('');
            fetchIscritti();
        } else {
            setIscritti([]);
        }
    }, [selectedCorsoId, fetchIscritti]);

    const handleIscrivi = async () => {
        if (!selectedCorso || !socio?.id) return;
        setEnrolling(true);
        setError('');
        try {
            const res = await fetch(`/activities/api/corsi/${selectedCorso.id}/iscritti`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ socioId: socio.id }),
            });
            if (res.ok) {
                setEnrolled(true);
                fetchIscritti();
            } else if (res.status === 409) {
                setEnrolled(true);
                fetchIscritti();
            } else {
                const err = await res.json().catch(() => ({}));
                setError(err.error || 'Errore durante l\'iscrizione');
            }
        } catch {
            setError('Errore di rete');
        } finally {
            setEnrolling(false);
        }
    };

    if (!isOpen) return null;

    const isFull = selectedCorso && iscritti.length >= selectedCorso.maxSoci && !enrolled;
    const canEnroll = selectedCorso && socio?.id && !enrolled && !isFull;

    return (
        <div className="icdm-overlay">
            <div className="icdm-modal">
                {/* Header */}
                <div className="icdm-header">
                    <div className="icdm-title">
                        <BookOpen size={20} />
                        Iscrizione al corso
                    </div>
                    <button className="icdm-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="icdm-body">
                    {/* Socio info */}
                    {socio && (
                        <div
                            className="icdm-socio-bar"
                            style={socio.sesso === 'F' ? {
                                backgroundColor: 'var(--femminile-container)',
                                borderColor: 'var(--femminile-container)',
                                color: 'var(--on-femminile-container)',
                            } : undefined}
                        >
                            <Users size={15} />
                            <span><strong>{socio.cognome} {socio.nome}</strong> — {socio.codice_fiscale}</span>
                        </div>
                    )}

                    {/* Corso selector */}
                    <div className="icdm-field-group">
                        <label>Seleziona corso associato all&apos;abbonamento</label>
                        <select
                            className="icdm-select"
                            value={selectedCorsoId}
                            onChange={e => setSelectedCorsoId(e.target.value)}
                        >
                            {corsi.length > 1 && <option value="">— Seleziona un corso —</option>}
                            {corsi.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.attivita?.descrizione || '—'} — {formatOrari(c)}
                                    {c.struttura ? ` — ${c.struttura.descrizione}` : ''}
                                    {` (${c._iscrittiCount ?? 0}/${c.maxSoci})`}
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedCorso && (
                        <>
                            {/* Corso info */}
                            <div className="icdm-corso-info">
                                <div className="icdm-info-grid">
                                    <div className="icdm-info-item">
                                        <span className="icdm-info-label">Attività</span>
                                        <span className="icdm-info-value">{selectedCorso.attivita?.descrizione || '—'}</span>
                                    </div>
                                    <div className="icdm-info-item">
                                        <span className="icdm-info-label">Giorni e orari</span>
                                        <span className="icdm-info-value">
                                            {formatOrari(selectedCorso) || '—'}
                                        </span>
                                    </div>
                                    {selectedCorso.struttura && (
                                        <div className="icdm-info-item">
                                            <span className="icdm-info-label">Struttura</span>
                                            <span className="icdm-info-value">{selectedCorso.struttura.descrizione}</span>
                                        </div>
                                    )}
                                    {selectedCorso.area && (
                                        <div className="icdm-info-item">
                                            <span className="icdm-info-label">Area</span>
                                            <span className="icdm-info-value">{selectedCorso.area.descrizione}</span>
                                        </div>
                                    )}
                                    {selectedCorso.staff && (
                                        <div className="icdm-info-item">
                                            <span className="icdm-info-label">Tecnico</span>
                                            <span className="icdm-info-value">
                                                {selectedCorso.staff.cognome} {selectedCorso.staff.nome?.charAt(0)}.
                                            </span>
                                        </div>
                                    )}
                                    <div className="icdm-info-item">
                                        <span className="icdm-info-label">Iscritti</span>
                                        <span className={`icdm-counter${iscritti.length >= selectedCorso.maxSoci ? ' icdm-counter-full' : ''}`}>
                                            <Users size={14} />
                                            {iscritti.length} / {selectedCorso.maxSoci}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Avviso corso pieno */}
                            {isFull && (
                                <div className="icdm-alert-warning">
                                    <AlertTriangle size={16} />
                                    Il corso ha raggiunto il numero massimo di iscritti.
                                </div>
                            )}

                            {/* Elenco iscritti */}
                            <div className="icdm-iscritti-section">
                                <div className="icdm-iscritti-title">
                                    Elenco iscritti
                                </div>
                                {loading ? (
                                    <div className="icdm-placeholder">Caricamento...</div>
                                ) : iscritti.length === 0 ? (
                                    <div className="icdm-placeholder">Nessun iscritto al momento</div>
                                ) : (
                                    <table className="icdm-table">
                                        <thead>
                                            <tr>
                                                <th>Socio</th>
                                                <th>Iscritto dal</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {iscritti.map(i => {
                                                const s = sociMap[i.socioId];
                                                const isMe = i.socioId === socio?.id;
                                                return (
                                                    <tr key={i.socioId} className={isMe ? 'icdm-row-me' : ''}>
                                                        <td>
                                                            {s
                                                                ? `${s.cognome} ${s.nome}`
                                                                : `#${i.socioId}`}
                                                            {isMe && <span className="icdm-badge-me">tu</span>}
                                                        </td>
                                                        <td>
                                                            {i.dataIscrizione
                                                                ? new Date(i.dataIscrizione).toLocaleDateString('it-IT')
                                                                : '—'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* Feedback e azione */}
                            {error && (
                                <div className="icdm-alert-error">
                                    <AlertTriangle size={15} /> {error}
                                </div>
                            )}

                            {enrolled ? (
                                <div className="icdm-success-box">
                                    <Check size={18} />
                                    Socio iscritto al corso con successo
                                </div>
                            ) : (
                                <button
                                    className="icdm-btn-iscrivi"
                                    onClick={handleIscrivi}
                                    disabled={enrolling || !canEnroll}
                                >
                                    <UserPlus size={16} />
                                    {enrolling ? 'Iscrizione in corso...' : 'Iscrivi al corso'}
                                </button>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="icdm-footer">
                    <button className="icdm-btn-skip" onClick={onClose}>
                        {enrolled ? <><Check size={15} /> Chiudi</> : 'Salta'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IscrizioneCorsoDopoModal;
