import { Navigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { LoadingScreen } from '../../shared/ui/ui';

export function AuthGate() {
  const { initializing, isAuthenticated, bootstrapRequired } = useAuth();

  if (initializing) {
    return <LoadingScreen title="Preparando acceso" message="Validando sesion y estado inicial del sistema." />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  if (bootstrapRequired) {
    return <Navigate to="/setup" replace />;
  }

  return <Navigate to="/login" replace />;
}
