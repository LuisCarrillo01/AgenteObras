import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { createInitialUser } from './api';
import { useAuth } from './hooks/useAuth';
import { Button, Input } from '../../shared/ui/ui';
import { getApiErrorMessage } from '../../shared/api/errors';
import { useState } from 'react';

const setupSchema = z.object({
  nombre: z.string().min(2, 'Minimo 2 caracteres'),
  email: z.email('Ingresa un email valido'),
  password: z.string().min(6, 'Minimo 6 caracteres'),
});

type SetupFormValues = z.infer<typeof setupSchema>;

export function SetupPage() {
  const navigate = useNavigate();
  const { markBootstrapResolved, refreshBootstrapStatus } = useAuth();
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      setServerError('');
      setSuccessMessage('');
      await createInitialUser(values);
      markBootstrapResolved();
      await refreshBootstrapStatus();
      setSuccessMessage('Administrador inicial creado correctamente. Ahora puedes iniciar sesion.');
      window.setTimeout(() => navigate('/login', { replace: true }), 900);
    } catch (error) {
      setServerError(getApiErrorMessage(error, 'No se pudo crear el usuario inicial'));
    }
  });

  return (
    <section className="auth-card" aria-label="Configuracion inicial">
      <div className="auth-hero">
        <span className="brand-chip">Bootstrap</span>
        <h1 className="page-title" style={{ marginTop: 18 }}>Configura el primer administrador</h1>
        <p className="page-subtitle" style={{ color: 'rgba(248, 250, 252, 0.78)' }}>
          Este paso solo aparece cuando la tabla `usuarios` esta vacia. El primer usuario se guarda con rol `admin`.
        </p>
      </div>

      <div className="auth-panel">
        <span className="brand-chip">Alta inicial</span>
        <h2 style={{ marginTop: 18 }}>Crea el acceso principal</h2>
        <p className="page-subtitle">Completa nombre, email y password para habilitar el login.</p>

        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16, marginTop: 24 }}>
          <Input label="Nombre" error={errors.nombre?.message} {...register('nombre')} />
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <Input label="Password" type="password" error={errors.password?.message} {...register('password')} />

          {serverError ? <div className="error-box">{serverError}</div> : null}
          {successMessage ? <div className="info-box">{successMessage}</div> : null}

          <div className="button-row">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creando administrador...' : 'Crear administrador inicial'}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
