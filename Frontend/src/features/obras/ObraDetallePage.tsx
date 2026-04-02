import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Card, EmptyState, ErrorState, PageHeader, StatusBadge } from '../../shared/ui/ui';
import { getObraResumen } from './api';
import { useObraImageUrl } from './useObraImageUrl';
import { getReportesByObra } from '../reportes/api';
import { getPendientesByObra } from '../pendientes/api';
import { formatDate } from '../../shared/lib/formatters';

export function ObraDetallePage() {
  const { id } = useParams();
  const obraId = Number(id);

  const resumenQuery = useQuery({ queryKey: ['obra-resumen', obraId], queryFn: () => getObraResumen(obraId), enabled: Number.isFinite(obraId) });
  const reportesQuery = useQuery({ queryKey: ['reportes-obra', obraId], queryFn: () => getReportesByObra(obraId), enabled: Number.isFinite(obraId) });
  const pendientesQuery = useQuery({ queryKey: ['pendientes-obra', obraId], queryFn: () => getPendientesByObra(obraId), enabled: Number.isFinite(obraId) });
  const obraImage = useObraImageUrl(obraId);

  return (
    <section className="page">
      <PageHeader
        title="Detalle de obra"
        subtitle="Resumen operativo, reportes asociados y pendientes de la obra seleccionada."
        actions={(
          <Link to="/obras" className="work-card-link work-card-link-inline">
            <ArrowLeft size={18} />
            Regresar
          </Link>
        )}
      />

      {resumenQuery.isError ? <ErrorState title="No se pudo cargar el resumen" description="Verifica que el id de obra exista." /> : null}

      <div className="obra-detail-hero">
        <Card className="obra-image-card obra-detail-hero-media">
          <div className="obra-image-frame">
            {obraImage.imageUrl ? <img src={obraImage.imageUrl} alt={resumenQuery.data?.obra ?? 'Imagen de la obra'} className="obra-image" /> : null}
            {!obraImage.imageUrl && obraImage.isLoading ? <div className="obra-image-placeholder obra-image-skeleton" /> : null}
            {!obraImage.imageUrl && !obraImage.isLoading ? (
              <div className="obra-image-placeholder">
                <strong>Sin imagen de referencia</strong>
                <span>Sube una foto desde la pantalla de obras para identificar mejor este frente.</span>
              </div>
            ) : null}
          </div>
        </Card>

        <div className="obra-detail-stats-grid">
          <Card className="stat-card">
            <span className="stat-label">Obra</span>
            <div style={{ fontWeight: 700 }}>{resumenQuery.data?.obra ?? '--'}</div>
          </Card>
          <Card className="stat-card">
            <span className="stat-label">Pendientes</span>
            <div className="stat-value">{resumenQuery.data?.pendientes ?? '--'}</div>
          </Card>
          <Card className="stat-card">
            <span className="stat-label">Ultima actividad</span>
            <div>{formatDate(resumenQuery.data?.ultima_actividad ?? null)}</div>
          </Card>
        </div>
      </div>

      <div className="data-grid">
        <Card>
          <h2>Reportes asociados</h2>
          {!reportesQuery.data?.length && !reportesQuery.isLoading ? <EmptyState title="Sin reportes" description="Aun no hay reportes asociados a esta obra." /> : null}
          <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
            {reportesQuery.data?.map((item) => (
              <div key={item.id} className="panel" style={{ padding: 16 }}>
                <strong>{item.tecnico.nombre}</strong>
                <div className="muted" style={{ marginTop: 4 }}>{formatDate(item.fecha)}</div>
                <div style={{ marginTop: 8 }}>{item.mensajeOriginal}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2>Pendientes</h2>
          {!pendientesQuery.data?.length && !pendientesQuery.isLoading ? <EmptyState title="Sin pendientes" description="La obra no registra tareas pendientes." /> : null}
          <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
            {pendientesQuery.data?.map((item) => (
              <div key={item.id} className="panel" style={{ padding: 16 }}>
                <StatusBadge label={item.estado} tone={item.estado === 'resuelto' ? 'success' : 'warning'} />
                <div style={{ marginTop: 10 }}>{item.descripcion}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}
