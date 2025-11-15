const AUTH_KEY = 'finova_auth';

export function storeAuth(token, user) {
  const authData = { token, user };
  localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
}

export function getStoredAuth() {
  const stored = localStorage.getItem(AUTH_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return null;
    }
  }
  return null;
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
}



















