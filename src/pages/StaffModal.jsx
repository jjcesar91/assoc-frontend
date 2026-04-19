import React, { useState, useEffect } from 'react';
import { X, Shirt } from 'lucide-react';
import CityAutocomplete from '../components/CityAutocomplete';
import './SocioModal.css';
import './Soci.css';

const EMPTY = {
    cognome: '',
    nome: '',
    sesso: '',
    dataNascita: '',
    luogoNascita: '',
    codiceFiscale: '',
    email: '',
    telefono: '',
    indirizzo: '',
    comune: '',
    cap: '',
    descrizioneQualifica: '',
    attualmenteImpiegato: 'SI',
    iban: '',
};

const StaffModal = ({ isOpen, onClose, staff, onSave }) => {
    const [form, setForm] = useState(EMPTY);

    useEffect(() => {
        if (!isOpen) return;
        if (staff) {
            setForm({
                cognome:              staff.cognome              || '',
                nome:                 staff.nome                 || '',
                sesso:                staff.sesso                || '',
                dataNascita:          staff.dataNascita          || '',
                luogoNascita:         staff.luogoNascita         || '',
                codiceFiscale:        staff.codiceFiscale        || '',
                email:                staff.email                || '',
                telefono:             staff.telefono             || '',
                indirizzo:            staff.indirizzo            || '',
                comune:               staff.comune               || '',
                cap:                  staff.cap                  || '',
                descrizioneQualifica: staff.descrizioneQualifica || '',
                attualmenteImpiegato: staff.attualmenteImpiegato != null
                    ? (staff.attualmenteImpiegato ? 'SI' : 'NO') : '',
                iban:                 staff.iban                 || '',
            });
        } else {
            setForm(EMPTY);
        }
    }, [isOpen, staff]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleComuneSelect = (city) => {
        setForm(prev => ({ ...prev, comune: city.nome, cap: city.cap || prev.cap }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = {
            ...form,
            attualmenteImpiegato: form.attualmenteImpiegato === 'SI',
        };
        if (staff?.id) payload.id = staff.id;
        onSave(payload);
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ alignItems: 'flex-start', paddingTop: '72px' }}>
            <div
                className="modal-card socio-modal"
                style={{ maxWidth: '860px', width: '95%', maxHeight: 'calc(100vh - 88px)', display: 'flex', flexDirection: 'column' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 24px',
                    borderBottom: '1px solid #e5e7eb',
                    backgroundColor: '#fff'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Shirt size={20} style={{ color: '#10b981' }} />
                        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#111827' }}>
                            {form.cognome || form.nome ? `Staff ${form.cognome} ${form.nome}`.trim() : 'Nuovo Staff'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px', display: 'flex', alignItems: 'center', borderRadius: '4px' }}
                        onMouseOver={e => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                        onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px', backgroundColor: '#fff' }}>
                    <form id="staffForm" onSubmit={handleSubmit}>
                            <div className="md-form-grid-custom">
                                {/* Row 1: Cognome, Nome, Sesso, Data nascita */}
                                <div className="form-group grid-span-3">
                                    <label className="field-label">Cognome *</label>
                                    <input className="md-input" name="cognome" placeholder="Cognome" value={form.cognome} onChange={handleChange} required />
                                </div>
                                <div className="form-group grid-span-3">
                                    <label className="field-label">Nome *</label>
                                    <input className="md-input" name="nome" placeholder="Nome" value={form.nome} onChange={handleChange} required />
                                </div>
                                <div className="form-group grid-span-2">
                                    <label className="field-label">Sesso *</label>
                                    <select className="md-select" name="sesso" value={form.sesso} onChange={handleChange} required>
                                        <option value=""></option>
                                        <option value="M">M</option>
                                        <option value="F">F</option>
                                    </select>
                                </div>
                                <div className="form-group grid-span-4">
                                    <label className="field-label">Data nascita *</label>
                                    <input className="md-input" type="date" name="dataNascita" value={form.dataNascita} onChange={handleChange} required />
                                </div>

                                {/* Row 2: Luogo nascita, CF, Email, Telefono */}
                                <div className="form-group grid-span-3">
                                    <label className="field-label">Comune di Nascita *</label>
                                    <CityAutocomplete
                                        value={form.luogoNascita}
                                        name="luogoNascita"
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div className="form-group grid-span-3">
                                    <label className="field-label">Codice Fiscale</label>
                                    <input className="md-input" name="codiceFiscale" placeholder="Codice fiscale" value={form.codiceFiscale} onChange={handleChange} maxLength={16} style={{ textTransform: 'uppercase' }} />
                                </div>
                                <div className="form-group grid-span-3">
                                    <label className="field-label">Email</label>
                                    <input className="md-input" type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} />
                                </div>
                                <div className="form-group grid-span-3">
                                    <label className="field-label">Telefono</label>
                                    <input className="md-input" name="telefono" placeholder="Telefono" value={form.telefono} onChange={handleChange} />
                                </div>

                                {/* Row 3: Indirizzo, Comune, Cap */}
                                <div className="form-group grid-span-6">
                                    <label className="field-label">Indirizzo</label>
                                    <input className="md-input" name="indirizzo" placeholder="Indirizzo" value={form.indirizzo} onChange={handleChange} />
                                </div>
                                <div className="form-group grid-span-4">
                                    <label className="field-label">Comune di Residenza</label>
                                    <CityAutocomplete
                                        value={form.comune}
                                        name="comune"
                                        onChange={handleChange}
                                        onSelect={handleComuneSelect}
                                    />
                                </div>
                                <div className="form-group grid-span-2">
                                    <label className="field-label">Cap</label>
                                    <input className="md-input" name="cap" placeholder="Cap" value={form.cap} onChange={handleChange} maxLength={10} />
                                </div>

                                {/* Row 4: Qualifica, Attualmente impiegato, IBAN */}
                                <div className="form-group grid-span-4">
                                    <label className="field-label">Descrizione qualifica *</label>
                                    <input className="md-input" name="descrizioneQualifica" placeholder="Qualifica" value={form.descrizioneQualifica} onChange={handleChange} required />
                                </div>
                                <div className="form-group grid-span-2">
                                    <label className="field-label">Attualmente impiegato</label>
                                    <select className="md-select" name="attualmenteImpiegato" value={form.attualmenteImpiegato} onChange={handleChange}>
                                        <option value=""></option>
                                        <option value="SI">SI</option>
                                        <option value="NO">NO</option>
                                    </select>
                                </div>
                                <div className="form-group grid-span-6">
                                    <label className="field-label">IBAN</label>
                                    <input className="md-input" name="iban" placeholder="Iban" value={form.iban} onChange={handleChange} />
                                </div>
                            </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="modal-footer-custom">
                    <button className="btn-save-full" form="staffForm" type="submit">
                        ✓ Salva informazioni anagrafiche
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StaffModal;
