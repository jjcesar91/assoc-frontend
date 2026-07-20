import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Receipt, Upload, CheckCircle, Clock, XCircle, X, CalendarDays,
} from 'lucide-react';
import UploadRicevuta from '../components/UploadRicevuta';

// "I miei ordini" dell'area soci.
//
// Il socio non vede la distinzione proforma / ordine registrato: per lui un ordine
// è "da completare" finché non ha caricato la ricevuta del bonifico, e "completato"
// una volta caricata. La verifica e la registrazione restano compiti del backoffice
// e non producono alcun cambiamento visibile qui.
//
// Il caricamento riusa <UploadRicevuta/>, lo stesso componente della pagina
// pubblica raggiunta dal link inviato via email.

const euro = (v) => `€ ${Number(v || 0).toFixed(2).replace('.', ',')}`;

const formatDataOra = (dt) => {
    if (!dt) return '—';
    try {
        return new Date(dt).toLocaleString('it-IT', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    } catch { return String(dt); }
};

const formatData = (dt) => {
    if (!dt) return '—';
    try { return new Date(dt).toLocaleDateString('it-IT'); } catch { return String(dt); }
};

// Descrizione delle righe: il backend non persiste il nome prodotto nelle righe,
// va risolto dal catalogo tramite product_id (come fa il backoffice).
const descriviRighe = (ordine, prodottiById) => {
    const righe = Array.isArray(ordine.payment_items) ? ordine.payment_items : [];
    if (righe.length === 0) return [];
    return righe.map(r => {
        const nome = prodottiById[r.product_id]?.description || 'Prodotto';
        return r.qty > 1 ? `${nome} × ${r.qty}` : nome;
    });
};

const OrdineCard = ({ ordine, prodottiById, stato, onCaricaRicevuta, caricamentoInCorso }) => {
    const righe = descriviRighe(ordine, prodottiById);
    return (
        <div className={`sd-ordine-card sd-ordine-card--${stato}`}>
            <div className="sd-ordine-card-top">
                <span className="sd-ordine-numero">Ordine #{ordine.id}</span>
                {stato === 'da_completare' && (
                    <span className="sd-ordine-badge sd-ordine-badge--attesa">
                        <Clock size={12} /> DA COMPLETARE
                    </span>
                )}
                {stato === 'completato' && (
                    <span className="sd-ordine-badge sd-ordine-badge--ok">
                        <CheckCircle size={12} /> COMPLETATO
                    </span>
                )}
                {stato === 'annullato' && (
                    <span className="sd-ordine-badge sd-ordine-badge--annullato">
                        <XCircle size={12} /> ANNULLATO
                    </span>
                )}
                <span className="sd-amount">{euro(ordine.importo)}</span>
            </div>

            <div className="sd-ordine-card-meta">
                <CalendarDays size={13} />
                <span>Del {formatData(ordine.createdAt || ordine.data_pagamento)}</span>
                {ordine.conto_destinazione && <span>· Bonifico su {ordine.conto_destinazione}</span>}
            </div>

            {righe.length > 0 && (
                <div className="sd-ordine-righe">
                    {righe.map((r, i) => <span key={i} className="sd-ordine-riga">{r}</span>)}
                </div>
            )}

            {ordine.note && <div className="sd-ordine-note">{ordine.note}</div>}

            {stato === 'completato' && (
                <div className="sd-ordine-ricevuta">
                    <CheckCircle size={14} />
                    <span>
                        Ricevuta <strong>{ordine.ricevuta_file_nome || 'caricata'}</strong>
                        {' · '}{formatDataOra(ordine.ricevuta_uploaded_at)}
                    </span>
                </div>
            )}

            {stato === 'da_completare' && (
                <div className="sd-ordine-card-azioni">
                    <button
                        className="sd-btn sd-btn-primary"
                        onClick={() => onCaricaRicevuta(ordine)}
                        disabled={caricamentoInCorso}
                    >
                        <Upload size={15} />
                        {caricamentoInCorso ? 'Apertura…' : 'Carica ricevuta'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default function SocioOrdini({ socio, refreshKey = 0 }) {
    const [ordini, setOrdini] = useState([]);
    const [prodottiById, setProdottiById] = useState({});
    const [loading, setLoading] = useState(true);

    // Modale di caricamento: { ordine, token } oppure { ordine, errore }
    const [uploadModal, setUploadModal] = useState(null);
    const [ordineInApertura, setOrdineInApertura] = useState(null);

    const caricaOrdini = useCallback(() => {
        setLoading(true);
        fetch('/payments/api/socio/ordini')
            .then(r => r.ok ? r.json() : [])
            .then(data => setOrdini(Array.isArray(data) ? data : []))
            .catch(() => setOrdini([]))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { caricaOrdini(); }, [caricaOrdini, refreshKey]);

    // Catalogo per risolvere i nomi dei prodotti nelle righe d'ordine.
    useEffect(() => {
        if (!socio?.societa_id) return;
        fetch(`/products/api?societaId=${socio.societa_id}`)
            .then(r => r.ok ? r.json() : [])
            .then(list => {
                const mappa = {};
                (Array.isArray(list) ? list : []).forEach(p => { mappa[p.id] = p; });
                setProdottiById(mappa);
            })
            .catch(() => {});
    }, [socio?.societa_id]);

    const { daCompletare, conclusi } = useMemo(() => {
        const daCompletare = [];
        const conclusi = [];
        for (const o of ordini) {
            if (!o.ricevuta_uploaded_at && !o.annullato) daCompletare.push(o);
            else conclusi.push(o);
        }
        return { daCompletare, conclusi };
    }, [ordini]);

    // Il link pubblico di caricamento vale 3 giorni: ne generiamo uno nuovo al
    // momento del click, così un ordine vecchio resta sempre completabile.
    const apriCaricamento = async (ordine) => {
        setOrdineInApertura(ordine.id);
        try {
            const res = await fetch(`/payments/api/socio/ordini/${ordine.id}/ricevuta-token`, { method: 'POST' });
            const dati = await res.json().catch(() => ({}));
            if (!res.ok || !dati.token) {
                setUploadModal({ ordine, errore: dati.error || 'Non è stato possibile aprire il caricamento della ricevuta.' });
                return;
            }
            setUploadModal({ ordine, token: dati.token });
        } catch {
            setUploadModal({ ordine, errore: 'Errore di rete. Riprova più tardi.' });
        } finally {
            setOrdineInApertura(null);
        }
    };

    const chiudiModal = () => {
        setUploadModal(null);
        caricaOrdini();
    };

    const renderLista = (lista, stato) => (
        <div className="sd-ordini-list">
            {lista.map(o => (
                <OrdineCard
                    key={o.id}
                    ordine={o}
                    prodottiById={prodottiById}
                    stato={stato === 'auto' ? (o.annullato ? 'annullato' : 'completato') : stato}
                    onCaricaRicevuta={apriCaricamento}
                    caricamentoInCorso={ordineInApertura === o.id}
                />
            ))}
        </div>
    );

    return (
        <>
            <div className="sd-section-card">
                <div className="sd-section-header">
                    <div className="sd-section-title">
                        <span className="sd-section-icon"><Clock size={20} /></span>
                        <h2>Da completare</h2>
                        {daCompletare.length > 0 && <span className="sd-count-badge">{daCompletare.length}</span>}
                    </div>
                </div>
                <div className="sd-section-body">
                    {loading ? (
                        <div className="sd-loading"><div className="sd-spinner" /><span>Caricamento…</span></div>
                    ) : daCompletare.length === 0 ? (
                        <div className="sd-empty">Non hai ordini in attesa della ricevuta di pagamento.</div>
                    ) : (
                        <>
                            <p className="sd-muted sd-ordini-nota">
                                Effettua il bonifico secondo le istruzioni ricevute via email, poi carica qui la ricevuta per completare l'ordine.
                            </p>
                            {renderLista(daCompletare, 'da_completare')}
                        </>
                    )}
                </div>
            </div>

            <div className="sd-section-card">
                <div className="sd-section-header">
                    <div className="sd-section-title">
                        <span className="sd-section-icon"><Receipt size={20} /></span>
                        <h2>Completati</h2>
                        {conclusi.length > 0 && <span className="sd-count-badge">{conclusi.length}</span>}
                    </div>
                </div>
                <div className="sd-section-body">
                    {loading ? (
                        <div className="sd-loading"><div className="sd-spinner" /><span>Caricamento…</span></div>
                    ) : conclusi.length === 0 ? (
                        <div className="sd-empty">Nessun ordine completato.</div>
                    ) : (
                        renderLista(conclusi, 'auto')
                    )}
                </div>
            </div>

            {uploadModal && (
                <div className="sd-modal-overlay" onClick={chiudiModal}>
                    <div className="sd-modal" onClick={e => e.stopPropagation()}>
                        <div className="sd-modal-header">
                            <div className="sd-modal-title">
                                <span className="sd-modal-type-icon"><Upload size={16} /></span>
                                <span>Ricevuta ordine #{uploadModal.ordine.id}</span>
                            </div>
                            <button className="sd-modal-close" onClick={chiudiModal}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="sd-modal-body">
                            {uploadModal.errore ? (
                                <div className="sd-field-error">{uploadModal.errore}</div>
                            ) : (
                                <UploadRicevuta token={uploadModal.token} mostraOrdine={false} />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
