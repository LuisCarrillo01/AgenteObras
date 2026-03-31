import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, ConfirmDialog, EmptyState, ErrorState, Input, Modal, PageHeader, Select, StatusBadge } from '../../shared/ui/ui';
import { createObra, finalizarObra, getObras, updateObra } from './api';
import type { EstadoObra, Obra, ObraPayload } from './types';
import { formatDate, mapEstadoTone } from '../../shared/lib/formatters';
import { getApiErrorMessage } from '../../shared/api/errors';

const obraSchema = z
  .object({
    nombre: z.string().trim().min(2, 'Minimo 2 caracteres'),
    foto_referencia_url: z.string().trim().url('Ingresa una URL valida').optional().or(z.literal('')),
    direccion: z.string().optional(),
    cliente: z.string().optional(),
    estado: z.enum(['activa', 'pausada', 'finalizada']),
    fecha_inicio: z.string().optional(),
    fecha_fin: z.string().optional(),
  })
  .refine(
    (values) => {
      if (!values.fecha_inicio || !values.fecha_fin) {
        return true;
      }

      return values.fecha_fin >= values.fecha_inicio;
    },
    {
      path: ['fecha_fin'],
      message: 'La fecha fin no puede ser anterior a la fecha inicio',
    },
  );

type ObraFormValues = z.infer<typeof obraSchema>;

const defaultValues: ObraFormValues = {
  nombre: '',
  foto_referencia_url: '',
  direccion: '',
  cliente: '',
  estado: 'activa',
  fecha_inicio: '',
  fecha_fin: '',
};

export function ObrasPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [estadoFilter, setEstadoFilter] = useState<string>('');
  const [selectedObra, setSelectedObra] = useState<Obra | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
  const [serverError, setServerError] = useState('');

  const obrasQuery = useQuery({ queryKey: ['obras', estadoFilter], queryFn: () => getObras(estadoFilter || undefined) });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ObraFormValues>({
    resolver: zodResolver(obraSchema),
    defaultValues,
  });

  const closeModalImmediately = () => {
    setModalOpen(false);
    setCloseDialogOpen(false);
    setSelectedObra(null);
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
    setSelectedObra(null);
    setServerError('');
    reset(defaultValues);
    setModalOpen(true);
  };

  const openEditModal = (item: Obra) => {
    setSelectedObra(item);
    setServerError('');
    reset({
      nombre: item.nombre,
      foto_referencia_url: item.fotoReferenciaUrl ?? '',
      direccion: item.direccion ?? '',
      cliente: item.cliente ?? '',
      estado: item.estado,
      fecha_inicio: item.fechaInicio?.slice(0, 10) ?? '',
      fecha_fin: item.fechaFin?.slice(0, 10) ?? '',
    });
    setModalOpen(true);
  };

  const syncList = async () => {
    await queryClient.invalidateQueries({ queryKey: ['obras'] });
    closeModalImmediately();
  };

  const createMutation = useMutation({ mutationFn: createObra, onSuccess: syncList, onError: (error) => setServerError(getApiErrorMessage(error)) });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ObraPayload }) => updateObra(id, payload),
    onSuccess: syncList,
    onError: (error) => setServerError(getApiErrorMessage(error)),
  });
  const finishMutation = useMutation({
    mutationFn: finalizarObra,
    onSuccess: async () => {
      setFinalizeDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['obras'] });
    },
    onError: (error) => setServerError(getApiErrorMessage(error)),
  });

  const rows = obrasQuery.data ?? [];

  const onSubmit = handleSubmit(async (values) => {
    setServerError('');

    const payload: ObraPayload = {
      nombre: values.nombre,
      foto_referencia_url: values.foto_referencia_url?.trim() || null,
      direccion: values.direccion?.trim() || null,
      cliente: values.cliente?.trim() || null,
      estado: values.estado as EstadoObra,
      fecha_inicio: values.fecha_inicio || null,
      fecha_fin: values.fecha_fin || null,
    };

    if (selectedObra) {
      await updateMutation.mutateAsync({ id: selectedObra.id, payload });
      return;
    }

    await createMutation.mutateAsync(payload);
  });

  return (
    <section className="page">
      <PageHeader
        title="Obras"
        subtitle="Seguimiento de proyectos, estados operativos y cierre de obra."
        actions={<Button onClick={openCreateModal}>Nueva obra</Button>}
      />

      <Card>
        <div className="filters" style={{ marginBottom: 18 }}>
          <Select label="Estado" value={estadoFilter} onChange={(event) => setEstadoFilter(event.target.value)}>
            <option value="">Todas</option>
            <option value="activa">Activas</option>
            <option value="pausada">Pausadas</option>
            <option value="finalizada">Finalizadas</option>
          </Select>
        </div>

        {obrasQuery.isError ? <ErrorState title="No se pudo cargar obras" description="Verifica la conexion con backend." /> : null}
        {!rows.length && !obrasQuery.isLoading ? <EmptyState title="Sin obras registradas" description="Crea una obra nueva desde el boton principal." /> : null}

        <div className="table-scroll desktop-table">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Inicio</th>
                <th>Fin</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.nombre}</strong>
                    <div className="muted">{item.direccion || 'Sin direccion'}</div>
                  </td>
                  <td>{item.cliente || '-'}</td>
                  <td><StatusBadge label={item.estado} tone={mapEstadoTone(item.estado)} /></td>
                  <td>{formatDate(item.fechaInicio)}</td>
                  <td>{formatDate(item.fechaFin)}</td>
                  <td>
                    <div className="button-row">
                      <Button variant="secondary" onClick={() => navigate(`/obras/${item.id}`)}>Detalle</Button>
                      <Button variant="secondary" onClick={() => openEditModal(item)}>Editar</Button>
                      {item.estado !== 'finalizada' ? <Button variant="danger" onClick={() => { setSelectedObra(item); setFinalizeDialogOpen(true); }}>Finalizar</Button> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mobile-card-list">
          {rows.map((item) => (
            <article key={item.id} className="mobile-record">
              <div className="mobile-record-header">
                <div>
                  <strong>{item.nombre}</strong>
                  <div className="muted">{item.direccion || 'Sin direccion'}</div>
                </div>
                <StatusBadge label={item.estado} tone={mapEstadoTone(item.estado)} />
              </div>
              <div className="mobile-record-grid">
                <div className="mobile-record-item">
                  <span className="mobile-record-label">Cliente</span>
                  <span className="mobile-record-value">{item.cliente || '-'}</span>
                </div>
                <div className="mobile-record-item">
                  <span className="mobile-record-label">Inicio</span>
                  <span className="mobile-record-value">{formatDate(item.fechaInicio)}</span>
                </div>
                <div className="mobile-record-item">
                  <span className="mobile-record-label">Fin</span>
                  <span className="mobile-record-value">{formatDate(item.fechaFin)}</span>
                </div>
              </div>
              <div className="button-row">
                <Button variant="secondary" onClick={() => navigate(`/obras/${item.id}`)}>Detalle</Button>
                <Button variant="secondary" onClick={() => openEditModal(item)}>Editar</Button>
                {item.estado !== 'finalizada' ? <Button variant="danger" onClick={() => { setSelectedObra(item); setFinalizeDialogOpen(true); }}>Finalizar</Button> : null}
              </div>
            </article>
          ))}
        </div>
      </Card>

      <Modal
        open={modalOpen}
        title={selectedObra ? 'Editar obra' : 'Nueva obra'}
        description="Registra informacion operativa y valida fechas antes de guardar."
        onClose={requestCloseModal}
        footer={(
          <div className="button-row modal-actions">
            <Button type="button" variant="secondary" onClick={requestCloseModal}>Cancelar</Button>
            <Button type="submit" form="obra-form" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}>
              {selectedObra ? 'Guardar cambios' : 'Crear obra'}
            </Button>
          </div>
        )}
        size="lg"
      >
        <form id="obra-form" onSubmit={onSubmit} style={{ display: 'grid', gap: 14 }}>
          <Input label="Nombre" error={errors.nombre?.message} {...register('nombre')} />
          <Input label="URL imagen referencia" error={errors.foto_referencia_url?.message} {...register('foto_referencia_url')} />
          <Input label="Direccion" error={errors.direccion?.message} {...register('direccion')} />
          <Input label="Cliente" error={errors.cliente?.message} {...register('cliente')} />
          <Select label="Estado" error={errors.estado?.message} {...register('estado')}>
            <option value="activa">Activa</option>
            <option value="pausada">Pausada</option>
            <option value="finalizada">Finalizada</option>
          </Select>
          <Input label="Fecha inicio" type="date" error={errors.fecha_inicio?.message} {...register('fecha_inicio')} />
          <Input label="Fecha fin" type="date" error={errors.fecha_fin?.message} {...register('fecha_fin')} />

          {serverError ? <div className="error-box">{serverError}</div> : null}
        </form>
      </Modal>

      <ConfirmDialog
        open={closeDialogOpen}
        title="Descartar cambios"
        description="Hay cambios sin guardar en la obra. Si cierras perderas la informacion ingresada."
        confirmLabel="Descartar cambios"
        confirmVariant="danger"
        onCancel={() => setCloseDialogOpen(false)}
        onConfirm={closeModalImmediately}
      />

      <ConfirmDialog
        open={finalizeDialogOpen}
        title="Finalizar obra"
        description={`Se marcara como finalizada la obra ${selectedObra?.nombre ?? ''}.`}
        confirmLabel="Finalizar obra"
        confirmVariant="danger"
        onCancel={() => setFinalizeDialogOpen(false)}
        onConfirm={() => {
          if (selectedObra) {
            finishMutation.mutate(selectedObra.id);
          }
        }}
      />
    </section>
  );
}
