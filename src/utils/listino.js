// Listino degli abbonamenti: formule { id, durata, illimitato, ingressi, prezzo }
// (validate e salvate dal servizio products, vedi services/products/utils/listino.js)

export const DURATE = [
    { value: '1_mese', label: '1 mese', giorni: 30 },
    { value: '2_mesi', label: '2 mesi', giorni: 60 },
    { value: '3_mesi', label: '3 mesi', giorni: 90 },
    { value: '4_mesi', label: '4 mesi', giorni: 120 },
    { value: '6_mesi', label: '6 mesi', giorni: 180 },
    { value: '12_mesi', label: '12 mesi', giorni: 365 },
];

export const durataLabel = (durata) => DURATE.find(d => d.value === durata)?.label || durata || '';
export const durataGiorni = (durata) => DURATE.find(d => d.value === durata)?.giorni || 30;

export const formatEuro = (v) => `€ ${(parseFloat(v) || 0).toFixed(2).replace('.', ',')}`;

// "3 mesi · 10 ingressi" / "12 mesi · ingressi illimitati"
export const etichettaFormula = (f) => (f
    ? `${durataLabel(f.durata)} · ${f.illimitato ? 'ingressi illimitati' : `${f.ingressi} ingressi`}`
    : '');

// Formule di un abbonamento; per i prodotti salvati prima dei listini ne ricava una dai campi legacy
export const listinoDi = (product) => {
    if (!product || product.type !== 'subscription') return [];
    if (Array.isArray(product.listino) && product.listino.length) return product.listino;
    return [{
        id: null,
        durata: product.duration || '1_mese',
        illimitato: !!product.unlimitedEntries || !(parseInt(product.numEntries, 10) > 0),
        ingressi: parseInt(product.numEntries, 10) || null,
        prezzo: parseFloat(product.basePrice) || 0,
    }];
};

export const trovaFormula = (product, listinoId) => {
    const listino = listinoDi(product);
    return listino.find(f => f.id === listinoId) || (listino.length === 1 ? listino[0] : null);
};

// Abbonamenti che danno accesso al corso (molti a molti; fallback sul legacy abbonamentoId)
export const abbonamentiDelCorso = (corso) => (Array.isArray(corso?.abbonamentoIds)
    ? corso.abbonamentoIds
    : (corso?.abbonamentoId ? [corso.abbonamentoId] : []));

const GIORNI = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];

// "Pilates · LUN 18:00, GIO 18:00"
export const corsoLabel = (corso) => {
    const nome = corso.descrizione || corso.attivita?.descrizione || `Corso ${corso.id}`;
    const orari = (corso.orari?.length ? corso.orari : [corso])
        .filter(o => o.oraInizio)
        .map(o => `${GIORNI[o.giorno] ?? ''} ${o.oraInizio}`.trim());
    return orari.length ? `${nome} · ${orari.join(', ')}` : nome;
};

// Voce di abbonamento più recente (per scadenza) tra i pagamenti, limitata agli
// abbonamenti indicati: considera anche le singole voci di un pagamento con più prodotti.
// Ritorna il pagamento con product_id/date/formula della voce trovata, o undefined.
export const ultimoAbbonamento = (payments, abbonamentoIds) => {
    const ids = new Set((abbonamentoIds || []).map(Number));
    if (ids.size === 0) return undefined;
    let best;
    for (const p of payments || []) {
        const voci = [p, ...(Array.isArray(p.payment_items) ? p.payment_items : [])];
        for (const v of voci) {
            if (!ids.has(Number(v.product_id)) || !v.data_scadenza_abbonamento) continue;
            if (!best || new Date(v.data_scadenza_abbonamento) > new Date(best.data_scadenza_abbonamento)) {
                best = {
                    ...p,
                    product_id: v.product_id,
                    data_inizio_abbonamento: v.data_inizio_abbonamento ?? p.data_inizio_abbonamento,
                    data_scadenza_abbonamento: v.data_scadenza_abbonamento,
                    listino_id: v.listino_id,
                    formula: v.formula,
                };
            }
        }
    }
    return best;
};

// Preavviso per un corso: il più ampio tra gli abbonamenti collegati
export const giorniAvvisoCorso = (corso, abbonamenti, fallback = 30) => {
    const ids = abbonamentiDelCorso(corso);
    const valori = (abbonamenti || []).filter(a => ids.includes(a.id)).map(a => a.giorniAvvisoScadenza).filter(v => v != null);
    return valori.length ? Math.max(...valori) : fallback;
};
