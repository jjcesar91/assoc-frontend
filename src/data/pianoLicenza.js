import { useState, useEffect, useCallback } from 'react';

// Piano e limiti della licenza della società corrente (/users/api/licenza-corrente).
// I limiti sono applicati dal backend; qui servono per contatori, pulsanti
// disabilitati e avvisi. bypass = superuser (Backoffice), mai limitato.

const CACHE_TTL_MS = 30 * 1000;
const cache = new Map(); // societaId → { data, at }

export const MESSAGGIO_PIANO = (info) => `Non incluso nel piano ${info?.piano_nome || 'attuale'}`;

async function fetchPiano(societaId) {
    const key = societaId || 'default';
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;
    const res = await fetch(`/users/api/licenza-corrente${societaId ? `?societaId=${societaId}` : ''}`);
    const data = res.ok ? await res.json() : null;
    cache.set(key, { data, at: Date.now() });
    return data;
}

export function usePianoLicenza(societaId) {
    const [info, setInfo] = useState(() => cache.get(societaId || 'default')?.data || null);

    useEffect(() => {
        let cancelled = false;
        fetchPiano(societaId).then(d => { if (!cancelled) setInfo(d); }).catch(() => {});
        return () => { cancelled = true; };
    }, [societaId]);

    const refresh = useCallback(() => {
        cache.delete(societaId || 'default');
        return fetchPiano(societaId).then(setInfo).catch(() => {});
    }, [societaId]);

    const limiti = info && !info.bypass ? info.limiti : null;
    return {
        info,
        refresh,
        // Funzionalità non disponibile nel piano (false solo se esplicitamente esclusa)
        bloccata: (feature) => !!limiti && limiti[feature] === false,
        // Massimo per una risorsa (null = illimitato o superuser)
        massimo: (chiave) => (limiti ? limiti[chiave] ?? null : null),
    };
}

// Errore di limite dal backend (403 con code LIMITE_PIANO)
export const isLimitePiano = (data) => data?.code === 'LIMITE_PIANO';
