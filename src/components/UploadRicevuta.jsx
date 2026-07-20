import { useState, useEffect, useRef, useCallback } from 'react';

// Meccanismo di caricamento della ricevuta di pagamento, indicizzato per token.
// È usato sia dalla pagina pubblica /carica-ricevuta (link inviato via email)
// sia dall'area soci, dove il socio genera un token per un proprio ordine:
// in entrambi i casi il backend resta quello pubblico /payments/api/public/ricevuta/:token.
//
// Stati possibili:
//   - loading      : verifica del token in corso
//   - not_found    : token assente o non valido  → "404"
//   - expired      : link scaduto (oltre 72 ore)
//   - uploaded     : ricevuta già caricata (sola lettura: data + nome file)
//   - ok           : caricabile (form di upload)
//
// Regola di modifica: dopo aver caricato e confermato, finché il componente resta
// montato è possibile sostituire il file (PUT). Riaprendo il link in un secondo
// momento la ricevuta risulta in sola lettura.

export const ACCEPT = '.pdf,.doc,.docx,.odt,.rtf,image/*';
export const ACCEPT_LABEL = 'PDF, Word, LibreOffice/OpenDocument o immagine';

function formatData(dt) {
    if (!dt) return '';
    try {
        return new Date(dt).toLocaleString('it-IT', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    } catch {
        return String(dt);
    }
}

/**
 * @param {Object} props
 * @param {string|null} props.token - token del link di caricamento
 * @param {boolean} [props.mostraOrdine] - mostra il riepilogo ordine restituito dal backend
 * @param {(evidenza: { nome_file: string, uploaded_at: string }) => void} [props.onUploaded]
 */
export default function UploadRicevuta({ token, mostraOrdine = true, onUploaded }) {
    const [stato, setStato] = useState('loading'); // loading|not_found|expired|uploaded|ok|error
    const [ordine, setOrdine] = useState(null);
    const [evidenza, setEvidenza] = useState(null); // { nome_file, uploaded_at }
    const [editabileInSessione, setEditabileInSessione] = useState(false);

    const [file, setFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [errore, setErrore] = useState('');
    const fileInputRef = useRef(null);

    const caricaStato = useCallback(async () => {
        if (!token) { setStato('not_found'); return; }
        try {
            const res = await fetch(`/payments/api/public/ricevuta/${encodeURIComponent(token)}`);
            if (res.status === 404) { setStato('not_found'); return; }
            const data = await res.json().catch(() => ({}));
            if (data.status === 'expired') { setStato('expired'); return; }
            if (data.status === 'uploaded') {
                setEvidenza({ nome_file: data.nome_file, uploaded_at: data.uploaded_at });
                setStato('uploaded');
                return;
            }
            if (data.status === 'ok') {
                setOrdine(data.ordine || null);
                setStato('ok');
                return;
            }
            setStato('not_found');
        } catch {
            setStato('error');
        }
    }, [token]);

    useEffect(() => { caricaStato(); }, [caricaStato]);

    const onSelectFile = (e) => {
        setErrore('');
        setFile(e.target.files?.[0] || null);
    };

    const invia = async (metodo) => {
        if (!file) { setErrore('Seleziona un file da caricare.'); return; }
        setSubmitting(true);
        setErrore('');
        try {
            const fd = new FormData();
            fd.append('ricevuta', file);
            const res = await fetch(`/payments/api/public/ricevuta/${encodeURIComponent(token)}`, {
                method: metodo,
                body: fd,
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                if (data.status === 'uploaded') {
                    // Qualcun altro ha già caricato la ricevuta nel frattempo
                    setEvidenza({ nome_file: data.nome_file, uploaded_at: data.uploaded_at });
                    setEditabileInSessione(false);
                    setStato('uploaded');
                    return;
                }
                if (data.status === 'expired') { setStato('expired'); return; }
                setErrore(data.error || 'Errore durante il caricamento.');
                return;
            }
            // Successo: ricevuta caricata, modificabile finché si resta in pagina
            const nuovaEvidenza = { nome_file: data.nome_file, uploaded_at: data.uploaded_at };
            setEvidenza(nuovaEvidenza);
            setEditabileInSessione(true);
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            setStato('uploaded');
            if (onUploaded) onUploaded(nuovaEvidenza);
        } catch {
            setErrore('Errore di rete durante il caricamento.');
        } finally {
            setSubmitting(false);
        }
    };

    if (stato === 'loading') {
        return <p style={styles.muted}>Verifica del link in corso…</p>;
    }

    if (stato === 'error') {
        return (
            <div style={styles.boxError}>
                <p>Si è verificato un errore. Riprova più tardi.</p>
            </div>
        );
    }

    if (stato === 'not_found') {
        return (
            <div style={styles.boxError}>
                <div style={styles.bigCode}>404</div>
                <p>Il link non è valido. Verifica di aver copiato correttamente l'indirizzo ricevuto via email.</p>
            </div>
        );
    }

    if (stato === 'expired') {
        return (
            <div style={styles.boxWarn}>
                <p><strong>Link scaduto.</strong></p>
                <p>Questo link per il caricamento della ricevuta è valido 3 giorni e non è più attivo. Contatta l'associazione per riceverne uno nuovo.</p>
            </div>
        );
    }

    if (stato === 'uploaded') {
        return (
            <div>
                <div style={styles.boxSuccess}>
                    <p><strong>Ricevuta caricata correttamente.</strong></p>
                    <ul style={styles.list}>
                        <li>File: <strong>{evidenza?.nome_file || '—'}</strong></li>
                        <li>Data caricamento: <strong>{formatData(evidenza?.uploaded_at)}</strong></li>
                    </ul>
                </div>

                {editabileInSessione ? (
                    <div style={styles.editBlock}>
                        <p style={styles.muted}>
                            Puoi ancora sostituire il file finché resti su questa pagina.
                            Riaprendo il link in un secondo momento non sarà più possibile modificarlo.
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={ACCEPT}
                            onChange={onSelectFile}
                            style={styles.fileInput}
                        />
                        {errore && <p style={styles.errText}>{errore}</p>}
                        <button
                            style={{ ...styles.btn, ...(submitting || !file ? styles.btnDisabled : {}) }}
                            disabled={submitting || !file}
                            onClick={() => invia('PUT')}
                        >
                            {submitting ? 'Aggiornamento…' : 'Sostituisci ricevuta'}
                        </button>
                    </div>
                ) : (
                    <p style={styles.muted}>La ricevuta è stata registrata e non è più modificabile.</p>
                )}
            </div>
        );
    }

    // stato === 'ok'
    return (
        <div>
            {mostraOrdine && ordine && (
                <div style={styles.boxInfo}>
                    <div>Ordine: <strong>{ordine.numero}</strong></div>
                    {ordine.intestatario && <div>Intestatario: <strong>{ordine.intestatario}</strong></div>}
                    <div>Importo: <strong>{ordine.importo}</strong></div>
                </div>
            )}
            <p style={styles.muted}>
                Carica la ricevuta del pagamento. Formati ammessi: {ACCEPT_LABEL}. Dimensione massima 10MB.
            </p>
            <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT}
                onChange={onSelectFile}
                style={styles.fileInput}
            />
            {errore && <p style={styles.errText}>{errore}</p>}
            <button
                style={{ ...styles.btn, ...(submitting || !file ? styles.btnDisabled : {}) }}
                disabled={submitting || !file}
                onClick={() => invia('POST')}
            >
                {submitting ? 'Caricamento…' : 'Carica ricevuta'}
            </button>
        </div>
    );
}

const styles = {
    muted: { color: '#6b7280', fontSize: '14px', lineHeight: 1.5 },
    list: { margin: '8px 0 0', paddingLeft: '18px', lineHeight: 1.7 },
    bigCode: { fontSize: '48px', fontWeight: 700, color: '#9ca3af', marginBottom: '8px' },
    boxInfo: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', lineHeight: 1.6 },
    boxSuccess: { background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '16px', color: '#065f46' },
    boxWarn: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '16px', color: '#92400e' },
    boxError: { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px', color: '#991b1b', textAlign: 'center' },
    editBlock: { marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' },
    fileInput: { display: 'block', margin: '16px 0', width: '100%' },
    btn: {
        background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px',
        padding: '12px 20px', fontSize: '15px', cursor: 'pointer', width: '100%',
    },
    btnDisabled: { background: '#9ca3af', cursor: 'not-allowed' },
    errText: { color: '#dc2626', fontSize: '14px', margin: '4px 0 12px' },
};
