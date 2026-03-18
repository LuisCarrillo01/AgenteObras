import { apiClient } from '../../shared/api/client';
import type { ApiResponse, PaginatedData } from '../../shared/api/types';
import type { Reporte } from './types';

async function extractList(endpoint: string) {
  const { data } = await apiClient.get<ApiResponse<PaginatedData<Reporte>>>(endpoint, { params: { page: 1, limit: 100 } });
  return data.data.items;
}

export function getReportes() {
  return extractList('/reportes');
}

export function getReportesByObra(id: number) {
  return extractList(`/reportes/obra/${id}`);
}

export function getReportesByTecnico(id: number) {
  return extractList(`/reportes/tecnico/${id}`);
}
