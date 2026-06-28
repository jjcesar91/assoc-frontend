import React from 'react';
import { Mail, X, Send } from 'lucide-react';

/**
 * Modal che chiede conferma per l'invio di una comunicazione email (stato CHIEDI).
 * Props:
 *  - isOpen
 *  - titolo            : titolo del modal
 *  - destinatario      : email del socio
 *  - oggetto           : oggetto email
 *  - testoHtml         : anteprima HTML del corpo (shortcode già risolti)
 *  - allegatoNome      : (opzionale) nome del file allegato (es. ricevuta PDF)
 *  - sending           : bool, invio in corso
 *  - onConfirm / onClose
 */
const ChiediInvioComunicazioneModal = ({
    isOpen,
    titolo = 'Invio comunicazione',
    destinatario,
    oggetto,
    testoHtml,
    allegatoNome,
    sending = false,
    onConfirm,
    onClose,
}) => {
    if (!isOpen) return null;

    const noEmail = !destinatario;

    return (
        <div style={overlayStyle} onClick={sending ? undefined : onClose}>
            <div style={modalStyle} onClick={e => e.stopPropagation()}>
                <div style={headerStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Mail size={20} /> <span style={{ fontWeight: 600 }}>{titolo}</span>
                    </div>
                    <button onClick={onClose} disabled={sending} style={closeBtnStyle} title="Chiudi">
                        <X size={20} />
                    </button>
                </div>

                <div style={bodyStyle}>
                    {noEmail ? (
                        <div style={{ color: 'var(--danger)', background: 'var(--danger-container)', padding: 12, borderRadius: 6 }}>
                            Il socio associato all'ordine non ha un indirizzo email registrato: impossibile inviare la comunicazione.
                        </div>
                    ) : (
                        <>
                            <p style={{ marginTop: 0 }}>Vuoi inviare la comunicazione via email al socio?</p>
                            <div style={rowStyle}><span style={labelStyle}>Destinatario</span><span>{destinatario}</span></div>
                            <div style={rowStyle}><span style={labelStyle}>Oggetto</span><span>{oggetto}</span></div>
                            {allegatoNome && (
                                <div style={rowStyle}><span style={labelStyle}>Allegato</span><span>📎 {allegatoNome}</span></div>
                            )}
                            <div style={{ marginTop: 12 }}>
                                <span style={labelStyle}>Anteprima messaggio</span>
                                <div
                                    style={previewStyle}
                                    dangerouslySetInnerHTML={{ __html: testoHtml || '' }}
                                />
                            </div>
                        </>
                    )}
                </div>

                <div style={footerStyle}>
                    <button onClick={onClose} disabled={sending} className="btn-outlined" style={{ height: 40 }}>
                        <X size={16} /> {noEmail ? 'Chiudi' : 'Non inviare'}
                    </button>
                    {!noEmail && (
                        <button onClick={onConfirm} disabled={sending} className="btn-contained" style={{ height: 40, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Send size={16} /> {sending ? 'Invio in corso...' : 'Invia'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2100,
};
const modalStyle = {
    background: 'var(--surface)', borderRadius: 8, width: 560, maxWidth: '95%',
    maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
};
const headerStyle = {
    padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    borderBottom: '1px solid var(--border-color)',
};
const closeBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' };
const bodyStyle = { padding: '20px', overflowY: 'auto' };
const rowStyle = { display: 'flex', gap: 12, padding: '4px 0', fontSize: '0.9rem' };
const labelStyle = { minWidth: 110, color: 'var(--text-secondary)', fontWeight: 500, display: 'inline-block' };
const previewStyle = {
    border: '1px solid var(--border-color)', borderRadius: 6, padding: 12, marginTop: 6,
    background: 'var(--surface-1)', maxHeight: 220, overflowY: 'auto', fontSize: '0.9rem',
};
const footerStyle = {
    padding: '14px 20px', display: 'flex', justifyContent: 'flex-end', gap: 12,
    borderTop: '1px solid var(--border-color)', background: 'var(--surface-1)', borderRadius: '0 0 8px 8px',
};

export default ChiediInvioComunicazioneModal;
