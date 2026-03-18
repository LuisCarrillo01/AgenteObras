import { createContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { getBootstrapStatus as fetchBootstrapStatus, login as loginRequest } from '../api';
import type { AuthUser, LoginPayload } from '../types';
import { clearStoredToken, clearStoredUser, getStoredToken, getStoredUser, setStoredToken, setStoredUser } from '../../../shared/lib/storage';

interface AuthContextValue {
  usuario: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  initializing: boolean;
  bootstrapRequired: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
  refreshBootstrapStatus: () => Promise<void>;
  markBootstrapResolved: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [usuario, setUsuario] = useState<AuthUser | null>(() => getStoredUser<AuthUser>());
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [initializing, setInitializing] = useState(true);
  const [bootstrapRequired, setBootstrapRequired] = useState(false);

  const logout = () => {
    clearStoredToken();
    clearStoredUser();
    setToken(null);
    setUsuario(null);
  };

  const refreshBootstrapStatus = async () => {
    try {
      const status = await fetchBootstrapStatus();
      setBootstrapRequired(status.requiresSetup);
    } catch {
      setBootstrapRequired(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      if (token && usuario) {
        setBootstrapRequired(false);
        setInitializing(false);
        return;
      }

      await refreshBootstrapStatus();
      setInitializing(false);
    };

    void initialize();
  }, [token, usuario]);

  useEffect(() => {
    const handleUnauthorized = () => logout();

    window.addEventListener('app:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('app:unauthorized', handleUnauthorized);
  }, []);

  const login = async (payload: LoginPayload) => {
    const data = await loginRequest(payload);
    setStoredToken(data.token);
    setStoredUser(data.usuario);
    setToken(data.token);
    setUsuario(data.usuario);
    setBootstrapRequired(false);
  };

  const markBootstrapResolved = () => setBootstrapRequired(false);

  const value = useMemo(
    () => ({
      usuario,
      token,
      isAuthenticated: Boolean(token && usuario),
      initializing,
      bootstrapRequired,
      login,
      logout,
      refreshBootstrapStatus,
      markBootstrapResolved,
    }),
    [bootstrapRequired, initializing, token, usuario],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
