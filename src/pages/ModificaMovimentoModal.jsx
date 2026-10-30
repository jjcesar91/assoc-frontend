import React, { useEffect, useState } from 'react';
import { X, Edit2 } from 'lucide-react';
import './NuovaOperazioneModal.css';

// Prima Nota → Modifica di un movimento che nasce da una ricevuta o da una proforma:
// si correggono i dati contabili (data, conto, modalità, note). Il contenuto della
// ricevuta (voci, intestatario, numero) resta quello emesso; l'importo si può
// correggere solo se il movimento non ha un numero di ricevuta e ha una sola voce.
const MODALITA_STANDARD = ['Contanti', 'POS', 'Assegno', 'Bonifico', 'Carta di credito', 'Altro'];

const vociDi = (p) => {
    let v = p?.payment_items;
    if (typeof v === 'string') { try { v = JSON.parse(v); } catch { v = null; } }
    return Array.isArray(v) ? v : [];
};

const importoModificabile = (p) => !p?.numero_ricevuta && vociDi(p).length <= 1;

const ModificaMovimentoModal = ({ isOpen, movimento, societaId, onClose, onSaved }) => {
    const [conti, setConti] = useState([]);
    const [form, setForm] = useState({ data_pagamento: '', conto_destinazione: '', modalita_pagamento: '', note: '', importo: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isOpen || !societaId) return;
        const token = localStorage.getItem('token');
        fetch(`/payments/api/conti?societa_id=${societaId}`, { headers: { 'Authorization': `Bearer ${token}` } })
            .then(r => (r.ok ? r.json() : []))
            .then(data => setConti(Array.isArray(data) ? data : []))
            .catch(() => setConti([]));
    }, [isOpen, societaId]);

    // All'apertura: valori del movimento (aggiornamento durante il render, senza effetto)
    const [apertoPer, setApertoPer] = useState(null);
    if (isOpen && movimento && apertoPer !== movimento.id) {
        setApertoPer(movimento.id);
        setError(null);
        setForm({
            data_pagamento: movimento.data_pagamento || '',
            conto_destinazione: movimento.conto_destinazione || '',
            modalita_pagamento: movimento.modalita_pagamento || '',
            note: movimento.note || '',
            importo: String(Math.abs(parseFloat(movimento.importo) || 0)),
        });
    }
    if (!isOpen && apertoPer !== null) setApertoPer(null);

    if (!isOpen || !movimento) return null;

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
    const contoScelto = conti.find(c => c.descrizione === form.conto_destinazione);
    const modalitaConto = Array.isArray(contoScelto?.modalita_pagamento) ? contoScelto.modalita_pagamento : [];
    const modalita = [...new Set([...modalitaConto, ...MODALITA_STANDARD, movimento.modalita_pagamento].filter(Boolean))];
    const conImporto = importoModificabile(movimento);

    const salva = async (e) => {
        e.preventDefault();
        setError(null);
        if (!form.data_pagamento) { setError('Inserisci la data.'); return; }
        const payload = {
            data_pagamento: form.data_pagamento,
            conto_destinazione: form.conto_destinazione || null,
            modalita_pagamento: form.modalita_pagamento || null,
            note: form.note || null,
        };
        if (conImporto) {
            const imp = Math.abs(parseFloat(String(form.importo).replace(',', '.')));
            if (!imp || isNaN(imp)) { setError('Inserisci un importo valido.'); return; }
            const segno = parseFloat(movimento.importo) < 0 ? -1 : 1;
            payload.importo = segno * imp;
            const voci = vociDi(movimento);
            if (voci.length === 1) payload.payment_items = [{ ...voci[0], importo: segno * imp }];
        }
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/payments/api/${movimento.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                throw new Error(d.error || 'Salvataggio non riuscito');
            }
            onSaved?.();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="nom-overlay">
            <div className="nom-modal" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
                <div className="nom-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Edit2 size={20} />
                        <span>Modifica movimento</span>
                    </div>
                    <button className="nom-close-btn" onClick={onClose} title="Chiudi"><X size={20} /></button>
                </div>

                <form onSubmit={salva} className="nom-body">
                    <div className="nom-section">
                        <div className="nom-section-title">
                            {movimento.tipo_documento === 'proforma' ? 'Proforma' : 'Ricevuta'}
                            {movimento.numero_ricevuta ? ` n. ${movimento.numero_ricevuta}` : ''} · {movimento.intestatario || '—'}
                        </div>
                        <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            {conImporto
                                ? 'Puoi correggere data, conto, modalità, importo e note.'
                                : 'Puoi correggere data, conto, modalità e note. Voci e importo restano quelli della ricevuta emessa: per cambiarli annulla la ricevuta e creane una nuova.'}
                        </p>
                        <div className="nom-fields-grid">
                            <div className="nom-field nom-field--half">
                                <label>Data *</label>
                                <input type="date" className="md-input" value={form.data_pagamento} onChange={set('data_pagamento')} required />
                            </div>
                            <div className="nom-field nom-field--half">
                                <label>Importo (€)</label>
                                <input type="number" step="0.01" min="0.01" className="md-input" value={form.importo} onChange={set('importo')} disabled={!conImporto} />
                            </div>
                            <div className="nom-field nom-field--half">
                                <label>Conto</label>
                                <select className="md-select" value={form.conto_destinazione} onChange={set('conto_destinazione')}>
                                    <option value="">— Nessun conto —</option>
                                    {conti.map(c => <option key={c.id} value={c.descrizione}>{c.descrizione}</option>)}
                                    {form.conto_destinazione && !conti.some(c => c.descrizione === form.conto_destinazione) && (
                                        <option value={form.conto_destinazione}>{form.conto_destinazione}</option>
                                    )}
                                </select>
                            </div>
                            <div className="nom-field nom-field--half">
                                <label>Modalità</label>
                                <select className="md-select" value={form.modalita_pagamento} onChange={set('modalita_pagamento')}>
                                    <option value="">— Non indicata —</option>
                                    {modalita.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div className="nom-field nom-field--full">
                                <label>Note</label>
                                <textarea className="md-input" rows={2} value={form.note} onChange={set('note')} />
                            </div>
                        </div>
                    </div>

                    {error && <div className="nom-error">{error}</div>}

                    <div className="nom-footer">
                        <button type="button" className="nom-btn nom-btn--cancel" onClick={onClose} disabled={saving}>Annulla</button>
                        <button type="submit" className="nom-btn nom-btn--save" disabled={saving}>{saving ? 'Salvataggio…' : 'Salva modifiche'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ModificaMovimentoModal;
