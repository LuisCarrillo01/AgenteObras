import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, ConfirmDialog, EmptyState, ErrorState, Input, Modal, PageHeader, Select, StatusBadge } from '../../shared/ui/ui';
import { createTecnico, deactivateTecnico, getTecnicos, updateTecnico } from './api';
import type { Tecnico, TecnicoPayload } from './types';
import { formatBooleanStatus, formatDate } from '../../shared/lib/formatters';
import { useDebouncedValue } from '../../shared/hooks/useDebouncedValue';
import { getApiErrorMessage } from '../../shared/api/errors';

const tecnicoSchema = z.object({
  nombre: z.string().trim().min(2, 'Minimo 2 caracteres'),
  telefono: z.string().trim().min(7, 'Minimo 7 caracteres'),
  activo: z.enum(['true', 'false']),
});

type TecnicoFormValues = z.infer<typeof tecnicoSchema>;

const defaultValues: TecnicoFormValues = {
  nombre: '',
  telefono: '',
  activo: 'true',
};

export function TecnicosPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedTecnico, setSelectedTecnico] = useState<Tecnico | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serverError, setServerError] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  const tecnicosQuery = useQuery({ queryKey: ['tecnicos'], queryFn: () => getTecnicos(true) });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<TecnicoFormValues>({
    resolver: zodResolver(tecnicoSchema),
    defaultValues,
  });

  const closeModalImmediately = () => {
    setModalOpen(false);
    setCloseDialogOpen(false);
    setSelectedTecnico(null);
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
    setSelectedTecnico(null);
    setServerError('');
    reset(defaultValues);
    setModalOpen(true);
  };

  const openEditModal = (item: Tecnico) => {
    setSelectedTecnico(item);
    setServerError('');
    reset({ nombre: item.nombre, telefono: item.telefono, activo: item.activo ? 'true' : 'false' });
    setModalOpen(true);
  };

  const syncList = async () => {
    await queryClient.invalidateQueries({ queryKey: ['tecnicos'] });
    closeModalImmediately();
  };

  const createMutation = useMutation({ mutationFn: createTecnico, onSuccess: syncList, onError: (error) => setServerError(getApiErrorMessage(error)) });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<TecnicoPayload> }) => updateTecnico(id, payload),
    onSuccess: syncList,
    onError: (error) => setServerError(getApiErrorMessage(error)),
  });
  const deleteMutation = useMutation({
    mutationFn: deactivateTecnico,
    onSuccess: async () => {
      setDeleteDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['tecnicos'] });
    },
    onError: (error) => setServerError(getApiErrorMessage(error)),
  });

  const filteredItems = (tecnicosQuery.data ?? []).filter((item) => {
    const matchesSearch = [item.nombre, item.telefono].some((value) => value.toLowerCase().includes(debouncedSearch.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? item.activo : !item.activo);
    return matchesSearch && matchesStatus;
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError('');

    const payload: TecnicoPayload = {
      nombre: values.nombre,
      telefono: values.telefono,
      activo: values.activo === 'true',
    };

    if (selectedTecnico) {
      await updateMutation.mutateAsync({ id: selectedTecnico.id, payload });
      return;
    }

    await createMutation.mutateAsync(payload);
  });

  return (
    <section className="page">
      <PageHeader
        title="Tecnicos"
        subtitle="Control de cuadrillas, telefonos y disponibilidad de personal en terreno."
        actions={<Button onClick={openCreateModal}>Nuevo tecnico</Button>}
      />

      <Card>
        <div className="filters" style={{ marginBottom: 18 }}>
          <Input label="Buscar" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre o telefono" />
          <Select label="Estado" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')}>
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </Select>
        </div>

        {tecnicosQuery.isError ? <ErrorState title="No se pudo cargar tecnicos" description="Asegurate de tener sesion valida." /> : null}
        {!filteredItems.length && !tecnicosQuery.isLoading ? <EmptyState title="Sin tecnicos" description="Agrega tecnicos desde el boton principal." /> : null}

        <div className="table-scroll desktop-table">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Telefono</th>
                <th>Estado</th>
                <th>Creado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.nombre}</td>
                  <td>{item.telefono}</td>
                  <td><StatusBadge label={formatBooleanStatus(item.activo)} tone={item.activo ? 'success' : 'neutral'} /></td>
                  <td>{formatDate(item.creadoEn)}</td>
                  <td>
                    <div className="button-row">
                      <Button variant="secondary" onClick={() => openEditModal(item)}>Editar</Button>
                      {item.activo ? <Button variant="danger" onClick={() => { setSelectedTecnico(item); setDeleteDialogOpen(true); }}>Desactivar</Button> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mobile-card-list">
          {filteredItems.map((item) => (
            <article key={item.id} className="mobile-record">
              <div className="mobile-record-header">
                <div>
                  <strong>{item.nombre}</strong>
                  <div className="muted">{item.telefono}</div>
                </div>
                <StatusBadge label={formatBooleanStatus(item.activo)} tone={item.activo ? 'success' : 'neutral'} />
              </div>
              <div className="mobile-record-grid">
                <div className="mobile-record-item">
                  <span className="mobile-record-label">Creado</span>
                  <span className="mobile-record-value">{formatDate(item.creadoEn)}</span>
                </div>
              </div>
              <div className="button-row">
                <Button variant="secondary" onClick={() => openEditModal(item)}>Editar</Button>
                {item.activo ? <Button variant="danger" onClick={() => { setSelectedTecnico(item); setDeleteDialogOpen(true); }}>Desactivar</Button> : null}
              </div>
            </article>
          ))}
        </div>
      </Card>

      <Modal
        open={modalOpen}
        title={selectedTecnico ? 'Editar tecnico' : 'Nuevo tecnico'}
        description="Actualiza datos del personal y valida antes de guardar."
        onClose={requestCloseModal}
        footer={(
          <div className="button-row modal-actions">
            <Button type="button" variant="secondary" onClick={requestCloseModal}>Cancelar</Button>
            <Button type="submit" form="tecnico-form" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}>
              {selectedTecnico ? 'Guardar cambios' : 'Crear tecnico'}
            </Button>
          </div>
        )}
      >
        <form id="tecnico-form" onSubmit={onSubmit} style={{ display: 'grid', gap: 14 }}>
          <Input label="Nombre" error={errors.nombre?.message} {...register('nombre')} />
          <Input label="Telefono" error={errors.telefono?.message} {...register('telefono')} />
          {selectedTecnico ? (
            <Select label="Estado" error={errors.activo?.message} {...register('activo')}>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </Select>
          ) : null}

          {serverError ? <div className="error-box">{serverError}</div> : null}
        </form>
      </Modal>

      <ConfirmDialog
        open={closeDialogOpen}
        title="Descartar cambios"
        description="Tienes cambios sin guardar en el tecnico. Si cierras perderas la informacion escrita."
        confirmLabel="Descartar cambios"
        confirmVariant="danger"
        onCancel={() => setCloseDialogOpen(false)}
        onConfirm={closeModalImmediately}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Desactivar tecnico"
        description={`Se marcara como inactivo a ${selectedTecnico?.nombre ?? 'este tecnico'}.`}
        confirmLabel="Desactivar"
        confirmVariant="danger"
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={() => {
          if (selectedTecnico) {
            deleteMutation.mutate(selectedTecnico.id);
          }
        }}
      />
    </section>
  );
}
