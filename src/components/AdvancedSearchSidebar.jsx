import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import CityAutocomplete from './CityAutocomplete';
import MultiSelect from './MultiSelect';

const AdvancedSearchSidebar = ({ isOpen, onClose }) => {
    const [listAtLeastOne, setListAtLeastOne] = useState([]);
    const [listAll, setListAll] = useState([]);
    const [notInList, setNotInList] = useState([]);

    const listOptions = [
        { value: "4614", label: "Aerobica" },
        { value: "4356", label: "THAI BOXE" },
        { value: "4257", label: "U13" }
    ];

    return (
        <>
            {/* Overlay */}
            <div 
                style={{
                    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', 
                    zIndex: 1200, opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none',
                    transition: 'opacity 0.3s'
                }} 
                onClick={onClose}
            />
            {/* Sidebar */}
            <div 
                style={{
                    position: 'fixed', top: 0, right: 0, bottom: 0, width: '500px', maxWidth: '90vw',
                    backgroundColor: 'var(--surface-color)', zIndex: 1201, boxShadow: '-5px 0 15px rgba(0,0,0,0.2)',
                    transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex', flexDirection: 'column'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '16px 20px', backgroundColor: 'var(--primary-color)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    <div style={{display:'flex', alignItems:'center', gap:'10px', fontSize:'1.3rem', fontWeight: 500}}>
                        <Search size={24} /> Ricerca avanzata
                    </div>
                    <button onClick={onClose} style={{background:'none', border:'none', color:'white', cursor:'pointer', display: 'flex', padding: 0}}>
                        <X size={28} />
                    </button>
                </div>
                
                {/* Content */}
                <div style={{flex: 1, overflowY: 'auto', padding: '20px'}}>
                    <form onSubmit={(e) => e.preventDefault()} style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                        
                        {/* Row 1: Età min/max, Sesso, Iscritto */}
                        <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px'}}>
                            <div className="adv-field">
                                <label>Età min</label>
                                <select className="md-select">
                                    {[...Array(101).keys()].map(i => <option key={i} value={i}>{i}</option>)}
                                </select>
                            </div>
                            <div className="adv-field">
                                <label>Età max</label>
                                <select className="md-select">
                                    {[...Array(101).keys()].map(i => <option key={i} value={i}>{i}</option>)}
                                </select>
                            </div>
                            <div className="adv-field">
                                <label>Sesso</label>
                                <select className="md-select">
                                    <option value="0">TUTTI</option>
                                    <option value="1">MASCHIO</option>
                                    <option value="2">FEMMINA</option>
                                </select>
                            </div>
                            <div className="adv-field">
                                <label>Iscritto</label>
                                <select className="md-select">
                                    <option value="-1">TUTTI</option>
                                    <option value="1">SI</option>
                                    <option value="0">NO</option>
                                </select>
                            </div>
                        </div>

                        {/* Row 2: Iscrizione DA - A */}
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                            <div className="adv-field">
                                <label>Iscrizione DA</label>
                                <input type="date" className="md-input"/>
                            </div>
                            <div className="adv-field">
                                <label>Iscrizione A</label>
                                <input type="date" className="md-input"/>
                            </div>
                        </div>

                        {/* Row 3: Stagioni precedenti */}
                        <div className="adv-field">
                            <label>Iscritto stagioni precedenti</label>
                            <select className="md-select">
                                <option value="-1">TUTTI</option>
                                <option value="1">SI - STAGIONE PRECEDENTE</option>
                                <option value="2">SI - STAGIONE PREC. QUALSIASI</option>
                                <option value="0">NO - STAGIONE PRECEDENTE</option>
                                <option value="3">NO - STAGIONE PREC. QUALSIASI</option>
                            </select>
                        </div>

                         {/* Row 4: Livello, Valutazione, Ha email, Cert */}
                        <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px'}}>
                             <div className="adv-field">
                                <label>Livello</label>
                                <select className="md-select">
                                    <option value="-1">Qualsiasi</option>
                                    <option value="1">ND</option>
                                    <option value="4098">Socio</option>
                                    <option value="4099">Tesserato</option>
                                </select>
                            </div>
                            <div className="adv-field">
                                <label>Valutazione</label>
                                <select className="md-select">
                                    <option value="-1">Qualsiasi</option>
                                    <option value="0">N.D.</option>
                                    <option value="1">A</option>
                                    <option value="2">B</option>
                                    <option value="3">C</option>
                                </select>
                            </div>
                            <div className="adv-field">
                                <label>Ha email</label>
                                <select className="md-select">
                                    <option value="-1">TUTTI</option>
                                    <option value="1">SI</option>
                                    <option value="0">NO</option>
                                </select>
                            </div>
                            <div className="adv-field">
                                <label>Cert. medico</label>
                                <select className="md-select">
                                    <option value="">TUTTI</option>
                                    <option value="2">VALIDO</option>
                                    <option value="1">IN SCADENZA</option>
                                    <option value="0">SCADUTO</option>
                                </select>
                            </div>
                        </div>

                        {/* Row 5: Pagamenti, Scadenzario, CF */}
                        <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px'}}>
                            <div className="adv-field">
                                <label>Stato pagamenti</label>
                                <select className="md-select">
                                    <option value="-1">TUTTI</option>
                                    <option value="0">REGOLARI</option>
                                    <option value="1">NON REGOLARI</option>
                                </select>
                            </div>
                            <div className="adv-field">
                                <label>Ha scadenzario</label>
                                <select className="md-select">
                                    <option value="-1">TUTTI</option>
                                    <option value="1">SI</option>
                                    <option value="0">NO</option>
                                </select>
                            </div>
                            <div className="adv-field">
                                <label>Ha codice fiscale</label>
                                <select className="md-select">
                                    <option value="-1">TUTTI</option>
                                    <option value="1">SI</option>
                                    <option value="0">NO</option>
                                </select>
                            </div>
                        </div>

                        {/* Row 6: Quote periodiche, Comune */}
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                            <div className="adv-field">
                                <label>Ha pagato quote periodiche</label>
                                <select className="md-select">
                                    <option value="-1">TUTTI</option>
                                    <option value="1">SI</option>
                                    <option value="0">NO</option>
                                </select>
                            </div>
                            <div className="adv-field">
                                <CityAutocomplete label="Comune di residenza" />
                            </div>
                        </div>

                        {/* Row 7: Pagamenti min, Corso */}
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                            <div className="adv-field">
                                <label>Pagamenti effettuati per min</label>
                                <input type="number" className="md-input"/>
                            </div>
                            <div className="adv-field">
                                <label>Frequenta un corso</label>
                                <select className="md-select">
                                    <option value="-1">TUTTI</option>
                                    <option value="1">SI</option>
                                    <option value="0">NO</option>
                                </select>
                            </div>
                        </div>

                        {/* Row 8: Tipo attività, Abbonamento */}
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                            <div className="adv-field">
                                <label>Tipo attività corso frequentato</label>
                                <select className="md-select">
                                    <option value="-1">TUTTE</option>
                                    <option value="2429">Torneo Basket 3vs3</option>
                                    <option value="2430">MiniBasket Dragons Buttrio</option>
                                    <option value="2431">Corso di Yoga</option>
                                    <option value="2432">SCUOLA NUOTO</option>
                                    <option value="2433">Corso di Sci</option>
                                    <option value="2441">Padel Prenotazione</option>
                                    <option value="2540">Aerobica</option>
                                </select>
                            </div>
                            <div className="adv-field">
                                <label>Ha un abbonamento</label>
                                <select className="md-select">
                                    <option value="-1">TUTTI</option>
                                    <option value="1">SI</option>
                                    <option value="0">NO</option>
                                </select>
                            </div>
                        </div>

                        {/* Row 9: Indirizzo */}
                        <div className="adv-field">
                            <label style={{textTransform:'uppercase'}}>INDIRIZZO</label>
                            <input className="md-input" />
                        </div>

                         {/* Row 10: Luogo Nascita */}
                         <div className="adv-field">
                            <CityAutocomplete label="LUOGO DI NASCITA" />
                        </div>

                        {/* Row 11: Data Nascita Range */}
                        <div className="adv-field">
                            <label style={{textTransform:'uppercase'}}>DATA DI NASCITA</label>
                            <div style={{display:'flex', gap:'12px'}}>
                                <input type="date" className="md-input" style={{flex:1}} />
                                <input type="date" className="md-input" style={{flex:1}} />
                            </div>
                        </div>

                        {/* Row 12: ID Badge, Stato tesseramento */}
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                            <div className="adv-field">
                                <label>ID Badge</label>
                                <input className="md-input" />
                            </div>
                            <div className="adv-field">
                                <label>Stato tesseramento</label>
                                <select className="md-select">
                                    <option value="-1">TUTTI</option>
                                    <option value="2">VALIDO</option>
                                    <option value="1">IN SCADENZA</option>
                                    <option value="0">SCADUTO</option>
                                </select>
                            </div>
                        </div>
                        
                        {/* Row 13: Liste */}
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                            <MultiSelect 
                                label="In lista (almeno una)" 
                                options={listOptions} 
                                value={listAtLeastOne} 
                                onChange={setListAtLeastOne} 
                            />
                            <MultiSelect 
                                label="In lista (tutte)" 
                                options={listOptions} 
                                value={listAll} 
                                onChange={setListAll} 
                            />
                        </div>

                        {/* Row 14: Non lista */}
                        <MultiSelect 
                            label="NON Appartiene alla lista" 
                            options={listOptions} 
                            value={notInList} 
                            onChange={setNotInList} 
                        />
                        
                        {/* Spacer for bottom scrolling */}
                        <div style={{height: '20px'}}></div>

                    </form>
                </div>

                {/* Footer */}
                <div style={{padding: '16px 20px', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)'}}>
                     <button className="btn-contained" style={{width: '100%', backgroundColor: 'var(--success-color)', justifyContent: 'center', fontSize: '1.2rem', padding: '12px', display:'flex', alignItems:'center'}}>
                        <Search size={22} style={{marginRight:'10px'}}/> Avvia ricerca
                    </button>
                </div>
            </div>

            <style>{`
                .adv-field {
                    display: flex;
                    flex-direction: column;
                }
                .adv-field label {
                    font-size: 0.9rem;
                    color: var(--primary-color);
                    margin-bottom: 4px;
                }
            `}</style>
        </>
    );
};

export default AdvancedSearchSidebar;
