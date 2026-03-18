import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthGate } from './guards/AuthGate';
import { ProtectedRoute } from './guards/ProtectedRoute';
import { AppShell } from './layouts/AppShell';
import { AuthLayout } from './layouts/AuthLayout';
import { LoginPage } from '../features/auth/LoginPage';
import { SetupPage } from '../features/auth/SetupPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { UsuariosPage } from '../features/usuarios/UsuariosPage';
import { TecnicosPage } from '../features/tecnicos/TecnicosPage';
import { ObrasPage } from '../features/obras/ObrasPage';
import { ObraDetallePage } from '../features/obras/ObraDetallePage';
import { ReportesPage } from '../features/reportes/ReportesPage';
import { PendientesPage } from '../features/pendientes/PendientesPage';
import { PendientesObraPage } from '../features/pendientes/PendientesObraPage';

export const router = createBrowserRouter([
  { path: '/', element: <AuthGate /> },
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/setup', element: <SetupPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/usuarios', element: <UsuariosPage /> },
          { path: '/tecnicos', element: <TecnicosPage /> },
          { path: '/obras', element: <ObrasPage /> },
          { path: '/obras/:id', element: <ObraDetallePage /> },
          { path: '/reportes', element: <ReportesPage /> },
          { path: '/pendientes', element: <PendientesPage /> },
          { path: '/pendientes/obra/:id', element: <PendientesObraPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
