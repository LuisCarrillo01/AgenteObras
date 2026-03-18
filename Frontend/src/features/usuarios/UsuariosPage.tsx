import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, ConfirmDialog, EmptyState, ErrorState, Input, Modal, PageHeader, Select, StatusBadge } from '../../shared/ui/ui';
import { createUsuario, getUsuarios, updateUsuario } from './api';
import type { Usuario, UsuarioPayload, UsuarioRol } from './types';
import { formatBooleanStatus, formatDate } from '../../shared/lib/formatters';
import { getApiErrorMessage } from '../../shared/api/errors';
import { useDebouncedValue } from '../../shared/hooks/useDebouncedValue';
import { useAuth } from '../auth/hooks/useAuth';

const usuarioSchema = z.object({
  nombre: z.string().trim().min(2, 'Minimo 2 caracteres'),
  email: z.email('Ingresa un email valido'),
  rol: z.enum(['admin', 'encargado']),
  activo: z.enum(['true', 'false']),
  password: z.string().optional(),
});

type UsuarioFormValues = z.infer<typeof usuarioSchema>;

const defaultValues: UsuarioFormValues = {
  nombre: '',
  email: '',
  rol: 'encargado',
  activo: 'true',
  password: '',
};

export function UsuariosPage() {
  const { usuario: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [serverError, setServerError] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  const usuariosQuery = useQuery({ queryKey: ['usuarios'], queryFn: getUsuarios });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<UsuarioFormValues>({
    resolver: zodResolver(usuarioSchema),
    defaultValues,
  });

  const closeModalImmediately = () => {
    setModalOpen(false);
    setCloseDialogOpen(false);
    setSelectedUsuario(null);
    setServerError('');
    reset(defaultValues);
  };

  const requestCloseModal = () => {
    if (isDirty) {
      setCloseDialogOpen(true);
      return;
    }

    closeModalImmediately();
  };

  const openCreateModal = () => {
    setSelectedUsuario(null);
    setServerError('');
    reset(defaultValues);
    setModalOpen(true);
  };

  const openEditModal = (item: Usuario) => {
    setSelectedUsuario(item);
    setServerError('');
    reset({
      nombre: item.nombre,
      email: item.email,
      rol: item.rol,
      activo: item.activo ? 'true' : 'false',
      password: '',
    });
    setModalOpen(true);
  };

  const syncList = async () => {
    await queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    closeModalImmediately();
  };

  const createMutation = useMutation({
    mutationFn: createUsuario,
    onSuccess: syncList,
    onError: (error) => setServerError(getApiErrorMessage(error, 'No se pudo crear el usuario')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<UsuarioPayload> }) => updateUsuario(id, payload),
    onSuccess: syncList,
    onError: (error) => setServerError(getApiErrorMessage(error, 'No se pudo actualizar el usuario')),
  });

  const filteredUsuarios = (usuariosQuery.data ?? []).filter((item) => {
    const term = debouncedSearch.trim().toLowerCase();
    if (!term) {
      return true;
    }

    return [item.nombre, item.email, item.rol].some((value) => value.toLowerCase().includes(term));
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError('');

    if (!selectedUsuario && (!values.password || values.password.trim().length < 6)) {
      setServerError('La password inicial debe tener minimo 6 caracteres.');
      return;
    }

    if (selectedUsuario) {
      const payload: Partial<UsuarioPayload> = {
        nombre: values.nombre,
        email: values.email,
        rol: values.rol as UsuarioRol,
        activo: values.activo === 'true',
      };

      if (values.password?.trim()) {
        payload.password = values.password.trim();
      }

      await updateMutation.mutateAsync({ id: selectedUsuario.id, payload });
      return;
    }

    await createMutation.mutateAsync({
      nombre: values.nombre,
      email: values.email,
      rol: values.rol as UsuarioRol,
      password: values.password?.trim(),
    });
  });

  return (
    <section className="page">
      <PageHeader
        title="Usuarios"
        subtitle="Administra cuentas del sistema, roles y estado de acceso."
        actions={(
          <div className="button-row">
            <StatusBadge label={`Sesion: ${currentUser?.rol ?? 'sin rol'}`} tone="neutral" />
            <Button onClick={openCreateModal}>Nuevo usuario</Button>
          </div>
        )}
      />

      <Card>
        <div className="filters" style={{ marginBottom: 18 }}>
          <Input label="Buscar" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre, email o rol" />
        </div>

        {usuariosQuery.isError ? <ErrorState title="No se pudo cargar usuarios" description="Revisa el token o el backend." /> : null}
        {!filteredUsuarios.length && !usuariosQuery.isLoading ? <EmptyState title="Sin usuarios" description="Crea el siguiente usuario desde el boton principal." /> : null}

        <div className="table-scroll desktop-table">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Creado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsuarios.map((item) => (
                <tr key={item.id}>
                  <td>{item.nombre}</td>
                  <td>{item.email}</td>
                  <td><StatusBadge label={item.rol} tone={item.rol === 'admin' ? 'warning' : 'neutral'} /></td>
                  <td><StatusBadge label={formatBooleanStatus(item.activo)} tone={item.activo ? 'success' : 'neutral'} /></td>
                  <td>{formatDate(item.creadoEn)}</td>
                  <td><Button variant="secondary" onClick={() => openEditModal(item)}>Editar</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mobile-card-list">
          {filteredUsuarios.map((item) => (
            <article key={item.id} className="mobile-record">
              <div className="mobile-record-header">
                <div>
                  <strong>{item.nombre}</strong>
                  <div className="muted">{item.email}</div>
                </div>
                <StatusBadge label={item.rol} tone={item.rol === 'admin' ? 'warning' : 'neutral'} />
              </div>
              <div className="mobile-record-grid">
                <div className="mobile-record-item">
                  <span className="mobile-record-label">Estado</span>
                  <span className="mobile-record-value"><StatusBadge label={formatBooleanStatus(item.activo)} tone={item.activo ? 'success' : 'neutral'} /></span>
                </div>
                <div className="mobile-record-item">
                  <span className="mobile-record-label">Creado</span>
                  <span className="mobile-record-value">{formatDate(item.creadoEn)}</span>
                </div>
              </div>
              <div className="button-row">
                <Button variant="secondary" onClick={() => openEditModal(item)}>Editar</Button>
              </div>
            </article>
          ))}
        </div>
      </Card>

      <Modal
        open={modalOpen}
        title={selectedUsuario ? 'Editar usuario' : 'Nuevo usuario'}
        description="Usa validaciones de formulario antes de guardar."
        onClose={requestCloseModal}
        footer={(
          <div className="button-row modal-actions">
            <Button type="button" variant="secondary" onClick={requestCloseModal}>Cancelar</Button>
            <Button type="submit" form="usuario-form" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}>
              {selectedUsuario ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </div>
        )}
      >
        <form id="usuario-form" onSubmit={onSubmit} style={{ display: 'grid', gap: 14 }}>
          <Input label="Nombre" error={errors.nombre?.message} {...register('nombre')} />
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <Select label="Rol" error={errors.rol?.message} {...register('rol')}>
            <option value="encargado">Encargado</option>
            <option value="admin">Admin</option>
          </Select>
          {selectedUsuario ? (
            <Select label="Estado" error={errors.activo?.message} {...register('activo')}>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </Select>
          ) : null}
          <Input
            label={selectedUsuario ? 'Nueva password (opcional)' : 'Password'}
            type="password"
            error={errors.password?.message}
            {...register('password')}
          />

          {serverError ? <div className="error-box">{serverError}</div> : null}
        </form>
      </Modal>

      <ConfirmDialog
        open={closeDialogOpen}
        title="Descartar cambios"
        description="Tienes datos sin guardar. Si cierras esta ventana perderas lo ingresado."
        confirmLabel="Descartar cambios"
        confirmVariant="danger"
        onCancel={() => setCloseDialogOpen(false)}
        onConfirm={closeModalImmediately}
      />
    </section>
  );
}
