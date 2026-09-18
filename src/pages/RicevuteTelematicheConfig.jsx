import React, { useState, useEffect } from 'react';
import { useSocieta } from '../data/SocietaContext';
import { Save, Copy } from 'lucide-react';

const RicevuteTelematicheConfig = () => {
    const { selectedSocietaId, societaList, fetchSocieta } = useSocieta();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [moduli, setModuli] = useState([]);
    const [selectedModuloId, setSelectedModuloId] = useState('');
    const [originalModuloId, setOriginalModuloId] = useState('');

    const societa = societaList.find(s => s.id == selectedSocietaId);
    const publicLink = selectedSocietaId ? `${window.location.origin}/ricevuta-telematica/${selectedSocietaId}` : '';

    useEffect(() => {
        setMessage(null);
        if (!selectedSocietaId || societaList.length === 0) {
            if (!selectedSocietaId) setModuli([]);
            return;
        }

        (async () => {
            try {
                const response = await fetch(`/documents/api/moduli?societa_id=${selectedSocietaId}`);
                if (response.ok) {
                    const data = await response.json();
                    setModuli(data);

                    const configured = societa?.ricevuta_telematica_modulo_id;
                    const configuredExists = configured && data.some(m => m.id === configured);
                    const defaultId = configuredExists ? configured : (data[0]?.id || '');
                    setSelectedModuloId(defaultId);
                    setOriginalModuloId(defaultId);
                }
            } catch (error) {
                console.error('Error fetching moduli:', error);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSocietaId, societaList]);

    const handleSave = async () => {
        if (!selectedSocietaId) return;

        setLoading(true);
        setMessage(null);

        try {
            const response = await fetch(`/users/api/societa/${selectedSocietaId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ricevuta_telematica_modulo_id: selectedModuloId || null })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error('Errore salvataggio dati: ' + (err.error || err.message));
            }

            setOriginalModuloId(selectedModuloId);
            setMessage({ type: 'success', text: 'Configurazione salvata con successo' });
            fetchSocieta();
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: error.message || 'Errore di rete' });
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(publicLink);
            setMessage({ type: 'success', text: 'Link copiato negli appunti' });
        } catch (error) {
            console.error('Errore copia link:', error);
        }
    };

    if (!selectedSocietaId) {
        return <div style={{ padding: '20px' }}>Seleziona una società per gestire la configurazione delle ricevute telematiche.</div>;
    }

    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginBottom: '24px', fontSize: '1.2rem', fontWeight: 600, color: '#333' }}>Ricevute Telematiche</h2>

            {message && (
                <div style={{
                    padding: '10px',
                    marginBottom: '20px',
                    borderRadius: '4px',
                    backgroundColor: message.type === 'success' ? 'var(--success-container)' : 'var(--danger-container)',
                    color: message.type === 'success' ? 'var(--success)' : 'var(--danger)'
                }}>
                    {message.text}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '0.95rem', marginBottom: '15px', color: '#333', fontWeight: '600', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Modulo da compilare</label>
                    <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '10px' }}>
                        Seleziona quale modulo (tra quelli configurati in Modulistica) viene compilato e stampato quando un socio inserisce i propri dati dalla pagina pubblica. Di default viene usato il primo modulo creato.
                    </p>
                    <select
                        className="md-input"
                        value={selectedModuloId}
                        onChange={(e) => setSelectedModuloId(Number(e.target.value) || '')}
                        style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', color: '#333', backgroundColor: 'white' }}
                    >
                        {moduli.length === 0 && <option value="">Nessun modulo disponibile</option>}
                        {moduli.map(m => (
                            <option key={m.id} value={m.id}>{m.descrizione}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '0.95rem', marginBottom: '15px', color: '#333', fontWeight: '600', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Link pubblico per i soci</label>
                    <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '10px' }}>
                        Condividi questo link con i soci: potranno inserire i propri dati e stampare subito il modulo, senza bisogno di accedere al backoffice.
                    </p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                            readOnly
                            value={publicLink}
                            className="md-input"
                            style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ddd', color: '#333', backgroundColor: 'var(--surface-1)' }}
                        />
                        <button
                            onClick={handleCopyLink}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '4px', border: '1px solid #ddd', backgroundColor: 'white', color: '#333', cursor: 'pointer' }}
                        >
                            <Copy size={16} /> Copia
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
                <button
                    onClick={handleSave}
                    disabled={loading || selectedModuloId === originalModuloId}
                    style={{
                        padding: '10px 24px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: 'var(--success)',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        opacity: (loading || selectedModuloId === originalModuloId) ? 0.7 : 1
                    }}
                >
                    <Save size={18} /> Salva
                </button>
            </div>
        </div>
    );
};

export default RicevuteTelematicheConfig;
