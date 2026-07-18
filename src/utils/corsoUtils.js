// Helper condivisi per i corsi con più giorni/orari.

// Orari di un corso, con fallback ai campi piatti legacy (corsi non ancora migrati)
export const getOrari = (corso) => {
    if (corso?.orari?.length > 0) return corso.orari;
    if (corso?.giorno === undefined || corso?.giorno === null) return [];
    return [{ giorno: corso.giorno, oraInizio: corso.oraInizio, durataMinuti: corso.durataMinuti }];
};

export const computeOraFine = (oraInizio, durataMinuti) => {
    if (!oraInizio) return '';
    const [h, m] = oraInizio.split(':').map(Number);
    const tot = h * 60 + m + (durataMinuti || 0);
    return `${String(Math.floor(tot / 60)).padStart(2, '0')}:${String(tot % 60).padStart(2, '0')}`;
};

const GIORNI_ABBR = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];

// Es. "LUN 09:00-09:50, MER 18:00-18:50"
export const formatOrari = (corso) => getOrari(corso)
    .map(o => `${GIORNI_ABBR[o.giorno] ?? ''} ${o.oraInizio}-${computeOraFine(o.oraInizio, o.durataMinuti)}`)
    .join(', ');
