import React, { useState, useEffect, useCallback } from 'react';
import { ScrollText, ExternalLink, AlertTriangle } from 'lucide-react';
import NuovaLicenzaMenu from '../components/NuovaLicenzaMenu';
import LicenzaModal from './LicenzaModal';
import NuovaSocietaModal from './NuovaSocietaModal';
import { useAlert } from '../components/AlertModal';
import { useSocieta } from '../data/SocietaContext';
import { PIANI, STATI, pianoInfo, statoInfo } from '../data/licenze';
import { formatDateIT } from '../utils/dateUtils';
import './Prodotti.css';

// Backoffice → Licenze (solo superuser): una riga per licenza. Ogni licenza
// raggruppa una o più società e ha almeno un amministratore.
const BackofficeLicenze = () => {
    const showAlert = useAlert();
    const { fetchSocieta } = useSocieta();
    const [licenze, setLicenze] = useState([]);
    const [adminCount, setAdminCount] = useState({});
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ nome: '', stato: '', piano: '' });
    const [aperta, setAperta] = useState(null); // { id, initialTab, initialLink }
    const [isNewOpen, setIsNewOpen] = useState(false);

    const fetchAll = useCallback(() => Promise.all([
        fetch('/users/api/licenze').then(r => (r.ok ? r.json() : [])),
        fetch('/auth/api/admin/licenze/amministratori-conteggio').then(r => (r.ok ? r.json() : {})),
    ])
        .then(([list, counts]) => { setLicenze(list); setAdminCount(counts); })
        .catch(() => {})
        .finally(() => setLoading(false)), []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Nuova licenza da Backoffice (dati ricevuti via email): crea la prima società,
    // che apre una licenza Free in attesa di attivazione, poi l'amministratore senza
    // password + link (potrà accedere dopo l'attivazione dal tab Licenza).
    const handleCreate = async (form, logoFile) => {
        const { admin_nome, admin_cognome, admin_email, admin_telefono, ...societaData } = form;
        let created;
        try {
            const res = await fetch('/users/api/societa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(societaData),
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
        setIsNewOpen(false);
        fetchSocieta();

        // Licenza aperta dalla nuova società
        const societaRes = await fetch(`/users/api/societa/${created.id}`).catch(() => null);
        const licenzaId = societaRes?.ok ? (await societaRes.json()).licenza_id : null;
        if (!licenzaId) {
            showAlert('Società creata, ma la licenza non è stata trovata. Ricarica la pagina.', 'Attenzione', 'warning');
            fetchAll();
            return;
        }
        try {
            const res = await fetch('/auth/api/admin/onboarding-admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    societaId: created.id,
                    licenzaId,
                    email: admin_email.trim().toLowerCase(),
                    nome: admin_nome.trim(),
                    cognome: admin_cognome.trim(),
                    telefono: admin_telefono.trim(),
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                showAlert(`Licenza creata, ma l'amministratore no: ${data.error || 'errore'}. Aggiungilo dal tab Amministratori.`, 'Attenzione', 'warning');
                setAperta({ id: licenzaId, initialTab: 'amministratori' });
            } else {
                setAperta({ id: licenzaId, initialTab: 'amministratori', initialLink: { token: data.token, expiresAt: data.expiresAt, email: data.user.email } });
            }
        } catch {
            showAlert('Licenza creata, ma errore di rete nella creazione dell\'amministratore. Aggiungilo dal tab Amministratori.', 'Attenzione', 'warning');
            setAperta({ id: licenzaId, initialTab: 'amministratori' });
        }
        fetchAll();
    };

    const inAttesa = licenze.filter(l => l.stato === 'in_attesa').length;
    const filtered = licenze.filter(l => {
        if (filters.stato && l.stato !== filters.stato) return false;
        if (filters.piano && l.piano !== filters.piano) return false;
        if (filters.nome) {
            const q = filters.nome.toLowerCase();
            const match = (l.nome || '').toLowerCase().includes(q) || l.societa.some(s => (s.denominazione || '').toLowerCase().includes(q));
            if (!match) return false;
        }
        return true;
    });

    return (
        <div className="prodotti-full-container">
            <div className="main-content">
                {inAttesa > 0 && (
                    <div
                        onClick={() => setFilters(f => ({ ...f, stato: 'in_attesa' }))}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', marginBottom: '12px', borderRadius: '8px', backgroundColor: 'var(--warning-container)', color: 'var(--on-warning-container)', cursor: 'pointer' }}
                    >
                        <AlertTriangle size={18} />
                        <span><strong>{inAttesa}</strong> {inAttesa === 1 ? 'registrazione in attesa' : 'registrazioni in attesa'} di attivazione — clicca per vederle.</span>
                    </div>
                )}

                <div className="toolbar-card" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 2, minWidth: '200px' }}>
                        <label style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Licenza o società</label>
                        <input className="md-input" placeholder="Cerca" value={filters.nome} onChange={e => setFilters(f => ({ ...f, nome: e.target.value }))} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '140px' }}>
                        <label style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Stato</label>
                        <select className="md-select" value={filters.stato} onChange={e => setFilters(f => ({ ...f, stato: e.target.value }))}>
                            <option value="">Tutti</option>
                            {STATI.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '140px' }}>
                        <label style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Piano</label>
                        <select className="md-select" value={filters.piano} onChange={e => setFilters(f => ({ ...f, piano: e.target.value }))}>
                            <option value="">Tutti</option>
                            {PIANI.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                    </div>
                    <NuovaLicenzaMenu onCrea={() => setIsNewOpen(true)} style={{ marginLeft: 'auto' }} />
                </div>

                <div className="table-card">
                    <div className="table-responsive">
                        <table className="md-table">
                            <thead>
                                <tr>
                                    <th>Licenza</th>
                                    <th>Piano</th>
                                    <th>Stato</th>
                                    <th>Società</th>
                                    <th>Amministratori</th>
                                    <th>Registrata il</th>
                                    <th>Scadenza</th>
                                    <th style={{ textAlign: 'right' }}>Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>Caricamento...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>Nessuna licenza trovata</td></tr>
                                ) : filtered.map(l => {
                                    const piano = pianoInfo(l.piano);
                                    const stato = statoInfo(l.stato);
                                    const nAdmin = adminCount[l.id] || 0;
                                    return (
                                        <tr key={l.id} onClick={() => setAperta({ id: l.id })} style={{ cursor: 'pointer' }}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--info-container)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        <ScrollText size={20} />
                                                    </div>
                                                    <div style={{ fontWeight: 500 }}>{l.nome || `Licenza #${l.id}`}</div>
                                                </div>
                                            </td>
                                            <td><span className={`badge ${piano.badge}`}>{piano.label}</span></td>
                                            <td><span className={`badge ${stato.badge}`}>{stato.label}</span></td>
                                            <td style={{ fontSize: '0.875rem' }} title={l.societa.map(s => s.denominazione).join('\n')}>
                                                {l.societa.length === 1 ? l.societa[0].denominazione : `${l.societa.length} società`}
                                            </td>
                                            <td style={{ fontSize: '0.875rem' }}>
                                                {nAdmin > 0 ? nAdmin : <span style={{ color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={14} /> Nessuno</span>}
                                            </td>
                                            <td style={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{formatDateIT(l.createdAt)}</td>
                                            <td style={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{l.data_scadenza ? formatDateIT(l.data_scadenza) : '–'}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button className="btn-icon-small" title="Apri" style={{ backgroundColor: 'var(--warning)', color: '#fff', borderRadius: '4px', padding: '5px 8px' }} onClick={e => { e.stopPropagation(); setAperta({ id: l.id }); }}>
                                                    <ExternalLink size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {!loading && (
                        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            Tot licenze: <strong>{filtered.length}</strong>
                        </div>
                    )}
                </div>
            </div>

            {aperta && (
                <LicenzaModal
                    key={aperta.id}
                    licenzaId={aperta.id}
                    initialTab={aperta.initialTab}
                    initialLink={aperta.initialLink}
                    onClose={() => setAperta(null)}
                    onChanged={fetchAll}
                />
            )}

            <NuovaSocietaModal
                isOpen={isNewOpen}
                onClose={() => setIsNewOpen(false)}
                onSave={handleCreate}
                withAdmin
                title="Nuova licenza"
            />
        </div>
    );
};

export default BackofficeLicenze;
