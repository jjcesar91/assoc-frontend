import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, Upload, Trash2, Palette, Globe, LogIn } from 'lucide-react';
import SimpleEditor from '../components/SimpleEditor';
import LoginBrandPanel from '../components/LoginBrandPanel';
import { useAlert } from '../components/AlertModal';
import { useConfirm } from '../components/ConfirmModal';
import { useBranding, assetUrl, writeCachedBranding, EMPTY_BRANDING, DEFAULT_TITLE, DEFAULT_SUBTITLE } from '../data/branding';
import './Prodotti.css';

const DEFAULT_PRIMARY = '#0d9488'; // teal del design system

const TEXT_KEYS = ['nome_ambiente', 'titolo', 'sottotitolo', 'descrizione_html', 'colore_primario', 'colore_header'];

const Section = ({ icon, title, children }) => {
    const SectionIcon = icon;
    return (
    <div className="table-card" style={{ padding: '20px 24px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, marginBottom: '16px' }}>
            <SectionIcon size={18} style={{ color: 'var(--primary)' }} /> {title}
        </div>
        {children}
    </div>
    );
};

const Field = ({ label, hint, children }) => (
    <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>{label}</label>
        {children}
        {hint && <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>{hint}</div>}
    </div>
);

const ColorField = ({ label, value, placeholderColor, onChange, hint }) => (
    <Field label={label} hint={hint}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
                type="color"
                value={value || placeholderColor}
                onChange={e => onChange(e.target.value)}
                style={{ width: '44px', height: '36px', padding: 0, border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer' }}
            />
            <input
                className="md-input"
                value={value || ''}
                placeholder={`Default (${placeholderColor})`}
                onChange={e => onChange(e.target.value.trim() || null)}
                style={{ width: '160px', fontFamily: 'monospace' }}
            />
            {value && (
                <button type="button" className="btn-outlined" onClick={() => onChange(null)} style={{ padding: '6px 10px' }}>
                    Default
                </button>
            )}
        </div>
    </Field>
);

const AssetField = ({ label, hint, path, previewStyle, onUpload, onRemove, busy }) => (
    <Field label={label} hint={hint}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{
                minWidth: '56px', height: '56px', padding: '6px', borderRadius: '8px',
                border: '1px dashed var(--border-color)', backgroundColor: 'var(--surface-1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                {path
                    ? <img src={assetUrl(path)} alt="" style={{ maxHeight: '44px', maxWidth: '160px', objectFit: 'contain', ...previewStyle }} />
                    : <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Default</span>}
            </div>
            <label className="btn-contained" style={{ backgroundColor: 'var(--primary)', cursor: busy ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Upload size={16} /> {path ? 'Sostituisci' : 'Carica'}
                <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/x-icon,.ico"
                    hidden
                    disabled={busy}
                    onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onUpload(f); }}
                />
            </label>
            {path && (
                <button type="button" className="btn-outlined" onClick={onRemove} disabled={busy} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Trash2 size={16} /> Rimuovi
                </button>
            )}
        </div>
    </Field>
);

const pickText = (b) => Object.fromEntries(TEXT_KEYS.map(k => [k, b?.[k] ?? null]));

// Backoffice → Configurazione: personalizzazione dell'ambiente (solo superuser).
const BackofficeConfigurazione = () => {
    const { branding, setBranding, preview } = useBranding();
    const showAlert = useAlert();
    const confirm = useConfirm();
    const [draft, setDraft] = useState(() => pickText(branding));
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(null);

    // Bozza = testi/colori in modifica + file già caricati (salvati subito)
    const merged = { ...branding, ...draft };
    const dirty = TEXT_KEYS.some(k => (draft[k] || null) !== (branding[k] || null));

    // Anteprima dal vivo su tutta l'app; uscendo dalla pagina torna al salvato
    useEffect(() => { preview(merged); });
    useEffect(() => () => preview(null), [preview]);

    const set = (key) => (value) => setDraft(d => ({ ...d, [key]: value }));

    const saved = (data) => {
        const next = { ...EMPTY_BRANDING, ...data };
        writeCachedBranding(next);
        setBranding(next);
        return next;
    };

    const handleSave = async () => {
        for (const k of ['colore_primario', 'colore_header']) {
            if (draft[k] && !/^#[0-9a-fA-F]{6}$/.test(draft[k])) {
                showAlert('Colore non valido: usa il formato #rrggbb', 'Errore');
                return;
            }
        }
        setSaving(true);
        try {
            const res = await fetch('/users/api/piattaforma', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(draft),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) { showAlert(data.error || 'Errore nel salvataggio', 'Errore'); return; }
            setDraft(pickText(saved(data)));
        } catch {
            showAlert('Errore di rete', 'Errore');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        const ok = await confirm('Ripristinare testi e colori di default? Logo e favicon restano invariati finché non li rimuovi.', 'Ripristina default');
        if (ok) setDraft(pickText(EMPTY_BRANDING));
    };

    const handleUpload = (tipo) => async (file) => {
        setUploading(tipo);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await fetch(`/users/api/piattaforma/${tipo}`, { method: 'POST', body: fd });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) { showAlert(data.error || 'Errore nel caricamento', 'Errore'); return; }
            saved(data);
        } catch {
            showAlert('Errore di rete', 'Errore');
        } finally {
            setUploading(null);
        }
    };

    const handleRemove = (tipo) => async () => {
        setUploading(tipo);
        try {
            const res = await fetch(`/users/api/piattaforma/${tipo}`, { method: 'DELETE' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) { showAlert(data.error || 'Errore nella rimozione', 'Errore'); return; }
            saved(data);
        } catch {
            showAlert('Errore di rete', 'Errore');
        } finally {
            setUploading(null);
        }
    };

    return (
        <div className="prodotti-full-container">
            <div className="main-content" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 420px)', gap: '16px', alignItems: 'start' }}>
                <div>
                    <Section icon={Globe} title="Ambiente">
                        <Field label="Nome ambiente" hint="Titolo della pagina nel tab del browser.">
                            <input className="md-input" maxLength={80} placeholder={DEFAULT_TITLE} value={draft.nome_ambiente || ''} onChange={e => set('nome_ambiente')(e.target.value)} style={{ width: '100%' }} />
                        </Field>
                        <AssetField
                            label="Favicon"
                            hint="Icona nel tab del browser. PNG o ICO quadrato (es. 64×64), massimo 1 MB. Si salva subito."
                            path={branding.favicon_path}
                            previewStyle={{ width: '32px', height: '32px' }}
                            busy={uploading === 'favicon'}
                            onUpload={handleUpload('favicon')}
                            onRemove={handleRemove('favicon')}
                        />
                    </Section>

                    <Section icon={Palette} title="Palette colori">
                        <ColorField
                            label="Colore primario"
                            hint="Pulsanti, link, elementi attivi e sfondo della pagina di login. Le varianti (hover, chiaro) sono calcolate in automatico."
                            value={draft.colore_primario}
                            placeholderColor={DEFAULT_PRIMARY}
                            onChange={set('colore_primario')}
                        />
                        <ColorField
                            label="Colore header"
                            hint="Barra in alto e voce Backoffice del menu. Default: colore primario."
                            value={draft.colore_header}
                            placeholderColor={draft.colore_primario || DEFAULT_PRIMARY}
                            onChange={set('colore_header')}
                        />
                    </Section>

                    <Section icon={LogIn} title="Pagina di login">
                        <AssetField
                            label="Logo"
                            hint="Sostituisce l'icona sopra il titolo. PNG, JPG o WEBP, meglio con sfondo trasparente, massimo 1 MB. Si salva subito."
                            path={branding.logo_path}
                            busy={uploading === 'logo'}
                            onUpload={handleUpload('logo')}
                            onRemove={handleRemove('logo')}
                        />
                        <Field label="Titolo">
                            <input className="md-input" maxLength={120} placeholder={DEFAULT_TITLE} value={draft.titolo || ''} onChange={e => set('titolo')(e.target.value)} style={{ width: '100%' }} />
                        </Field>
                        <Field label="Sottotitolo">
                            <input className="md-input" maxLength={255} placeholder={DEFAULT_SUBTITLE} value={draft.sottotitolo || ''} onChange={e => set('sottotitolo')(e.target.value)} style={{ width: '100%' }} />
                        </Field>
                        <Field label="Descrizione" hint="Se vuota viene mostrato l'elenco di default (Gestione soci e iscrizioni, …). Non visibile su smartphone.">
                            <SimpleEditor value={draft.descrizione_html || ''} onChange={e => set('descrizione_html')(e.target.value)} />
                        </Field>
                    </Section>

                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '24px' }}>
                        <button type="button" className="btn-outlined" onClick={handleReset} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <RotateCcw size={16} /> Ripristina default
                        </button>
                        <button
                            type="button"
                            className="btn-contained"
                            onClick={handleSave}
                            disabled={saving || !dirty}
                            style={{ backgroundColor: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: (saving || !dirty) ? 0.6 : 1 }}
                        >
                            <Save size={16} /> {saving ? 'Salvataggio…' : 'Salva'}
                        </button>
                    </div>
                </div>

                <div style={{ position: 'sticky', top: '16px' }}>
                    <div className="table-card" style={{ padding: '16px' }}>
                        <div style={{ fontWeight: 600, marginBottom: '12px' }}>
                            Anteprima pagina di login {dirty && <span className="badge badge-warning" style={{ marginLeft: '6px' }}>non salvata</span>}
                        </div>
                        <div style={{ borderRadius: '8px', overflow: 'hidden', display: 'flex', minHeight: '420px' }}>
                            <LoginBrandPanel branding={merged} style={{ flex: 1, padding: '32px 24px' }} />
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '10px' }}>
                            I colori sono applicati dal vivo a tutta l'app mentre li modifichi: senza salvare, uscendo dalla pagina torna la configurazione attuale.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BackofficeConfigurazione;
