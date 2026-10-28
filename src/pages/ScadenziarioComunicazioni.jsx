import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Save, RotateCcw, Info, CheckCircle, CalendarClock } from 'lucide-react';
import { useSocieta } from '../data/SocietaContext';
import SimpleEditor from '../components/SimpleEditor';
import BackofficeTabs, { BackofficeTabPanel } from '../components/BackofficeTabs';
import { useSchedaAttiva } from '../components/useSchedaAttiva';
import './Soci.css';

// Scadenziario → Comunicazioni: testi delle email di scadenza inviate dalle automazioni
// (una scheda per tipo). Stessi dati di Configurazione → Automazioni (/users/api/automazioni/config):
// qui si modificano attivazione, preavviso, oggetto e testo; il log degli invii resta là.

const CAMPI_TESTO = [
    { label: 'Nome', token: '{{NOME}}', title: 'Nome del socio destinatario' },
    { label: 'Cognome', token: '{{COGNOME}}', title: 'Cognome del socio destinatario' },
    { label: 'Società', token: '{{SOCIETA}}', title: 'Denominazione della società' },
    { label: 'Data scadenza', token: '{{DATA_SCADENZA}}', title: 'Data della scadenza (se non la inserisci viene aggiunta in fondo al messaggio)' },
];
const CAMPI_OGGETTO = CAMPI_TESTO.filter(c => c.token !== '{{COGNOME}}');

const QUANDO = {
    socio_field: 'Inviata al socio quando la data di scadenza registrata nella sua scheda si avvicina.',
    tutti_soci: 'Scadenza unica della società: inviata a ciascun socio con email.',
    per_abbonamento: 'Inviata al socio per ogni abbonamento in scadenza (le stesse scadenze dello Scadenziario).',
};

const testoDi = (r) => ({ oggetto: r.oggetto_email || r.oggetto_default || '', testo: r.testo_email || r.testo_default || '' });

const ScadenziarioComunicazioni = () => {
    const { selectedSocietaId, societaList } = useSocieta();
    const societa = societaList.find(s => s.id == selectedSocietaId);
    const [rules, setRules] = useState(null);
    const [bozze, setBozze] = useState({}); // tipo → { attiva, giorni_anticipo, oggetto, testo }
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    const carica = async () => {
        if (!selectedSocietaId) return;
        setRules(null);
        try {
            const res = await fetch(`/users/api/automazioni/config?societaId=${selectedSocietaId}`);
            const data = res.ok ? await res.json() : { rules: [] };
            setRules(data.rules);
            setBozze(Object.fromEntries(data.rules.map(r => [r.tipo, { attiva: !!r.attiva, giorni_anticipo: r.giorni_anticipo, ...testoDi(r) }])));
        } catch {
            setRules([]);
        }
    };

    useEffect(() => { carica(); setMessage(null); }, [selectedSocietaId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Le automazioni ETS Point compaiono solo per le società che le gestiscono
    const visibili = useMemo(() => (rules || []).filter(r => r.applicabile
        && (r.categoria !== 'ets_point' || societa?.gestore_ets_point)), [rules, societa]);

    const modificata = (r) => {
        const b = bozze[r.tipo];
        if (!b) return false;
        const t = testoDi(r);
        return b.attiva !== !!r.attiva || String(b.giorni_anticipo) !== String(r.giorni_anticipo) || b.oggetto !== t.oggetto || b.testo !== t.testo;
    };

    const tabs = visibili.map(r => ({
        id: r.tipo,
        label: r.label,
        badge: modificata(r) ? 'modificato' : ((r.oggetto_email || r.testo_email) ? 'personalizzato' : null),
    }));
    const [attiva, seleziona] = useSchedaAttiva(tabs);

    const aggiorna = (tipo, patch) => setBozze(prev => ({ ...prev, [tipo]: { ...prev[tipo], ...patch } }));

    const salva = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const payload = {
                societaId: selectedSocietaId,
                rules: rules.map(r => {
                    const b = bozze[r.tipo] || {};
                    return {
                        tipo: r.tipo,
                        attiva: b.attiva ?? r.attiva,
                        giorni_anticipo: parseInt(b.giorni_anticipo ?? r.giorni_anticipo, 10) || 0,
                        extra_config: r.extra_config || null,
                        // Testo uguale al predefinito = nessuna personalizzazione (segue i futuri aggiornamenti)
                        oggetto_email: b.oggetto && b.oggetto !== r.oggetto_default ? b.oggetto : null,
                        testo_email: b.testo && b.testo !== r.testo_default ? b.testo : null,
                    };
                }),
            };
            const res = await fetch('/users/api/automazioni/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                setMessage({ type: 'success', text: 'Comunicazioni salvate' });
                await carica();
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
        return <div className="soci-full-container"><div className="main-content" style={{ color: 'var(--text-secondary)' }}>Seleziona una società per configurare le comunicazioni.</div></div>;
    }
    if (rules === null) {
        return <div className="soci-full-container"><div className="main-content" style={{ color: 'var(--text-secondary)' }}>Caricamento…</div></div>;
    }

    return (
        <div className="soci-full-container">
            <div className="main-content" style={{ maxWidth: '1000px' }}>
                {message && (
                    <div style={{
                        backgroundColor: message.type === 'success' ? 'var(--success-container)' : 'var(--danger-container)',
                        color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
                        padding: '12px', borderRadius: '4px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                        {message.type === 'success' && <CheckCircle size={16} />} {message.text}
                    </div>
                )}

                <p style={{ color: 'var(--text-secondary)', marginTop: 0, marginBottom: 16, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>
                        Email di promemoria inviate ai soci prima delle scadenze. Il controllo avviene ogni giorno alle 6:00;
                        il registro degli invii e il controllo immediato sono in{' '}
                        <Link to="/comunicazioni/automazioni" style={{ color: 'var(--primary)' }}>Configurazione → Automazioni</Link>.
                    </span>
                </p>

                {visibili.length === 0 ? (
                    <div className="toolbar-card" style={{ color: 'var(--text-secondary)' }}>Nessuna comunicazione di scadenza disponibile per questa società.</div>
                ) : (
                    <>
                        <BackofficeTabs tabs={tabs} attiva={attiva} onSeleziona={seleziona} label="Comunicazioni di scadenza" />
                        {visibili.map(r => {
                            const b = bozze[r.tipo] || {};
                            return (
                                <BackofficeTabPanel key={r.tipo} id={r.tipo} attiva={attiva}>
                                    <div className="toolbar-card" style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'stretch' }}>
                                        <div style={{ borderBottom: '1px solid #eee', paddingBottom: 12 }}>
                                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <CalendarClock size={18} /> {r.label}
                                            </h3>
                                            <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{QUANDO[r.destinatario] || ''}</p>
                                        </div>

                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-end' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                                <input type="checkbox" checked={!!b.attiva} onChange={(e) => aggiorna(r.tipo, { attiva: e.target.checked })} style={{ width: 16, height: 16 }} />
                                                Invio attivo
                                            </label>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Giorni di anticipo</label>
                                                <input className="md-input" type="number" min="0" style={{ width: 120, padding: '6px 12px' }}
                                                    value={b.giorni_anticipo ?? ''} onChange={(e) => aggiorna(r.tipo, { giorni_anticipo: e.target.value })} />
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, opacity: b.attiva ? 1 : 0.6 }}>
                                            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Oggetto email</label>
                                            <SimpleEditor subject value={b.oggetto || ''} onChange={(e) => aggiorna(r.tipo, { oggetto: e.target.value })} insertFields={CAMPI_OGGETTO} />
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, opacity: b.attiva ? 1 : 0.6 }}>
                                            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Testo del messaggio</label>
                                            <SimpleEditor value={b.testo || ''} onChange={(e) => aggiorna(r.tipo, { testo: e.target.value })} insertFields={CAMPI_TESTO} />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, flexWrap: 'wrap', gap: 8 }}>
                                                <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <Info size={13} /> Se il testo non contiene la data di scadenza, viene aggiunta in fondo al messaggio.
                                                </span>
                                                <button type="button" className="btn-outlined" style={{ height: 32, fontSize: '0.82rem' }}
                                                    onClick={() => aggiorna(r.tipo, { oggetto: r.oggetto_default || '', testo: r.testo_default || '' })}>
                                                    <RotateCcw size={14} /> Ripristina testo predefinito
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </BackofficeTabPanel>
                            );
                        })}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                            <button className="btn-contained" onClick={salva} disabled={saving} style={{ height: 44, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Save size={18} /> {saving ? 'Salvataggio...' : 'Salva comunicazioni'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ScadenziarioComunicazioni;
