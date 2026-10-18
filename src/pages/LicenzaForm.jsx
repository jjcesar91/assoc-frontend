import React, { useState } from 'react';
import { Save, Copy, Check, CheckCircle2 } from 'lucide-react';
import { useAlert } from '../components/AlertModal';
import { PIANI, STATI, ANNI_ASSOCIATIVI, formatRiepilogoRegistrazione } from '../data/licenze';

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

const EDITABLE = [
    'piano', 'stato', 'data_inizio', 'data_scadenza', 'note',
    'associazione', 'tipologia', 'email', 'indirizzo', 'cap', 'comune', 'provincia',
    'anno_associativo_tipo', 'anno_associativo_inizio', 'affiliazioni', 'presidente', 'telefono',
    'referente_nome', 'referente_telefono',
];

const pick = (l) => Object.fromEntries(EDITABLE.map(k => [k, l?.[k] ?? '']));

const label = { display: 'block', fontSize: '0.8rem', marginBottom: '4px', color: 'var(--text-secondary)' };
const sectionTitle = { fontSize: '0.95rem', fontWeight: 600, margin: '8px 0 12px' };
const grid = (cols) => ({ display: 'grid', gridTemplateColumns: cols, gap: '12px 16px', marginBottom: '12px' });

const Input = ({ name, form, onChange, ...rest }) => (
    <input className="md-input" value={form[name] || ''} onChange={e => onChange(name, e.target.value)} style={{ width: '100%' }} {...rest} />
);

// Licenza: piano/stato/date + snapshot dei dati di registrazione.
// licenza: dati già caricati dal modal (che lo rimonta con key=updatedAt quando
// la licenza cambia); onSaved(licenza) aggiorna modal ed elenco.
const LicenzaForm = ({ licenza, onSaved }) => {
    const showAlert = useAlert();
    const saved = licenza;
    const [form, setForm] = useState(() => pick(licenza));
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);


    const set = (name, value) => setForm(f => ({ ...f, [name]: value }));
    const dirty = EDITABLE.some(k => (form[k] || '') !== (saved?.[k] ?? ''));
    const [gg, mm] = (form.anno_associativo_inizio || '01-01').split('-');

    const save = async (payloadOverride) => {
        const source = { ...form, ...(payloadOverride || {}) };
        if (source.data_inizio && source.data_scadenza && source.data_scadenza < source.data_inizio) {
            showAlert('La data di scadenza è precedente alla data di inizio', 'Errore');
            return;
        }
        setSaving(true);
        try {
            const payload = { ...source };
            if (payload.anno_associativo_tipo !== 'personalizzato') payload.anno_associativo_inizio = null;
            const res = await fetch(`/users/api/licenze/${licenza.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) { showAlert(data.error || 'Errore nel salvataggio', 'Errore'); return; }
            setForm(pick(data));
            onSaved?.(data);
        } catch {
            showAlert('Errore di rete', 'Errore');
        } finally {
            setSaving(false);
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(formatRiepilogoRegistrazione(form));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            showAlert('Copia non riuscita', 'Errore');
        }
    };

    const handleSave = () => save();
    // Attivazione rapida di una registrazione dal sito (salva anche le altre modifiche)
    const handleAttiva = () => save({ stato: 'attiva' });

    return (
        <div>
            {saved?.stato === 'in_attesa' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', padding: '12px 16px', marginBottom: '16px', borderRadius: '8px', backgroundColor: 'var(--warning-container)', color: 'var(--on-warning-container)' }}>
                    <span>Licenza registrata dal sito e <strong>in attesa di attivazione</strong>: gli amministratori non possono ancora accedere.</span>
                    <button type="button" className="btn-contained" onClick={handleAttiva} disabled={saving} style={{ backgroundColor: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 size={16} /> Attiva licenza
                    </button>
                </div>
            )}
            <div style={sectionTitle}>Licenza</div>
            <div style={grid('repeat(auto-fit, minmax(160px, 1fr))')}>
                <div>
                    <label style={label}>Piano</label>
                    <select className="md-select" value={form.piano} onChange={e => set('piano', e.target.value)} style={{ width: '100%' }}>
                        {PIANI.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                </div>
                <div>
                    <label style={label}>Stato</label>
                    <select className="md-select" value={form.stato} onChange={e => set('stato', e.target.value)} style={{ width: '100%' }}>
                        {STATI.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                </div>
                <div>
                    <label style={label}>Data inizio</label>
                    <Input name="data_inizio" type="date" form={form} onChange={set} />
                </div>
                <div>
                    <label style={label}>Data scadenza</label>
                    <Input name="data_scadenza" type="date" form={form} onChange={set} title="Vuota = senza scadenza" />
                </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
                <label style={label}>Note interne</label>
                <textarea className="md-input" rows={2} value={form.note || ''} onChange={e => set('note', e.target.value)} style={{ width: '100%', resize: 'vertical' }} />
            </div>

            <div style={{ ...sectionTitle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <span>Dati di registrazione</span>
                <button type="button" className="btn-outlined" onClick={handleCopy} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                    {copied ? <><Check size={16} /> Copiato</> : <><Copy size={16} /> Copia riepilogo</>}
                </button>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', margin: '-6px 0 12px' }}>
                Dati come inviati dal cliente alla registrazione: indipendenti dall'anagrafica della società.
            </div>
            <div style={grid('2fr 1fr')}>
                <div><label style={label}>Associazione</label><Input name="associazione" form={form} onChange={set} /></div>
                <div><label style={label}>Tipologia</label><Input name="tipologia" form={form} onChange={set} placeholder="ASD, APS, …" /></div>
            </div>
            <div style={grid('1fr 1fr')}>
                <div><label style={label}>Email</label><Input name="email" type="email" form={form} onChange={set} /></div>
                <div><label style={label}>Telefono associazione</label><Input name="telefono" form={form} onChange={set} /></div>
            </div>
            <div style={grid('2fr 1fr 1.4fr 1fr')}>
                <div><label style={label}>Indirizzo (via)</label><Input name="indirizzo" form={form} onChange={set} /></div>
                <div><label style={label}>CAP</label><Input name="cap" form={form} onChange={set} maxLength={10} /></div>
                <div><label style={label}>Comune</label><Input name="comune" form={form} onChange={set} /></div>
                <div><label style={label}>Provincia</label><Input name="provincia" form={form} onChange={set} maxLength={30} placeholder="es. TV" /></div>
            </div>
            <div style={grid('1fr 1fr')}>
                <div>
                    <label style={label}>Anno associativo</label>
                    <select className="md-select" value={form.anno_associativo_tipo || ''} onChange={e => set('anno_associativo_tipo', e.target.value)} style={{ width: '100%' }}>
                        <option value="">—</option>
                        {ANNI_ASSOCIATIVI.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                    </select>
                </div>
                {form.anno_associativo_tipo === 'personalizzato' && (
                    <div>
                        <label style={label}>Dal (giorno / mese)</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <select className="md-select" value={gg} onChange={e => set('anno_associativo_inizio', `${e.target.value}-${mm}`)}>
                                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <select className="md-select" value={mm} onChange={e => set('anno_associativo_inizio', `${gg}-${e.target.value}`)}>
                                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>
                )}
            </div>
            <div style={{ marginBottom: '12px' }}>
                <label style={label}>Affiliazioni</label>
                <Input name="affiliazioni" form={form} onChange={set} placeholder="es. EPS: UISP, Federazioni: FIGC" />
            </div>
            <div style={grid('1fr 1fr 1fr')}>
                <div><label style={label}>Presidente</label><Input name="presidente" form={form} onChange={set} /></div>
                <div><label style={label}>Referente</label><Input name="referente_nome" form={form} onChange={set} placeholder="Nome e cognome" /></div>
                <div><label style={label}>Telefono referente</label><Input name="referente_telefono" form={form} onChange={set} /></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                    type="button"
                    className="btn-contained"
                    onClick={handleSave}
                    disabled={saving || !dirty}
                    style={{ backgroundColor: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: (saving || !dirty) ? 0.6 : 1 }}
                >
                    <Save size={16} /> {saving ? 'Salvataggio…' : 'Salva licenza'}
                </button>
            </div>
        </div>
    );
};

export default LicenzaForm;
