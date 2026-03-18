import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, EmptyState, ErrorState, PageHeader, Select, StatusBadge } from '../../shared/ui/ui';
import { getReportes, getReportesByObra, getReportesByTecnico } from './api';
import { getObrasActivas } from '../obras/api';
import { getTecnicos } from '../tecnicos/api';
import { formatDate } from '../../shared/lib/formatters';

type FilterMode = 'all' | 'obra' | 'tecnico';

export function ReportesPage() {
  const [mode, setMode] = useState<FilterMode>('all');
  const [selectedId, setSelectedId] = useState('');
  const obrasQuery = useQuery({ queryKey: ['obras-activas-select'], queryFn: getObrasActivas });
  const tecnicosQuery = useQuery({ queryKey: ['tecnicos-select'], queryFn: () => getTecnicos(true) });

  const reportesQuery = useQuery({
    queryKey: ['reportes', mode, selectedId],
    queryFn: async () => {
      if (mode === 'obra' && selectedId) {
        return getReportesByObra(Number(selectedId));
      }

      if (mode === 'tecnico' && selectedId) {
        return getReportesByTecnico(Number(selectedId));
      }

      return getReportes();
    },
  });

  return (
    <section className="page">
      <PageHeader title="Reportes" subtitle="Consulta actividad consolidada o filtra por obra y tecnico." />

      <Card>
        <div className="filters">
          <Select label="Modo de filtro" value={mode} onChange={(event) => { setMode(event.target.value as FilterMode); setSelectedId(''); }}>
            <option value="all">Todos</option>
            <option value="obra">Por obra</option>
            <option value="tecnico">Por tecnico</option>
          </Select>

          {mode === 'obra' ? (
            <Select label="Obra" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
              <option value="">Selecciona una obra</option>
              {obrasQuery.data?.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </Select>
          ) : null}

          {mode === 'tecnico' ? (
            <Select label="Tecnico" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
              <option value="">Selecciona un tecnico</option>
              {tecnicosQuery.data?.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </Select>
          ) : null}
        </div>
      </Card>

      <Card>
        {reportesQuery.isError ? <ErrorState title="No se pudo cargar reportes" description="Intenta cambiar el filtro o revisar el backend." /> : null}
        {!reportesQuery.data?.length && !reportesQuery.isLoading ? <EmptyState title="Sin reportes" description="No hay resultados para el filtro actual." /> : null}

        <div className="table-scroll desktop-table">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tecnico</th>
                <th>Obra</th>
                <th>Estado obra</th>
                <th>Mensaje</th>
              </tr>
            </thead>
            <tbody>
              {reportesQuery.data?.map((item) => (
                <tr key={item.id}>
                  <td>{formatDate(item.fecha)}</td>
                  <td>{item.tecnico.nombre}</td>
                  <td>{item.obra.nombre}</td>
                  <td><StatusBadge label={item.obra.estado} tone={item.obra.estado === 'activa' ? 'success' : 'neutral'} /></td>
                  <td>{item.mensajeOriginal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mobile-card-list">
          {reportesQuery.data?.map((item) => (
            <article key={item.id} className="mobile-record">
              <div className="mobile-record-header">
                <div>
                  <strong>{item.tecnico.nombre}</strong>
                  <div className="muted">{formatDate(item.fecha)}</div>
                </div>
                <StatusBadge label={item.obra.estado} tone={item.obra.estado === 'activa' ? 'success' : 'neutral'} />
              </div>
              <div className="mobile-record-grid">
                <div className="mobile-record-item">
                  <span className="mobile-record-label">Obra</span>
                  <span className="mobile-record-value">{item.obra.nombre}</span>
                </div>
                <div className="mobile-record-item">
                  <span className="mobile-record-label">Mensaje</span>
                  <span className="mobile-record-value">{item.mensajeOriginal}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </Card>
    </section>
  );
}
