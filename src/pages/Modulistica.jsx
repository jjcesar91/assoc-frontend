import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, X, Bold, Italic, Underline, List, Printer, Calendar } from 'lucide-react';
import { useSocieta } from '../data/SocietaContext';
import { useConfirm } from '../components/ConfirmModal';

const Modulistica = () => {
    const { selectedSocietaId, societaList } = useSocieta();
    const confirm = useConfirm();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ descrizione: '', testo: '' });
    const [editingId, setEditingId] = useState(null);
    const [modalContent, setModalContent] = useState('');
    const contentRef = useRef(null);
    
    // Print Modal State
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printDate, setPrintDate] = useState('');
    const [moduloToPrint, setModuloToPrint] = useState(null);

    const [moduli, setModuli] = useState([]);

    useEffect(() => {
        if (isModalOpen && contentRef.current) {
            contentRef.current.innerHTML = modalContent;
             // Delay focus slightly to ensure DOM is ready
            setTimeout(() => {
                 if (contentRef.current) contentRef.current.focus();
            }, 50);
        }
    }, [isModalOpen, modalContent]); // Depend on modalContent too, so initial load works correctly

    useEffect(() => {
        const script = document.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
        script.async = true;
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        }
    }, []);

    useEffect(() => {
        // Chiudi modali aperti al cambio società
        setIsModalOpen(false);
        setIsPrintModalOpen(false);
        fetchModuli();
    }, [selectedSocietaId]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchModuli = async () => {
        try {
            const response = await fetch('/documents/api/moduli');
            if (response.ok) {
                const data = await response.json();
                setModuli(data);
            } else {
                console.error("Failed to fetch moduli");
            }
        } catch (error) {
            console.error("Error fetching moduli:", error);
        }
    };

    const handleOpenModal = () => {
        setEditingId(null);
        setFormData({ descrizione: '', testo: '' });
        setModalContent('');
        setIsModalOpen(true);
    };

    const handleEdit = (modulo) => {
        setEditingId(modulo.id);
        setFormData({ descrizione: modulo.descrizione, testo: modulo.testo });
        setModalContent(modulo.htmlContent || modulo.testo || '');
        setIsModalOpen(true);
    };

    const handlePrintRequest = (modulo) => {
        setModuloToPrint(modulo);
        setPrintDate(new Date().toISOString().split('T')[0]);
        setIsPrintModalOpen(true);
    };

    const handleConfirmPrint = () => {
        if (moduloToPrint && printDate) {
            executePrint(moduloToPrint, printDate);
            setIsPrintModalOpen(false);
        }
    };

    const executePrint = (modulo, dateToPrint) => {
        let societa = null;
        if (selectedSocietaId && societaList.length > 0) {
            societa = societaList.find(s => s.id == selectedSocietaId);
        }
        
        // Ensure path handling is correct regardless of stored format
        let logoUrl = '';
        if (societa && societa.logo_path) {
            // Check if logo_path is already a full URL or blob, if not prepend /users/
            if (societa.logo_path.startsWith('http') || societa.logo_path.startsWith('blob:') || societa.logo_path.startsWith('data:')) {
                logoUrl = societa.logo_path;
            } else {
                logoUrl = `/users/${societa.logo_path.startsWith('/') ? societa.logo_path.slice(1) : societa.logo_path}`;
            }
        }
        
        const denomination = societa ? societa.denominazione : 'Nome Società';
        const address = societa ? `${societa.indirizzo || ''} ${societa.cap || ''} ${societa.comune || ''} ${societa.provincia ? '('+societa.provincia+')' : ''}` : '';
        const cf = societa ? `CF: ${societa.codice_fiscale || ''} ${societa.partita_iva ? ' - P.IVA: ' + societa.partita_iva : ''}` : '';
        const footerText = societa ? (societa.footer_text || '') : '';
        const today = new Date(dateToPrint).toLocaleDateString('it-IT');

        // Helper to convert image to base64 to avoid CORS/Loading issues in PDF
        const getBase64Image = (url) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.src = url;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/png'));
                };
                img.onerror = reject;
            });
        };

        const generatePDF = (logoBase64 = null) => {
            const element = document.createElement('div');
            // Use 100% width but limit max-width for A4
            element.style.width = '100%'; 
            element.style.maxWidth = '800px';
            element.innerHTML = `
            <div style="padding: 20px; font-family: 'Helvetica', 'Arial', sans-serif; color: #000; background: white;">
                
                <!-- HEADER - Flexbox with strict widths -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; margin-bottom: 20px; padding-bottom: 15px;">
                    <!-- Logo container -->
                    <div style="flex: 0 0 150px; height: 100px; display: flex; align-items: center; justify-content: flex-start;">
                        ${logoBase64 ? `<img src="${logoBase64}" style="max-height: 100px; max-width: 150px; object-fit: contain;" />` : ''}
                    </div>
                    
                    <!-- Company Info -->
                    <div style="flex: 1; text-align: right; padding-left: 20px;">
                        <h3 style="margin: 0; font-size: 16pt; font-weight: bold; line-height: 1.2;">${denomination}</h3>
                        <div style="font-size: 10pt; margin-top: 5px; line-height: 1.3;">${address}</div>
                        <div style="font-size: 10pt; margin-top: 2px;">${cf}</div>
                    </div>
                </div>

                <!-- TITLE -->
                <h1 style="text-align: center; font-size: 20pt; font-weight: bold; margin: 0 0 30px 0; text-transform: uppercase;">${modulo.descrizione}</h1>

                <!-- MEMBER TABLE -->
                <style>
                    .pdf-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 10pt; }
                    .pdf-table td { border: 1px solid #000; padding: 8px; vertical-align: top; }
                    .pdf-label { font-size: 8pt; text-transform: uppercase; color: #000; margin-bottom: 4px; font-weight: bold; }
                    .pdf-value { min-height: 18px; }
                </style>
                <table class="pdf-table">
                    <tr>
                        <td style="width: 25%;">
                            <div class="pdf-label">COGNOME</div>
                            <div class="pdf-value"></div>
                        </td>
                        <td style="width: 25%;">
                            <div class="pdf-label">NOME</div>
                            <div class="pdf-value"></div>
                        </td>
                        <td style="width: 25%;">
                            <div class="pdf-label">DATA DI NASCITA</div>
                            <div class="pdf-value"></div>
                        </td>
                        <td style="width: 25%;">
                            <div class="pdf-label">LUOGO DI NASCITA</div>
                            <div class="pdf-value"></div>
                        </td>
                    </tr>
                    <tr>
                         <td colspan="2">
                            <div class="pdf-label">CODICE FISCALE</div>
                            <div class="pdf-value"></div>
                        </td>
                         <td>
                            <div class="pdf-label">TELEFONO</div>
                            <div class="pdf-value"></div>
                        </td>
                        <td>
                            <div class="pdf-label">EMAIL</div>
                            <div class="pdf-value"></div>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="4">
                            <div class="pdf-label">INDIRIZZO RESIDENZA</div>
                            <div class="pdf-value"></div>
                        </td>
                    </tr>
                </table>

                <!-- BODY CONTENT -->
                <div style="font-size: 11pt; line-height: 1.6; text-align: justify; margin-bottom: 60px;">
                    ${modulo.htmlContent || modulo.testo || ''}
                </div>

                <!-- SIGNATURES -->
                <table style="width: 100%; margin-top: 50px; border: none;">
                    <tr>
                        <td style="width: 40%; vertical-align: bottom; font-size: 12pt;">
                            ${today}
                        </td>
                        <td style="width: 20%;"></td>
                        <td style="width: 40%; text-align: center; vertical-align: bottom;">
                            <div style="font-size: 12pt; margin-bottom: 40px; text-align: left;">Firma</div>
                            <div style="border-bottom: 1px solid #000; height: 1px;"></div>
                        </td>
                    </tr>
                </table>
            </div>
            `;

            const opt = {
                margin: 0.5,
                filename: `${modulo.descrizione.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { 
                    scale: 2, 
                    useCORS: true
                },
                jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
            };

            if (window.html2pdf) {
                // Short timeout to ensure DOM rendering completes
                setTimeout(() => {
                    window.html2pdf().set(opt).from(element).save();
                }, 500);
            } else {
                alert("La libreria PDF sta caricando, riprova tra un secondo.");
            }
        };

        if (logoUrl) {
            getBase64Image(logoUrl)
                .then(base64 => generatePDF(base64))
                .catch(err => {
                    console.error("Error loading logo:", err);
                    generatePDF(); // Fallback without logo
                });
        } else {
            generatePDF();
        }
    };

    const handleDelete = async (id) => {
        if (await confirm('Sei sicuro di voler eliminare questo modulo?')) {
            try {
                const response = await fetch(`/documents/api/moduli/${id}`, {
                    method: 'DELETE'
                });
                if (response.ok) {
                    setModuli(moduli.filter(m => m.id !== id));
                } else {
                    alert('Errore durante l\'eliminazione del modulo');
                }
            } catch (error) {
                console.error("Error deleting modulo:", error);
                alert('Errore di rete durante l\'eliminazione');
            }
        }
    };

    const handleSave = async () => {
        const finalContent = contentRef.current ? contentRef.current.innerHTML : '';
        const plainText = contentRef.current ? contentRef.current.innerText : '';
        
        const payload = {
            descrizione: formData.descrizione,
            testo: plainText,
            htmlContent: finalContent
        };

        try {
            if (editingId) {
                const response = await fetch(`/documents/api/moduli/${editingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                if (response.ok) {
                    const updatedModulo = await response.json();
                    setModuli(moduli.map(m => m.id === editingId ? updatedModulo : m));
                    setIsModalOpen(false);
                } else {
                    alert('Errore durante l\'aggiornamento del modulo');
                }
            } else {
                const response = await fetch('/documents/api/moduli', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    const newModulo = await response.json();
                    setModuli([...moduli, newModulo]);
                    setIsModalOpen(false);
                } else {
                    alert('Errore durante la creazione del modulo');
                }
            }
        } catch (error) {
            console.error("Error saving modulo:", error);
            alert('Errore di rete durante il salvataggio');
        }
    };

    const execCommand = (command, value = null) => {
        document.execCommand(command, false, value);
        if (contentRef.current) contentRef.current.focus();
    };


    const filteredModuli = moduli.filter(modulo => 
        modulo.descrizione.toLowerCase().includes(searchTerm.toLowerCase()) ||
        modulo.testo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'white', color: '#333', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginBottom: '24px', fontSize: '1.2rem', fontWeight: 600, color: '#333' }}>Modulistica</h2>
            
            {/* Top Bar: Search and Add Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                {/* Search Bar */}
                <div style={{ position: 'relative', width: '300px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                    <input 
                        type="text" 
                        placeholder="Cerca moduli..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="md-input"
                        style={{ 
                            width: '100%', 
                            padding: '8px 12px 8px 35px', 
                            borderRadius: '4px',
                            border: '1px solid #ddd'
                        }} 
                    />
                </div>

                {/* New Module Button */}
                <button 
                    style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        backgroundColor: '#007bff', 
                        color: 'white', 
                        border: 'none', 
                        padding: '8px 16px', 
                        borderRadius: '4px', 
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                    }}
                    onClick={handleOpenModal}
                >
                    <Plus size={18} />
                    Nuovo modulo
                </button>
            </div>

            {/* Table */}
            <div style={{ flex: 1, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #eee' }}>
                            <th style={{ padding: '12px', fontWeight: 600, color: '#555' }}>Descrizione</th>
                            <th style={{ padding: '12px', fontWeight: 600, color: '#555' }}>Testo (parziale)</th>
                            <th style={{ padding: '12px', fontWeight: 600, color: '#555', width: '100px' }}>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredModuli.length > 0 ? (
                            filteredModuli.map((modulo) => (
                                <tr key={modulo.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '12px' }}>{modulo.descrizione}</td>
                                    <td style={{ padding: '12px', color: '#666' }}>{modulo.testo.length > 50 ? modulo.testo.substring(0, 50) + '...' : modulo.testo}</td>
                                    <td style={{ padding: '12px' }}>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button 
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#28a745' }} 
                                                title="Stampa PDF"
                                                onClick={() => handlePrintRequest(modulo)}
                                            >
                                                <Printer size={18} />
                                            </button>
                                            <button 
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555' }} 
                                                title="Modifica"
                                                onClick={() => handleEdit(modulo)}
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button 
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d32f2f' }} 
                                                title="Elimina"
                                                onClick={() => handleDelete(modulo.id)}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                                    Nessun modulo trovato
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white', borderRadius: '8px', padding: '24px', width: '90%', maxWidth: '800px',
                        maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#333' }}>{editingId ? 'Modifica Modulo' : 'Nuovo Modulo'}</h3>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#333' }}>Descrizione</label>
                            <input
                                type="text"
                                className="md-input"
                                value={formData.descrizione}
                                onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', color: '#333' }}
                                placeholder="Inserisci una descrizione..."
                            />
                        </div>

                        <div style={{ marginBottom: '20px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#333' }}>Contenuto</label>
                            
                            {/* Toolbar */}
                            <div style={{ border: '1px solid #ddd', borderBottom: 'none', padding: '8px', display: 'flex', gap: '8px', alignItems: 'center', borderRadius: '4px 4px 0 0', backgroundColor: '#f9f9f9', flexWrap: 'wrap' }}>
                                <button onClick={() => execCommand('bold')} title="Grassetto" style={{ padding: '4px', cursor: 'pointer', background: 'none', border: '1px solid transparent', borderRadius: '3px', color: '#333' }}><Bold size={18} /></button>
                                <button onClick={() => execCommand('italic')} title="Corsivo" style={{ padding: '4px', cursor: 'pointer', background: 'none', border: '1px solid transparent', borderRadius: '3px', color: '#333' }}><Italic size={18} /></button>
                                <button onClick={() => execCommand('underline')} title="Sottolineato" style={{ padding: '4px', cursor: 'pointer', background: 'none', border: '1px solid transparent', borderRadius: '3px', color: '#333' }}><Underline size={18} /></button>
                                <button onClick={() => execCommand('insertUnorderedList')} title="Elenco puntato" style={{ padding: '4px', cursor: 'pointer', background: 'none', border: '1px solid transparent', borderRadius: '3px', color: '#333' }}><List size={18} /></button>
                                <div style={{ width: '1px', height: '20px', backgroundColor: '#ddd', margin: '0 4px' }}></div>
                                <select 
                                    onChange={(e) => execCommand('fontSize', e.target.value)} 
                                    style={{ padding: '4px', borderRadius: '4px', border: '1px solid #ddd', cursor: 'pointer', color: '#333', backgroundColor: 'white' }}
                                    defaultValue="3"
                                >
                                    <option value="1">Molto piccolo</option>
                                    <option value="2">Piccolo</option>
                                    <option value="3">Normale</option>
                                    <option value="4">Media</option>
                                    <option value="5">Grande</option>
                                    <option value="6">Molto grande</option>
                                    <option value="7">Enorme</option>
                                </select>
                            </div>
                            
                            {/* Editor Area */}
                            <div
                                ref={contentRef}
                                contentEditable
                                style={{
                                    border: '1px solid #ddd',
                                    borderRadius: '0 0 4px 4px',
                                    padding: '12px',
                                    minHeight: '200px',
                                    flex: 1,
                                    outline: 'none',
                                    color: '#333',
                                    overflowY: 'auto'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px', paddingTop: '20px', borderTop: '1px solid #eee', flexShrink: 0 }}>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                style={{
                                    padding: '10px 20px', borderRadius: '4px', border: '1px solid #ddd', backgroundColor: 'white', color: '#333', cursor: 'pointer'
                                }}
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleSave}
                                style={{
                                    padding: '10px 20px', borderRadius: '4px', border: 'none', backgroundColor: '#007bff', color: 'white', cursor: 'pointer'
                                }}
                            >
                                Salva
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Date Modal */}
            {isPrintModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white', borderRadius: '8px', padding: '24px', width: '90%', maxWidth: '400px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#333' }}>Stampa Modulo</h3>
                            <button onClick={() => setIsPrintModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#333' }}>Seleziona la data per il documento</label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input 
                                    type="date" 
                                    className="md-input"
                                    value={printDate} 
                                    onChange={(e) => setPrintDate(e.target.value)}
                                    style={{ width: '100%', padding: '10px 35px 10px 10px', borderRadius: '4px', border: '1px solid #ddd', color: '#333' }}
                                />
                                <Calendar 
                                    size={18} 
                                    style={{ position: 'absolute', right: '10px', color: '#6b7280', cursor: 'pointer', zIndex: 5 }} 
                                    onClick={(e) => {
                                        // Try to find the input sibling to show picker
                                        const input = e.currentTarget.parentNode.querySelector('input[type="date"]');
                                        if (input && input.showPicker) input.showPicker();
                                    }} 
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                             <button
                                onClick={() => setIsPrintModalOpen(false)}
                                style={{
                                    padding: '10px 20px', borderRadius: '4px', border: '1px solid #ddd', backgroundColor: 'white', color: '#333', cursor: 'pointer'
                                }}
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleConfirmPrint}
                                style={{
                                    padding: '10px 20px', borderRadius: '4px', border: 'none', backgroundColor: '#007bff', color: 'white', cursor: 'pointer'
                                }}
                            >
                                Conferma e Stampa
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Modulistica;
