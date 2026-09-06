import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Euro, Coins, CreditCard, Banknote, Landmark, Calendar, FileText, AlertTriangle } from 'lucide-react';
import './GeneraPagamentoModal.css';
import { useSocieta } from '../data/SocietaContext';
import { useAnno, getAnnoDateRange } from '../data/AnnoContext';
import { getRangeDataRicevuta, validaDataRicevuta, oggiStr } from '../utils/dataRicevutaUtils';
import { formatDateIT } from '../utils/dateUtils';

// Elenco storico, usato come ripiego quando il conto selezionato non ha
// modalità configurate in anagrafica (Configurazione → Conti).
const MODALITA_STORICHE = ['Contanti', 'POS', 'Assegno', 'Bonifico'];
const MODALITA_ICONS = { Contanti: Coins, POS: CreditCard, Assegno: Banknote, Bonifico: Landmark };

const GeneraRicevutaModal = ({
    isOpen,
    onClose,
    onConfirm,
    totale,
    socio,
    cart,
    subscriptionDates
}) => {
    const { selectedSocietaId, societaList } = useSocieta();
    const { annoOptions, formatAnnoLabel, currentRefYear } = useAnno();
    const selectedSocieta = useMemo(
        () => societaList?.find(s => s.id == selectedSocietaId) || null,
        [societaList, selectedSocietaId]
    );
    const [conti, setConti] = useState([]);

    const todayStr = oggiStr();
    const defaultDataRicevuta = todayStr.split('-').reverse().join('/'); // basic parse to DD/MM/YYYY is visually confusing with normal input date, better keep YYYY-MM-DD for input type date

    const [modalita, setModalita] = useState('Contanti');
    const [contoDestinazione, setContoDestinazione] = useState('CASSA');

    const [intestatario, setIntestatario] = useState('');
    const [emettiRicevuta, setEmettiRicevuta] = useState('SI');
    const [annoRicevuta, setAnnoRicevuta] = useState(null);
    const [dataRicevuta, setDataRicevuta] = useState(todayStr); // YYYY-MM-DD
    const [nextNumeroRicevuta, setNextNumeroRicevuta] = useState(null);
    // Data dell'ultima ricevuta dell'anno selezionato (stringa YYYY-MM-DD) restituita
    // dal backend; vuota se per quell'anno non esistono ancora ricevute.
    const [lastPaymentDate, setLastPaymentDate] = useState('');
    // Progressivo grezzo (intero) restituito dal backend: se === 1 significa che è
    // la prima ricevuta dell'anno per questa società.
    const [nextNumeroRaw, setNextNumeroRaw] = useState(null);
    // Modal per scegliere il numero di partenza alla prima ricevuta.
    const [showStartNumberModal, setShowStartNumberModal] = useState(false);
    const [startNumberInput, setStartNumberInput] = useState('1');

    const isFirstRicevuta = nextNumeroRaw === 1;
    // Suffisso "/2026" o "/2025-26" ricavato dal numero formattato, per l'anteprima.
    const numeroSuffix = nextNumeroRicevuta && nextNumeroRicevuta.includes('/')
        ? nextNumeroRicevuta.slice(nextNumeroRicevuta.indexOf('/'))
        : '';

    // Intervallo consentito per la data documento (regole condivise con la
    // conversione proforma → pagamento, vedi utils/dataRicevutaUtils).
    const rangeData = useMemo(
        () => getRangeDataRicevuta(annoRicevuta, selectedSocieta, lastPaymentDate),
        [annoRicevuta, selectedSocieta, lastPaymentDate]
    );
    const minDataRicevuta = rangeData.min;
    const maxDataRicevuta = rangeData.max;

    // Esito della validazione sulla data corrente: usato per l'avviso inline e
    // per bloccare la conferma.
    const esitoData = useMemo(
        () => validaDataRicevuta(dataRicevuta, rangeData),
        [dataRicevuta, rangeData]
    );

    const [codiceFiscale, setCodiceFiscale] = useState('');
    const [codiceFiscaleGenitore, setCodiceFiscaleGenitore] = useState('');
    const [partitaIva, setPartitaIva] = useState('');

    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    // Errore sulla data mostrato dopo un tentativo di conferma.
    const [dataError, setDataError] = useState('');

    // Al cambio dell'anno ricevuta posiziona la data documento sul default:
    // oggi per l'anno corrente, ultimo giorno dell'anno per gli anni passati.
    useEffect(() => {
        if (!isOpen || annoRicevuta == null) return;
        setDataRicevuta(maxDataRicevuta);
    }, [annoRicevuta]); // eslint-disable-line react-hooks/exhaustive-deps

    // Clamp difensivo: riporta la data dentro l'intervallo quando cambiano gli
    // estremi (es. cambio anno o arrivo di lastPaymentDate dal backend).
    // NB: non dipende da `dataRicevuta` di proposito — una data digitata a mano
    // fuori range non viene riscritta sotto le dita dell'utente, ma segnalata
    // dall'avviso inline e bloccata alla conferma.
    useEffect(() => {
        if (!isOpen) return;
        setDataRicevuta(prev => {
            if (!prev) return prev;
            if (prev > maxDataRicevuta) return maxDataRicevuta;
            if (minDataRicevuta && prev < minDataRicevuta) return minDataRicevuta;
            return prev;
        });
    }, [isOpen, maxDataRicevuta, minDataRicevuta]);

    useEffect(() => {
        if (isOpen) {
            if (socio) {
                setIntestatario(socio.tipo_socio === 'associazione' ? (socio.ragione_sociale || '') : `${socio.cognome} ${socio.nome}`);
                setCodiceFiscale(socio.codice_fiscale || '');
                setCodiceFiscaleGenitore(socio.cf_genitore || '');
                setPartitaIva(socio.partita_iva || '');
            } else {
                setIntestatario('');
                setCodiceFiscale('');
                setCodiceFiscaleGenitore('');
                setPartitaIva('');
            }
            setSubmitting(false);

            const fetchConti = async () => {
                if (!selectedSocietaId) return;
                try {
                    const token = localStorage.getItem('token');
                    const res = await fetch(`/payments/api/conti?societa_id=${selectedSocietaId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setConti(data);

                        // Default: conto con "Contanti" tra le modalità, altrimenti CASSA/il primo.
                        const defaultConto = data.find(c => (c.modalita_pagamento || []).includes('Contanti')) || data.find(c => c.descrizione === 'CASSA');
                        if (defaultConto) {
                            setContoDestinazione(defaultConto.descrizione);
                            setModalita(defaultConto.modalita_pagamento?.[0] || 'Contanti');
                        } else {
                            setContoDestinazione('CASSA');
                            setModalita('Contanti');
                        }
                    }
                } catch (e) {
                    console.error(e);
                }
            };
            fetchConti();

            // Reset other fields as well to defaults if needed
            setEmettiRicevuta('SI');
            // Alla riapertura la modal mostra sempre l'anno associativo corrente
            setAnnoRicevuta(currentRefYear);
            setDataRicevuta(todayStr);
            setNote('');
        }
    }, [isOpen, socio, todayStr, selectedSocietaId]);

    // Aggiorna N. ricevuta quando cambia l'anno ricevuta (o all'apertura della modal)
    useEffect(() => {
        if (!isOpen || !selectedSocietaId || annoRicevuta == null) return;
        let cancelled = false;
        const fetchNextNumero = async () => {
            setNextNumeroRicevuta(null);
            setNextNumeroRaw(null);
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(
                    `/payments/api/next-numero?societa_id=${selectedSocietaId}&anno=${annoRicevuta}`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );
                if (res.ok && !cancelled) {
                    const data = await res.json();
                    setNextNumeroRicevuta(data.formatted);
                    setNextNumeroRaw(data.nextNumero ?? null);
                    setLastPaymentDate(data.lastPaymentDate || '');
                }
            } catch (e) {
                console.error(e);
                if (!cancelled) setNextNumeroRicevuta(null);
            }
        };
        fetchNextNumero();
        return () => { cancelled = true; };
    }, [isOpen, annoRicevuta, selectedSocietaId]);

    // Il conto guida la scelta della modalità: cambiando conto, i pulsanti
    // modalità si ricaricano con le modalità associate al conto selezionato
    // (se il conto non ne ha nessuna configurata, restano le modalità
    // "storiche" per non bloccare l'operatore).
    const handleContoChange = (descrizione) => {
        setContoDestinazione(descrizione);
        const conto = conti.find(c => c.descrizione === descrizione);
        const modalitaDelConto = conto?.modalita_pagamento;
        if (modalitaDelConto && modalitaDelConto.length > 0 && !modalitaDelConto.includes(modalita)) {
            setModalita(modalitaDelConto[0]);
        }
    };

    if (!isOpen) return null;

    const contoSelezionato = conti.find(c => c.descrizione === contoDestinazione);
    const modalitaOptions = (contoSelezionato?.modalita_pagamento?.length > 0)
        ? contoSelezionato.modalita_pagamento
        : MODALITA_STORICHE;

    const annoDiverso = annoRicevuta != null && annoRicevuta !== currentRefYear;

    const hasSubscription = cart.some(i => i.type === 'subscription');

    const handleConfirm = (tipoDocumento = 'pagamento', progressivoIniziale = null) => {
        if (submitting) return;

        // La data documento deve stare nell'intervallo consentito: gli attributi
        // min/max dell'input sono solo indicativi e non impediscono di digitare
        // un valore fuori range.
        if (!esitoData.ok) {
            setDataError(esitoData.error);
            return;
        }
        setDataError('');

        // Prima ricevuta dell'anno: chiedi da quale numero far partire la numerazione
        // (solo per i pagamenti con ricevuta, non per le proforma).
        if (
            tipoDocumento === 'pagamento' &&
            emettiRicevuta === 'SI' &&
            isFirstRicevuta &&
            progressivoIniziale == null
        ) {
            setStartNumberInput(String(nextNumeroRaw || 1));
            setShowStartNumberModal(true);
            return;
        }

        setSubmitting(true);
        const periodoStr = (hasSubscription && subscriptionDates)
            ? ` [${formatDateIT(subscriptionDates.dataInizio)} - ${formatDateIT(subscriptionDates.dataFine)}]`
            : '';

        const getScadenzaTesseramentoStr = (periodicity) => {
            if (!periodicity || !dataRicevuta) return '';
            const d = new Date(dataRicevuta);
            if (periodicity === 'anno_solare') {
                const scad = new Date(d);
                scad.setFullYear(scad.getFullYear() + 1);
                scad.setDate(scad.getDate() - 1);
                return formatDateIT(scad);
            }
            if (periodicity === 'anno_associativo') {
                const tipo = selectedSocieta?.tipo_anno_associativo || 'solare';
                let anno = d.getFullYear();
                const m = d.getMonth() + 1;
                const day = d.getDate();
                if (tipo === 'associativo') {
                    if (m < 9) anno = d.getFullYear() - 1;
                } else if (tipo === 'personalizzato' && selectedSocieta?.data_inizio_anno_associativo) {
                    const parts = selectedSocieta.data_inizio_anno_associativo.split('-');
                    const cDay = parseInt(parts[0], 10);
                    const cMonth = parseInt(parts[1], 10);
                    if (m < cMonth || (m === cMonth && day < cDay)) anno = d.getFullYear() - 1;
                }
                const { end } = getAnnoDateRange(anno, selectedSocieta);
                return formatDateIT(end);
            }
            return '';
        };

        const items = cart.map(i => {
            let suffix = '';
            if (i.type === 'subscription') suffix = periodoStr;
            else if (i.type === 'tesseramento') {
                const scad = getScadenzaTesseramentoStr(i.periodicity);
                if (scad) suffix = ` (Scadenza ${scad})`;
            }
            const effectivePrice = parseFloat((i.unitPriceStr || '0').replace(',', '.')) || parseFloat(i.basePrice || 0);
            return {
                product_id: i.id,
                importo: effectivePrice * i.qty,
                quote: `${i.description || i.name} (x${i.qty}) €${(effectivePrice * i.qty).toFixed(2).replace('.', ',')}${suffix}`,
                quote_types: i.type || '',
                periodicity_tesseramento: i.type === 'tesseramento' ? (i.periodicity || null) : null,
                data_inizio_abbonamento: i.type === 'subscription' ? (subscriptionDates?.dataInizio || null) : null,
                data_scadenza_abbonamento: i.type === 'subscription' ? (subscriptionDates?.dataFine || null) : null,
            };
        });

        const payload = {
            items,
            modalita_pagamento: modalita,
            conto_destinazione: contoDestinazione,
            intestatario: intestatario,
            data_pagamento: dataRicevuta,
            data_ricevuta: dataRicevuta,
            codice_fiscale: codiceFiscale,
            codice_fiscale_genitore: codiceFiscaleGenitore,
            partita_iva: partitaIva,
            note: note,
            emetti_ricevuta: tipoDocumento === 'proforma' ? 'NO' : emettiRicevuta,
            anno_ricevuta: tipoDocumento === 'proforma' ? null : annoRicevuta,
            progressivo_iniziale: tipoDocumento === 'proforma' ? null : progressivoIniziale,
            socio_id: socio?.id || null,
            tipo_documento: tipoDocumento,
        };
        onConfirm(payload);
    };

    // Conferma del numero di partenza scelto nella modal della prima ricevuta.
    const handleStartNumberConfirm = () => {
        const n = parseInt(startNumberInput, 10);
        if (isNaN(n) || n < 1) return;
        setShowStartNumberModal(false);
        handleConfirm('pagamento', n);
    };

    return (
        <>
        <div className="gpm-overlay">
            <div className="gpm-modal">
                <div className="gpm-header">
                    <div className="gpm-title">
                        <Euro size={20} strokeWidth={2}/> Nuova Ricevuta
                    </div>
                    <button className="gpm-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <div className="gpm-body">

                    {annoDiverso && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            marginBottom: '16px', padding: '12px 16px',
                            background: '#fef3c7', border: '1px solid #f59e0b',
                            borderRadius: '8px', color: '#7c2d12', fontSize: '0.9rem',
                        }}>
                            <AlertTriangle size={20} strokeWidth={2.2} style={{ flexShrink: 0 }} />
                            <span>
                                Attenzione: stai creando una ricevuta per l'anno associativo <strong>{formatAnnoLabel(annoRicevuta)}</strong>,
                                diverso da quello corrente (<strong>{formatAnnoLabel(currentRefYear)}</strong>).
                            </span>
                        </div>
                    )}

                    <div className="gpm-top-section">
                        <div className="gpm-field-group">
                            <label>Totale</label>
                            <div className="gpm-totale-box">
                                € {parseFloat(totale).toFixed(2).replace('.', ',')}
                            </div>
                        </div>

                        <div className="gpm-field-group">
                            <label>Conto di destinazione</label>
                            <select
                                className="gpm-select"
                                value={contoDestinazione}
                                onChange={(e) => handleContoChange(e.target.value)}
                            >
                                {conti.length > 0 ? (
                                    conti.map(c => <option key={c.id} value={c.descrizione}>{c.descrizione}</option>)
                                ) : (
                                    <>
                                        <option value="CASSA">CASSA</option>
                                        <option value="BANCA">BANCA</option>
                                    </>
                                )}
                            </select>
                        </div>

                        <div className="gpm-field-group" style={{ flex: 2 }}>
                            <label>Modalità di pagamento</label>
                            <div className="gpm-payment-methods">
                                {modalitaOptions.map(m => {
                                    const Icon = MODALITA_ICONS[m] || Coins;
                                    return (
                                        <button key={m} type="button" className={`gpm-method-btn ${modalita === m ? 'active' : ''}`} onClick={() => setModalita(m)}>
                                            <Icon size={16}/> {m}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="gpm-divider"></div>

                    <div className="gpm-row-4" style={{ marginTop: '20px' }}>
                        <div className="gpm-field-group">
                            <label>Emetti ricevuta</label>
                            <select className="gpm-select" value={emettiRicevuta} onChange={(e) => setEmettiRicevuta(e.target.value)}>
                                <option value="SI">SI</option>
                                <option value="NO">NO</option>
                            </select>
                        </div>
                        <div className="gpm-field-group">
                            <label>Anno ricevuta</label>
                            <select
                                className="gpm-select"
                                style={annoDiverso ? { borderColor: '#f59e0b', boxShadow: '0 0 0 2px rgba(245,158,11,0.4)', fontWeight: 700 } : undefined}
                                value={annoRicevuta ?? ''}
                                onChange={(e) => setAnnoRicevuta(parseInt(e.target.value, 10))}
                            >
                                {annoOptions.map(anno => (
                                    <option key={anno} value={anno}>{formatAnnoLabel(anno)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="gpm-field-group" style={{ flex: 2 }}>
                            <label>N. ricevuta</label>
                            <div className="gpm-input" style={{ color: nextNumeroRicevuta ? 'var(--text-primary)' : '#aaa', fontStyle: nextNumeroRicevuta ? 'normal' : 'italic', fontWeight: nextNumeroRicevuta ? '600' : 'normal', display: 'flex', alignItems: 'center', background: 'var(--surface-1)', cursor: 'default' }}>
                                {nextNumeroRicevuta || 'Calcolo in corso…'}
                            </div>
                        </div>
                        <div className="gpm-field-group">
                            <label>Data documento</label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="date"
                                    className="gpm-input"
                                    value={dataRicevuta}
                                    min={minDataRicevuta || undefined}
                                    max={maxDataRicevuta}
                                    style={{ width: '100%', paddingRight: '35px' }}
                                    onChange={(e) => { setDataRicevuta(e.target.value); setDataError(''); }}
                                />
                                <Calendar
                                    size={18}
                                    style={{ position: 'absolute', right: '10px', color: 'var(--text-secondary)', cursor: 'pointer', zIndex: 5 }}
                                    onClick={(e) => e.currentTarget.previousElementSibling.showPicker?.()}
                                />
                            </div>
                            {(dataError || !esitoData.ok) && (
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px', marginTop: '5px', fontSize: '0.78rem', color: 'var(--danger)', lineHeight: 1.35 }}>
                                    <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: '1px' }} />
                                    <span>{dataError || esitoData.error}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="gpm-row-3">
                        <div className="gpm-field-group">
                            <label>Codice fiscale intestatario</label>
                            <input
                                type="text"
                                className="gpm-input"
                                value={codiceFiscale}
                                onChange={(e) => setCodiceFiscale(e.target.value.toUpperCase())}
                            />
                        </div>
                        <div className="gpm-field-group">
                            <label>Codice fiscale genitore</label>
                            <input
                                type="text"
                                className="gpm-input"
                                value={codiceFiscaleGenitore}
                                onChange={(e) => setCodiceFiscaleGenitore(e.target.value.toUpperCase())}
                            />
                        </div>
                        <div className="gpm-field-group">
                            <label>Partita IVA</label>
                            <input
                                type="text"
                                className="gpm-input"
                                value={partitaIva}
                                onChange={(e) => setPartitaIva(e.target.value)}
                            />
                        </div>
                    </div>

                    {hasSubscription && subscriptionDates && (
                        <div className="gpm-field-group full-width" style={{ marginTop: '15px', background: 'var(--info-container)', border: '1px solid var(--info-container)', borderRadius: '8px', padding: '12px 16px' }}>
                            <label style={{ color: 'var(--primary-hover)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Calendar size={15} /> Periodo abbonamento
                            </label>
                            <div style={{ display: 'flex', gap: '32px', marginTop: '6px', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                                <span><strong>Inizio:</strong> {formatDateIT(subscriptionDates.dataInizio)}</span>
                                <span><strong>Scadenza:</strong> {formatDateIT(subscriptionDates.dataFine)}</span>
                            </div>
                        </div>
                    )}

                    <div className="gpm-field-group full-width" style={{ marginTop: '15px' }}>
                        <label>Note</label>
                        <textarea
                            className="gpm-textarea"
                            rows={3}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </div>

                </div>
                <div className="gpm-footer">
                    <button className="gpm-submit-btn gpm-submit-btn--proforma" onClick={() => handleConfirm('proforma')} disabled={submitting || !esitoData.ok} title={!esitoData.ok ? esitoData.error : undefined}>
                        <FileText size={18} strokeWidth={2}/> {submitting ? 'Elaborazione...' : 'Salva come Proforma'}
                    </button>
                    <button className="gpm-submit-btn" onClick={() => handleConfirm('pagamento')} disabled={submitting || !esitoData.ok} title={!esitoData.ok ? esitoData.error : undefined}>
                        <Check size={18} strokeWidth={2}/> {submitting ? 'Elaborazione...' : 'Registra Pagamento'}
                    </button>
                </div>
            </div>
        </div>

        {showStartNumberModal && (
            <div className="gpm-overlay" style={{ zIndex: 1100 }}>
                <div className="gpm-modal" style={{ width: '440px' }}>
                    <div className="gpm-header">
                        <div className="gpm-title">
                            <FileText size={20} strokeWidth={2}/> Numero di partenza
                        </div>
                        <button className="gpm-close-btn" onClick={() => setShowStartNumberModal(false)}>
                            <X size={20} />
                        </button>
                    </div>
                    <div className="gpm-body">
                        <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.5 }}>
                            Questa è la <strong>prima ricevuta</strong> di questa società per l'anno selezionato.
                            Scegli da quale numero far partire la numerazione (ad esempio se prosegui una
                            numerazione già iniziata altrove).
                        </p>
                        <div className="gpm-field-group">
                            <label>Numero di partenza</label>
                            <input
                                type="number"
                                min="1"
                                className="gpm-input"
                                value={startNumberInput}
                                autoFocus
                                onChange={(e) => setStartNumberInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleStartNumberConfirm(); }}
                            />
                        </div>
                        <div style={{ marginTop: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Numero ricevuta:{' '}
                            <strong style={{ color: 'var(--text-primary)' }}>
                                {(() => {
                                    const n = parseInt(startNumberInput, 10);
                                    return (!isNaN(n) && n >= 1 ? n : '—') + numeroSuffix;
                                })()}
                            </strong>
                        </div>
                    </div>
                    <div className="gpm-footer">
                        <button className="gpm-submit-btn gpm-submit-btn--proforma" onClick={() => setShowStartNumberModal(false)}>
                            Annulla
                        </button>
                        <button
                            className="gpm-submit-btn"
                            onClick={handleStartNumberConfirm}
                            disabled={(() => { const n = parseInt(startNumberInput, 10); return isNaN(n) || n < 1; })()}
                        >
                            <Check size={18} strokeWidth={2}/> Conferma
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
};

export default GeneraRicevutaModal;
