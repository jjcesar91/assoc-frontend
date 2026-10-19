import React, { useState, useEffect } from 'react';
import { Mail, Save } from 'lucide-react';
import { useAlert } from '../components/AlertModal';

const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
const MAX = 20;

const parse = (text) => [...new Set(text.split(/[\s,;]+/).map(v => v.trim().toLowerCase()).filter(Boolean))];

// Backoffice → Configurazione → Notifiche: amministratori che ricevono in copia
// nascosta (CCN) l'email di benvenuto inviata a ogni nuova registrazione dal sito.
// Dato privato: letto e salvato solo con l'endpoint riservato ai superuser.
const NotificheRegistrazioneSection = ({ wrapper }) => {
    const Wrapper = wrapper; // contenitore di sezione della pagina Configurazione
    const showAlert = useAlert();
    const [saved, setSaved] = useState(null); // array salvato
    const [text, setText] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        fetch('/users/api/piattaforma')
            .then(r => (r.ok ? r.json() : null))
            .then(data => {
                if (cancelled || !data) return;
                const list = data.registrazione_ccn || [];
                setSaved(list);
                setText(list.join('\n'));
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);

    const list = parse(text);
    const invalid = list.filter(e => !EMAIL.test(e));
    const dirty = saved !== null && list.join(',') !== saved.join(',');

    const handleSave = async () => {
        if (invalid.length) { setError(`Indirizzi non validi: ${invalid.join(', ')}`); return; }
        if (list.length > MAX) { setError(`Massimo ${MAX} indirizzi`); return; }
        setSaving(true);
        try {
            const res = await fetch('/users/api/piattaforma', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ registrazione_ccn: list }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) { setError(data.error || 'Errore nel salvataggio'); return; }
            const nuova = data.registrazione_ccn || [];
            setSaved(nuova);
            setText(nuova.join('\n'));
            setError('');
        } catch {
            showAlert('Errore di rete', 'Errore');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Wrapper icon={Mail} title="Notifiche nuove registrazioni">
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Amministratori in copia nascosta (CCN)
            </label>
            <textarea
                className="md-input"
                rows={4}
                value={text}
                disabled={saved === null}
                onChange={e => { setText(e.target.value); setError(''); }}
                placeholder={'nome@esempio.it\naltro@esempio.it'}
                style={{ width: '100%', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.85rem', ...(error ? { borderColor: 'var(--danger)', backgroundColor: 'var(--danger-container)' } : {}) }}
            />
            <div style={{ fontSize: '0.75rem', color: error ? 'var(--danger)' : 'var(--text-tertiary)', marginTop: '4px' }}>
                {error || `Un indirizzo per riga (o separati da virgola), massimo ${MAX}. Ricevono una copia dell'email di benvenuto inviata a ogni associazione che si registra dal sito: è anche l'avviso che c'è una licenza da attivare.`}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', gap: '12px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {list.length === 0 ? 'Nessun destinatario in copia' : `${list.length} ${list.length === 1 ? 'destinatario' : 'destinatari'}`}
                </span>
                <button
                    type="button"
                    className="btn-contained"
                    onClick={handleSave}
                    disabled={saving || !dirty}
                    style={{ backgroundColor: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: (saving || !dirty) ? 0.6 : 1 }}
                >
                    <Save size={16} /> {saving ? 'Salvataggio…' : 'Salva destinatari'}
                </button>
            </div>
        </Wrapper>
    );
};

export default NotificheRegistrazioneSection;
