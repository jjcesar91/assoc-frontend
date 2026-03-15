import React, { useState, useEffect } from 'react';
import { Search, X, User, MousePointerClick, Contact } from 'lucide-react';
import './RicercaSocioModal.css';

const getCertStatus = (scadenza) => {
    if (!scadenza) return 'NON ISCRITTO';
    const scadenzaDate = new Date(scadenza);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (scadenzaDate < today) {
        return 'SCADUTO';
    } else {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);
        if (scadenzaDate <= thirtyDaysFromNow) {
            return 'IN SCADENZA';
        }
        return 'ISCRITTO'; // They use mostly ISCRITTO / NON ISCRITTO in the pic
    }
};

const RicercaSocioModal = ({ isOpen, onClose, onSelect, societaId }) => {
    const [soci, setSoci] = useState([]);
    const [filteredSoci, setFilteredSoci] = useState([]);
    const [filters, setFilters] = useState({ cognome: '', nome: '' });

    useEffect(() => {
        const fetchSoci = async () => {
            if (!societaId || !isOpen) return;
            try {
                const response = await fetch(`/users/api/soci?societa_id=${societaId}`);
                const data = await response.json();
                if (Array.isArray(data)) {
                    setSoci(data);
                    setFilteredSoci(data);
                }
            } catch (error) {
                console.error("Error fetching soci", error);
            }
        };
        fetchSoci();
    }, [societaId, isOpen]);

    useEffect(() => {
        let result = soci;
        if (filters.cognome) {
            result = result.filter(s => s.cognome.toLowerCase().includes(filters.cognome.toLowerCase()));
        }
        if (filters.nome) {
            result = result.filter(s => s.nome.toLowerCase().includes(filters.nome.toLowerCase()));
        }
        setFilteredSoci(result);
    }, [filters, soci]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-container ricerva-socio-modal">
                <div className="modal-header" style={{backgroundColor: '#4fc3f7', color: 'white'}}>
                    <h2 className="modal-title">
                        <Search size={20} /> Ricerca socio
                    </h2>
                    <button className="modal-close" onClick={onClose} style={{color: 'white'}}>
                        <X size={24} />
                    </button>
                </div>
                
                <div className="modal-content" style={{padding: '20px'}}>
                    <div className="ricerca-filters">
                        <div className="form-group-rm">
                            <label>Cognome</label>
                            <input 
                                type="text" 
                                placeholder="Cognome" 
                                value={filters.cognome}
                                onChange={(e) => setFilters({...filters, cognome: e.target.value})}
                                className="md-input-rm"
                            />
                        </div>
                        <div className="form-group-rm">
                            <label>Nome</label>
                            <input 
                                type="text" 
                                placeholder="Nome" 
                                value={filters.nome}
                                onChange={(e) => setFilters({...filters, nome: e.target.value})}
                                className="md-input-rm"
                            />
                        </div>
                    </div>

                    <div className="ricerca-list">
                        <table className="md-table-rm">
                            <tbody>
                                {filteredSoci.map(socio => (
                                    <tr key={socio.id}>
                                        <td style={{width: '40%'}}>
                                            <div style={{display:'flex', alignItems:'center', gap:'8px', color: socio.sesso === 'F' ? '#ff4081' : '#1976d2', fontWeight: 'bold'}}>
                                                <User size={18}/>
                                                <span>{socio.id} {socio.cognome} {socio.nome}</span>
                                            </div>
                                        </td>
                                        <td style={{width: '20%'}}>
                                            {socio.data_nascita ? new Date(socio.data_nascita).toLocaleDateString('it-IT') : ''}
                                        </td>
                                        <td style={{width: '20%'}}>
                                            <span className={`badge-rm ${getCertStatus(socio.scadenza_certificato) === 'ISCRITTO' ? 'badge-success' : 'badge-danger'}`}>
                                                {getCertStatus(socio.scadenza_certificato) === 'ISCRITTO' ? 'ISCRITTO' : 'NON ISCRITTO'}
                                            </span>
                                        </td>
                                        <td style={{width: '20%', textAlign: 'right'}}>
                                            <div style={{display:'flex', gap:'5px', justifyContent:'flex-end'}}>
                                                <button className="btn-scheda-rm" onClick={() => window.open(`/soci?apriSocioPath=${socio.id}`, '_blank')}>
                                                    <Contact size={14}/> Scheda
                                                </button>
                                                <button className="btn-seleziona-rm" onClick={() => onSelect(socio)}>
                                                    <MousePointerClick size={14}/> Seleziona
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default RicercaSocioModal;
