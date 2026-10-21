import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Trash2 } from 'lucide-react';
import { useSocieta } from '../data/SocietaContext';
import './ProdottoModal.css';
import RateScadenzarioModal from './RateScadenzarioModal';
import { DURATE, durataGiorni, listinoDi, abbonamentiDelCorso, corsoLabel } from '../utils/listino';

// Riga del listino in modifica: prezzo come stringa con la virgola
const rigaListino = (f) => ({
    id: f?.id || null,
    durata: f?.durata || '1_mese',
    illimitato: !!f?.illimitato,
    ingressi: f?.ingressi ? String(f.ingressi) : '',
    prezzo: f?.prezzo !== undefined && f?.prezzo !== null ? String(f.prezzo).replace('.', ',') : '',
});

// Il preavviso di scadenza deve stare dentro la formula più breve
const durataMinimaGiorni = (listino) => Math.min(...(listino.length ? listino : [{ durata: '1_mese' }]).map(f => durataGiorni(f.durata)));

const ProdottoModal = ({ isOpen, onClose, onSave, product }) => {
    const { selectedSocietaId } = useSocieta();
    const [showRateModal, setShowRateModal] = useState(false);
    const [formErrors, setFormErrors] = useState({});
    const [sottogruppi, setSottogruppi] = useState([]);
    // Abbonamenti: formule del listino e corsi inclusi
    const [listino, setListino] = useState([rigaListino()]);
    const [corsi, setCorsi] = useState([]);
    const [corsoIds, setCorsoIds] = useState([]);
    // Initial state based on `product` if editing
    const [formData, setFormData] = useState({
        type: 'generic', // Default
        description: '',
        basePrice: '',
        visible: true,
        sellableOnline: false,
        visibleInFast: false,
        hasRevenueCenter: false, // Default
        // Specifics
        periodicity: '',
        duration: '1_mese',
        giorniAvvisoScadenza: 7,
        unlimitedEntries: false,
        numEntries: '',
        passepartout: false,
        season: '',
        numInstallments: '',
        installments: [],
        gruppoId: '' // sottogruppo di bilancio (solo per tipo generic)
    });

    useEffect(() => {
        setFormErrors({});
        setListino(product?.type === 'subscription' ? listinoDi(product).map(rigaListino) : [rigaListino()]);
        if (product) {
            setFormData({
                ...product
            });
        } else {
            // Reset form for new product
             setFormData({
                type: 'generic',
                description: '',
                basePrice: '',
                visible: true,
                sellableOnline: false,
                visibleInFast: false,
                hasRevenueCenter: false,
                periodicity: '',
                duration: '1_mese',
                giorniAvvisoScadenza: 7,
                unlimitedEntries: false,
                numEntries: '',
                passepartout: false,
                season: '',
                numInstallments: '',
                installments: [],
                gruppoId: ''
            });
        }
    }, [product, isOpen]);

    // Sottogruppi di bilancio disponibili (servizio payments), per l'associazione
    // opzionale dei prodotti generici a un sottogruppo specifico.
    useEffect(() => {
        if (!isOpen || !selectedSocietaId) { setSottogruppi([]); return; }
        fetch(`/payments/api/gruppi?societa_id=${selectedSocietaId}`)
            .then(r => r.ok ? r.json() : [])
            .then(data => setSottogruppi((data || []).filter(g => g.gruppo_id)))
            .catch(() => setSottogruppi([]));
    }, [isOpen, selectedSocietaId]);

    // Corsi della società, per scegliere quelli inclusi nell'abbonamento
    useEffect(() => {
        if (!isOpen || !selectedSocietaId) { setCorsi([]); setCorsoIds([]); return; }
        fetch(`/activities/api/corsi?societaId=${selectedSocietaId}`)
            .then(r => (r.ok ? r.json() : []))
            .then(data => {
                const list = Array.isArray(data) ? data : [];
                setCorsi(list);
                setCorsoIds(product?.id ? list.filter(c => abbonamentiDelCorso(c).includes(product.id)).map(c => c.id) : []);
            })
            .catch(() => setCorsi([]));
    }, [isOpen, selectedSocietaId, product]);

    const aggiornaRiga = (idx, campo, valore) => {
        setListino(prev => prev.map((r, i) => (i !== idx ? r : {
            ...r,
            [campo]: valore,
            ...(campo === 'illimitato' && valore ? { ingressi: '' } : {}),
        })));
        setFormErrors(prev => ({ ...prev, listino: undefined, [`listino_${idx}`]: undefined }));
    };

    const toggleCorso = (id) => setCorsoIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        // Validate basePrice: only digits and comma
        if (name === 'basePrice' && !/^\d*,?\d*$/.test(value)) return;

        // Handle boolean selects properly
        let finalValue = value;
        if (value === 'true') finalValue = true;
        if (value === 'false') finalValue = false;

        setFormData(prev => {
            const updated = {
                ...prev,
                [name]: type === 'checkbox' ? checked : finalValue,
                ...(name === 'type' && finalValue !== 'generic' ? { gruppoId: '' } : {})
            };
            return updated;
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const errors = {};

        if (!formData.description || !formData.description.trim()) {
            errors.description = 'La descrizione è obbligatoria.';
        }

        const priceStr = String(formData.basePrice).replace(',', '.');
        if (formData.type !== 'subscription' && (formData.basePrice === '' || formData.basePrice === null || isNaN(parseFloat(priceStr)) || parseFloat(priceStr) < 0)) {
            errors.basePrice = 'Inserire un prezzo valido (≥ 0).';
        }

        if (formData.type === 'subscription') {
            if (listino.length === 0) errors.listino = 'Aggiungi almeno una formula al listino.';
            const chiavi = new Set();
            listino.forEach((r, idx) => {
                const n = parseInt(r.ingressi, 10);
                const prezzo = parseFloat(String(r.prezzo).replace(',', '.'));
                const chiave = `${r.durata}|${r.illimitato ? 'open' : n}`;
                if (!r.illimitato && (!r.ingressi || isNaN(n) || n <= 0)) {
                    errors[`listino_${idx}`] = 'Indica il numero di ingressi o scegli "illimitati".';
                } else if (r.prezzo === '' || isNaN(prezzo) || prezzo < 0) {
                    errors[`listino_${idx}`] = 'Inserire un prezzo valido (≥ 0).';
                } else if (chiavi.has(chiave)) {
                    errors[`listino_${idx}`] = 'Formula già presente con la stessa durata e gli stessi ingressi.';
                }
                chiavi.add(chiave);
            });
            const avviso = parseInt(formData.giorniAvvisoScadenza, 10);
            const maxDays = durataMinimaGiorni(listino);
            if (isNaN(avviso) || avviso <= 1) {
                errors.giorniAvvisoScadenza = 'Il valore deve essere un intero > 1.';
            } else if (avviso >= maxDays) {
                errors.giorniAvvisoScadenza = `Il valore deve essere inferiore alla durata più breve del listino (${maxDays} giorni).`;
            }
        }

        if (formData.type === 'tesseramento') {
            if (!formData.periodicity) {
                errors.periodicity = 'Selezionare la periodicità.';
            }
            const avvisoTess = parseInt(formData.giorniAvvisoScadenza, 10);
            if (isNaN(avvisoTess) || avvisoTess <= 1) {
                errors.giorniAvvisoScadenza = 'Il valore deve essere un intero > 1.';
            } else if (avvisoTess >= 365) {
                errors.giorniAvvisoScadenza = 'Il valore deve essere inferiore a 365 giorni.';
            }
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setFormErrors({});
        if (formData.type === 'subscription') {
            onSave({
                ...formData,
                listino: listino.map(r => ({
                    ...(r.id ? { id: r.id } : {}),
                    durata: r.durata,
                    illimitato: r.illimitato,
                    ingressi: r.illimitato ? null : parseInt(r.ingressi, 10),
                    prezzo: parseFloat(String(r.prezzo).replace(',', '.')),
                })),
                corsoIds: formData.passepartout ? [] : corsoIds,
            });
            return;
        }
        onSave(formData);
    };

    const handleRateSave = (installments) => {
        setShowRateModal(false);
        onSave({ ...formData, installments });
    };

    if (!isOpen) return null;

    // Render logic for specific fields based on type
    const renderSpecificFields = () => {
        switch (formData.type) {
            case 'subscription':
                return (
                    <>
                    <div className="prodotto-form-group">
                        <label>Listino</label>
                        <div className="prodotto-listino">
                            <div className="prodotto-listino-head">
                                <span>Durata</span><span>Ingressi</span><span>Prezzo</span><span />
                            </div>
                            {listino.map((r, idx) => (
                                <div key={idx} className="prodotto-listino-riga-wrap">
                                    <div className="prodotto-listino-riga" data-testid="riga-listino">
                                        <select aria-label="Durata" value={r.durata} onChange={e => aggiornaRiga(idx, 'durata', e.target.value)} className="prodotto-form-control">
                                            {DURATE.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                        </select>
                                        <div className="prodotto-listino-ingressi">
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                aria-label="Numero ingressi"
                                                value={r.ingressi}
                                                onChange={e => { if (/^\d*$/.test(e.target.value)) aggiornaRiga(idx, 'ingressi', e.target.value); }}
                                                disabled={r.illimitato}
                                                placeholder={r.illimitato ? '∞' : 'es. 10'}
                                                className={`prodotto-form-control${formErrors[`listino_${idx}`] && !r.illimitato ? ' prodotto-form-control-error' : ''}`}
                                            />
                                            <label className="prodotto-listino-open">
                                                <input type="checkbox" checked={r.illimitato} onChange={e => aggiornaRiga(idx, 'illimitato', e.target.checked)} />
                                                Illimitati
                                            </label>
                                        </div>
                                        <div className="prodotto-input-euro-wrapper">
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                aria-label="Prezzo"
                                                value={r.prezzo}
                                                onChange={e => { if (/^\d*,?\d{0,2}$/.test(e.target.value)) aggiornaRiga(idx, 'prezzo', e.target.value); }}
                                                className={`prodotto-form-control prodotto-input-euro${formErrors[`listino_${idx}`] ? ' prodotto-form-control-error' : ''}`}
                                            />
                                            <span className="prodotto-euro-symbol">€</span>
                                        </div>
                                        <button type="button" className="btn-icon-small" title="Rimuovi formula" disabled={listino.length === 1}
                                            onClick={() => setListino(prev => prev.filter((_, i) => i !== idx))}
                                            style={{ color: 'var(--danger-color)', opacity: listino.length === 1 ? 0.4 : 1 }}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    {formErrors[`listino_${idx}`] && <span className="prodotto-form-error">{formErrors[`listino_${idx}`]}</span>}
                                </div>
                            ))}
                            <button type="button" className="btn-outlined prodotto-listino-add"
                                onClick={() => setListino(prev => [...prev, rigaListino({ durata: prev[prev.length - 1]?.durata })])}>
                                <Plus size={16} /> Aggiungi formula
                            </button>
                        </div>
                        {formErrors.listino && <span className="prodotto-form-error">{formErrors.listino}</span>}
                        <span className="prodotto-form-hint">Al momento della vendita si sceglie la formula: prezzo, durata e ingressi arrivano dal listino.</span>
                    </div>
                    <div className="prodotto-form-group">
                        <label>Corsi inclusi</label>
                        {formData.passepartout ? (
                            <span className="prodotto-form-hint">Passepartout: l'abbonamento dà accesso a tutti i corsi.</span>
                        ) : corsi.length === 0 ? (
                            <span className="prodotto-form-hint">Nessun corso definito per la società.</span>
                        ) : (
                            <div className="prodotto-corsi" data-testid="corsi-inclusi">
                                {corsi.map(c => (
                                    <label key={c.id} className="prodotto-corso">
                                        <input type="checkbox" checked={corsoIds.includes(c.id)} onChange={() => toggleCorso(c.id)} />
                                        <span>{corsoLabel(c)}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="prodotto-form-row">
                        <div className="prodotto-form-col">
                            <div className="prodotto-form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        name="passepartout"
                                        checked={!!formData.passepartout}
                                        onChange={handleChange}
                                        style={{ width: 16, height: 16 }}
                                    />
                                    Abbonamento passepartout
                                </label>
                            </div>
                        </div>
                    </div>
                    <div className="prodotto-form-row">
                        <div className="prodotto-form-col">
                            <div className="prodotto-form-group">
                                <label>Giorni di avviso scadenza</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    name="giorniAvvisoScadenza"
                                    value={formData.giorniAvvisoScadenza}
                                    onChange={(e) => {
                                        if (/^\d*$/.test(e.target.value)) handleChange(e);
                                    }}
                                    onBlur={(e) => {
                                        const val = parseInt(e.target.value, 10);
                                        const maxDays = durataMinimaGiorni(listino);
                                        if (isNaN(val) || val <= 1) {
                                            setFormData(prev => ({ ...prev, giorniAvvisoScadenza: 2 }));
                                        } else if (val >= maxDays) {
                                            setFormData(prev => ({ ...prev, giorniAvvisoScadenza: maxDays - 1 }));
                                        }
                                    }}
                                    className={`prodotto-form-control${formErrors.giorniAvvisoScadenza ? ' prodotto-form-control-error' : ''}`}
                                    placeholder="es. 7"
                                />
                                {formErrors.giorniAvvisoScadenza && <span className="prodotto-form-error">{formErrors.giorniAvvisoScadenza}</span>}
                            </div>
                        </div>
                    </div>
                    </>
                );
            case 'tesseramento':
                return (
                    <div className="prodotto-form-row">
                        <div className="prodotto-form-col">
                            <div className="prodotto-form-group">
                                <label>Periodicità</label>
                                <select name="periodicity" value={formData.periodicity} onChange={handleChange} className={`prodotto-form-control${formErrors.periodicity ? ' prodotto-form-control-error' : ''}`}>
                                    <option value="">Seleziona...</option>
                                    <option value="anno_associativo">Anno Associativo</option>
                                    <option value="anno_solare">365 Giorni</option>
                                </select>
                                {formErrors.periodicity && <span className="prodotto-form-error">{formErrors.periodicity}</span>}
                            </div>
                        </div>
                        <div className="prodotto-form-col">
                            <div className="prodotto-form-group">
                                <label>Giorni di avviso scadenza</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    name="giorniAvvisoScadenza"
                                    value={formData.giorniAvvisoScadenza}
                                    onChange={(e) => {
                                        if (/^\d*$/.test(e.target.value)) handleChange(e);
                                    }}
                                    onBlur={(e) => {
                                        const val = parseInt(e.target.value, 10);
                                        if (isNaN(val) || val <= 1) {
                                            setFormData(prev => ({ ...prev, giorniAvvisoScadenza: 2 }));
                                        } else if (val >= 365) {
                                            setFormData(prev => ({ ...prev, giorniAvvisoScadenza: 364 }));
                                        }
                                    }}
                                    className={`prodotto-form-control${formErrors.giorniAvvisoScadenza ? ' prodotto-form-control-error' : ''}`}
                                    placeholder="es. 7"
                                />
                                {formErrors.giorniAvvisoScadenza && <span className="prodotto-form-error">{formErrors.giorniAvvisoScadenza}</span>}
                            </div>
                        </div>
                    </div>
                );
            case 'generic':
                return (
                    <div className="prodotto-form-row">
                        <div className="prodotto-form-col">
                            <div className="prodotto-form-group">
                                <label>Sottogruppo di bilancio (opzionale)</label>
                                <select
                                    name="gruppoId"
                                    value={formData.gruppoId || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, gruppoId: e.target.value === '' ? '' : parseInt(e.target.value, 10) }))}
                                    className="prodotto-form-control"
                                >
                                    <option value="">— Nessuno (usa la configurazione di default) —</option>
                                    {sottogruppi.map(g => (
                                        <option key={g.id} value={g.id}>{g.codice ? `${g.codice} - ${g.descrizione}` : g.descrizione}</option>
                                    ))}
                                </select>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    Le ricevute emesse per questo prodotto confluiranno in prima nota e bilancio sotto questo sottogruppo.
                                </span>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="prodotto-modal-overlay">
            <div className="prodotto-modal">
                <div className="prodotto-modal-header">
                    <h2><ShoppingCart size={24} /> Prodotto</h2>
                    <button onClick={onClose} className="close-btn"><React.Fragment>X</React.Fragment></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="prodotto-modal-content">
                        <div className="prodotto-tabs">
                             <button type="button" className="prodotto-tab-btn"><ShoppingCart size={16}/> Generali</button>
                        </div>

                        <div className="prodotto-form-group">
                            <label>Tipo prodotto</label>
                            <select name="type" value={formData.type} onChange={handleChange} className="prodotto-form-control">
                                <option value="generic">Prodotto generico</option>
                                <option value="subscription">Abbonamento</option>
                                <option value="quota_associativa">Quota associativa/Iscrizione</option>
                                <option value="tesseramento">Tesseramento</option>
                            </select>
                        </div>

                        <div className="prodotto-form-group">
                            <label>Descrizione</label>
                            <input type="text" name="description" value={formData.description} onChange={handleChange} className={`prodotto-form-control${formErrors.description ? ' prodotto-form-control-error' : ''}`} />
                            {formErrors.description && <span className="prodotto-form-error">{formErrors.description}</span>}
                        </div>

                        <div className="prodotto-form-row">
                            {formData.type !== 'subscription' && (
                             <div className="prodotto-form-col">
                                <div className="prodotto-form-group">
                                    <label>Prezzo base</label>
                                    <div className="prodotto-input-euro-wrapper">
                                        <input type="text" inputMode="decimal" name="basePrice" value={formData.basePrice} onChange={handleChange} className={`prodotto-form-control prodotto-input-euro${formErrors.basePrice ? ' prodotto-form-control-error' : ''}`} />
                                        <span className="prodotto-euro-symbol">€</span>
                                    </div>
                                    {formErrors.basePrice && <span className="prodotto-form-error">{formErrors.basePrice}</span>}
                                </div>
                            </div>
                            )}
                            <div className="prodotto-form-col">
                                <div className="prodotto-form-group">
                                    <label>Visibile</label>
                                    <select name="visible" value={formData.visible} onChange={handleChange} className="prodotto-form-control">
                                        <option value={true}>Si</option>
                                        <option value={false}>No</option>
                                    </select>
                                </div>
                            </div>
                            <div className="prodotto-form-col">
                                <div className="prodotto-form-group">
                                    {/* Determina se il prodotto compare nel negozio dell'area soci */}
                                    <label>Vendibile online</label>
                                    <select name="sellableOnline" value={formData.sellableOnline} onChange={handleChange} className="prodotto-form-control">
                                        <option value={true}>Si</option>
                                        <option value={false}>No</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {renderSpecificFields()}
                    </div>
                     <div className="prodotto-modal-footer">
                         <div style={{flex: 1}}></div>
                        <button type="submit" className="btn-save"><React.Fragment>✓</React.Fragment> Salva</button>
                    </div>
                </form>
            </div>

            {showRateModal && (
                <RateScadenzarioModal
                    isOpen={showRateModal}
                    onClose={() => setShowRateModal(false)}
                    onSave={handleRateSave}
                    numInstallments={formData.numInstallments}
                    basePrice={formData.basePrice}
                    productDescription={formData.description}
                    existingInstallments={formData.installments}
                />
            )}
        </div>
    );
};

export default ProdottoModal;
