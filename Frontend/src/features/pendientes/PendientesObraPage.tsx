import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Button, Card, EmptyState, ErrorState, PageHeader, StatusBadge } from '../../shared/ui/ui';
import { getPendientesByObra, reabrirPendiente, resolverPendiente } from './api';
import { useObraImageUrl } from '../obras/useObraImageUrl';
import { formatDate } from '../../shared/lib/formatters';
import { getApiErrorMessage } from '../../shared/api/errors';
import { useState } from 'react';

const artworkThemes = ['sunrise', 'blueprint', 'signal'] as const;

export function PendientesObraPage() {
  const { id } = useParams();
  const obraId = Number(id);
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState('');

  const pendientesQuery = useQuery({
    queryKey: ['pendientes-obra', obraId],
    queryFn: () => getPendientesByObra(obraId),
    enabled: Number.isFinite(obraId),
  });
  const obraImage = useObraImageUrl(obraId);

  const resolverMutation = useMutation({
    mutationFn: resolverPendiente,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pendientes-obra', obraId] });
      await queryClient.invalidateQueries({ queryKey: ['pendientes'] });
    },
    onError: (error) => setServerError(getApiErrorMessage(error)),
  });

  const reabrirMutation = useMutation({
    mutationFn: reabrirPendiente,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pendientes-obra', obraId] });
      await queryClient.invalidateQueries({ queryKey: ['pendientes'] });
    },
    onError: (error) => setServerError(getApiErrorMessage(error)),
  });

  const grouped = useMemo(() => {
    const items = pendientesQuery.data ?? [];
    return {
      pendientes: items.filter((item) => item.estado === 'pendiente'),
      resueltos: items.filter((item) => item.estado === 'resuelto'),
      obraNombre: items[0]?.obra.nombre ?? `Obra ${obraId}`,
      obraCliente: items[0]?.obra.cliente ?? 'Sin cliente asignado',
      obraEstado: items[0]?.obra.estado ?? 'sin estado',
    };
  }, [obraId, pendientesQuery.data]);

  const theme = artworkThemes[obraId % artworkThemes.length];

  const renderCard = (type: 'pendiente' | 'resuelto') => (item: (typeof grouped.pendientes)[number]) => (
    <article key={item.id} className="pending-card">
      <div className="pending-card-head">
        <StatusBadge label={item.estado} tone={item.estado === 'resuelto' ? 'success' : 'warning'} />
        <span className="pending-card-date">{formatDate(item.creadoEn)}</span>
      </div>
      <div className="pending-card-title">{item.descripcion}</div>
      <div className="pending-card-meta">
        <span>Creado: {formatDate(item.creadoEn)}</span>
        <span>Resuelto: {formatDate(item.resueltoEn)}</span>
      </div>
      {type === 'pendiente' ? (
        <div className="button-row" style={{ marginTop: 14 }}>
          <Button variant="secondary" onClick={() => resolverMutation.mutate(item.id)}>Resolver</Button>
        </div>
      ) : (
        <div className="button-row" style={{ marginTop: 14 }}>
          <Button variant="secondary" onClick={() => reabrirMutation.mutate(item.id)}>Volver a pendiente</Button>
        </div>
      )}
    </article>
  );

  return (
    <section className="page">
      <PageHeader
        title="Tablero de obra"
        subtitle="Vista enfocada para revisar todo lo pendiente y resuelto de una sola obra."
        actions={(
          <Link to="/pendientes" className="work-card-link work-card-link-inline">
            <ArrowLeft size={18} />
            Regresar
          </Link>
        )}
      />

      <Card className="pending-hero-card">
        <div className={`pending-hero-art work-card-art-${theme}${obraImage.imageUrl ? ' pending-hero-art-image' : ''}`}>
          {obraImage.imageUrl ? <img src={obraImage.imageUrl} alt={grouped.obraNombre} className="obra-image obra-image-hero" /> : null}
          {!obraImage.imageUrl && obraImage.isLoading ? <div className="obra-image-placeholder obra-image-skeleton" /> : null}
          <div className="work-card-overlay pending-hero-overlay">
            <span className="work-card-chip">Tablero por obra</span>
            <h2 className="work-card-title">{grouped.obraNombre}</h2>
            <p className="work-card-copy">{grouped.obraCliente}</p>
            <div className="pending-hero-caption">
              {obraImage.imageUrl
                ? 'Gestiona pendientes abiertos y resueltos con referencia visual directa de la obra.'
                : 'Gestiona pendientes abiertos y recupera historial resuelto sin salir de esta obra.'}
            </div>
          </div>
        </div>
        <div className="pending-hero-meta">
          <div className="pending-hero-topline">
            <StatusBadge label={grouped.obraEstado} tone="neutral" />
            <span className="pending-hero-hint">{obraImage.imageUrl ? 'Imagen de referencia disponible' : 'Sin imagen de referencia'}</span>
          </div>
          <div className="work-card-stats">
            <div className="work-stat work-stat-open">
              <span className="work-stat-label">Pendientes</span>
              <strong>{grouped.pendientes.length}</strong>
            </div>
            <div className="work-stat work-stat-closed">
              <span className="work-stat-label">Resueltos</span>
              <strong>{grouped.resueltos.length}</strong>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        {serverError ? <div className="error-box">{serverError}</div> : null}
        {pendientesQuery.isError ? <ErrorState title="No se pudo cargar el tablero" description="Verifica la conexion con la API o el id de la obra." /> : null}

        <div className="pending-dual-board">
          <section className="pending-lane pending-lane-open">
            <div className="pending-lane-head">
              <div>
                <span>Pendientes</span>
                <p>Acciones que siguen abiertas en la obra</p>
              </div>
              <span>{grouped.pendientes.length}</span>
            </div>
            <div className="pending-lane-body">
              {grouped.pendientes.length ? grouped.pendientes.map(renderCard('pendiente')) : <EmptyState title="Sin pendientes" description="Esta obra no tiene tareas abiertas." />}
            </div>
          </section>

          <section className="pending-lane pending-lane-closed">
            <div className="pending-lane-head">
              <div>
                <span>Resueltos</span>
                <p>Registro de tareas ya cerradas</p>
              </div>
              <span>{grouped.resueltos.length}</span>
            </div>
            <div className="pending-lane-body">
              {grouped.resueltos.length ? grouped.resueltos.map(renderCard('resuelto')) : <EmptyState title="Sin resueltos" description="Aun no se registran tareas cerradas en esta obra." />}
            </div>
          </section>
        </div>
      </Card>
    </section>
  );
}
