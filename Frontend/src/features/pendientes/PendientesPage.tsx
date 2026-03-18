import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, EmptyState, ErrorState, Input, PageHeader, Select, StatusBadge } from '../../shared/ui/ui';
import { getPendientes } from './api';
import { useDebouncedValue } from '../../shared/hooks/useDebouncedValue';

const artworkThemes = ['sunrise', 'blueprint', 'signal'] as const;

interface PendientesResumenObra {
  obraId: number;
  obraNombre: string;
  obraCliente: string;
  obraEstado: string;
  pendientes: number;
  resueltos: number;
  total: number;
}

export function PendientesPage() {
  const [search, setSearch] = useState('');
  const [obraState, setObraState] = useState('all');
  const debouncedSearch = useDebouncedValue(search);

  const pendientesQuery = useQuery({ queryKey: ['pendientes'], queryFn: () => getPendientes() });

  const obras = useMemo<PendientesResumenObra[]>(() => {
    const grouped = new Map<number, PendientesResumenObra>();
    const term = debouncedSearch.trim().toLowerCase();

    for (const item of pendientesQuery.data ?? []) {
      if (!grouped.has(item.obra.id)) {
        grouped.set(item.obra.id, {
          obraId: item.obra.id,
          obraNombre: item.obra.nombre,
          obraCliente: item.obra.cliente ?? 'Sin cliente asignado',
          obraEstado: item.obra.estado ?? 'sin estado',
          pendientes: 0,
          resueltos: 0,
          total: 0,
        });
      }

      const group = grouped.get(item.obra.id)!;
      group.total += 1;

      if (item.estado === 'resuelto') {
        group.resueltos += 1;
      } else {
        group.pendientes += 1;
      }
    }

    return [...grouped.values()]
      .filter((obra) => {
        const matchesSearch = !term || obra.obraNombre.toLowerCase().includes(term) || obra.obraCliente.toLowerCase().includes(term);
        const matchesState = obraState === 'all' || obra.obraEstado === obraState;
        return matchesSearch && matchesState;
      })
      .sort((a, b) => a.obraNombre.localeCompare(b.obraNombre));
  }, [debouncedSearch, obraState, pendientesQuery.data]);

  return (
    <section className="page">
      <PageHeader title="Pendientes" subtitle="Selecciona una obra para abrir su tablero con pendientes y resueltos en columnas separadas." />

      <Card>
        <div className="filters">
          <Input label="Buscar obra" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre o cliente" />
          <Select label="Estado de obra" value={obraState} onChange={(event) => setObraState(event.target.value)}>
            <option value="all">Todas</option>
            <option value="activa">Activas</option>
            <option value="pausada">Pausadas</option>
            <option value="finalizada">Finalizadas</option>
          </Select>
        </div>
      </Card>

      <Card>
        {pendientesQuery.isError ? <ErrorState title="No se pudieron cargar las obras" description="Verifica la conexion con la API." /> : null}
        {!obras.length && !pendientesQuery.isLoading ? <EmptyState title="Sin obras disponibles" description="No hay pendientes asociados para mostrar en tarjetas." /> : null}

        <div className="works-grid-intro">
          <div>
            <span className="section-kicker">Vista por obra</span>
            <h2 className="section-title">Selecciona un frente de trabajo</h2>
            <p className="section-copy">Cada card resume el volumen total de pendientes y resueltos para entrar directo al tablero operativo de la obra.</p>
          </div>
          <div className="works-grid-summary">
            <div className="works-summary-pill">
              <span>Obras visibles</span>
              <strong>{obras.length}</strong>
            </div>
            <div className="works-summary-pill works-summary-pill-open">
              <span>Pendientes</span>
              <strong>{obras.reduce((acc, obra) => acc + obra.pendientes, 0)}</strong>
            </div>
            <div className="works-summary-pill works-summary-pill-closed">
              <span>Resueltos</span>
              <strong>{obras.reduce((acc, obra) => acc + obra.resueltos, 0)}</strong>
            </div>
          </div>
        </div>

        <div className="works-grid">
          {obras.map((obra, index) => (
            <article key={obra.obraId} className="work-card">
              <div className={`work-card-art work-card-art-${artworkThemes[index % artworkThemes.length]}`}>
                <div className="work-card-overlay">
                  <span className="work-card-chip">Obra #{obra.obraId}</span>
                  <h2 className="work-card-title">{obra.obraNombre}</h2>
                  <p className="work-card-copy">{obra.obraCliente}</p>
                </div>
              </div>

              <div className="work-card-body">
                <div className="work-card-meta-row">
                  <StatusBadge label={obra.obraEstado} tone="neutral" />
                  <span className="work-card-total">{obra.total} registros</span>
                </div>

                <p className="work-card-note">Monitorea bloqueos abiertos, cierres recientes y entra al tablero para gestionar acciones por columna.</p>

                <div className="work-card-stats">
                  <div className="work-stat work-stat-open">
                    <span className="work-stat-label">Pendientes</span>
                    <strong>{obra.pendientes}</strong>
                  </div>
                  <div className="work-stat work-stat-closed">
                    <span className="work-stat-label">Resueltos</span>
                    <strong>{obra.resueltos}</strong>
                  </div>
                </div>

                <Link to={`/pendientes/obra/${obra.obraId}`} className="work-card-link">
                  Ver tablero operativo
                  <ArrowRight size={18} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </Card>
    </section>
  );
}
