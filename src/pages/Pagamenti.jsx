import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Folder, Printer, Mail, ChevronLeft, ChevronRight, User, Banknote, CreditCard, Landmark, DollarSign, ChevronDown } from 'lucide-react';
import { useSocieta } from '../data/SocietaContext';
import PagamentoModal from './PagamentoModal';
import './Soci.css';

const Pagamenti = () => {
    const { selectedSocietaId } = useSocieta();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPayment, setCurrentPayment] = useState(null);

    const [filters, setFilters] = useState({
        intestatario: '',
        dataDa: '',
        dataA: '',
        utente: 'TUTTI',
        statoPagamento: 'TUTTI',
        modalitaPagamento: 'TUTTI'
    });

    useEffect(() => {
        if (selectedSocietaId) {
            fetchPayments();
        } else {
            setPayments([]);
            setLoading(false);
        }
    }, [selectedSocietaId]);

    const fetchPayments = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/payments/api?societa_id=${selectedSocietaId}`);
            if (response.ok) {
                const data = await response.json();
                setPayments(data);
            }
        } catch (error) {
            console.error("Error fetching payments", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const openModal = (payment = null) => {
        setCurrentPayment(payment);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setCurrentPayment(null);
        setIsModalOpen(false);
        fetchPayments();
    };

    const renderPaymentIcon = (modalita) => {
        if (!modalita) return <Banknote size={20} />;
        const m = modalita.toLowerCase();
        if (m.includes('contanti')) return <Banknote size={20} strokeWidth={1.5} />;
        if (m.includes('pos')) return <CreditCard size={20} strokeWidth={1.5} />;
        if (m.includes('bonifico')) return <Landmark size={20} strokeWidth={1.5} />;
        if (m.includes('assegno')) return <DollarSign size={20} strokeWidth={1.5} />;
        return <Banknote size={20} strokeWidth={1.5} />;
    };

    const filteredPayments = payments.filter(p => {
        if (filters.intestatario && !p.intestatario?.toLowerCase().includes(filters.intestatario.toLowerCase())) return false;
        if (filters.modalitaPagamento !== 'TUTTI' && p.modalita_pagamento !== filters.modalitaPagamento) return false;
        if (filters.statoPagamento !== 'TUTTI' && p.stato_pagamento !== filters.statoPagamento) return false;
        if (filters.dataDa && p.data_pagamento < filters.dataDa) return false;
        if (filters.dataA && p.data_pagamento > filters.dataA) return false;
        return true;
    });

    const totalEntrate = filteredPayments.filter(p => parseFloat(p.importo) >= 0).reduce((acc, p) => acc + parseFloat(p.importo), 0);
    const totalUscite = filteredPayments.filter(p => parseFloat(p.importo) < 0).reduce((acc, p) => acc + Math.abs(parseFloat(p.importo)), 0);

    return (
        <div className="soci-full-container">
            <div className="main-content">
                
                {/* Filters Toolbar */}
                <div className="toolbar-card" style={{display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'stretch'}}>
                    <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '12px'}}>
                        
                        <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '120px'}}>
                            <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Intestatario</label>
                            <input 
                                className="md-input" 
                                placeholder="Intestatario" 
                                style={{width: '100%', padding: '6px 12px'}} 
                                value={filters.intestatario}
                                onChange={(e) => handleFilterChange('intestatario', e.target.value)}
                            />
                        </div>
                        
                        <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '120px'}}>
                            <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Data da</label>
                            <input 
                                type="date"
                                className="md-input" 
                                style={{width: '100%', padding: '6px 12px'}} 
                                value={filters.dataDa}
                                onChange={(e) => handleFilterChange('dataDa', e.target.value)}
                            />
                        </div>

                        <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '120px'}}>
                            <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Data a</label>
                            <input 
                                type="date"
                                className="md-input" 
                                style={{width: '100%', padding: '6px 12px'}} 
                                value={filters.dataA}
                                onChange={(e) => handleFilterChange('dataA', e.target.value)}
                            />
                        </div>

                        <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '120px'}}>
                            <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Utente</label>
                            <select 
                                className="md-select" 
                                style={{width: '100%', padding: '6px 12px'}}
                                value={filters.utente}
                                onChange={(e) => handleFilterChange('utente', e.target.value)}
                            >
                                <option value="TUTTI">TUTTI</option>
                            </select>
                        </div>
                        
                        <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '120px'}}>
                            <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Stato pagamento</label>
                            <select 
                                className="md-select" 
                                style={{width: '100%', padding: '6px 12px'}}
                                value={filters.statoPagamento}
                                onChange={(e) => handleFilterChange('statoPagamento', e.target.value)}
                            >
                                <option value="TUTTI">TUTTI</option>
                                <option value="1. VALIDO CON RICEVUTA">1. VALIDO CON RICEVUTA</option>
                                <option value="2. VALIDO SENZA RICEVUTA">2. VALIDO SENZA RICEVUTA</option>
                                <option value="3. ANNULLATO CON RICEVUTA">3. ANNULLATO CON RICEVUTA</option>
                            </select>
                        </div>

                        <div style={{display:'flex', flexDirection:'column', flex: 1, minWidth: '120px'}}>
                            <label style={{fontSize:'0.85rem', marginBottom:'4px'}}>Modalità pagamento</label>
                            <select 
                                className="md-select" 
                                style={{width: '100%', padding: '6px 12px'}}
                                value={filters.modalitaPagamento}
                                onChange={(e) => handleFilterChange('modalitaPagamento', e.target.value)}
                            >
                                <option value="TUTTI">TUTTI</option>
                                <option value="Contanti">CONTANTI</option>
                                <option value="POS">POS</option>
                                <option value="Assegno">ASSEGNO</option>
                                <option value="Bonifico">BONIFICO</option>
                                <option value="Online">ONLINE</option>
                            </select>
                        </div>

                        <div style={{display:'flex', gap:'8px', marginLeft: 'auto'}}>
                            <button 
                                className="btn-contained" 
                                style={{backgroundColor: 'var(--primary-color)', height: '35px', display:'flex', alignItems:'center', gap:'8px', fontSize:'0.9rem', padding: '0 12px'}}
                            >
                                <Printer size={14}/> Chiusura <ChevronDown size={14}/>
                            </button>
                            <button 
                                className="btn-contained" 
                                style={{backgroundColor: '#1abc9c', height: '35px', display:'flex', alignItems:'center', gap:'8px', fontSize:'0.9rem', padding: '0 12px'}}
                            >
                                <Printer size={14}/> Esporta elenco
                            </button>
                            <button 
                                className="btn-contained" 
                                style={{backgroundColor: 'var(--success-color)', height: '35px', display:'flex', alignItems:'center', gap:'8px', fontSize:'0.9rem', padding: '0 12px'}}
                                onClick={() => openModal()}
                            >
                                <Plus size={14}/> Nuovo Pagamento
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table Block */}
                <div style={{marginTop: '20px', flex:1, display:'flex', flexDirection:'column'}} className="card">
                    <div className="table-responsive">
                        <table className="md-table" style={{ borderCollapse: 'separate', borderSpacing: '0 4px', backgroundColor: 'transparent' }}>
                            <thead>
                                <tr style={{backgroundColor: '#f1c40f', color: '#fff'}}>
                                    <th style={{padding: '12px', borderTopLeftRadius: '6px', borderBottomLeftRadius: '6px', color:'#000'}}>Intestatario - Data - operatore</th>
                                    <th style={{padding: '12px', color:'#000'}}>Identificativi documento</th>
                                    <th style={{padding: '12px', color:'#000'}}>Quote</th>
                                    <th style={{padding: '12px', textAlign:'right', color:'#000'}}>Importo</th>
                                    <th style={{padding: '12px', textAlign:'right', borderTopRightRadius: '6px', borderBottomRightRadius: '6px', color:'#000'}}>Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" style={{textAlign:'center', padding:'32px', color:'var(--text-secondary)'}}>
                                            Caricamento...
                                        </td>
                                    </tr>
                                ) : filteredPayments.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" style={{textAlign:'center', padding:'32px', color:'var(--text-secondary)'}}>
                                            Nessun pagamento trovato
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPayments.map(p => {
                                        const amount = parseFloat(p.importo);
                                        const isEntrata = amount >= 0;
                                        
                                        return (
                                            <tr key={p.id} onDoubleClick={() => openModal(p)} style={{
                                                backgroundColor: isEntrata ? '#fff' : '#fceceb', 
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                                borderLeft: `5px solid ${isEntrata ? '#2ecc71' : '#e74c3c'}`
                                            }}>
                                                <td style={{padding: '12px', borderTopLeftRadius: '4px', borderBottomLeftRadius: '4px'}}>
                                                    <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                                                        <div style={{width:'36px', height:'36px', borderRadius:'50%', backgroundColor: isEntrata ? '#e8f8f5' : '#fdedec', color: isEntrata ? '#2ecc71' : '#e74c3c', display:'flex', alignItems:'center', justifyContent:'center'}}>
                                                            {renderPaymentIcon(p.modalita_pagamento)}
                                                        </div>
                                                        <div>
                                                            <div style={{fontWeight:'600', color: 'var(--text-primary)'}}>{p.intestatario}</div>
                                                            <div style={{fontSize:'0.8rem', color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:'4px'}}>
                                                                {p.data_pagamento} - h 12:00:00 <User size={12}/> {p.utente_nome || 'ADMIN'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{padding: '12px'}}>
                                                    <span style={{
                                                        border: `1px solid ${isEntrata ? '#2ecc71' : '#e74c3c'}`, 
                                                        color: isEntrata ? '#2ecc71' : '#e74c3c',
                                                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold'
                                                    }}>
                                                        {p.numero_ricevuta} {p.progressivo_stagione ? `STAG: ${p.progressivo_stagione}` : ''}
                                                    </span>
                                                </td>
                                                <td style={{padding: '12px'}}>
                                                    <span style={{
                                                        border: '1px solid #ccc', borderRadius: '12px', padding: '4px 10px', fontSize: '0.8rem', background: '#fff'
                                                    }}>
                                                        {p.quote}
                                                    </span>
                                                </td>
                                                <td style={{padding: '12px', textAlign:'right'}}>
                                                    <div style={{display:'flex', justifyContent:'flex-end', alignItems:'center', gap:'10px'}}>
                                                        <span style={{
                                                            color: isEntrata ? '#2ecc71' : '#e74c3c',
                                                            fontWeight: 'bold', fontSize: '1.1rem'
                                                        }}>
                                                            {Math.abs(amount).toFixed(2).replace('.', ',')}
                                                        </span>
                                                        <span style={{
                                                            backgroundColor: isEntrata ? '#2ecc71' : '#f1948a',
                                                            color: 'white', padding: '4px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '1rem', minWidth: '80px', textAlign: 'right'
                                                        }}>
                                                            {Math.abs(amount).toFixed(2).replace('.', ',')}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td style={{padding: '12px', textAlign:'right', borderTopRightRadius: '4px', borderBottomRightRadius: '4px'}}>
                                                    <div style={{display:'flex', justifyContent:'flex-end', gap:'5px'}}>
                                                        <button style={{border:'none', width:'32px', height:'32px', borderRadius:'4px', display:'inline-flex', alignItems:'center', justifyContent:'center', cursor:'pointer', backgroundColor: '#f1c40f', color:'white'}} title="Dettaglio" onClick={() => openModal(p)}><Folder size={16} /></button>
                                                        <button style={{border:'none', width:'32px', height:'32px', borderRadius:'4px', display:'inline-flex', alignItems:'center', justifyContent:'center', cursor:'pointer', backgroundColor: '#1abc9c', color:'white'}} title="Stampa"><Printer size={16} /></button>
                                                        <button style={{border:'none', width:'32px', height:'32px', borderRadius:'4px', display:'inline-flex', alignItems:'center', justifyContent:'center', cursor:'pointer', backgroundColor: '#5dade2', color:'white'}} title="Invia"><Mail size={16} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination Footer */}
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:'15px', borderTop:'1px solid #eee', marginTop:'auto'}}>
                        <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
                            <button style={{border:'1px solid #ddd', background:'white', padding:'6px 12px', borderRadius:'4px', cursor:'pointer', color:'#333'}}>&lt;&lt;</button>
                            <button style={{border:'1px solid #ddd', background:'white', padding:'6px 12px', borderRadius:'4px', cursor:'pointer', color:'#333'}}>&lt;</button>
                            <button style={{background:'var(--primary-color)', color:'white', border:'1px solid var(--primary-color)', padding:'6px 12px', borderRadius:'4px', cursor:'pointer', fontWeight:'bold'}}>1</button>
                            <button style={{border:'1px solid #ddd', background:'white', padding:'6px 12px', borderRadius:'4px', cursor:'pointer', color:'#333'}}>&gt;</button>
                            <button style={{border:'1px solid #ddd', background:'white', padding:'6px 12px', borderRadius:'4px', cursor:'pointer', color:'#333'}}>&gt;&gt;</button>
                            <span style={{marginLeft:'10px', color:'var(--primary-color)', fontWeight:'bold'}}>Tot righe: {filteredPayments.length}</span>
                        </div>
                        <div style={{display:'flex', gap:'10px'}}>
                            <span style={{backgroundColor:'#e74c3c', color:'white', padding:'5px 15px', borderRadius:'4px', fontWeight:'bold'}}>€ {totalUscite.toFixed(2).replace('.', ',')}</span>
                            <span style={{backgroundColor:'#2ecc71', color:'white', padding:'5px 15px', borderRadius:'4px', fontWeight:'bold'}}>€ {totalEntrate.toFixed(2).replace('.', ',')}</span>
                        </div>
                    </div>
                </div>

            </div>

            {isModalOpen && (
                <PagamentoModal 
                    isOpen={isModalOpen} 
                    onClose={closeModal} 
                    payment={currentPayment} 
                    societaId={selectedSocietaId}
                />
            )}
        </div>
    );
};

export default Pagamenti;
