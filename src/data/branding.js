import { createContext, useContext } from 'react';

// Personalizzazione ("skin") dell'ambiente, configurata in Backoffice → Configurazione
// e letta da /users/api/public/piattaforma. Campi null = aspetto di default.

export const DEFAULT_TITLE = 'Gestionale';
export const DEFAULT_SUBTITLE = 'Portale di gestione associazioni';
const DEFAULT_FAVICON = '/vite.svg';
const CACHE_KEY = 'piattaforma_branding';

export const EMPTY_BRANDING = {
    nome_ambiente: null,
    favicon_path: null,
    colore_primario: null,
    colore_header: null,
    logo_path: null,
    titolo: null,
    sottotitolo: null,
    descrizione_html: null,
};

export const BrandingContext = createContext({ branding: EMPTY_BRANDING, refresh: () => {}, preview: () => {} });
export const useBranding = () => useContext(BrandingContext);

// I file caricati sono serviti dal servizio users sotto /users/uploads/...
export const assetUrl = (relPath) => (relPath ? `/users/${relPath}` : null);

// --- Colori -----------------------------------------------------------------

const HEX = /^#[0-9a-fA-F]{6}$/;

const hexToRgb = (hex) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const rgbToHex = (rgb) => `#${rgb.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
const mix = (hex, target, amount) => {
    const a = hexToRgb(hex);
    const b = hexToRgb(target);
    return rgbToHex(a.map((v, i) => v + (b[i] - v) * amount));
};

// Dal colore primario si ricavano le varianti usate dal design system.
export const derivePalette = (primary) => ({
    '--primary': primary,
    '--primary-hover': mix(primary, '#000000', 0.15),
    '--primary-active': mix(primary, '#000000', 0.3),
    '--primary-container': mix(primary, '#ffffff', 0.82),
    '--on-primary-container': mix(primary, '#000000', 0.6),
});

const PALETTE_VARS = ['--primary', '--primary-hover', '--primary-active', '--primary-container', '--on-primary-container', '--header-bg'];

// --- Applicazione al documento ---------------------------------------------

export function applyBranding(b) {
    const branding = { ...EMPTY_BRANDING, ...(b || {}) };
    const root = document.documentElement;

    document.title = branding.nome_ambiente || DEFAULT_TITLE;

    let icon = document.querySelector("link[rel~='icon']");
    if (!icon) {
        icon = document.createElement('link');
        icon.rel = 'icon';
        document.head.appendChild(icon);
    }
    const faviconHref = assetUrl(branding.favicon_path) || DEFAULT_FAVICON;
    if (icon.getAttribute('href') !== faviconHref) {
        icon.removeAttribute('type'); // il default è SVG, i file caricati no
        icon.setAttribute('href', faviconHref);
    }

    PALETTE_VARS.forEach(v => root.style.removeProperty(v));
    if (HEX.test(branding.colore_primario || '')) {
        Object.entries(derivePalette(branding.colore_primario)).forEach(([k, v]) => root.style.setProperty(k, v));
    }
    if (HEX.test(branding.colore_header || '')) {
        root.style.setProperty('--header-bg', branding.colore_header);
    }
}

export function readCachedBranding() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        return raw ? { ...EMPTY_BRANDING, ...JSON.parse(raw) } : null;
    } catch {
        return null;
    }
}

export function writeCachedBranding(b) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(b)); } catch { /* storage non disponibile */ }
}

// --- Descrizione HTML della pagina di login --------------------------------

// Ripulitura lato browser (il backend ripulisce già al salvataggio): ammessi
// solo i tag di formattazione dell'editor, nessun attributo.
const ALLOWED_TAGS = new Set(['P', 'DIV', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'SPAN']);

export function sanitizeHtml(html) {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
    const walk = (node) => {
        [...node.childNodes].forEach(child => {
            if (child.nodeType === Node.ELEMENT_NODE) {
                if (!ALLOWED_TAGS.has(child.tagName)) {
                    child.remove();
                    return;
                }
                [...child.attributes].forEach(attr => child.removeAttribute(attr.name));
                walk(child);
            } else if (child.nodeType !== Node.TEXT_NODE) {
                child.remove();
            }
        });
    };
    const container = doc.body.firstChild;
    walk(container);
    return container.innerHTML;
}
