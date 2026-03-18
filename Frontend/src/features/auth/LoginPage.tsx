import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { Button, Input } from '../../shared/ui/ui';
import { getApiErrorMessage } from '../../shared/api/errors';
import { useState } from 'react';

const loginSchema = z.object({
  email: z.email('Ingresa un email valido'),
  password: z.string().min(1, 'La password es obligatoria'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login, bootstrapRequired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState('');
  const [mobileInfoOpen, setMobileInfoOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      setServerError('');
      await login(values);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? '/dashboard', { replace: true });
    } catch (error) {
      setServerError(getApiErrorMessage(error, 'No se pudo iniciar sesion'));
    }
  });

  const infoContent = (
    <>
      <span className="brand-chip">Ingreso seguro</span>
      <h1 className="page-title auth-info-title" style={{ marginTop: 18 }}>Control diario de obras y reportes</h1>
      <p className="page-subtitle auth-info-copy" style={{ color: 'rgba(248, 250, 252, 0.78)' }}>
        Accede al tablero tecnico para coordinar equipos, revisar pendientes y administrar usuarios.
      </p>
      <div className="auth-kpis">
        <div className="auth-kpi">
          <strong>Dashboard tecnico</strong>
          <div className="muted auth-info-copy" style={{ color: 'rgba(248, 250, 252, 0.78)' }}>KPIs, actividad del dia y seguimiento de obras.</div>
        </div>
        <div className="auth-kpi">
          <strong>Sincronizacion con backend</strong>
          <div className="muted auth-info-copy" style={{ color: 'rgba(248, 250, 252, 0.78)' }}>Usa el contrato de `API_FRONTEND.md` y JWT para sesion.</div>
        </div>
      </div>
    </>
  );

  return (
    <section className="auth-card" aria-label="Pantalla de login">
      <div className="auth-hero auth-hero-desktop">{infoContent}</div>

      <div className="auth-panel">
        <span className="brand-chip">Login</span>
        <h2 className="auth-panel-title" style={{ marginTop: 18 }}>Inicia sesion</h2>
        <p className="page-subtitle auth-panel-copy">Ingresa tus credenciales para continuar y supervisar la operacion tecnica en tiempo real.</p>

        {bootstrapRequired ? (
          <div className="info-box" style={{ marginTop: 18 }}>
            El sistema detecto que aun no existe un usuario inicial. Redirige al flujo de configuracion inicial.
          </div>
        ) : null}

        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16, marginTop: 24 }}>
          <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
          <Input label="Password" type="password" autoComplete="current-password" error={errors.password?.message} {...register('password')} />

          {serverError ? <div className="error-box">{serverError}</div> : null}

          <div className="button-row">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Ingresando...' : 'Entrar al sistema'}
            </Button>
          </div>
        </form>

        <div className="auth-inline-note">Usa el mismo acceso para revisar dashboards, obras, reportes y pendientes desde una sola consola.</div>

        <div className="auth-info-mobile">
          <button
            type="button"
            className={`auth-info-toggle${mobileInfoOpen ? ' open' : ''}`}
            onClick={() => setMobileInfoOpen((value) => !value)}
            aria-expanded={mobileInfoOpen}
          >
            <span>Ingreso seguro</span>
            <ChevronDown size={18} />
          </button>

          {mobileInfoOpen ? <div className="auth-hero auth-hero-mobile">{infoContent}</div> : null}
        </div>
      </div>
    </section>
  );
}
