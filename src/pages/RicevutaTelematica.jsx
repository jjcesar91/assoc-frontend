import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAlert } from '../components/AlertModal';
import { buildModuloPrintHtml, loadImageAsBase64, resolveLogoUrl } from '../utils/moduloPdf';
import { parseCodiceFiscale, lookupLuogoNascita } from '../utils/codiceFiscale';

// Pagina pubblica (senza autenticazione), specifica per una società: il socio
// inserisce la propria anagrafica minima, viene creato/aggiornato come Socio
// (get-or-create per codice fiscale + società) e si apre subito la stampa del
// Modulo configurato per quella società, precompilato con i suoi dati.
//
// Raggiungibile solo tramite link diretto /ricevuta-telematica/:societaId,
// intenzionalmente NON presente nel menu laterale del backoffice.
//
// Appena nome, cognome e codice fiscale sono compilati, il codice fiscale viene
// analizzato (utils/codiceFiscale.js) per dedurre sesso, data e luogo di nascita:
// questi campi compaiono precompilati (ma restano modificabili, nel caso la
// deduzione sbagli o il comune non sia nell'elenco).

const EMPTY_FORM = {
    nome: '', cognome: '', codice_fiscale: '', indirizzo: '', email: '', telefono: '',
    sesso: '', data_nascita: '', comune_nascita: '', nazione_nascita: '',
};

export default function RicevutaTelematica() {
    const { societaId } = useParams();
    const showAlert = useAlert();

    const [societa, setSocieta] = useState(null);
    const [loadingSocieta, setLoadingSocieta] = useState(true);
    const [notFound, setNotFound] = useState(false);

    const [form, setForm] = useState(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);
    // Esito dell'analisi del codice fiscale corrente: controlla se/come mostrare
    // i campi dedotti (data/sesso/luogo di nascita) e l'eventuale avviso di CF non valido.
    const [cfInfo, setCfInfo] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/users/api/public/societa/${societaId}`);
                if (cancelled) return;
                if (!res.ok) {
                    setNotFound(true);
                    return;
                }
                const data = await res.json();
                setSocieta(data);
            } catch {
                if (!cancelled) setNotFound(true);
            } finally {
                if (!cancelled) setLoadingSocieta(false);
            }
        })();
        return () => { cancelled = true; };
    }, [societaId]);

    // Appena il codice fiscale raggiunge 16 caratteri, deduce sesso/data/comune
    // di nascita e precompila i campi corrispondenti (restano modificabili).
    useEffect(() => {
        const cf = form.codice_fiscale.trim();

        // Se il CF non è (più) valido, oltre a nascondere i campi dedotti li svuota:
        // altrimenti resterebbero in form (anche se non visibili) e finirebbero nel
        // payload inviato al submit, associati a un codice fiscale diverso da quello attuale.
        const clearDeducedFields = () => {
            setCfInfo(null);
            setForm((prev) => ({ ...prev, sesso: '', data_nascita: '', comune_nascita: '', nazione_nascita: '' }));
        };

        if (cf.length !== 16) {
            clearDeducedFields();
            return;
        }

        const parsed = parseCodiceFiscale(cf);
        if (!parsed) {
            clearDeducedFields();
            return;
        }

        let cancelled = false;
        (async () => {
            const luogo = await lookupLuogoNascita(parsed.codiceCatastale);
            if (cancelled) return;
            // Un codice catastale che inizia per Z è sempre uno stato estero, anche
            // se per qualche motivo non è presente nell'elenco caricato.
            const estero = luogo ? luogo.estero : parsed.codiceCatastale.startsWith('Z');
            setCfInfo({ ...parsed, estero, luogoNome: luogo?.nome || null });
            setForm((prev) => ({
                ...prev,
                sesso: parsed.sesso,
                data_nascita: parsed.dataNascita,
                comune_nascita: estero ? 'Estero' : (luogo?.nome || prev.comune_nascita),
                nazione_nascita: estero ? (luogo?.nome || prev.nazione_nascita) : '',
            }));
        })();
        return () => { cancelled = true; };
    }, [form.codice_fiscale]);

    const handleChange = (field) => (e) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

    const validate = () => {
        if (!form.nome.trim() || !form.cognome.trim()) {
            return 'Nome e cognome sono obbligatori.';
        }
        const cf = form.codice_fiscale.trim();
        if (!cf || cf.length !== 16) {
            return 'Inserisci un codice fiscale valido (16 caratteri).';
        }
        return null;
    };

    const handleConferma = async (e) => {
        e.preventDefault();
        const validationError = validate();
        if (validationError) {
            showAlert(validationError, 'Dati mancanti', 'warning');
            return;
        }

        // Apri la finestra subito, dentro il gesto dell'utente: se la si apre dopo
        // l'await il popup blocker restituisce un about:blank vuoto (o null).
        // Stesso identico accorgimento di handlePrintPayment in pages/Ricevute.jsx.
        const printWindow = window.open('', '_blank');
        setSubmitting(true);
        try {
            const estero = form.comune_nascita.trim().toLowerCase() === 'estero';
            const luogoNascita = estero ? form.nazione_nascita.trim() : form.comune_nascita.trim();

            const socioRes = await fetch('/users/api/public/soci', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    societa_id: societaId,
                    nome: form.nome.trim(),
                    cognome: form.cognome.trim(),
                    codice_fiscale: form.codice_fiscale.trim().toUpperCase(),
                    indirizzo: form.indirizzo.trim(),
                    email: form.email.trim(),
                    telefono: form.telefono.trim(),
                    sesso: form.sesso || null,
                    data_nascita: form.data_nascita || null,
                    luogo_nascita: luogoNascita || null,
                }),
            });
            if (!socioRes.ok) {
                const err = await socioRes.json().catch(() => ({}));
                throw new Error(err.error || 'Errore durante il salvataggio dei dati');
            }
            const socio = await socioRes.json();

            const moduloRes = await fetch(
                `/documents/api/public/moduli/effettivo?societa_id=${societaId}&modulo_id=${societa?.ricevuta_telematica_modulo_id || ''}`
            );
            if (!moduloRes.ok) {
                const err = await moduloRes.json().catch(() => ({}));
                throw new Error(err.error || 'Nessun modulo configurato per questa società');
            }
            const modulo = await moduloRes.json();

            const logoUrl = resolveLogoUrl(societa);
            let logoBase64 = null;
            if (logoUrl) {
                try {
                    logoBase64 = await loadImageAsBase64(logoUrl);
                } catch (err) {
                    console.error('Errore caricamento logo:', err);
                }
            }

            const html = buildModuloPrintHtml({
                modulo,
                societa,
                logoBase64,
                today: new Date().toISOString(),
                socio,
                autoPrint: true,
            });

            if (printWindow) {
                printWindow.document.open();
                printWindow.document.write(html);
                printWindow.document.close();
            }
        } catch (err) {
            console.error('Errore generazione modulo:', err);
            if (printWindow) printWindow.close();
            showAlert(err.message || 'Errore durante la generazione del modulo', 'Errore');
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingSocieta) {
        return (
            <div style={styles.page}>
                <div style={styles.card}>Caricamento...</div>
            </div>
        );
    }

    if (notFound) {
        return (
            <div style={styles.page}>
                <div style={styles.card}>
                    <h1 style={styles.title}>Link non valido</h1>
                    <p>La pagina richiesta non è disponibile. Controlla il link ricevuto.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                {societa?.logo_path && (
                    <img src={resolveLogoUrl(societa)} alt="" style={styles.logo} />
                )}
                <h1 style={styles.title}>{societa?.denominazione}</h1>
                <p style={styles.subtitle}>Inserisci i tuoi dati per compilare e stampare il modulo.</p>

                <form onSubmit={handleConferma}>
                    <div style={styles.row}>
                        <div style={styles.field}>
                            <label style={styles.label}>Nome *</label>
                            <input style={styles.input} value={form.nome} onChange={handleChange('nome')} required />
                        </div>
                        <div style={styles.field}>
                            <label style={styles.label}>Cognome *</label>
                            <input style={styles.input} value={form.cognome} onChange={handleChange('cognome')} required />
                        </div>
                    </div>

                    <div style={styles.field}>
                        <label style={styles.label}>Codice fiscale *</label>
                        <input
                            style={styles.input}
                            value={form.codice_fiscale}
                            onChange={handleChange('codice_fiscale')}
                            maxLength={16}
                            required
                        />
                        {cfInfo && !cfInfo.checksumValid && (
                            <p style={styles.warning}>Il codice fiscale inserito non sembra valido: controlla i dati dedotti qui sotto.</p>
                        )}
                    </div>

                    {cfInfo && (
                        <>
                            <div style={styles.row}>
                                <div style={styles.field}>
                                    <label style={styles.label}>Data di nascita</label>
                                    <input
                                        type="date"
                                        style={styles.input}
                                        value={form.data_nascita}
                                        onChange={handleChange('data_nascita')}
                                    />
                                </div>
                                <div style={styles.field}>
                                    <label style={styles.label}>Sesso</label>
                                    <select style={styles.input} value={form.sesso} onChange={handleChange('sesso')}>
                                        <option value="M">Maschio</option>
                                        <option value="F">Femmina</option>
                                    </select>
                                </div>
                            </div>

                            <div style={styles.row}>
                                <div style={styles.field}>
                                    <label style={styles.label}>Comune di nascita</label>
                                    <input
                                        style={styles.input}
                                        value={form.comune_nascita}
                                        onChange={handleChange('comune_nascita')}
                                    />
                                </div>
                                {form.comune_nascita.trim().toLowerCase() === 'estero' && (
                                    <div style={styles.field}>
                                        <label style={styles.label}>Nazione di nascita</label>
                                        <input
                                            style={styles.input}
                                            value={form.nazione_nascita}
                                            onChange={handleChange('nazione_nascita')}
                                        />
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    <div style={styles.field}>
                        <label style={styles.label}>Indirizzo</label>
                        <input style={styles.input} value={form.indirizzo} onChange={handleChange('indirizzo')} />
                    </div>

                    <div style={styles.row}>
                        <div style={styles.field}>
                            <label style={styles.label}>Email</label>
                            <input type="email" style={styles.input} value={form.email} onChange={handleChange('email')} />
                        </div>
                        <div style={styles.field}>
                            <label style={styles.label}>Telefono</label>
                            <input style={styles.input} value={form.telefono} onChange={handleChange('telefono')} />
                        </div>
                    </div>

                    <button type="submit" style={styles.button} disabled={submitting}>
                        {submitting ? 'Attendere...' : 'Conferma e stampa'}
                    </button>
                </form>
            </div>
        </div>
    );
}

const styles = {
    page: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f3f4f6',
        padding: '24px',
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    },
    card: {
        width: '100%',
        maxWidth: '480px',
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        padding: '32px',
    },
    logo: { maxHeight: '80px', maxWidth: '200px', objectFit: 'contain', marginBottom: '16px' },
    title: { fontSize: '20px', margin: '0 0 8px', color: '#111827' },
    subtitle: { fontSize: '14px', color: '#6b7280', margin: '0 0 24px' },
    row: { display: 'flex', gap: '12px' },
    field: { flex: 1, marginBottom: '16px' },
    label: { display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: '#374151' },
    warning: { fontSize: '12px', color: '#b45309', margin: '6px 0 0' },
    input: {
        width: '100%',
        padding: '10px 12px',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '14px',
        boxSizing: 'border-box',
        color: '#111827',
    },
    button: {
        width: '100%',
        padding: '12px',
        marginTop: '8px',
        border: 'none',
        borderRadius: '6px',
        background: 'var(--primary, #2563eb)',
        color: 'white',
        fontSize: '15px',
        fontWeight: 600,
        cursor: 'pointer',
    },
};
