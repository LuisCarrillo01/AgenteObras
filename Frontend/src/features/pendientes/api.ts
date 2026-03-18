import { apiClient } from '../../shared/api/client';
import type { ApiResponse, PaginatedData } from '../../shared/api/types';
import type { Pendiente } from './types';

async function extractList(endpoint: string, estado?: string) {
  const { data } = await apiClient.get<ApiResponse<PaginatedData<Pendiente>>>(endpoint, {
    params: { page: 1, limit: 100, estado: estado || undefined },
  });
  return data.data.items;
}

export function getPendientes(estado?: string) {
  return extractList('/pendientes', estado);
}

export function getPendientesByObra(id: number) {
  return extractList(`/pendientes/obra/${id}`);
}

export async function resolverPendiente(id: number) {
  const { data } = await apiClient.put<ApiResponse<Pendiente>>(`/pendientes/${id}/resolver`);
  return data.data;
}

export async function reabrirPendiente(id: number) {
  const { data } = await apiClient.put<ApiResponse<Pendiente>>(`/pendientes/${id}/reabrir`);
  return data.data;
}
