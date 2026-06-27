import React, { useState, useEffect } from 'react';
import { X, Check, CheckSquare, Calendar } from 'lucide-react';
import './AbbonamentoDateModal.css';

/**
 * Calcola la data di fine abbonamento a partire dalla data di inizio e dalla durata.
 * Regola generale: fine = (inizio + N mesi) - 1 giorno
 * Caso overflow (es. 30/31 gen + 1 mese → 28/29 feb): usa l'ultimo giorno del mese target senza sottrarre 1.
 */
function calcEndDate(startDateStr, durationStr) {
    if (!startDateStr || !durationStr) return '';
    const months = parseInt(durationStr.split('_')[0], 10);
    if (isNaN(months) || months <= 0) return '';

    const [year, month, day] = startDateStr.split('-').map(Number);

    let targetMonth = month - 1 + months; // 0-indexed
    let targetYear = year + Math.floor(targetMonth / 12);
    targetMonth = targetMonth % 12;

    const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

    if (day > lastDayOfTargetMonth) {
        // Overflow: usa l'ultimo giorno del mese target
        return [
            String(targetYear).padStart(4, '0'),
            String(targetMonth + 1).padStart(2, '0'),
            String(lastDayOfTargetMonth).padStart(2, '0')
        ].join('-');
    } else {
        // Normale: stesso giorno nel mese target, meno 1 giorno
        const endDate = new Date(targetYear, targetMonth, day - 1);
        return [
            String(endDate.getFullYear()).padStart(4, '0'),
            String(endDate.getMonth() + 1).padStart(2, '0'),
            String(endDate.getDate()).padStart(2, '0')
        ].join('-');
    }
}

const AbbonamentoDateModal = ({ isOpen, onClose, onConfirm, duration }) => {
    const todayStr = new Date().toISOString().split('T')[0];

    const [dataInizio, setDataInizio] = useState(todayStr);
    const [dataFine, setDataFine] = useState('');

    useEffect(() => {
        if (isOpen) {
            setDataInizio(todayStr);
            setDataFine(calcEndDate(todayStr, duration));
        }
    }, [isOpen, duration]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleInizioChange = (e) => {
        const val = e.target.value;
        setDataInizio(val);
        if (val) setDataFine(calcEndDate(val, duration));
        else setDataFine('');
    };

    if (!isOpen) return null;

    return (
        <div className="adm-overlay">
            <div className="adm-modal">
                <div className="adm-header">
                    <div className="adm-title">
                        <CheckSquare size={22} strokeWidth={2} />
                        Date di validità abbonamento
                    </div>
                    <button className="adm-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="adm-body">
                    <div className="adm-row">
                        <div className="adm-field-group">
                            <label>Data inizio abbonamento</label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="date"
                                    className="adm-input"
                                    value={dataInizio}
                                    onChange={handleInizioChange}
                                />
                                <Calendar
                                    size={18}
                                    style={{ position: 'absolute', right: '10px', color: 'var(--text-secondary)', cursor: 'pointer', zIndex: 5 }}
                                    onClick={(e) => e.currentTarget.previousElementSibling.showPicker?.()}
                                />
                            </div>
                        </div>

                        <div className="adm-field-group">
                            <label>Data scadenza abbonamento</label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="date"
                                    className="adm-input"
                                    value={dataFine}
                                    onChange={(e) => setDataFine(e.target.value)}
                                />
                                <Calendar
                                    size={18}
                                    style={{ position: 'absolute', right: '10px', color: 'var(--text-secondary)', cursor: 'pointer', zIndex: 5 }}
                                    onClick={(e) => e.currentTarget.previousElementSibling.showPicker?.()}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="adm-footer">
                    <button className="adm-confirm-btn" onClick={() => onConfirm({ dataInizio, dataFine })}>
                        <Check size={18} strokeWidth={2} /> Prosegui
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AbbonamentoDateModal;
