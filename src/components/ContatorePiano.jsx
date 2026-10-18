import React from 'react';

// Contatore discreto "usati / massimo" di una risorsa limitata dal piano della
// licenza (es. soci, conti, moduli). Nulla se la risorsa non è limitata.
const ContatorePiano = ({ usati, massimo, etichetta, pianoNome, style }) => {
    if (massimo == null) return null;
    const pieno = usati >= massimo;
    return (
        <span
            title={`Piano ${pianoNome || ''}: massimo ${massimo} ${etichetta}`}
            style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontSize: '0.8rem', padding: '2px 8px', borderRadius: '999px',
                backgroundColor: pieno ? 'var(--warning-container)' : 'var(--surface-2)',
                color: pieno ? 'var(--on-warning-container)' : 'var(--text-secondary)',
                whiteSpace: 'nowrap', ...style,
            }}
        >
            {etichetta}: <strong>{usati}</strong> / {massimo}{pianoNome ? ` · ${pianoNome}` : ''}
        </span>
    );
};

export default ContatorePiano;
