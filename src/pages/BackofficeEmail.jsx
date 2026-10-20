import React, { useState, useEffect, useCallback } from 'react';
import { Mail, Save, RotateCcw, Eye, X, Users } from 'lucide-react';
import SimpleEditor from '../components/SimpleEditor';
import { useAlert } from '../components/AlertModal';
import { useConfirm } from '../components/ConfirmModal';
import './Prodotti.css';

const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
const parseList = (text) => [...new Set(String(text || '').split(/[\s,;]+/).map(v => v.trim().toLowerCase()).filter(Boolean))];

const card = { padding: '20px 24px', marginBottom: '16px' };
const label = { display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' };
const hint = { fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: '4px' };

// Destinatari in copia nascosta (CCN), uno per email, in cima alla pagina
const DestinatariCcn = ({ templates, onSaved }) => {
    const showAlert = useAlert();
    const [testi, setTesti] = useState(() => Object.fromEntries(templates.map(t => [t.chiave, t.ccn.join('\n')])));
    const [saving, setSaving] = useState(false);
    const [errori, setErrori] = useState({});

    const modificati = templates.filter(t => parseList(testi[t.chiave]).join(',') !== t.ccn.join(','));

    const salva = async () => {
        const e = {};
        modificati.forEach(t => {
            const invalidi = parseList(testi[t.chiave]).filter(v => !EMAIL.test(v));
            if (invalidi.length) e[t.chiave] = `Indirizzi non validi: ${invalidi.join(', ')}`;
        });
        setErrori(e);
        if (Object.keys(e).length) return;
        setSaving(true);
        try {
            for (const t of modificati) {
                const res = await fetch(`/users/api/email-template/${t.chiave}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ccn: parseList(testi[t.chiave]) }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) { setErrori(er => ({ ...er, [t.chiave]: data.error || 'Errore nel salvataggio' })); return; }
                onSaved(data);
            }
        } catch {
            showAlert('Errore di rete', 'Errore');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="table-card" style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, marginBottom: '6px' }}>
                <Users size={18} style={{ color: 'var(--primary)' }} /> Amministratori in copia nascosta (CCN)
            </div>
            <div style={{ ...hint, marginBottom: '14px' }}>
                Per ogni email, gli indirizzi (uno per riga, massimo 20) che ne ricevono una copia. La copia riporta a chi è stata
                inviata; quella dell'attivazione non contiene il link per impostare la password, che è personale.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                {templates.map(t => (
                    <div key={t.chiave}>
                        <label style={label}>{t.nome}</label>
                        <textarea
                            className="md-input"
                            rows={4}
                            value={testi[t.chiave]}
                            onChange={e => { const v = e.target.value; setTesti(s => ({ ...s, [t.chiave]: v })); setErrori(er => ({ ...er, [t.chiave]: undefined })); }}
                            placeholder="nome@esempio.it"
                            style={{ width: '100%', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.82rem', ...(errori[t.chiave] ? { borderColor: 'var(--danger)', backgroundColor: 'var(--danger-container)' } : {}) }}
                        />
                        <div style={{ ...hint, color: errori[t.chiave] ? 'var(--danger)' : hint.color }}>
                            {errori[t.chiave] || `${parseList(testi[t.chiave]).length} destinatari`}
                        </div>
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" className="btn-contained" onClick={salva} disabled={saving || !modificati.length}
                    style={{ backgroundColor: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: (saving || !modificati.length) ? 0.6 : 1 }}>
                    <Save size={16} /> {saving ? 'Salvataggio…' : 'Salva destinatari'}
                </button>
            </div>
        </div>
    );
};

// Testo di una email: oggetto e corpo con segnaposto, anteprima, ripristino
const EmailCard = ({ template, onSaved, onAnteprima }) => {
    const showAlert = useAlert();
    const confirm = useConfirm();
    const [oggetto, setOggetto] = useState(template.oggetto);
    const [corpo, setCorpo] = useState(template.corpo_html);
    const [saving, setSaving] = useState(false);
    const dirty = oggetto !== template.oggetto || corpo !== template.corpo_html;

    const salva = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/users/api/email-template/${template.chiave}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oggetto, corpo_html: corpo }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) { showAlert(data.error || 'Errore nel salvataggio', 'Errore'); return; }
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
                    {template.ccn.length > 0 && <span className="badge badge-info">CCN: {template.ccn.length}</span>}
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

// Backoffice → Email: testi e destinatari in copia delle email automatiche (solo superuser)
const BackofficeEmail = () => {
    const showAlert = useAlert();
    const [templates, setTemplates] = useState(null);
    const [anteprima, setAnteprima] = useState(null); // { nome, subject, html }

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
                <DestinatariCcn key={templates.map(t => t.ccn.join(',')).join('|')} templates={templates} onSaved={aggiorna} />
                {templates.map(t => (
                    <EmailCard key={`${t.chiave}-${t.personalizzato}-${t.oggetto}`} template={t} onSaved={aggiorna} onAnteprima={apriAnteprima} />
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
