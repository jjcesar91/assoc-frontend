// Ricerca avanzata dei soci (pannello "Ricerca avanzata" della pagina Soci).
// Tutti i filtri lavorano sui dati già caricati dalla pagina (soci con iscrizioni,
// pagamenti della società, corsi e iscrizioni ai corsi): nessuna chiamata in più al server.
import { annoContabileDiData } from './iscrizioneStatoUtils';

// Valore '' = filtro non attivo
export const FILTRI_AVANZATI_VUOTI = {
    etaMin: '', etaMax: '', sesso: '', tipoSocio: '',
    iscritto: '', iscrizioneDa: '', iscrizioneA: '', stagioniPrecedenti: '',
    statoTesseramento: '', certMedico: '', statoPagamenti: '', livello: '',
    haEmail: '', haTelefono: '', haCodiceFiscale: '',
    haScadenzario: '', haAbbonamento: '', pagatoStagione: '', importoMinStagione: '',
    frequentaCorso: '', attivitaId: '', corsoId: '',
    comune: '', indirizzo: '', luogoNascita: '', nascitaDa: '', nascitaA: '',
    etichetteAlmenoUna: [], etichetteTutte: [], etichetteNessuna: [],
};

const attivo = (v) => (Array.isArray(v) ? v.length > 0 : v !== '' && v != null);

/** Numero di filtri avanzati impostati */
export const contaFiltriAvanzati = (f) => Object.values(f || {}).filter(attivo).length;

// Etichette del socio: JSON (array) oppure elenco separato da virgole, come nella tabella soci
export const parseEtichette = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val.filter(Boolean);
    try { const p = JSON.parse(val); return Array.isArray(p) ? p : [String(val)]; }
    catch { return String(val).split(',').map(s => s.trim()).filter(Boolean); }
};

const norm = (s) => String(s || '').trim().toLowerCase();
const pad2 = (n) => String(n).padStart(2, '0');
const oggiISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
const isoDi = (v) => (v ? String(v).slice(0, 10) : null);

function eta(dataNascita) {
    const iso = isoDi(dataNascita);
    if (!iso) return null;
    const [y, m, d] = iso.split('-').map(Number);
    const oggi = new Date();
    let e = oggi.getFullYear() - y;
    if (oggi.getMonth() + 1 < m || (oggi.getMonth() + 1 === m && oggi.getDate() < d)) e -= 1;
    return e;
}

// Pagamento effettivo: non annullato ("3. …") e non proforma (ricevuta provvisoria non pagata)
const pagamentoValido = (p) => !(typeof p.stato_pagamento === 'string' && p.stato_pagamento.startsWith('3.'))
    && p.tipo_documento !== 'proforma';

const vociDi = (p) => {
    let v = p.payment_items;
    if (typeof v === 'string') { try { v = JSON.parse(v); } catch { v = null; } }
    return Array.isArray(v) ? v : [];
};

/**
 * Indici per socio (per socio_id e per codice fiscale) calcolati una volta dai pagamenti:
 * anni contabili con quota associativa, ultima scadenza abbonamento, presenza di scadenze,
 * numero e totale dei pagamenti nella stagione selezionata.
 */
export function indiciPagamenti(payments, societa, annoSelezionato) {
    const perId = new Map();
    const perCf = new Map();
    const voce = (map, k) => {
        if (!map.has(k)) map.set(k, { anniQuota: new Set(), ultimaScadAbb: null, scadenze: 0, pagamentiStagione: 0, totaleStagione: 0 });
        return map.get(k);
    };
    for (const p of payments || []) {
        if (!pagamentoValido(p)) continue;
        if (p.socio_id == null && !p.codice_fiscale) continue;
        const destinazioni = [];
        if (p.socio_id != null) destinazioni.push(voce(perId, p.socio_id));
        if (p.codice_fiscale) destinazioni.push(voce(perCf, p.codice_fiscale.toUpperCase()));

        const tipi = (p.quote_types || '').split(',').map(t => t.trim().toLowerCase());
        const annoPag = p.data_pagamento ? annoContabileDiData(p.data_pagamento, societa) : null;
        const voci = vociDi(p);
        const scadAbb = voci.length
            ? voci.filter(v => norm(v.quote_types) === 'subscription').map(v => isoDi(v.data_scadenza_abbonamento || p.data_scadenza_abbonamento)).filter(Boolean)
            : (tipi.includes('subscription') && p.data_scadenza_abbonamento ? [isoDi(p.data_scadenza_abbonamento)] : []);
        const haTessera365 = (voci.length ? voci.some(v => norm(v.quote_types) === 'tesseramento' && (v.periodicity_tesseramento || p.periodicity_tesseramento) === 'anno_solare')
            : tipi.includes('tesseramento') && p.periodicity_tesseramento === 'anno_solare');
        const importo = parseFloat(p.importo) || 0;

        for (const d of destinazioni) {
            if (tipi.includes('quota_associativa') && annoPag != null) d.anniQuota.add(annoPag);
            for (const s of scadAbb) if (!d.ultimaScadAbb || s > d.ultimaScadAbb) d.ultimaScadAbb = s;
            if (scadAbb.length || haTessera365) d.scadenze += 1;
            if (annoSelezionato != null && annoPag === Number(annoSelezionato) && importo > 0) {
                d.pagamentiStagione += 1;
                d.totaleStagione += importo;
            }
        }
    }
    return { perId, perCf };
}

/** Unisce gli indici trovati per socio_id e per codice fiscale */
function datiPagamentiSocio(indici, socio) {
    const a = socio.id != null ? indici.perId.get(socio.id) : null;
    const cf = (socio.codice_fiscale || '').toUpperCase();
    const b = cf ? indici.perCf.get(cf) : null;
    if (!a && !b) return { anniQuota: new Set(), ultimaScadAbb: null, scadenze: 0, pagamentiStagione: 0, totaleStagione: 0 };
    if (!a || !b || a === b) return a || b;
    // Lo stesso pagamento può comparire in entrambi gli indici: per i conteggi vale il maggiore
    return {
        anniQuota: new Set([...a.anniQuota, ...b.anniQuota]),
        ultimaScadAbb: [a.ultimaScadAbb, b.ultimaScadAbb].filter(Boolean).sort().pop() || null,
        scadenze: Math.max(a.scadenze, b.scadenze),
        pagamentiStagione: Math.max(a.pagamentiStagione, b.pagamentiStagione),
        totaleStagione: Math.max(a.totaleStagione, b.totaleStagione),
    };
}

// Data di iscrizione del socio: data di ammissione, altrimenti la prima iscrizione registrata
export function dataIscrizioneSocio(socio) {
    if (socio.data_ammissione) return isoDi(socio.data_ammissione);
    const date = (socio.iscrizioni || []).map(i => isoDi(i.data_iscrizione)).filter(Boolean).sort();
    return date[0] || null;
}

/**
 * Crea il predicato dei filtri avanzati.
 * ctx: { indici, corsiPerSocio: Map<socioId, Set<corsoId>>, corsiById: Map<corsoId, corso>,
 *        currentRefYear, getIscrizioneStatus, getTesseramentoStatus, getCertStatus }
 */
export function creaFiltroAvanzato(f, ctx) {
    if (!f || contaFiltriAvanzati(f) === 0) return () => true;
    const oggi = oggiISO();
    const annoPrec = ctx.currentRefYear != null ? ctx.currentRefYear - 1 : null;
    const etaMin = f.etaMin === '' ? null : Number(f.etaMin);
    const etaMax = f.etaMax === '' ? null : Number(f.etaMax);
    const importoMin = f.importoMinStagione === '' ? null : parseFloat(String(f.importoMinStagione).replace(',', '.'));
    const siNo = (valore, condizione) => valore === '' || (valore === '1' ? condizione : !condizione);

    return (socio) => {
        // Anagrafica
        if (etaMin != null || etaMax != null) {
            const e = eta(socio.data_nascita);
            if (e == null) return false;
            if (etaMin != null && e < etaMin) return false;
            if (etaMax != null && e > etaMax) return false;
        }
        if (f.sesso && (socio.sesso || '').toUpperCase() !== f.sesso) return false;
        if (f.tipoSocio && (socio.tipo_socio || 'persona') !== f.tipoSocio) return false;
        if (f.livello && (socio.livello || 'ND') !== f.livello) return false;
        if (!siNo(f.haEmail, !!(socio.email || '').trim())) return false;
        if (!siNo(f.haTelefono, !!(socio.telefono || '').trim())) return false;
        if (!siNo(f.haCodiceFiscale, !!(socio.codice_fiscale || '').trim())) return false;
        if (f.comune && norm(socio.comune) !== norm(f.comune)) return false;
        if (f.indirizzo && !norm(socio.indirizzo).includes(norm(f.indirizzo))) return false;
        if (f.luogoNascita && norm(socio.luogo_nascita) !== norm(f.luogoNascita)) return false;
        if (f.nascitaDa || f.nascitaA) {
            const n = isoDi(socio.data_nascita);
            if (!n) return false;
            if (f.nascitaDa && n < f.nascitaDa) return false;
            if (f.nascitaA && n > f.nascitaA) return false;
        }

        // Iscrizione e tesseramento (stessi stati delle colonne della tabella)
        if (f.iscritto) {
            const st = ctx.getIscrizioneStatus(socio);
            if (!siNo(f.iscritto, st === 'REGOLARE' || st === 'IN SCADENZA')) return false;
        }
        if (f.iscrizioneDa || f.iscrizioneA) {
            const d = dataIscrizioneSocio(socio);
            if (!d) return false;
            if (f.iscrizioneDa && d < f.iscrizioneDa) return false;
            if (f.iscrizioneA && d > f.iscrizioneA) return false;
        }
        if (f.statoTesseramento && ctx.getTesseramentoStatus(socio) !== f.statoTesseramento) return false;
        if (f.certMedico && ctx.getCertStatus(socio.scadenza_certificato) !== f.certMedico) return false;
        if (f.statoPagamenti) {
            const regolari = ctx.getTesseramentoStatus(socio) === 'REGOLARE';
            if (f.statoPagamenti === 'regolari' ? !regolari : regolari) return false;
        }

        // Pagamenti
        const pag = datiPagamentiSocio(ctx.indici, socio);
        if (f.stagioniPrecedenti) {
            const anni = new Set([...pag.anniQuota, ...(socio.iscrizioni || []).map(i => i.anno).filter(a => a != null)]);
            const precedente = annoPrec != null && anni.has(annoPrec);
            const qualsiasi = ctx.currentRefYear != null && [...anni].some(a => a < ctx.currentRefYear);
            if (f.stagioniPrecedenti === 'si_prec' && !precedente) return false;
            if (f.stagioniPrecedenti === 'si_qualsiasi' && !qualsiasi) return false;
            if (f.stagioniPrecedenti === 'no_prec' && precedente) return false;
            if (f.stagioniPrecedenti === 'no_qualsiasi' && qualsiasi) return false;
        }
        if (!siNo(f.haScadenzario, pag.scadenze > 0)) return false;
        if (!siNo(f.haAbbonamento, !!pag.ultimaScadAbb && pag.ultimaScadAbb >= oggi)) return false;
        if (!siNo(f.pagatoStagione, pag.pagamentiStagione > 0)) return false;
        if (importoMin != null && !(pag.totaleStagione >= importoMin)) return false;

        // Corsi
        const corsi = ctx.corsiPerSocio.get(socio.id) || new Set();
        if (!siNo(f.frequentaCorso, corsi.size > 0)) return false;
        if (f.corsoId && !corsi.has(Number(f.corsoId))) return false;
        if (f.attivitaId && ![...corsi].some(id => String(ctx.corsiById.get(id)?.attivita?.id ?? ctx.corsiById.get(id)?.attivitaId) === String(f.attivitaId))) return false;

        // Etichette
        const et = parseEtichette(socio.etichette);
        if (f.etichetteAlmenoUna.length && !f.etichetteAlmenoUna.some(e => et.includes(e))) return false;
        if (f.etichetteTutte.length && !f.etichetteTutte.every(e => et.includes(e))) return false;
        if (f.etichetteNessuna.length && f.etichetteNessuna.some(e => et.includes(e))) return false;

        return true;
    };
}
