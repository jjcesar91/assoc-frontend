import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import { useSocieta } from './SocietaContext';

const AnnoContext = createContext();

/**
 * Restituisce { start: Date, end: Date } per l'anno di riferimento `anno`
 * dato il tipo di anno associativo della società.
 */
export function getAnnoDateRange(anno, societa) {
    const tipo = societa?.tipo_anno_associativo || 'solare';
    if (tipo === 'solare') {
        return { start: new Date(`${anno}-01-01`), end: new Date(`${anno}-12-31`) };
    }
    if (tipo === 'associativo') {
        return { start: new Date(`${anno}-09-01`), end: new Date(`${anno + 1}-08-31`) };
    }
    if (tipo === 'personalizzato' && societa?.data_inizio_anno_associativo) {
        const parts = societa.data_inizio_anno_associativo.split('-');
        if (parts.length === 2) {
            const cDay = String(parseInt(parts[0], 10)).padStart(2, '0');
            const cMonth = String(parseInt(parts[1], 10)).padStart(2, '0');
            const start = new Date(`${anno}-${cMonth}-${cDay}`);
            const end = new Date(`${anno + 1}-${cMonth}-${cDay}`);
            end.setDate(end.getDate() - 1);
            return { start, end };
        }
    }
    return { start: new Date(`${anno}-01-01`), end: new Date(`${anno}-12-31`) };
}

export const useAnno = () => useContext(AnnoContext);

function calculateCurrentRefYear(societa) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    if (!societa || societa.tipo_anno_associativo === 'solare') {
        return year;
    } else if (societa.tipo_anno_associativo === 'associativo') {
        return month < 9 ? year - 1 : year;
    } else if (societa.tipo_anno_associativo === 'personalizzato' && societa.data_inizio_anno_associativo) {
        const parts = societa.data_inizio_anno_associativo.split('-');
        if (parts.length === 2) {
            const cDay = parseInt(parts[0], 10);
            const cMonth = parseInt(parts[1], 10);
            if (month < cMonth || (month === cMonth && day < cDay)) {
                return year - 1;
            }
        }
        return year;
    }
    return year;
}

export const AnnoProvider = ({ children }) => {
    const { societaList, selectedSocietaId } = useSocieta();

    const selectedSocieta = useMemo(
        () => societaList.find(s => s.id == selectedSocietaId) || null,
        [societaList, selectedSocietaId]
    );

    const tipoAnno = selectedSocieta?.tipo_anno_associativo || 'solare';

    const currentRefYear = useMemo(
        () => calculateCurrentRefYear(selectedSocieta),
        [selectedSocieta]
    );

    const annoOptions = useMemo(
        () => {
            const options = [currentRefYear - 1, currentRefYear];
            // Mostra il prossimo anno associativo 15 giorni prima del suo inizio
            // (soglia calcolata in base alla configurazione della società).
            const nextStart = getAnnoDateRange(currentRefYear + 1, selectedSocieta).start;
            const threshold = new Date(nextStart);
            threshold.setDate(threshold.getDate() - 15);
            if (new Date() >= threshold) {
                options.push(currentRefYear + 1);
            }
            return options;
        },
        [currentRefYear, selectedSocieta]
    );

    // All'ingresso nel programma si parte sempre dall'anno associativo corrente
    // (nessun ripristino da sessioni precedenti).
    const [selectedAnno, setSelectedAnnoState] = useState(null);

    // Quando cambia la società o viene caricata la lista, adegua l'anno se non è nelle opzioni disponibili
    useEffect(() => {
        if (selectedAnno !== null && annoOptions.includes(selectedAnno)) return;
        setSelectedAnnoState(currentRefYear);
    }, [selectedSocieta, currentRefYear, annoOptions]); // eslint-disable-line react-hooks/exhaustive-deps

    const setSelectedAnno = (anno) => {
        setSelectedAnnoState(anno);
    };

    const formatAnnoLabel = (anno) => {
        if (tipoAnno === 'solare') return String(anno);
        return `${anno}/${anno + 1}`;
    };

    return (
        <AnnoContext.Provider value={{
            selectedAnno: selectedAnno ?? currentRefYear,
            setSelectedAnno,
            annoOptions,
            currentRefYear,
            tipoAnno,
            formatAnnoLabel,
        }}>
            {children}
        </AnnoContext.Provider>
    );
};
