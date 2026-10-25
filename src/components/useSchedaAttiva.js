import { useSearchParams } from 'react-router-dom';

// Scheda attiva delle pagine a schede del Backoffice: sta nell'URL (?scheda=…), così
// il link e il ricaricamento della pagina la conservano. Senza parametro: la prima.
export function useSchedaAttiva(tabs) {
    const [params, setParams] = useSearchParams();
    const richiesta = params.get('scheda');
    const attiva = tabs.some(t => t.id === richiesta) ? richiesta : tabs[0]?.id;
    const seleziona = (id) => setParams(p => { const n = new URLSearchParams(p); n.set('scheda', id); return n; }, { replace: true });
    return [attiva, seleziona];
}
