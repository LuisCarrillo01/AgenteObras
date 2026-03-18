const TOKEN_KEY = 'opengravity.token';
const USER_KEY = 'opengravity.usuario';
const SIDEBAR_COLLAPSED_KEY = 'opengravity.sidebar-collapsed';

export function getStoredToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export function getStoredUser<T>() {
  const raw = window.localStorage.getItem(USER_KEY);

  if (!raw) {
    return null as T | null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null as T | null;
  }
}

export function setStoredUser<T>(user: T) {
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredUser() {
  window.localStorage.removeItem(USER_KEY);
}

export function getStoredSidebarCollapsed() {
  return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
}

export function setStoredSidebarCollapsed(collapsed: boolean) {
  window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
}
