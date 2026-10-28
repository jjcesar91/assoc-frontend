import React, { useState } from 'react';
import { X, Search, RotateCcw } from 'lucide-react';
import CityAutocomplete from './CityAutocomplete';
import MultiSelect from './MultiSelect';
import { FILTRI_AVANZATI_VUOTI, contaFiltriAvanzati } from '../utils/ricercaAvanzata';

// Pannello "Ricerca avanzata" della pagina Soci. Lavora su una bozza: i filtri si applicano
// con "Avvia ricerca" (la logica è in utils/ricercaAvanzata.js). Le opzioni di livello,
// etichette, attività e corsi arrivano dai dati della società.

const SI_NO = [['', 'TUTTI'], ['1', 'SI'], ['0', 'NO']];
const ETA = Array.from({ length: 101 }, (_, i) => i);

const Sezione = ({ titolo, children }) => (
    <fieldset className="adv-sezione">
        <legend>{titolo}</legend>
        {children}
    </fieldset>
);

const Griglia = ({ colonne = 2, children }) => (
    <div className="adv-griglia" style={{ gridTemplateColumns: `repeat(${colonne}, minmax(0, 1fr))` }}>{children}</div>
);

const Select = ({ label, value, onChange, opzioni }) => (
    <label className="adv-field">
        <span>{label}</span>
        <select className="md-select" value={value} onChange={(e) => onChange(e.target.value)}>
            {opzioni.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
    </label>
);

const Data = ({ label, value, onChange }) => (
    <label className="adv-field">
        <span>{label}</span>
        <input type="date" className="md-input" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
);

const AdvancedSearchSidebar = ({ isOpen, onClose, valore, onApplica, opzioni = {} }) => {
    const [bozza, setBozza] = useState(valore || FILTRI_AVANZATI_VUOTI);
    // All'apertura la bozza riparte dai filtri applicati (aggiornamento durante il render,
    // al passaggio chiuso → aperto: niente effetto e niente render in più)
    const [eraAperto, setEraAperto] = useState(isOpen);
    if (isOpen !== eraAperto) {
        setEraAperto(isOpen);
        if (isOpen) setBozza(valore || FILTRI_AVANZATI_VUOTI);
    }

    const set = (campo) => (v) => setBozza(b => ({ ...b, [campo]: v }));
    const { livelli = [], etichette = [], attivita = [], corsi = [] } = opzioni;
    const etichetteOpzioni = etichette.map(e => ({ value: e, label: e }));
    const corsiVisibili = bozza.attivitaId ? corsi.filter(c => String(c.attivitaId) === String(bozza.attivitaId)) : corsi;
    const nAttivi = contaFiltriAvanzati(bozza);

    const applica = (e) => {
        e?.preventDefault();
        onApplica(bozza);
        onClose();
    };

    return (
        <>
            <div
                style={{
                    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
                    zIndex: 1200, opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none',
                    transition: 'opacity 0.3s'
                }}
                onClick={onClose}
            />
            <aside
                aria-label="Ricerca avanzata"
                aria-hidden={!isOpen}
                style={{
                    position: 'fixed', top: 0, right: 0, bottom: 0, width: '520px', maxWidth: '100vw',
                    backgroundColor: 'var(--surface-color, #fff)', zIndex: 1201, boxShadow: '-5px 0 15px rgba(0,0,0,0.2)',
                    transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex', flexDirection: 'column', visibility: isOpen ? 'visible' : 'hidden',
                }}
            >
                <div style={{
                    padding: '14px 20px', backgroundColor: 'var(--primary)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.2rem', fontWeight: 500 }}>
                        <Search size={22} /> Ricerca avanzata
                    </div>
                    <button type="button" onClick={onClose} aria-label="Chiudi" style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', padding: 0 }}>
                        <X size={26} />
                    </button>
                </div>

                <form id="ricerca-avanzata" onSubmit={applica} style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <Sezione titolo="Anagrafica">
                        <Griglia colonne={4}>
                            <Select label="Età min" value={bozza.etaMin} onChange={set('etaMin')} opzioni={[['', '—'], ...ETA.map(i => [String(i), String(i)])]} />
                            <Select label="Età max" value={bozza.etaMax} onChange={set('etaMax')} opzioni={[['', '—'], ...ETA.map(i => [String(i), String(i)])]} />
                            <Select label="Sesso" value={bozza.sesso} onChange={set('sesso')} opzioni={[['', 'TUTTI'], ['M', 'MASCHIO'], ['F', 'FEMMINA']]} />
                            <Select label="Tipo socio" value={bozza.tipoSocio} onChange={set('tipoSocio')} opzioni={[['', 'TUTTI'], ['persona', 'PERSONA'], ['associazione', 'ASSOCIAZIONE']]} />
                        </Griglia>
                        <Griglia colonne={2}>
                            <Data label="Nato dal" value={bozza.nascitaDa} onChange={set('nascitaDa')} />
                            <Data label="Nato al" value={bozza.nascitaA} onChange={set('nascitaA')} />
                        </Griglia>
                        <div className="adv-field">
                            <CityAutocomplete label="Luogo di nascita" value={bozza.luogoNascita} onChange={(e) => set('luogoNascita')(e.target.value)} />
                        </div>
                        <Griglia colonne={2}>
                            <div className="adv-field">
                                <CityAutocomplete label="Comune di residenza" value={bozza.comune} onChange={(e) => set('comune')(e.target.value)} />
                            </div>
                            <label className="adv-field">
                                <span>Indirizzo contiene</span>
                                <input className="md-input" value={bozza.indirizzo} onChange={(e) => set('indirizzo')(e.target.value)} />
                            </label>
                        </Griglia>
                        <Griglia colonne={4}>
                            <Select label="Ha email" value={bozza.haEmail} onChange={set('haEmail')} opzioni={SI_NO} />
                            <Select label="Ha telefono" value={bozza.haTelefono} onChange={set('haTelefono')} opzioni={SI_NO} />
                            <Select label="Ha cod. fiscale" value={bozza.haCodiceFiscale} onChange={set('haCodiceFiscale')} opzioni={SI_NO} />
                            <Select label="Livello" value={bozza.livello} onChange={set('livello')} opzioni={[['', 'Qualsiasi'], ...livelli.map(l => [l, l])]} />
                        </Griglia>
                    </Sezione>

                    <Sezione titolo="Iscrizione e tesseramento">
                        <Griglia colonne={2}>
                            <Select label="Iscritto (stagione in corso)" value={bozza.iscritto} onChange={set('iscritto')} opzioni={SI_NO} />
                            <Select label="Iscritto stagioni precedenti" value={bozza.stagioniPrecedenti} onChange={set('stagioniPrecedenti')} opzioni={[
                                ['', 'TUTTI'], ['si_prec', 'SI - STAGIONE PRECEDENTE'], ['si_qualsiasi', 'SI - QUALSIASI PRECEDENTE'],
                                ['no_prec', 'NO - STAGIONE PRECEDENTE'], ['no_qualsiasi', 'NO - NESSUNA PRECEDENTE'],
                            ]} />
                        </Griglia>
                        <Griglia colonne={2}>
                            <Data label="Iscritto dal" value={bozza.iscrizioneDa} onChange={set('iscrizioneDa')} />
                            <Data label="Iscritto al" value={bozza.iscrizioneA} onChange={set('iscrizioneA')} />
                        </Griglia>
                        <Griglia colonne={2}>
                            <Select label="Stato tesseramento" value={bozza.statoTesseramento} onChange={set('statoTesseramento')} opzioni={[['', 'TUTTI'], ['REGOLARE', 'REGOLARE'], ['IN SCADENZA', 'IN SCADENZA'], ['SCADUTO', 'SCADUTO'], ['NO', 'NON TESSERATO']]} />
                            <Select label="Certificato medico" value={bozza.certMedico} onChange={set('certMedico')} opzioni={[['', 'TUTTI'], ['2', 'VALIDO'], ['1', 'IN SCADENZA'], ['0', 'SCADUTO'], ['MISSING', 'ASSENTE']]} />
                        </Griglia>
                    </Sezione>

                    <Sezione titolo="Pagamenti e scadenze">
                        <Griglia colonne={2}>
                            <Select label="Stato pagamenti" value={bozza.statoPagamenti} onChange={set('statoPagamenti')} opzioni={[['', 'TUTTI'], ['regolari', 'REGOLARI'], ['non_regolari', 'NON REGOLARI']]} />
                            <Select label="Ha un abbonamento attivo" value={bozza.haAbbonamento} onChange={set('haAbbonamento')} opzioni={SI_NO} />
                            <Select label="Ha scadenze (abbonamenti/tessere)" value={bozza.haScadenzario} onChange={set('haScadenzario')} opzioni={SI_NO} />
                            <Select label="Ha pagato nella stagione" value={bozza.pagatoStagione} onChange={set('pagatoStagione')} opzioni={SI_NO} />
                        </Griglia>
                        <label className="adv-field">
                            <span>Totale pagato nella stagione almeno (€)</span>
                            <input type="number" min="0" step="0.01" className="md-input" value={bozza.importoMinStagione} onChange={(e) => set('importoMinStagione')(e.target.value)} />
                        </label>
                    </Sezione>

                    <Sezione titolo="Corsi">
                        <Griglia colonne={3}>
                            <Select label="Frequenta un corso" value={bozza.frequentaCorso} onChange={set('frequentaCorso')} opzioni={SI_NO} />
                            <Select label="Tipo attività" value={bozza.attivitaId} onChange={(v) => setBozza(b => ({ ...b, attivitaId: v, corsoId: '' }))}
                                opzioni={[['', 'TUTTE'], ...attivita.map(a => [String(a.id), a.descrizione])]} />
                            <Select label="Corso" value={bozza.corsoId} onChange={set('corsoId')}
                                opzioni={[['', 'TUTTI'], ...corsiVisibili.map(c => [String(c.id), c.label])]} />
                        </Griglia>
                    </Sezione>

                    <Sezione titolo="Etichette">
                        {etichette.length === 0 ? (
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Nessuna etichetta assegnata ai soci di questa società.</p>
                        ) : (
                            <>
                                <Griglia colonne={2}>
                                    <MultiSelect label="Ha almeno una di" options={etichetteOpzioni} value={bozza.etichetteAlmenoUna} onChange={set('etichetteAlmenoUna')} />
                                    <MultiSelect label="Ha tutte" options={etichetteOpzioni} value={bozza.etichetteTutte} onChange={set('etichetteTutte')} />
                                </Griglia>
                                <MultiSelect label="Non ha nessuna di" options={etichetteOpzioni} value={bozza.etichetteNessuna} onChange={set('etichetteNessuna')} />
                            </>
                        )}
                    </Sezione>
                </form>

                <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: 10 }}>
                    <button type="button" className="btn-outlined" style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}
                        onClick={() => setBozza(FILTRI_AVANZATI_VUOTI)} disabled={nAttivi === 0}>
                        <RotateCcw size={16} /> Azzera
                    </button>
                    <button type="submit" form="ricerca-avanzata" className="btn-contained" style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.05rem' }}>
                        <Search size={20} /> Avvia ricerca{nAttivi > 0 ? ` (${nAttivi} ${nAttivi === 1 ? 'filtro' : 'filtri'})` : ''}
                    </button>
                </div>
            </aside>

            <style>{`
                .adv-sezione { border: 1px solid var(--border-color); border-radius: 8px; padding: 10px 14px 14px; margin: 0; display: flex; flex-direction: column; gap: 12px; }
                .adv-sezione legend { padding: 0 6px; font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-secondary); }
                .adv-griglia { display: grid; gap: 12px; }
                .adv-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
                .adv-field > span, .adv-field label { font-size: 0.85rem; color: var(--primary); }
                .adv-field .md-select, .adv-field .md-input { width: 100%; box-sizing: border-box; }
                @media (max-width: 560px) { .adv-griglia { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; } }
            `}</style>
        </>
    );
};

export default AdvancedSearchSidebar;
