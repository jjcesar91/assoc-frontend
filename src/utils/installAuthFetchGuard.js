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

function withAuthHeaderIfNeeded(input, init) {
  const requestUrl = getRequestUrl(input);
  const token = localStorage.getItem('token');

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

  if (!mergedHeaders.has('Authorization')) {
    mergedHeaders.set('Authorization', `Bearer ${token}`);
  }

  return {
    ...(init || {}),
    headers: mergedHeaders,
  };
}

function clearSessionStorage() {
  localStorage.removeItem('token');
  localStorage.removeItem('user_role');
  localStorage.removeItem('user_features');
  localStorage.removeItem('selectedSocietaId');
  localStorage.removeItem('impersonate_admin_token');
  localStorage.removeItem('impersonate_admin_role');
  localStorage.removeItem('impersonate_admin_features');
}

export function installAuthFetchGuard() {
  if (typeof window === 'undefined' || window.__authFetchGuardInstalled) {
    return;
  }

  const originalFetch = window.fetch.bind(window);
  window.__authFetchGuardInstalled = true;

  window.fetch = async (input, init) => {
    const nextInit = withAuthHeaderIfNeeded(input, init);
    const response = await originalFetch(input, nextInit);
    const requestUrl = getRequestUrl(input);

    // Force logout only when session validation itself fails.
    // Other API endpoints can legitimately return 401/403 for permission scopes.
    if (
      isSessionValidationRequest(requestUrl) &&
      !shouldBypass(requestUrl) &&
      (response.status === 401 || response.status === 403)
    ) {
      clearSessionStorage();
      if (window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
    }

    return response;
  };
}
