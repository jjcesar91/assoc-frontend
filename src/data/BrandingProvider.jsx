import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrandingContext, EMPTY_BRANDING, applyBranding, readCachedBranding, writeCachedBranding } from './branding';

// Carica la personalizzazione dell'ambiente e la applica (titolo tab, favicon,
// colori). L'ultima versione nota resta in localStorage ed è applicata già in
// main.jsx prima del primo render, così al ricaricamento non si vede la skin di default.
const BrandingProvider = ({ children }) => {
    const [branding, setBranding] = useState(() => readCachedBranding() || EMPTY_BRANDING);
    // Bozza in anteprima (pagina Configurazione): ha la precedenza sul salvato
    const previewRef = useRef(null);

    const refresh = useCallback(() => fetch('/users/api/public/piattaforma')
        .then(res => (res.ok ? res.json() : null))
        .then(json => {
            if (!json) return;
            const data = { ...EMPTY_BRANDING, ...json };
            writeCachedBranding(data);
            setBranding(data);
        })
        .catch(() => { /* rete assente: resta la versione in cache */ }), []);

    useEffect(() => { refresh(); }, [refresh]);
    useEffect(() => { applyBranding(previewRef.current || branding); }, [branding]);

    // Anteprima dal vivo (pagina Configurazione): applica una bozza senza salvarla;
    // preview(null) torna alla configurazione salvata.
    const preview = useCallback((draft) => {
        previewRef.current = draft || null;
        applyBranding(draft || branding);
    }, [branding]);

    return (
        <BrandingContext.Provider value={{ branding, refresh, preview, setBranding }}>
            {children}
        </BrandingContext.Provider>
    );
};

export default BrandingProvider;
