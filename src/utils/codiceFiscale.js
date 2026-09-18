// Parsing del codice fiscale italiano (persona fisica): estrae i dati anagrafici
// deducibili — sesso, data di nascita, comune/nazione di nascita — per precompilare
// il form pubblico di RicevutaTelematica.jsx. Gestisce anche l'omocodia (le cifre
// numeriche di anno/giorno/codice catastale possono essere sostituite da lettere
// quando serve disambiguare due codici fiscali altrimenti identici).

const MESI = { A: 1, B: 2, C: 3, D: 4, E: 5, H: 6, L: 7, M: 8, P: 9, R: 10, S: 11, T: 12 };

// Sostituzione standard omocodia: lettera -> cifra originale.
const OMOCODIA = { L: '0', M: '1', N: '2', P: '3', Q: '4', R: '5', S: '6', T: '7', U: '8', V: '9' };

const CF_REGEX = /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/;

// Tabelle standard per il calcolo del carattere di controllo (16° carattere).
const DISPARI = {
    '0': 1, '1': 0, '2': 5, '3': 7, '4': 9, '5': 13, '6': 15, '7': 17, '8': 19, '9': 21,
    A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21, K: 2, L: 4, M: 18,
    N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14, U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23,
};
const PARI = {
    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7, I: 8, J: 9, K: 10, L: 11, M: 12,
    N: 13, O: 14, P: 15, Q: 16, R: 17, S: 18, T: 19, U: 20, V: 21, W: 22, X: 23, Y: 24, Z: 25,
};

function deOmocode(ch) {
    if (ch >= '0' && ch <= '9') return ch;
    return OMOCODIA[ch] ?? null;
}

function calcolaCarattereControllo(cf15) {
    let somma = 0;
    for (let i = 0; i < 15; i++) {
        const ch = cf15[i];
        somma += (i % 2 === 0) ? DISPARI[ch] : PARI[ch];
    }
    return String.fromCharCode(65 + (somma % 26));
}

/**
 * Analizza un codice fiscale (persona fisica) e ne estrae i dati anagrafici.
 * @param {string} cfRaw
 * @returns {null | { sesso: 'M'|'F', dataNascita: string, codiceCatastale: string, checksumValid: boolean }}
 * null se il formato non è quello di un codice fiscale valido.
 */
export function parseCodiceFiscale(cfRaw) {
    if (!cfRaw) return null;
    const cf = String(cfRaw).trim().toUpperCase();
    if (!CF_REGEX.test(cf)) return null;

    // Le posizioni numeriche sono già garantite da CF_REGEX (cifra oppure lettera
    // di omocodia valida), quindi deOmocode qui non può restituire null.
    const annoDigits = deOmocode(cf[6]) + deOmocode(cf[7]);
    const mese = MESI[cf[8]];
    const giornoDigits = deOmocode(cf[9]) + deOmocode(cf[10]);
    const catastoDigits = deOmocode(cf[12]) + deOmocode(cf[13]) + deOmocode(cf[14]);

    if (!mese) return null;

    const giornoNum = parseInt(giornoDigits, 10);
    const sesso = giornoNum > 40 ? 'F' : 'M';
    const giorno = sesso === 'F' ? giornoNum - 40 : giornoNum;
    if (giorno < 1 || giorno > 31) return null;

    const yy = parseInt(annoDigits, 10);
    const currentYear = new Date().getFullYear();
    let anno = 2000 + yy;
    if (anno > currentYear) anno = 1900 + yy;

    const dataNascita = `${anno}-${String(mese).padStart(2, '0')}-${String(giorno).padStart(2, '0')}`;
    const codiceCatastale = cf[11] + catastoDigits;
    const checksumValid = calcolaCarattereControllo(cf.slice(0, 15)) === cf[15];

    return { sesso, dataNascita, codiceCatastale, checksumValid };
}

let cachedLuoghi = null;
let fetchPromise = null;

function fetchLuoghiNascita() {
    if (cachedLuoghi) return Promise.resolve(cachedLuoghi);
    if (fetchPromise) return fetchPromise;

    fetchPromise = fetch('/data/luoghi-nascita-cf.json')
        .then((res) => {
            if (!res.ok) throw new Error('Network response was not ok');
            return res.json();
        })
        .then((data) => {
            cachedLuoghi = data;
            fetchPromise = null;
            return data;
        })
        .catch((err) => {
            console.error('Errore caricamento elenco luoghi di nascita:', err);
            fetchPromise = null;
            return {};
        });

    return fetchPromise;
}

/**
 * Risolve un codice catastale (Belfiore) nel nome del comune italiano oppure,
 * per i codici che iniziano per Z, nel nome dello stato estero.
 * @param {string} codiceCatastale
 * @returns {Promise<null | { nome: string, estero: boolean }>}
 */
export async function lookupLuogoNascita(codiceCatastale) {
    const luoghi = await fetchLuoghiNascita();
    const entry = luoghi[codiceCatastale];
    if (!entry) return null;
    const [nome, estero] = entry;
    return { nome, estero: estero === 1 };
}
