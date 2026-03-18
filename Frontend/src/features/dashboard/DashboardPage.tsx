import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary, getTodayActivity } from './api';
import { Card, EmptyState, ErrorState, PageHeader } from '../../shared/ui/ui';
import { formatDate } from '../../shared/lib/formatters';

export function DashboardPage() {
  const summaryQuery = useQuery({ queryKey: ['dashboard-summary'], queryFn: getDashboardSummary });
  const activityQuery = useQuery({ queryKey: ['dashboard-activity'], queryFn: getTodayActivity });

  return (
    <section className="page">
      <PageHeader
        title="Dashboard"
        subtitle="Vista operativa para revisar avance diario, actividad reciente y focos de atencion del sistema."
      />

      {summaryQuery.isError ? <ErrorState title="No se pudo cargar el dashboard" description="Verifica que el backend este disponible." /> : null}

      <div className="grid-cards">
        <Card className="stat-card">
          <span className="stat-label">Obras activas</span>
          <span className="stat-trend">Seguimiento en campo</span>
          <div className="stat-value">{summaryQuery.data?.obras_activas ?? '--'}</div>
        </Card>
        <Card className="stat-card">
          <span className="stat-label">Pendientes abiertos</span>
          <span className="stat-trend">Prioridad de cierre</span>
          <div className="stat-value">{summaryQuery.data?.pendientes ?? '--'}</div>
        </Card>
        <Card className="stat-card">
          <span className="stat-label">Reportes de hoy</span>
          <span className="stat-trend">Actividad reciente</span>
          <div className="stat-value">{summaryQuery.data?.reportes_hoy ?? '--'}</div>
        </Card>
      </div>

      <Card>
        <h2>Actividad del dia</h2>
        <p className="page-subtitle">Ultimos movimientos enviados por los tecnicos en terreno.</p>

        {activityQuery.isError ? <ErrorState title="No se pudo cargar la actividad" description="Intenta recargar el panel." /> : null}

        {!activityQuery.data?.length && !activityQuery.isLoading ? (
          <EmptyState title="Sin actividad registrada" description="Cuando entren reportes del dia apareceran aqui." />
        ) : null}

        <div style={{ display: 'grid', gap: 14, marginTop: 18 }}>
          {activityQuery.data?.map((activity) => (
            <div key={activity.id} className="panel" style={{ padding: 16 }}>
              <strong>{activity.tecnico.nombre}</strong>
              <div className="muted" style={{ marginTop: 4 }}>{activity.obra.nombre} · {formatDate(activity.fecha)}</div>
              <div style={{ marginTop: 10 }}>{activity.mensajeOriginal}</div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
