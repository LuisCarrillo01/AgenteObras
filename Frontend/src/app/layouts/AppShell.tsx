import { ChevronLeft, ChevronRight, HardHat, LayoutDashboard, ListTodo, LogOut, Menu, PanelsTopLeft, Shield, Users, Wrench, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { navigationItems } from '../../shared/config/navigation';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { Button, ConfirmDialog } from '../../shared/ui/ui';
import { getStoredSidebarCollapsed, setStoredSidebarCollapsed } from '../../shared/lib/storage';

const iconMap = {
  dashboard: LayoutDashboard,
  usuarios: Shield,
  tecnicos: Wrench,
  obras: HardHat,
  reportes: PanelsTopLeft,
  pendientes: ListTodo,
  default: Users,
};

export function AppShell() {
  const { usuario, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => getStoredSidebarCollapsed());

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      setStoredSidebarCollapsed(next);
      return next;
    });
  };

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-toggle-row desktop-only">
          <Button
            className="icon-button sidebar-toggle-button"
            variant="secondary"
            onClick={toggleSidebarCollapsed}
            aria-label={sidebarCollapsed ? 'Expandir panel lateral' : 'Ocultar panel lateral'}
            title={sidebarCollapsed ? 'Expandir panel lateral' : 'Ocultar panel lateral'}
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </Button>
        </div>
        <div className="brand-mark">
          <div className="sidebar-mobile-head">
            <div className="brand-stack">
              <span className="brand-chip">Centro Operativo</span>
              <div className="brand-title">OpenGravity Control</div>
              <div className="brand-kicker">Tablero de seguimiento tecnico</div>
            </div>
            {mobileMenuOpen ? (
              <Button
                className="mobile-nav-button mobile-only"
                variant="secondary"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Cerrar menu lateral"
                title="Cerrar menu lateral"
              >
                <X size={16} />
              </Button>
            ) : null}
          </div>
          <div className="brand-subtitle">Reportes de obra, equipos y pendientes en una sola vista.</div>
        </div>

        <nav aria-label="Navegacion principal">
          {navigationItems.map((item) => {
            const Icon = iconMap[item.icon as keyof typeof iconMap] ?? iconMap.default;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                data-tooltip={item.label}
                title={sidebarCollapsed ? item.label : undefined}
                aria-label={item.label}
              >
                <Icon size={18} />
                <span className="nav-link-label">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-info">
            <div className="muted">Sesion activa</div>
            <div style={{ fontWeight: 700, marginTop: 4 }}>{usuario?.nombre}</div>
            <div className="muted" style={{ marginTop: 4 }}>
              {usuario?.rol} · ruta actual <span className="code">{location.pathname}</span>
            </div>
          </div>
          <div className="sidebar-footer-action" style={{ marginTop: 16 }}>
            <Button
              className="sidebar-logout-button"
              variant="secondary"
              onClick={() => setLogoutDialogOpen(true)}
              data-tooltip="Cerrar sesion"
              title="Cerrar sesion"
              aria-label="Cerrar sesion"
            >
              <LogOut size={16} />
              <span className="sidebar-footer-label">Cerrar sesion</span>
            </Button>
          </div>
        </div>
      </aside>

      <section className="app-main">
        <header className="topbar">
          <div className="topbar-start">
            <Button
              className="mobile-nav-button mobile-only"
              variant="secondary"
              onClick={() => setMobileMenuOpen((value) => !value)}
              aria-label={mobileMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
            >
              {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
            </Button>
            <div>
              <div className="topbar-eyebrow">Panel operativo</div>
              <strong className="topbar-title">Coordinacion de reportes, tecnicos y obras</strong>
            </div>
          </div>
          <div className="topbar-meta">
            {/* <span className="desktop-only">Contrato API: `API_FRONTEND.md`</span> */}
            <span>Usuario: {usuario?.email}</span>
            <span>Rol: {usuario?.rol}</span>
          </div>
          <div className="topbar-actions">
            <Button variant="secondary" onClick={() => setLogoutDialogOpen(true)}>
              <LogOut size={16} />
              Cerrar sesion
            </Button>
          </div>
        </header>

        <Outlet />
      </section>

      {mobileMenuOpen ? <button className="sidebar-backdrop mobile-only" onClick={() => setMobileMenuOpen(false)} aria-label="Cerrar navegacion" /> : null}

      <ConfirmDialog
        open={logoutDialogOpen}
        title="Cerrar sesion"
        description="Se cerrara tu sesion actual y volveras al login."
        confirmLabel="Cerrar sesion"
        confirmVariant="danger"
        onCancel={() => setLogoutDialogOpen(false)}
        onConfirm={() => {
          setLogoutDialogOpen(false);
          logout();
        }}
      />
    </div>
  );
}
