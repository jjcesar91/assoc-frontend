import React, { useState, useEffect } from 'react';
import { useSocieta } from '../data/SocietaContext';
import { Save, RotateCcw, Mail, FileText, CheckCircle, Info } from 'lucide-react';
import SimpleEditor from '../components/SimpleEditor';
import {
    STATI_COMUNICAZIONE,
    STATO_LABELS,
    DEFAULTS,
    getComConfig,
    SHORTCODE_FIELDS_PROFORMA,
    SHORTCODE_FIELDS_COMUNI,
    SUBJECT_FIELDS_PROFORMA,
    SUBJECT_FIELDS_PAGAMENTO,
} from '../utils/comunicazioniOrdini';
import './Soci.css';

const StatoSelector = ({ value, onChange }) => (
    <div style={{ display: 'inline-flex', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
        {STATI_COMUNICAZIONE.map((s, i) => (
            <button
                key={s}
                type="button"
                onClick={() => onChange(s)}
                style={{
                    background: value === s ? 'var(--primary)' : 'white',
                    color: value === s ? 'white' : 'var(--text-secondary)',
                    border: 'none',
                    borderLeft: i > 0 ? '1px solid var(--border-color)' : 'none',
                    padding: '8px 18px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                }}
            >
                {STATO_LABELS[s]}
            </button>
        ))}
    </div>
);

const ComunicazioneCard = ({ titolo, icon, descrizione, tipo, config, setConfig, insertFields, subjectFields, societaEmail }) => {
    const disabled = config.stato === 'NON_ATTIVA';
    return (
        <div className="toolbar-card" style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'stretch', marginBottom: 24 }}>
            <div style={{ borderBottom: '1px solid #eee', paddingBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {icon} {titolo}
                </h3>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{descrizione}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Modalità</label>
                <StatoSelector value={config.stato} onChange={(s) => setConfig({ ...config, stato: s })} />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                    <strong>Non attiva</strong>: nessun invio · <strong>Chiedi</strong>: chiede conferma prima di inviare · <strong>Automatica</strong>: invia in automatico al socio.
                </span>

                {config.stato === 'AUTOMATICA' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <input
                            type="checkbox"
                            checked={!!config.cc}
                            onChange={(e) => setConfig({ ...config, cc: e.target.checked })}
                            style={{ width: 16, height: 16, cursor: 'pointer' }}
                        />
                        Invia sempre una copia (CC) alla mail della società{societaEmail ? ` (${societaEmail})` : ''}
                    </label>
                )}
            </div>

            {!disabled && (
                <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Oggetto email</label>
                        <SimpleEditor
                            subject
                            value={config.oggetto}
                            onChange={(e) => setConfig({ ...config, oggetto: e.target.value })}
                            insertFields={subjectFields}
                        />
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                            <Info size={13} /> Usa i pulsanti per inserire i campi dinamici nell'oggetto.
                        </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Testo del messaggio</label>
                        <SimpleEditor
                            value={config.testo}
                            onChange={(e) => setConfig({ ...config, testo: e.target.value })}
                            insertFields={insertFields}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, flexWrap: 'wrap', gap: 8 }}>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Info size={13} /> Usa i pulsanti in alto a destra dell'editor per inserire i campi dinamici nel punto desiderato.
                            </span>
                            <button
                                type="button"
                                className="btn-outlined"
                                style={{ height: 32, fontSize: '0.82rem' }}
                                onClick={() => setConfig({ ...config, oggetto: DEFAULTS[tipo].oggetto, testo: DEFAULTS[tipo].testo })}
                            >
                                <RotateCcw size={14} /> Ripristina testo predefinito
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const OrdiniComunicazioni = () => {
    const { selectedSocietaId, societaList, fetchSocieta } = useSocieta();

    const [proforma, setProforma] = useState({ stato: 'NON_ATTIVA', oggetto: '', testo: '', cc: false });
    const [pagamento, setPagamento] = useState({ stato: 'NON_ATTIVA', oggetto: '', testo: '', cc: false });
    const societaEmail = societaList.find(s => s.id == selectedSocietaId)?.email || '';
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        if (selectedSocietaId && societaList.length > 0) {
            const societa = societaList.find(s => s.id == selectedSocietaId);
            if (societa) {
                setProforma(getComConfig(societa, 'proforma'));
                setPagamento(getComConfig(societa, 'pagamento'));
                setMessage(null);
            }
        }
    }, [selectedSocietaId, societaList]);

    const handleSave = async () => {
        if (!selectedSocietaId) return;
        setSaving(true);
        setMessage(null);
        try {
            const payload = {
                com_proforma_stato: proforma.stato,
                com_proforma_oggetto: proforma.oggetto,
                com_proforma_testo: proforma.testo,
                com_proforma_cc: proforma.stato === 'AUTOMATICA' ? !!proforma.cc : false,
                com_pagamento_stato: pagamento.stato,
                com_pagamento_oggetto: pagamento.oggetto,
                com_pagamento_testo: pagamento.testo,
                com_pagamento_cc: pagamento.stato === 'AUTOMATICA' ? !!pagamento.cc : false,
            };
            const res = await fetch(`/users/api/societa/${selectedSocietaId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                setMessage({ type: 'success', text: 'Configurazione salvata con successo' });
                if (fetchSocieta) fetchSocieta();
            } else {
                const err = await res.json().catch(() => ({}));
                setMessage({ type: 'error', text: 'Errore nel salvataggio: ' + (err.error || err.message || 'sconosciuto') });
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'Errore di rete: ' + e.message });
        } finally {
            setSaving(false);
        }
    };

    if (!selectedSocietaId) {
        return (
            <div className="soci-full-container">
                <div className="main-content">
                    <div style={{ padding: 24, color: 'var(--text-secondary)' }}>Seleziona una società per configurare le comunicazioni.</div>
                </div>
            </div>
        );
    }

    return (
        <div className="soci-full-container">
            <div className="main-content">
                {message && (
                    <div style={{
                        backgroundColor: message.type === 'success' ? 'var(--success-container)' : 'var(--danger-container)',
                        color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
                        padding: '12px', borderRadius: '4px', marginBottom: '20px',
                        display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                        {message.type === 'success' && <CheckCircle size={16} />} {message.text}
                    </div>
                )}

                <p style={{ color: 'var(--text-secondary)', marginTop: 0, marginBottom: 20 }}>
                    Configura le email automatiche inviate al socio nei momenti chiave del ciclo di un ordine.
                </p>

                <ComunicazioneCard
                    titolo="Comunicazione nuova proforma"
                    icon={<FileText size={18} />}
                    descrizione="Inviata al socio quando viene creata una proforma. Informa della creazione dell'ordine e, per i conti di tipo Bonifico, include le istruzioni di pagamento."
                    tipo="proforma"
                    config={proforma}
                    setConfig={setProforma}
                    insertFields={SHORTCODE_FIELDS_PROFORMA}
                    subjectFields={SUBJECT_FIELDS_PROFORMA}
                    societaEmail={societaEmail}
                />

                <ComunicazioneCard
                    titolo="Comunicazione ordine pagato"
                    icon={<Mail size={18} />}
                    descrizione="Inviata quando una proforma viene convertita in pagamento. Conferma l'ordine, comunica la registrazione del pagamento e allega la ricevuta in PDF."
                    tipo="pagamento"
                    config={pagamento}
                    setConfig={setPagamento}
                    insertFields={SHORTCODE_FIELDS_COMUNI}
                    subjectFields={SUBJECT_FIELDS_PAGAMENTO}
                    societaEmail={societaEmail}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn-contained" onClick={handleSave} disabled={saving} style={{ height: 44, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Save size={18} /> {saving ? 'Salvataggio...' : 'Salva configurazione'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrdiniComunicazioni;
