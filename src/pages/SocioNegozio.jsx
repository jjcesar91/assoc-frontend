import { useState, useEffect, useMemo } from 'react';
import {
    ShoppingCart, Plus, Minus, Trash2, Package, Landmark,
    CheckCircle, ArrowLeft, Upload, FileText,
} from 'lucide-react';
import UploadRicevuta from '../components/UploadRicevuta';
import {
    getComConfig, applyShortcodes, buildIstruzioniPagamento,
    formatImporto, sendComunicazioneEmail,
} from '../utils/comunicazioniOrdini';

// Negozio dell'area soci: catalogo dei prodotti vendibili online della società,
// carrello e checkout con pagamento tramite bonifico.
//
// L'ordine nasce sempre come proforma lato backend: il socio non vede questa
// distinzione, per lui l'ordine è "da completare" finché non carica la ricevuta.
//
// Dopo la conferma il socio riceve sempre la comunicazione con le istruzioni di
// pagamento configurate sul conto, e può caricare la ricevuta subito oppure più
// tardi dalla sezione "I miei ordini".

const TIPO_LABELS = {
    generic: 'Prodotto',
    subscription: 'Abbonamento',
    quota_associativa: 'Quota associativa',
    tesseramento: 'Tesseramento',
};

const euro = (v) => `€ ${Number(v || 0).toFixed(2).replace('.', ',')}`;

const nomeSocio = (s) => {
    if (!s) return '';
    return s.tipo_socio === 'associazione'
        ? (s.ragione_sociale || '')
        : [s.nome, s.cognome].filter(Boolean).join(' ');
};

export default function SocioNegozio({ socio, societa, onOrdineCreato }) {
    const [catalogo, setCatalogo] = useState([]);
    const [conti, setConti] = useState([]);
    const [loading, setLoading] = useState(true);

    const [carrello, setCarrello] = useState({});  // { [productId]: qty }
    const [contoId, setContoId] = useState('');
    const [note, setNote] = useState('');

    const [inviando, setInviando] = useState(false);
    const [errore, setErrore] = useState('');
    // Esito della conferma: { ordine, istruzioni, tokenRicevuta, avvisoEmail }
    const [esito, setEsito] = useState(null);
    const [mostraUpload, setMostraUpload] = useState(false);

    useEffect(() => {
        let annullato = false;
        Promise.all([
            fetch('/payments/api/socio/catalogo').then(r => r.ok ? r.json() : []),
            fetch('/payments/api/socio/conti-bonifico').then(r => r.ok ? r.json() : []),
        ])
            .then(([prodotti, contiBonifico]) => {
                if (annullato) return;
                setCatalogo(Array.isArray(prodotti) ? prodotti : []);
                const lista = Array.isArray(contiBonifico) ? contiBonifico : [];
                setConti(lista);
                const preferito = lista.find(c => c.predefinito) || lista[0];
                if (preferito) setContoId(String(preferito.id));
            })
            .catch(() => { if (!annullato) { setCatalogo([]); setConti([]); } })
            .finally(() => { if (!annullato) setLoading(false); });
        return () => { annullato = true; };
    }, []);

    const righeCarrello = useMemo(
        () => Object.entries(carrello)
            .map(([id, qty]) => {
                const prodotto = catalogo.find(p => String(p.id) === String(id));
                if (!prodotto) return null;
                const prezzo = parseFloat(prodotto.basePrice || 0);
                return { prodotto, qty, totale: Math.round(prezzo * qty * 100) / 100 };
            })
            .filter(Boolean),
        [carrello, catalogo]
    );

    const totale = useMemo(
        () => Math.round(righeCarrello.reduce((s, r) => s + r.totale, 0) * 100) / 100,
        [righeCarrello]
    );

    const setQta = (productId, qty) => {
        setErrore('');
        setCarrello(prev => {
            const next = { ...prev };
            if (qty <= 0) delete next[productId];
            else next[productId] = Math.min(qty, 99);
            return next;
        });
    };

    // Conferma dell'ordine: creazione lato backend, poi comunicazione con le
    // istruzioni di pagamento e il link per il caricamento della ricevuta.
    const confermaOrdine = async () => {
        if (righeCarrello.length === 0) { setErrore('Il carrello è vuoto.'); return; }
        if (!contoId) { setErrore('Seleziona un metodo di pagamento.'); return; }
        setInviando(true);
        setErrore('');
        try {
            const res = await fetch('/payments/api/socio/ordini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: righeCarrello.map(r => ({ product_id: r.prodotto.id, qty: r.qty })),
                    conto_id: parseInt(contoId, 10),
                    note: note.trim() || undefined,
                }),
            });
            const dati = await res.json().catch(() => ({}));
            if (!res.ok) {
                setErrore(dati.error || 'Errore durante la creazione dell\'ordine.');
                return;
            }

            // Token per il caricamento della ricevuta: serve sia per il link nella
            // email sia per l'eventuale caricamento immediato in questa pagina.
            let tokenRicevuta = '';
            try {
                const tr = await fetch(`/payments/api/socio/ordini/${dati.id}/ricevuta-token`, { method: 'POST' });
                if (tr.ok) tokenRicevuta = (await tr.json()).token || '';
            } catch { /* il socio potrà comunque caricarla da "I miei ordini" */ }

            const conto = conti.find(c => String(c.id) === String(contoId));
            const istruzioni = buildIstruzioniPagamento(conti, conto?.descrizione, 'Bonifico');
            const avvisoEmail = await inviaIstruzioni(dati, istruzioni, tokenRicevuta);

            setEsito({ ordine: dati, istruzioni, tokenRicevuta, avvisoEmail });
            setCarrello({});
            setNote('');
            if (onOrdineCreato) onOrdineCreato();
        } catch {
            setErrore('Errore di rete durante la creazione dell\'ordine.');
        } finally {
            setInviando(false);
        }
    };

    // Comunicazione delle istruzioni di pagamento: per gli ordini creati dal
    // cliente è sempre inviata, indipendentemente da com_proforma_stato, perché
    // il socio non può restare senza IBAN e senza link per la ricevuta.
    const inviaIstruzioni = async (ordine, istruzioni, tokenRicevuta) => {
        const config = getComConfig(societa, 'proforma');
        const ctx = {
            nome: nomeSocio(socio),
            importo: formatImporto(ordine.importo),
            numeroOrdine: `#${ordine.id}`,
            numeroRicevuta: '',
            nomeAssociazione: societa?.denominazione || '',
            istruzioni,
            linkRicevuta: tokenRicevuta
                ? `${window.location.origin}/carica-ricevuta?token=${tokenRicevuta}`
                : '',
        };
        const esitoInvio = await sendComunicazioneEmail({
            socioId: socio?.id,
            oggetto: applyShortcodes(config.oggetto, ctx),
            testo: applyShortcodes(config.testo, ctx),
            ccnSocieta: config.ccn,
        });
        if (!esitoInvio.ok) return esitoInvio.error || 'Non è stato possibile inviare la email con le istruzioni di pagamento.';
        return esitoInvio.warning || '';
    };

    // ── Schermata di conferma ────────────────────────────────────────────
    if (esito) {
        return (
            <div className="sd-section-card">
                <div className="sd-section-body">
                    <div className="sd-ordine-esito">
                        <CheckCircle size={40} className="sd-ordine-esito-icon" />
                        <h2>Ordine registrato</h2>
                        <p className="sd-muted">
                            Ordine <strong>#{esito.ordine.id}</strong> per un totale di <strong>{euro(esito.ordine.importo)}</strong>.
                        </p>
                    </div>

                    {esito.avvisoEmail && (
                        <div className="sd-ordine-avviso">{esito.avvisoEmail}</div>
                    )}

                    {esito.istruzioni && (
                        <div className="sd-ordine-istruzioni">
                            <div className="sd-ordine-istruzioni-titolo">
                                <Landmark size={16} /> Istruzioni di pagamento
                            </div>
                            <div dangerouslySetInnerHTML={{ __html: esito.istruzioni }} />
                        </div>
                    )}

                    <div className="sd-ordine-esito-azioni">
                        {esito.tokenRicevuta && !mostraUpload && (
                            <button className="sd-btn sd-btn-primary" onClick={() => setMostraUpload(true)}>
                                <Upload size={16} /> Carica ora la ricevuta
                            </button>
                        )}
                        <button className="sd-btn sd-btn-ghost" onClick={() => { setEsito(null); setMostraUpload(false); }}>
                            <ArrowLeft size={16} /> Torna al negozio
                        </button>
                    </div>

                    {mostraUpload && esito.tokenRicevuta && (
                        <div className="sd-ordine-upload">
                            <UploadRicevuta
                                token={esito.tokenRicevuta}
                                mostraOrdine={false}
                                onUploaded={() => { if (onOrdineCreato) onOrdineCreato(); }}
                            />
                        </div>
                    )}

                    {!mostraUpload && (
                        <p className="sd-muted sd-ordine-nota">
                            Puoi caricare la ricevuta anche in un secondo momento dalla sezione «I miei ordini».
                        </p>
                    )}
                </div>
            </div>
        );
    }

    // ── Catalogo + carrello ──────────────────────────────────────────────
    return (
        <>
            <div className="sd-section-card">
                <div className="sd-section-header">
                    <div className="sd-section-title">
                        <span className="sd-section-icon"><Package size={20} /></span>
                        <h2>Prodotti disponibili</h2>
                        {catalogo.length > 0 && <span className="sd-count-badge">{catalogo.length}</span>}
                    </div>
                </div>
                <div className="sd-section-body">
                    {loading ? (
                        <div className="sd-loading"><div className="sd-spinner" /><span>Caricamento…</span></div>
                    ) : catalogo.length === 0 ? (
                        <div className="sd-empty">Nessun prodotto disponibile per l'acquisto online.</div>
                    ) : (
                        <div className="sd-prodotti-grid">
                            {catalogo.map(p => {
                                const qty = carrello[p.id] || 0;
                                return (
                                    <div key={p.id} className="sd-prodotto-card">
                                        <div className="sd-prodotto-tipo">{TIPO_LABELS[p.type] || 'Prodotto'}</div>
                                        <div className="sd-prodotto-nome">{p.description}</div>
                                        <div className="sd-prodotto-prezzo">{euro(p.basePrice)}</div>
                                        {qty === 0 ? (
                                            <button className="sd-btn sd-btn-primary sd-btn-block" onClick={() => setQta(p.id, 1)}>
                                                <Plus size={15} /> Aggiungi
                                            </button>
                                        ) : (
                                            <div className="sd-qty-control">
                                                <button className="sd-qty-btn" onClick={() => setQta(p.id, qty - 1)} aria-label="Riduci quantità">
                                                    <Minus size={14} />
                                                </button>
                                                <input
                                                    className="sd-qty-input"
                                                    type="number"
                                                    min="1"
                                                    max="99"
                                                    value={qty}
                                                    onChange={(e) => setQta(p.id, parseInt(e.target.value, 10) || 0)}
                                                />
                                                <button className="sd-qty-btn" onClick={() => setQta(p.id, qty + 1)} aria-label="Aumenta quantità">
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <div className="sd-section-card">
                <div className="sd-section-header">
                    <div className="sd-section-title">
                        <span className="sd-section-icon"><ShoppingCart size={20} /></span>
                        <h2>Carrello</h2>
                        {righeCarrello.length > 0 && <span className="sd-count-badge">{righeCarrello.length}</span>}
                    </div>
                </div>
                <div className="sd-section-body">
                    {righeCarrello.length === 0 ? (
                        <div className="sd-empty">Il carrello è vuoto. Aggiungi i prodotti che vuoi acquistare.</div>
                    ) : (
                        <>
                            <div className="sd-list">
                                {righeCarrello.map(r => (
                                    <div key={r.prodotto.id} className="sd-list-item">
                                        <div className="sd-list-item-main">
                                            <div className="sd-list-item-title">{r.prodotto.description}</div>
                                            <div className="sd-list-item-meta">
                                                {euro(r.prodotto.basePrice)} × {r.qty}
                                            </div>
                                        </div>
                                        <div className="sd-list-item-right">
                                            <span className="sd-amount">{euro(r.totale)}</span>
                                            <button
                                                className="sd-icon-btn sd-icon-btn-danger"
                                                onClick={() => setQta(r.prodotto.id, 0)}
                                                title="Rimuovi dal carrello"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="sd-carrello-totale">
                                <span>Totale</span>
                                <strong>{euro(totale)}</strong>
                            </div>

                            <div className="sd-checkout">
                                <label className="sd-field">
                                    <span className="sd-field-label">
                                        <Landmark size={14} /> Metodo di pagamento
                                    </span>
                                    {conti.length === 0 ? (
                                        <span className="sd-field-warning">
                                            Nessun conto bonifico configurato dall'associazione: non è possibile completare l'ordine.
                                        </span>
                                    ) : (
                                        <select
                                            className="sd-select"
                                            value={contoId}
                                            onChange={e => setContoId(e.target.value)}
                                        >
                                            {conti.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    Bonifico — {c.descrizione}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </label>

                                <label className="sd-field">
                                    <span className="sd-field-label"><FileText size={14} /> Note (facoltative)</span>
                                    <textarea
                                        className="sd-textarea"
                                        rows={2}
                                        value={note}
                                        maxLength={2000}
                                        onChange={e => setNote(e.target.value)}
                                        placeholder="Eventuali indicazioni per l'associazione"
                                    />
                                </label>

                                {errore && <div className="sd-field-error">{errore}</div>}

                                <button
                                    className="sd-btn sd-btn-primary sd-btn-block"
                                    disabled={inviando || conti.length === 0}
                                    onClick={confermaOrdine}
                                >
                                    {inviando ? 'Invio in corso…' : `Conferma ordine · ${euro(totale)}`}
                                </button>
                                <p className="sd-muted sd-checkout-nota">
                                    Riceverai via email le istruzioni per effettuare il bonifico.
                                    L'ordine si completa con il caricamento della ricevuta, subito o in un secondo momento.
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
