import { getSignInDestination } from './auth-destination';

const STORAGE_KEY = 'prolink:oauth-destination';
const MAX_AGE_MS = 15 * 60 * 1000;

export function clearOAuthDestination() {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* Storage may be disabled. */ }
}

export function rememberOAuthDestination(destination: string) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ destination: getSignInDestination(destination), createdAt: Date.now() })); } catch { /* The callback still has its next parameter. */ }
}

export function readOAuthDestination(): string | null {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    const record = JSON.parse(value);
    if (typeof record.createdAt !== 'number' || typeof record.destination !== 'string' || Date.now() - record.createdAt > MAX_AGE_MS || record.createdAt > Date.now()) {
      clearOAuthDestination();
      return null;
    }
    return getSignInDestination(record.destination);
  } catch { clearOAuthDestination(); return null; }
}

/** Recover a PKCE return sent to the site URL instead of the callback URL. */
export function recoverOAuthCallback(): boolean {
  const destination = readOAuthDestination();
  if (!destination || window.location.pathname === '/auth/callback') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.has('error') || new URLSearchParams(window.location.hash.slice(1)).has('error')) {
    clearOAuthDestination();
    window.location.replace('/sign-in?error=Google+sign-in+was+not+completed');
    return true;
  }
  const code = params.get('code');
  if (!code) return false;
  const callback = new URL('/auth/callback', window.location.origin);
  callback.searchParams.set('code', code);
  callback.searchParams.set('next', destination);
  window.location.replace(callback.toString());
  return true;
}

/** Handle authenticated returns that arrive directly on the landing page. */
export function finishOAuthNavigation(): boolean {
  const destination = readOAuthDestination();
  if (!destination) return false;
  clearOAuthDestination();
  if (window.location.pathname === destination) return false;
  window.location.replace(destination);
  return true;
}
