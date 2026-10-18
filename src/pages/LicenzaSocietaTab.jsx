import React, { useState } from 'react';
import { Plus, ExternalLink, Building2, Star } from 'lucide-react';
import NuovaSocietaModal from './NuovaSocietaModal';
import SocietaDettaglioModal from './SocietaDettaglioModal';
import { useAlert } from '../components/AlertModal';
import { useSocieta } from '../data/SocietaContext';
import { formatDateIT } from '../utils/dateUtils';

// Tab Società della licenza: elenco, dettaglio (anagrafica + utenti) e aggiunta.
// onChanged(): ricarica la licenza (e l'elenco) dopo un'aggiunta o una modifica.
const LicenzaSocietaTab = ({ licenza, onChanged }) => {
    const showAlert = useAlert();
    const { fetchSocieta } = useSocieta();
    const [isNewOpen, setIsNewOpen] = useState(false);
    const [dettaglioId, setDettaglioId] = useState(null);

    // Nuova società nella licenza: creazione con i default di sempre, poi gli
    // amministratori della licenza ottengono l'accesso anche a questa.
    const handleCreate = async (form, logoFile) => {
        let created;
        try {
            const res = await fetch('/users/api/societa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, licenza_id: licenza.id }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) { showAlert(data.error || data.message || 'Errore creazione società', 'Errore'); return; }
            created = data;
        } catch {
            showAlert('Errore di rete', 'Errore');
            return;
        }
        if (logoFile) {
            try {
                const fd = new FormData();
                fd.append('logo', logoFile);
                await fetch(`/users/api/societa/${created.id}/logo`, { method: 'POST', body: fd });
            } catch (e) {
                console.error('Errore caricamento logo società', e);
            }
        }
        try {
            const res = await fetch(`/auth/api/admin/licenze/${licenza.id}/provisioning`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ societaId: created.id }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                showAlert(`Società creata, ma gli amministratori non hanno ancora accesso: ${data.error || 'errore'}. Usa "Estendi a tutte le società" nel tab Amministratori.`, 'Attenzione', 'warning');
            }
        } catch {
            showAlert('Società creata, ma errore di rete nell\'abilitare gli amministratori. Usa "Estendi a tutte le società" nel tab Amministratori.', 'Attenzione', 'warning');
        }
        setIsNewOpen(false);
        fetchSocieta();
        onChanged?.();
    };

    const societa = licenza.societa || [];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {societa.length} {societa.length === 1 ? 'società' : 'società'} in questa licenza. Gli amministratori della licenza accedono a tutte.
                </div>
                <button className="btn-contained" style={{ backgroundColor: 'var(--success-color)', display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => setIsNewOpen(true)}>
                    <Plus size={16} /> Aggiungi società
                </button>
            </div>

            <div className="table-card">
                <div className="table-responsive">
                    <table className="md-table">
                        <thead>
                            <tr>
                                <th>Denominazione</th>
                                <th>Tipo</th>
                                <th>Codice fiscale</th>
                                <th>Email</th>
                                <th>Creata il</th>
                                <th style={{ textAlign: 'right' }}>Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {societa.length === 0 ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>Nessuna società</td></tr>
                            ) : societa.map(s => (
                                <tr key={s.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <Building2 size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                                            <span style={{ fontWeight: 500 }}>{s.denominazione}</span>
                                            {s.id === licenza.societa_id && (
                                                <span className="badge badge-info" title="Società indicata alla registrazione" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <Star size={12} /> Registrazione
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ fontSize: '0.875rem' }}>{s.tipo_associazione || '–'}</td>
                                    <td style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>{s.codice_fiscale || '–'}</td>
                                    <td style={{ fontSize: '0.875rem' }}>{s.email || '–'}</td>
                                    <td style={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{s.createdAt ? formatDateIT(s.createdAt) : '–'}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button className="btn-icon-small" title="Anagrafica e utenti" style={{ backgroundColor: 'var(--warning)', color: '#fff', borderRadius: '4px', padding: '5px 8px' }} onClick={() => setDettaglioId(s.id)}>
                                            <ExternalLink size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {dettaglioId && (
                <SocietaDettaglioModal
                    key={dettaglioId}
                    societaId={dettaglioId}
                    onClose={() => setDettaglioId(null)}
                    onSaved={() => onChanged?.()}
                />
            )}

            <NuovaSocietaModal
                isOpen={isNewOpen}
                onClose={() => setIsNewOpen(false)}
                onSave={handleCreate}
                title={`Nuova società in ${licenza.associazione || 'questa licenza'}`}
            />
        </div>
    );
};

export default LicenzaSocietaTab;
