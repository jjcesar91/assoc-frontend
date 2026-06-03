const AUTH_BYPASS_PATHS = [
  '/auth/api/login',
  '/auth/api/register',
  '/auth/api/refresh-token',
];

const SESSION_VALIDATION_PATHS = [
  '/auth/api/me',
  '/auth/api/refresh-token',
];

const INTERNAL_API_PATHS = [
  '/auth/',
  '/users/',
  '/documents/',
  '/products/',
  '/payments/',
  '/activities/',
];

let refreshInFlight = null;

function hasFeatureAccess(featureId) {
  const role = String(localStorage.getItem('user_role') || 'user').toLowerCase();
  // Keep superuser and admin unrestricted; other roles must respect feature flags.
  if (role === 'superuser' || role === 'admin') {
    return true;
  }

  const rawFeatures = localStorage.getItem('user_features');
  // Se le features non sono ancora caricate (race condition al login) o
  // il valore è null (nessuna restrizione impostata) → accesso consentito.
  if (rawFeatures === null || rawFeatures === undefined) {
    return true;
  }

  try {
    const features = JSON.parse(rawFeatures);
    if (features === null || features === undefined) {
      return true; // null = nessuna restrizione, tutte le funzionalità abilitate
    }
    return Array.isArray(features) && features.includes(featureId);
  } catch {
    return false;
  }
}

function hasApiAccess(requestUrl) {
  if (requestUrl.includes('/payments/')) {
    return hasFeatureAccess('pagamenti');
  }
  if (requestUrl.includes('/products/')) {
    // products è una API condivisa usata da pagamenti, soci, attività, scadenziario, prodotti
    // basta che l'utente abbia almeno una delle feature che la utilizzano
    return (
      hasFeatureAccess('prodotti') ||
      hasFeatureAccess('pagamenti') ||
      hasFeatureAccess('soci') ||
      hasFeatureAccess('attivita') ||
      hasFeatureAccess('scadenziario') ||
      hasFeatureAccess('contabilita')
    );
  }
  return true;
}

function getRequestUrl(input) {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  if (input && typeof input === 'object' && 'url' in input) return input.url;
  return '';
}

function shouldBypass(url) {
  return AUTH_BYPASS_PATHS.some((path) => url.includes(path));
}

function isSessionValidationRequest(url) {
  return SESSION_VALIDATION_PATHS.some((path) => url.includes(path));
}

function isInternalApiRequest(url) {
  return INTERNAL_API_PATHS.some((path) => url.includes(path));
}

function withAuthHeaderIfNeeded(input, init, options = {}) {
  const { tokenOverride, forceReplace = false } = options;
  const requestUrl = getRequestUrl(input);
  const token = tokenOverride || localStorage.getItem('token');

  if (!token || !isInternalApiRequest(requestUrl) || shouldBypass(requestUrl)) {
    return init;
  }

  const mergedHeaders = new Headers();

  if (input instanceof Request) {
    const inputHeaders = new Headers(input.headers);
    inputHeaders.forEach((value, key) => mergedHeaders.set(key, value));
  }

  if (init?.headers) {
    const initHeaders = new Headers(init.headers);
    initHeaders.forEach((value, key) => mergedHeaders.set(key, value));
  }

  if (forceReplace) {
    mergedHeaders.set('Authorization', `Bearer ${token}`);
  } else if (!mergedHeaders.has('Authorization')) {
    mergedHeaders.set('Authorization', `Bearer ${token}`);
  }

  return {
    ...(init || {}),
    headers: mergedHeaders,
  };
}

function clearSessionStorage() {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user_role');
  localStorage.removeItem('user_features');
  localStorage.removeItem('selectedSocietaId');
  localStorage.removeItem('impersonate_admin_token');
  localStorage.removeItem('impersonate_admin_refresh_token');
  localStorage.removeItem('impersonate_admin_role');
  localStorage.removeItem('impersonate_admin_features');
}

function redirectToLoginIfNeeded() {
  if (window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
}

async function refreshSession(originalFetch) {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await originalFetch('/auth/api/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: refreshToken }),
      });

      if (!response.ok) {
        return null;
      }

      const payload = await response.json();
      if (!payload?.accessToken || !payload?.refreshToken) {
        return null;
      }

      localStorage.setItem('token', payload.accessToken);
      localStorage.setItem('refresh_token', payload.refreshToken);
      window.dispatchEvent(new Event('session-updated'));
      return payload;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export function installAuthFetchGuard() {
  if (typeof window === 'undefined' || window.__authFetchGuardInstalled) {
    return;
  }

  const originalFetch = window.fetch.bind(window);
  window.__authFetchGuardInstalled = true;

  window.fetch = async (input, init) => {
    const requestUrl = getRequestUrl(input);
    const nextInit = withAuthHeaderIfNeeded(input, init);

    if (
      isInternalApiRequest(requestUrl) &&
      !shouldBypass(requestUrl) &&
      !hasApiAccess(requestUrl)
    ) {
      return new Response(
        JSON.stringify({ error: 'Forbidden by frontend feature gate' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    let response = await originalFetch(input, nextInit);

    // Refresh only for authentication failures (401).
    // A 403 usually means missing permissions and refreshing would just create retry loops.
    const shouldTryRefresh =
      isInternalApiRequest(requestUrl) &&
      !shouldBypass(requestUrl) &&
      !nextInit?.__authRetried &&
      response.status === 401;

    if (shouldTryRefresh) {
      const refreshedTokens = await refreshSession(originalFetch);

      if (refreshedTokens?.accessToken) {
        const retryInit = {
          ...(nextInit || {}),
          __authRetried: true,
        };
        const retryRequestInit = withAuthHeaderIfNeeded(input, retryInit, {
          tokenOverride: refreshedTokens.accessToken,
          forceReplace: true,
        });
        response = await originalFetch(input, retryRequestInit);
      } else {
        clearSessionStorage();
        redirectToLoginIfNeeded();
        return response;
      }
    }

    // Force logout only when session validation itself fails.
    // Other API endpoints can legitimately return 401/403 for permission scopes.
    if (
      isSessionValidationRequest(requestUrl) &&
      !shouldBypass(requestUrl) &&
      (response.status === 401 || response.status === 403)
    ) {
      clearSessionStorage();
      redirectToLoginIfNeeded();
    }

    return response;
  };
}
