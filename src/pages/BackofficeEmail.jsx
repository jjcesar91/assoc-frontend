import React, { useState, useEffect, useCallback } from 'react';
import { Mail, Save, RotateCcw, Eye, X } from 'lucide-react';
import SimpleEditor from '../components/SimpleEditor';
import BackofficeTabs, { BackofficeTabPanel } from '../components/BackofficeTabs';
import { useSchedaAttiva } from '../components/useSchedaAttiva';
import { useAlert } from '../components/AlertModal';
import { useConfirm } from '../components/ConfirmModal';
import './Prodotti.css';

const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
const parseList = (text) => [...new Set(String(text || '').split(/[\s,;]+/).map(v => v.trim().toLowerCase()).filter(Boolean))];

const card = { padding: '20px 24px', marginBottom: '16px' };
const label = { display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' };
const hint = { fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: '4px' };

// Comunicazione: oggetto e testo con segnaposto, destinatari in copia nascosta,
// anteprima e ripristino del testo predefinito
const EmailCard = ({ template, onSaved, onAnteprima, onDirtyChange }) => {
    const showAlert = useAlert();
    const confirm = useConfirm();
    const [oggetto, setOggetto] = useState(template.oggetto);
    const [corpo, setCorpo] = useState(template.corpo_html);
    const [ccn, setCcn] = useState(template.ccn.join('\n'));
    const [ccnError, setCcnError] = useState('');
    const [saving, setSaving] = useState(false);
    const ccnList = parseList(ccn);
    const dirty = oggetto !== template.oggetto || corpo !== template.corpo_html || ccnList.join(',') !== template.ccn.join(',');

    // La scheda segnala le modifiche non salvate
    useEffect(() => { onDirtyChange?.(template.chiave, dirty); }, [dirty, template.chiave, onDirtyChange]);

    const salva = async () => {
        const invalidi = ccnList.filter(v => !EMAIL.test(v));
        if (invalidi.length) { setCcnError(`Indirizzi non validi: ${invalidi.join(', ')}`); return; }
        setSaving(true);
        try {
            const res = await fetch(`/users/api/email-template/${template.chiave}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oggetto, corpo_html: corpo, ccn: ccnList }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                if (data.field === 'ccn') setCcnError(data.error);
                else showAlert(data.error || 'Errore nel salvataggio', 'Errore');
                return;
            }
            onSaved(data);
            setOggetto(data.oggetto);
            setCorpo(data.corpo_html);
        } catch {
            showAlert('Errore di rete', 'Errore');
        } finally {
            setSaving(false);
        }
    };

    const ripristina = async () => {
        const ok = await confirm(`Ripristinare oggetto e testo predefiniti di "${template.nome}"? Le modifiche non salvate andranno perse.`, 'Ripristina testo predefinito');
        if (!ok) return;
        setOggetto(template.default_oggetto);
        setCorpo(template.default_corpo_html);
    };

    return (
        <div className="table-card" style={card}>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <Mail size={18} style={{ color: 'var(--primary)' }} />
                    <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{template.nome}</h3>
                    <span className={`badge ${template.personalizzato ? 'badge-primary' : 'badge-info'}`}>{template.personalizzato ? 'Personalizzato' : 'Predefinito'}</span>
                    {template.ccn.length > 0 && <span className="badge badge-info">{template.ccn_label ? 'Destinatari' : 'CCN'}: {template.ccn.length}</span>}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '6px' }}>{template.quando}</div>
            </div>

            <div style={{ marginBottom: '16px' }}>
                <label style={label}>Oggetto</label>
                <SimpleEditor subject value={oggetto} onChange={e => setOggetto(e.target.value)} insertFields={template.campi} />
            </div>
            <div>
                <label style={label}>Testo</label>
                <SimpleEditor value={corpo} onChange={e => setCorpo(e.target.value)} insertFields={template.campi} />
                <div style={hint}>Usa i pulsanti dei campi per inserire i dati che cambiano a ogni invio (es. {template.campi[2]?.token}).</div>
            </div>

            <div style={{ marginTop: '16px' }}>
                <label style={label}>{template.ccn_label || 'Amministratori in copia nascosta (CCN)'}</label>
                <textarea
                    className="md-input"
                    rows={3}
                    value={ccn}
                    onChange={e => { setCcn(e.target.value); setCcnError(''); }}
                    placeholder="nome@esempio.it"
                    style={{ width: '100%', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.82rem', ...(ccnError ? { borderColor: 'var(--danger)', backgroundColor: 'var(--danger-container)' } : {}) }}
                />
                <div style={{ ...hint, color: ccnError ? 'var(--danger)' : hint.color }}>
                    {ccnError || (template.ccn_hint
                        ? `${template.ccn_hint} (${ccnList.length} indicati)`
                        : `Un indirizzo per riga, massimo 20 (${ccnList.length} indicati). Ricevono una copia con l'indicazione del destinatario${template.chiave === 'attivazione' ? ', senza il link per impostare la password (personale)' : ''}.`)}
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" className="btn-outlined" onClick={ripristina} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <RotateCcw size={16} /> Ripristina predefinito
                    </button>
                    <button type="button" className="btn-outlined" onClick={() => onAnteprima(template, oggetto, corpo)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Eye size={16} /> Anteprima
                    </button>
                </div>
                <button type="button" className="btn-contained" onClick={salva} disabled={saving || !dirty}
                    style={{ backgroundColor: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: (saving || !dirty) ? 0.6 : 1 }}>
                    <Save size={16} /> {saving ? 'Salvataggio…' : 'Salva'}
                </button>
            </div>
        </div>
    );
};

// Backoffice → Comunicazioni: testi e destinatari in copia delle email automatiche (solo superuser)
const BackofficeEmail = () => {
    const showAlert = useAlert();
    const [templates, setTemplates] = useState(null);
    const [anteprima, setAnteprima] = useState(null); // { nome, subject, html }
    const [modificate, setModificate] = useState({}); // chiave → modifiche non salvate
    const onDirtyChange = useCallback((chiave, dirty) => setModificate(m => (m[chiave] === dirty ? m : { ...m, [chiave]: dirty })), []);
    const tabs = (templates || []).map(t => ({
        id: t.chiave,
        label: t.nome,
        badge: modificate[t.chiave] ? 'modificato' : (t.personalizzato ? 'personalizzato' : null),
    }));
    const [attiva, seleziona] = useSchedaAttiva(tabs);

    const load = useCallback(() => fetch('/users/api/email-template')
        .then(r => (r.ok ? r.json() : []))
        .then(setTemplates)
        .catch(() => setTemplates([])), []);

    useEffect(() => { load(); }, [load]);

    const aggiorna = (t) => setTemplates(list => list.map(x => (x.chiave === t.chiave ? t : x)));

    const apriAnteprima = async (template, oggetto, corpo) => {
        try {
            const res = await fetch(`/users/api/email-template/${template.chiave}/anteprima`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oggetto, corpo_html: corpo }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) { showAlert(data.error || 'Anteprima non disponibile', 'Errore'); return; }
            setAnteprima({ nome: template.nome, ...data });
        } catch {
            showAlert('Errore di rete', 'Errore');
        }
    };

    if (templates === null) return <div className="prodotti-full-container"><div className="main-content" style={{ color: 'var(--text-secondary)' }}>Caricamento…</div></div>;

    return (
        <div className="prodotti-full-container">
            <div className="main-content" style={{ maxWidth: '1000px' }}>
                <BackofficeTabs tabs={tabs} attiva={attiva} onSeleziona={seleziona} label="Comunicazioni" />
                {templates.map(t => (
                    <BackofficeTabPanel key={t.chiave} id={t.chiave} attiva={attiva}>
                        <EmailCard key={`${t.chiave}-${t.personalizzato}-${t.oggetto}-${t.ccn.join(',')}`} template={t} onSaved={aggiorna} onAnteprima={apriAnteprima} onDirtyChange={onDirtyChange} />
                    </BackofficeTabPanel>
                ))}
            </div>

            {anteprima && (
                <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: '48px' }}>
                    <div className="modal-card modal-lg" style={{ width: '95%', maxHeight: 'calc(100vh - 72px)', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border-color)' }}>
                            <div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Anteprima con dati d'esempio · {anteprima.nome}</div>
                                <div style={{ fontWeight: 600 }}>{anteprima.subject}</div>
                            </div>
                            <button onClick={() => setAnteprima(null)} title="Chiudi" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}>
                                <X size={22} />
                            </button>
                        </div>
                        <iframe title="Anteprima email" srcDoc={anteprima.html} sandbox="" style={{ border: 'none', width: '100%', flex: 1, minHeight: '60vh', background: '#f5f6f8' }} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default BackofficeEmail;
