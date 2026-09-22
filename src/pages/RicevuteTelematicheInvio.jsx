import React, { useEffect, useState } from 'react';
import { useSocieta } from '../data/SocietaContext';
import { useConfirm } from '../components/ConfirmModal';
import { useAlert } from '../components/AlertModal';
import { formatDateIT } from '../utils/dateUtils';

// Elenco (non paginato) delle proforme generate dalla pagina pubblica
// /ricevuta-telematica/:societaId — riconosciute dall'etichetta
// "Ricevuta Telematica" impostata da RicevutaTelematicaController.create (le
// distingue dalle altre proforme "origine: cliente", es. area soci).
// "Conferma e invia ricevute" le trasforma in blocco in ricevute pagate,
// riusando l'endpoint già esistente PATCH /:id/converti-proforma, con
// conto_destinazione preso dal Conto configurato in Ricevute Telematiche > Configurazione.
const ETICHETTA_RICEVUTA_TELEMATICA = 'Ricevuta Telematica';

const RicevuteTelematicheInvio = () => {
    const { selectedSocietaId, societaList } = useSocieta();
    const confirm = useConfirm();
    const showAlert = useAlert();

    const [proforme, setProforme] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [conti, setConti] = useState([]);
    const [confirming, setConfirming] = useState(false);

    const societa = societaList.find(s => s.id == selectedSocietaId);
    const contoConfigurato = conti.find(c => c.id === societa?.ricevuta_telematica_conto_id) || null;

    const fetchProforme = async () => {
        if (!selectedSocietaId) {
            setProforme([]);
            return;
        }
        setLoading(true);
        try {
            const params = new URLSearchParams({
                societa_id: selectedSocietaId,
                tipo_documento: 'proforma',
                origine: 'cliente',
                etichetta: ETICHETTA_RICEVUTA_TELEMATICA,
            });
            const response = await fetch(`/payments/api?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setProforme(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Error fetching proforme telematiche:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setSelectedIds(new Set());
        fetchProforme();

        if (!selectedSocietaId) {
            setConti([]);
            return;
        }
        (async () => {
            try {
                const response = await fetch(`/payments/api/conti?societa_id=${selectedSocietaId}`);
                if (response.ok) {
                    const data = await response.json();
                    setConti(Array.isArray(data) ? data : []);
                }
            } catch (error) {
                console.error('Error fetching conti:', error);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSocietaId]);

    const allSelected = proforme.length > 0 && selectedIds.size === proforme.length;

    const toggleAll = () => {
        setSelectedIds(allSelected ? new Set() : new Set(proforme.map(p => p.id)));
    };

    const toggleOne = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const selectedCount = selectedIds.size;

    const handleConfermaInvio = async () => {
        if (selectedCount === 0) return;
        if (!contoConfigurato) {
            showAlert('Configura prima un conto in Ricevute Telematiche > Configurazione.', 'Conto non configurato', 'warning');
            return;
        }
        const confermato = await confirm(
            `Confermare e trasformare in ricevute pagate le ${selectedCount} proforme selezionate?`,
            'Conferma invio ricevute',
            { confirmLabel: 'Conferma', confirmColor: 'var(--success)' }
        );
        if (!confermato) return;

        setConfirming(true);
        let ok = 0;
        let fail = 0;
        for (const id of selectedIds) {
            try {
                const res = await fetch(`/payments/api/${id}/converti-proforma`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ conto_destinazione: contoConfigurato.descrizione }),
                });
                if (res.ok) ok++; else fail++;
            } catch (error) {
                console.error('Errore conferma proforma', id, error);
                fail++;
            }
        }
        setConfirming(false);
        setSelectedIds(new Set());
        await fetchProforme();

        if (fail === 0) {
            showAlert(`${ok} ricevute confermate con successo.`, 'Fatto', 'success');
        } else {
            showAlert(`${ok} ricevute confermate, ${fail} non riuscite. Riprova per quelle rimaste in elenco.`, 'Completato parzialmente', 'warning');
        }
    };

    const contoMancante = !contoConfigurato;

    if (!selectedSocietaId) {
        return <div style={{ padding: '20px' }}>Seleziona una società per gestire l'invio delle ricevute telematiche.</div>;
    }

    return (
        <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'white', color: '#333', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600, color: '#333' }}>Invio Ricevute</h2>
                <button
                    onClick={handleConfermaInvio}
                    disabled={selectedCount === 0 || confirming}
                    style={{
                        padding: '10px 20px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: 'var(--success)',
                        color: 'white',
                        cursor: (selectedCount === 0 || confirming) ? 'not-allowed' : 'pointer',
                        fontSize: '0.9rem',
                        opacity: (selectedCount === 0 || confirming) ? 0.6 : 1,
                    }}
                >
                    {confirming ? 'Conferma in corso...' : `Conferma e invia ricevute${selectedCount ? ` (${selectedCount})` : ''}`}
                </button>
            </div>

            {contoMancante && (
                <div style={{ padding: '10px', marginBottom: '16px', borderRadius: '4px', backgroundColor: 'var(--danger-container)', color: 'var(--danger)', fontSize: '0.85rem' }}>
                    Nessun conto configurato: vai in Ricevute Telematiche &gt; Configurazione per impostarlo prima di poter confermare.
                </div>
            )}

            <div style={{ flex: 1, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #eee' }}>
                            <th style={{ padding: '12px', width: '40px' }}>
                                <input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={proforme.length === 0} />
                            </th>
                            <th style={{ padding: '12px', fontWeight: 600, color: '#555' }}>Socio</th>
                            <th style={{ padding: '12px', fontWeight: 600, color: '#555' }}>Data</th>
                            <th style={{ padding: '12px', fontWeight: 600, color: '#555' }}>Prodotto</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Caricamento...</td></tr>
                        ) : proforme.length > 0 ? (
                            proforme.map((p) => (
                                <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '12px' }}>
                                        <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleOne(p.id)} />
                                    </td>
                                    <td style={{ padding: '12px' }}>{p.intestatario || '—'}</td>
                                    <td style={{ padding: '12px' }}>{formatDateIT(p.data_pagamento) || '—'}</td>
                                    <td style={{ padding: '12px' }}>{p.quote || '—'}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                                    Nessuna proforma da inviare
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default RicevuteTelematicheInvio;
