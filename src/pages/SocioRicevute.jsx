import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Receipt, Upload, CheckCircle, Clock, XCircle, X, CalendarDays,
} from 'lucide-react';
import UploadQuietanza from '../components/UploadQuietanza';

// "Le mie ricevute" dell'area soci.
//
// Il socio non vede la distinzione proforma / ricevuta registrata: per lui una
// ricevuta è "da completare" finché non ha caricato la quietanza del bonifico,
// e "completata" una volta caricata. La verifica e la registrazione restano
// compiti del backoffice e non producono alcun cambiamento visibile qui.
//
// Il caricamento riusa <UploadQuietanza/>, lo stesso componente della pagina
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
const descriviRighe = (ricevuta, prodottiById) => {
    const righe = Array.isArray(ricevuta.payment_items) ? ricevuta.payment_items : [];
    if (righe.length === 0) return [];
    return righe.map(r => {
        const nome = prodottiById[r.product_id]?.description || 'Prodotto';
        return r.qty > 1 ? `${nome} × ${r.qty}` : nome;
    });
};

const RicevutaCard = ({ ricevuta, prodottiById, stato, onCaricaQuietanza, caricamentoInCorso }) => {
    const righe = descriviRighe(ricevuta, prodottiById);
    return (
        <div className={`sd-ricevuta-card sd-ricevuta-card--${stato}`}>
            <div className="sd-ricevuta-card-top">
                <span className="sd-ricevuta-numero">Ricevuta #{ricevuta.id}</span>
                {stato === 'da_completare' && (
                    <span className="sd-ricevuta-badge sd-ricevuta-badge--attesa">
                        <Clock size={12} /> DA COMPLETARE
                    </span>
                )}
                {stato === 'completato' && (
                    <span className="sd-ricevuta-badge sd-ricevuta-badge--ok">
                        <CheckCircle size={12} /> COMPLETATA
                    </span>
                )}
                {stato === 'annullato' && (
                    <span className="sd-ricevuta-badge sd-ricevuta-badge--annullato">
                        <XCircle size={12} /> ANNULLATA
                    </span>
                )}
                <span className="sd-amount">{euro(ricevuta.importo)}</span>
            </div>

            <div className="sd-ricevuta-card-meta">
                <CalendarDays size={13} />
                <span>Del {formatData(ricevuta.createdAt || ricevuta.data_pagamento)}</span>
                {ricevuta.conto_destinazione && <span>· Bonifico su {ricevuta.conto_destinazione}</span>}
            </div>

            {righe.length > 0 && (
                <div className="sd-ricevuta-righe">
                    {righe.map((r, i) => <span key={i} className="sd-ricevuta-riga">{r}</span>)}
                </div>
            )}

            {ricevuta.note && <div className="sd-ricevuta-note">{ricevuta.note}</div>}

            {stato === 'completato' && (
                <div className="sd-ricevuta-quietanza">
                    <CheckCircle size={14} />
                    <span>
                        Quietanza <strong>{ricevuta.ricevuta_file_nome || 'caricata'}</strong>
                        {' · '}{formatDataOra(ricevuta.ricevuta_uploaded_at)}
                    </span>
                </div>
            )}

            {stato === 'da_completare' && (
                <div className="sd-ricevuta-card-azioni">
                    <button
                        className="sd-btn sd-btn-primary"
                        onClick={() => onCaricaQuietanza(ricevuta)}
                        disabled={caricamentoInCorso}
                    >
                        <Upload size={15} />
                        {caricamentoInCorso ? 'Apertura…' : 'Carica quietanza'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default function SocioRicevute({ socio, refreshKey = 0 }) {
    const [ricevute, setRicevute] = useState([]);
    const [prodottiById, setProdottiById] = useState({});
    const [loading, setLoading] = useState(true);

    // Modale di caricamento: { ricevuta, token } oppure { ricevuta, errore }
    const [uploadModal, setUploadModal] = useState(null);
    const [ricevutaInApertura, setRicevutaInApertura] = useState(null);

    const caricaRicevute = useCallback(() => {
        setLoading(true);
        fetch('/payments/api/socio/ordini')
            .then(r => r.ok ? r.json() : [])
            .then(data => setRicevute(Array.isArray(data) ? data : []))
            .catch(() => setRicevute([]))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { caricaRicevute(); }, [caricaRicevute, refreshKey]);

    // Catalogo per risolvere i nomi dei prodotti nelle righe della ricevuta.
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
        for (const o of ricevute) {
            if (!o.ricevuta_uploaded_at && !o.annullato) daCompletare.push(o);
            else conclusi.push(o);
        }
        return { daCompletare, conclusi };
    }, [ricevute]);

    // Il link pubblico di caricamento vale 3 giorni: ne generiamo uno nuovo al
    // momento del click, così una ricevuta vecchia resta sempre completabile.
    const apriCaricamento = async (ricevuta) => {
        setRicevutaInApertura(ricevuta.id);
        try {
            const res = await fetch(`/payments/api/socio/ordini/${ricevuta.id}/ricevuta-token`, { method: 'POST' });
            const dati = await res.json().catch(() => ({}));
            if (!res.ok || !dati.token) {
                setUploadModal({ ricevuta, errore: dati.error || 'Non è stato possibile aprire il caricamento della quietanza.' });
                return;
            }
            setUploadModal({ ricevuta, token: dati.token });
        } catch {
            setUploadModal({ ricevuta, errore: 'Errore di rete. Riprova più tardi.' });
        } finally {
            setRicevutaInApertura(null);
        }
    };

    const chiudiModal = () => {
        setUploadModal(null);
        caricaRicevute();
    };

    const renderLista = (lista, stato) => (
        <div className="sd-ricevute-list">
            {lista.map(o => (
                <RicevutaCard
                    key={o.id}
                    ricevuta={o}
                    prodottiById={prodottiById}
                    stato={stato === 'auto' ? (o.annullato ? 'annullato' : 'completato') : stato}
                    onCaricaQuietanza={apriCaricamento}
                    caricamentoInCorso={ricevutaInApertura === o.id}
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
                        <div className="sd-empty">Non hai ricevute in attesa della quietanza di pagamento.</div>
                    ) : (
                        <>
                            <p className="sd-muted sd-ricevute-nota">
                                Effettua il bonifico secondo le istruzioni ricevute via email, poi carica qui la quietanza per completare la ricevuta.
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
                        <div className="sd-empty">Nessuna ricevuta completata.</div>
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
                                <span>Quietanza ricevuta #{uploadModal.ricevuta.id}</span>
                            </div>
                            <button className="sd-modal-close" onClick={chiudiModal}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="sd-modal-body">
                            {uploadModal.errore ? (
                                <div className="sd-field-error">{uploadModal.errore}</div>
                            ) : (
                                <UploadQuietanza token={uploadModal.token} mostraRicevuta={false} />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
