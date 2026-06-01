import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Euro, Coins, CreditCard, Banknote, Landmark, Calendar } from 'lucide-react';
import './GeneraPagamentoModal.css';
import { useSocieta } from '../data/SocietaContext';
import { useAnno, getAnnoDateRange } from '../data/AnnoContext';

const GeneraPagamentoModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    totale, 
    socio, 
    cart,
    subscriptionDates
}) => {
    const { selectedSocietaId, societaList } = useSocieta();
    const { annoOptions, formatAnnoLabel, selectedAnno } = useAnno();
    const selectedSocieta = useMemo(
        () => societaList?.find(s => s.id == selectedSocietaId) || null,
        [societaList, selectedSocietaId]
    );
    const [conti, setConti] = useState([]);
    
    const todayStr = new Date().toISOString().split('T')[0];
    const defaultDataRicevuta = todayStr.split('-').reverse().join('/'); // basic parse to DD/MM/YYYY is visually confusing with normal input date, better keep YYYY-MM-DD for input type date

    const [modalita, setModalita] = useState('Contanti');
    const [contoDestinazione, setContoDestinazione] = useState('CASSA');
    
    const [intestatario, setIntestatario] = useState('');
    const [emettiRicevuta, setEmettiRicevuta] = useState('SI');
    const [annoRicevuta, setAnnoRicevuta] = useState(null);
    const [dataRicevuta, setDataRicevuta] = useState(todayStr); // YYYY-MM-DD
    const [nextNumeroRicevuta, setNextNumeroRicevuta] = useState(null);
    const [minDataRicevuta, setMinDataRicevuta] = useState('');

    const maxDataRicevuta = useMemo(() => {
        if (!annoRicevuta) return todayStr;
        const { end } = getAnnoDateRange(annoRicevuta, selectedSocieta);
        const endStr = end.toISOString().split('T')[0];
        return endStr < todayStr ? endStr : todayStr;
    }, [annoRicevuta, selectedSocieta, todayStr]);
    
    const [codiceFiscale, setCodiceFiscale] = useState('');
    const [codiceFiscaleGenitore, setCodiceFiscaleGenitore] = useState('');
    const [partitaIva, setPartitaIva] = useState('');
    
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Clamp dataRicevuta quando il massimo cambia (es. cambio anno ricevuta)
    useEffect(() => {
        if (dataRicevuta > maxDataRicevuta) {
            setDataRicevuta(maxDataRicevuta);
        }
    }, [maxDataRicevuta]); // eslint-disable-line react-hooks/exhaustive-deps

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
                        
                        // Default
                        const associati = data.filter(c => c.modalita_pagamento === 'Contanti');
                        if (associati.length > 0) {
                            setContoDestinazione(associati[0].descrizione);
                        } else {
                            setContoDestinazione('CASSA');
                        }
                    }
                } catch (e) {
                    console.error(e);
                }
            };
            fetchConti();

            // Reset other fields as well to defaults if needed
            setModalita('Contanti');
            setEmettiRicevuta('SI');
            setAnnoRicevuta(selectedAnno);
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
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(
                    `/payments/api/next-numero?societa_id=${selectedSocietaId}&anno=${annoRicevuta}`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );
                if (res.ok && !cancelled) {
                    const data = await res.json();
                    setNextNumeroRicevuta(data.formatted);
                    setMinDataRicevuta(data.lastPaymentDate || '');
                }
            } catch (e) {
                console.error(e);
                if (!cancelled) setNextNumeroRicevuta(null);
            }
        };
        fetchNextNumero();
        return () => { cancelled = true; };
    }, [isOpen, annoRicevuta, selectedSocietaId]);

    const handleModalitaChange = (newModalita) => {
        setModalita(newModalita);
        const associati = conti.filter(c => c.modalita_pagamento === newModalita);
        if (associati.length > 0) {
            setContoDestinazione(associati[0].descrizione);
        }
    };

    if (!isOpen) return null;

    const hasSubscription = cart.some(i => i.type === 'subscription');

    const formatDateIT = (dateStr) => {
        if (!dateStr) return '';
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    };

    const handleConfirm = () => {
        if (submitting) return;
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
                return scad.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
                return end.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
            emetti_ricevuta: emettiRicevuta,
            anno_ricevuta: annoRicevuta,
            socio_id: socio?.id || null,
        };
        onConfirm(payload);
    };

    return (
        <div className="gpm-overlay">
            <div className="gpm-modal">
                <div className="gpm-header">
                    <div className="gpm-title">
                        <Euro size={20} strokeWidth={2}/> Conferma
                    </div>
                    <button className="gpm-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <div className="gpm-body">
                    
                    <div className="gpm-top-section">
                        <div className="gpm-field-group">
                            <label>Totale</label>
                            <div className="gpm-totale-box">
                                € {parseFloat(totale).toFixed(2).replace('.', ',')}
                            </div>
                        </div>

                        <div className="gpm-field-group" style={{ flex: 2 }}>
                            <label>Modalità di pagamento</label>
                            <div className="gpm-payment-methods">
                                <button className={`gpm-method-btn ${modalita === 'Contanti' ? 'active' : ''}`} onClick={() => handleModalitaChange('Contanti')}>
                                    <Coins size={16}/> Contanti
                                </button>
                                <button className={`gpm-method-btn ${modalita === 'POS' ? 'active' : ''}`} onClick={() => handleModalitaChange('POS')}>
                                    <CreditCard size={16}/> POS
                                </button>
                                <button className={`gpm-method-btn ${modalita === 'Assegno' ? 'active' : ''}`} onClick={() => handleModalitaChange('Assegno')}>
                                    <Banknote size={16}/> Assegno
                                </button>
                                <button className={`gpm-method-btn ${modalita === 'Bonifico' ? 'active' : ''}`} onClick={() => handleModalitaChange('Bonifico')}>
                                    <Landmark size={16}/> Bonifico
                                </button>
                            </div>
                        </div>

                        <div className="gpm-field-group">
                            <label>Conto di destinazione</label>
                            <select 
                                className="gpm-select" 
                                value={contoDestinazione} 
                                onChange={(e) => setContoDestinazione(e.target.value)}
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
                            <select className="gpm-select" value={annoRicevuta ?? ''} onChange={(e) => setAnnoRicevuta(parseInt(e.target.value, 10))}>
                                {annoOptions.map(anno => (
                                    <option key={anno} value={anno}>{formatAnnoLabel(anno)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="gpm-field-group" style={{ flex: 2 }}>
                            <label>N. ricevuta</label>
                            <div className="gpm-input" style={{ color: nextNumeroRicevuta ? '#1a1a2e' : '#aaa', fontStyle: nextNumeroRicevuta ? 'normal' : 'italic', fontWeight: nextNumeroRicevuta ? '600' : 'normal', display: 'flex', alignItems: 'center', background: '#f5f5f5', cursor: 'default' }}>
                                {nextNumeroRicevuta || 'Calcolo in corso…'}
                            </div>
                        </div>
                        <div className="gpm-field-group">
                            <label>Data ricevuta</label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input 
                                    type="date" 
                                    className="gpm-input" 
                                    value={dataRicevuta} 
                                    min={minDataRicevuta || undefined}
                                    max={maxDataRicevuta}
                                    style={{ width: '100%', paddingRight: '35px' }}
                                    onChange={(e) => setDataRicevuta(e.target.value)}
                                />
                                <Calendar 
                                    size={18} 
                                    style={{ position: 'absolute', right: '10px', color: '#6b7280', cursor: 'pointer', zIndex: 5 }} 
                                    onClick={(e) => e.currentTarget.previousElementSibling.showPicker?.()}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="gpm-row-3">
                        <div className="gpm-field-group">
                            <label>Codice fiscale intestatario</label>
                            <input 
                                type="text" 
                                className="gpm-input" 
                                value={codiceFiscale} 
                                onChange={(e) => setCodiceFiscale(e.target.value)}
                            />
                        </div>
                        <div className="gpm-field-group">
                            <label>Codice fiscale genitore</label>
                            <input 
                                type="text" 
                                className="gpm-input" 
                                value={codiceFiscaleGenitore} 
                                onChange={(e) => setCodiceFiscaleGenitore(e.target.value)}
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
                        <div className="gpm-field-group full-width" style={{ marginTop: '15px', background: '#f0f7ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px 16px' }}>
                            <label style={{ color: '#1d4ed8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Calendar size={15} /> Periodo abbonamento
                            </label>
                            <div style={{ display: 'flex', gap: '32px', marginTop: '6px', fontSize: '0.95rem', color: '#1e3a5f' }}>
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
                    <button className="gpm-submit-btn" onClick={handleConfirm} disabled={submitting}>
                        <Check size={18} strokeWidth={2}/> {submitting ? 'Elaborazione...' : 'Genera pagamento'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GeneraPagamentoModal;