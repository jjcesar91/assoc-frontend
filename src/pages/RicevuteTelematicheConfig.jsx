import React, { useState, useEffect } from 'react';
import { useSocieta } from '../data/SocietaContext';
import { Save, Copy, ShieldCheck, RefreshCw } from 'lucide-react';
import { useConfirm } from '../components/ConfirmModal';

const RicevuteTelematicheConfig = () => {
    const { selectedSocietaId, societaList, fetchSocieta } = useSocieta();
    const confirm = useConfirm();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [moduli, setModuli] = useState([]);
    const [selectedModuloId, setSelectedModuloId] = useState('');
    const [originalModuloId, setOriginalModuloId] = useState('');
    const [prodotti, setProdotti] = useState([]);
    const [selectedProdottoId, setSelectedProdottoId] = useState('');
    const [originalProdottoId, setOriginalProdottoId] = useState('');
    const [conti, setConti] = useState([]);
    const [selectedContoId, setSelectedContoId] = useState('');
    const [originalContoId, setOriginalContoId] = useState('');
    const [certLoading, setCertLoading] = useState(false);

    const societa = societaList.find(s => s.id == selectedSocietaId);
    const publicLink = selectedSocietaId ? `${window.location.origin}/ricevuta-telematica/${selectedSocietaId}` : '';

    useEffect(() => {
        setMessage(null);
        if (!selectedSocietaId || societaList.length === 0) {
            if (!selectedSocietaId) { setModuli([]); setProdotti([]); setConti([]); }
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

        (async () => {
            try {
                const response = await fetch(`/products/api?societaId=${selectedSocietaId}`);
                if (response.ok) {
                    const data = await response.json();
                    setProdotti(Array.isArray(data) ? data : []);

                    // A differenza del modulo, per il prodotto non c'è un default automatico:
                    // se non è (più) configurato un prodotto valido per questa società, resta "Nessuno".
                    const configured = societa?.ricevuta_telematica_prodotto_id;
                    const configuredExists = configured && data.some(p => p.id === configured);
                    const defaultId = configuredExists ? configured : '';
                    setSelectedProdottoId(defaultId);
                    setOriginalProdottoId(defaultId);
                }
            } catch (error) {
                console.error('Error fetching prodotti:', error);
            }
        })();

        (async () => {
            try {
                const response = await fetch(`/payments/api/conti?societa_id=${selectedSocietaId}`);
                if (response.ok) {
                    const data = await response.json();
                    setConti(Array.isArray(data) ? data : []);

                    // Come per il prodotto, nessun default automatico.
                    const configured = societa?.ricevuta_telematica_conto_id;
                    const configuredExists = configured && data.some(c => c.id === configured);
                    const defaultId = configuredExists ? configured : '';
                    setSelectedContoId(defaultId);
                    setOriginalContoId(defaultId);
                }
            } catch (error) {
                console.error('Error fetching conti:', error);
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
                body: JSON.stringify({
                    ricevuta_telematica_modulo_id: selectedModuloId || null,
                    ricevuta_telematica_prodotto_id: selectedProdottoId || null,
                    ricevuta_telematica_conto_id: selectedContoId || null,
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error('Errore salvataggio dati: ' + (err.error || err.message));
            }

            setOriginalModuloId(selectedModuloId);
            setOriginalProdottoId(selectedProdottoId);
            setOriginalContoId(selectedContoId);
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

    // Il file scaricato non è un vero certificato TLS: è una pagina che, aperta nel
    // browser del cliente, naviga verso l'endpoint pubblico che installa il cookie
    // di verifica per questa società (vedi backend: certificatoController.installaCertificato).
    // Aprirlo una volta sul browser del cliente "installa" il certificato su quel browser.
    const buildCertificatoHtml = (societaId, token, denominazione) => {
        const installUrl = `${window.location.origin}/users/api/public/rt-certificato/installa?societaId=${societaId}&token=${token}`;
        return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8"><title>Installazione certificato</title></head>
<body>
<p>Installazione del certificato per "${denominazione}" in corso...</p>
<p>Se non vieni reindirizzato automaticamente, <a href="${installUrl}">clicca qui</a>.</p>
<script>window.location.replace(${JSON.stringify(installUrl)});</script>
</body>
</html>`;
    };

    const handleDownloadCertificato = async () => {
        if (!selectedSocietaId) return;
        setCertLoading(true);
        setMessage(null);
        try {
            const response = await fetch(`/users/api/societa/${selectedSocietaId}/certificato`);
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || 'Errore durante la generazione del certificato');
            }
            const { societaId, token } = await response.json();
            const html = buildCertificatoHtml(societaId, token, societa?.denominazione || 'società');
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const slug = (societa?.denominazione || 'societa').toLowerCase().replace(/[^a-z0-9]+/g, '-');
            a.download = `certificato-${slug}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: error.message || 'Errore di rete' });
        } finally {
            setCertLoading(false);
        }
    };

    const handleRigeneraCertificato = async () => {
        const ok = await confirm(
            'Il certificato già installato sui browser dei client smetterà di funzionare: dovrai riscaricarlo e reinstallarlo. Continuare?',
            'Rigenera certificato',
            { confirmLabel: 'Rigenera', confirmColor: 'var(--warning)' }
        );
        if (!ok) return;

        setCertLoading(true);
        setMessage(null);
        try {
            const response = await fetch(`/users/api/societa/${selectedSocietaId}/certificato/rigenera`, { method: 'POST' });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || 'Errore durante la rigenerazione del certificato');
            }
            setMessage({ type: 'success', text: 'Certificato rigenerato: scarica e installa la nuova versione sui browser dei client.' });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: error.message || 'Errore di rete' });
        } finally {
            setCertLoading(false);
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
                    <label style={{ display: 'block', fontSize: '0.95rem', marginBottom: '15px', color: '#333', fontWeight: '600', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Certificato di sicurezza</label>
                    <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '10px' }}>
                        Il link pubblico si apre solo dai browser su cui è stato installato il certificato di questa società: senza, la pagina risponde 403. Scarica il file e aprilo (una sola volta) sul browser del computer del cliente per installarlo; da quel momento il link sotto si aprirà normalmente su quel browser.
                    </p>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                            onClick={handleDownloadCertificato}
                            disabled={certLoading}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '4px', border: 'none', backgroundColor: 'var(--primary-color)', color: 'white', cursor: 'pointer', opacity: certLoading ? 0.7 : 1 }}
                        >
                            <ShieldCheck size={16} /> Scarica certificato
                        </button>
                        <button
                            onClick={handleRigeneraCertificato}
                            disabled={certLoading}
                            title="Invalida il certificato già installato sui client: dovrà essere riscaricato e reinstallato"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '4px', border: '1px solid #ddd', backgroundColor: 'white', color: '#333', cursor: 'pointer', opacity: certLoading ? 0.7 : 1 }}
                        >
                            <RefreshCw size={16} /> Rigenera certificato
                        </button>
                    </div>
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
                    <label style={{ display: 'block', fontSize: '0.95rem', marginBottom: '15px', color: '#333', fontWeight: '600', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Proforma automatica</label>
                    <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '10px' }}>
                        Se selezioni un prodotto, alla conferma il socio genera automaticamente anche una proforma per quel prodotto (da registrare poi in Ricevute, come le altre proforma). Lascia su "Nessuno" per non generare alcuna proforma.
                    </p>
                    <select
                        className="md-input"
                        value={selectedProdottoId}
                        onChange={(e) => setSelectedProdottoId(Number(e.target.value) || '')}
                        style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', color: '#333', backgroundColor: 'white' }}
                    >
                        <option value="">Nessuno (non generare una proforma)</option>
                        {prodotti.map(p => (
                            <option key={p.id} value={p.id}>{p.description} (€{Number(p.basePrice || 0).toFixed(2)})</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '0.95rem', marginBottom: '15px', color: '#333', fontWeight: '600', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Conto per l'incasso</label>
                    <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '10px' }}>
                        Conto usato quando, dalla pagina "Invio Ricevute", confermi in blocco le proforme trasformandole in ricevute pagate. Obbligatorio per poter usare quella pagina.
                    </p>
                    <select
                        className="md-input"
                        value={selectedContoId}
                        onChange={(e) => setSelectedContoId(Number(e.target.value) || '')}
                        style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', color: '#333', backgroundColor: 'white' }}
                    >
                        <option value="">Nessuno selezionato</option>
                        {conti.map(c => (
                            <option key={c.id} value={c.id}>{c.descrizione}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
                <button
                    onClick={handleSave}
                    disabled={loading || (selectedModuloId === originalModuloId && selectedProdottoId === originalProdottoId && selectedContoId === originalContoId)}
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
                        opacity: (loading || (selectedModuloId === originalModuloId && selectedProdottoId === originalProdottoId && selectedContoId === originalContoId)) ? 0.7 : 1
                    }}
                >
                    <Save size={18} /> Salva
                </button>
            </div>
        </div>
    );
};

export default RicevuteTelematicheConfig;
