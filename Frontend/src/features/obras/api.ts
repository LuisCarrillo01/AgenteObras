import { apiClient } from '../../shared/api/client';
import type { ApiResponse, PaginatedData } from '../../shared/api/types';
import type { Obra, ObraPayload, ObraResumen } from './types';

export async function getObras(estado?: string) {
  const { data } = await apiClient.get<ApiResponse<PaginatedData<Obra>>>('/obras', {
    params: { page: 1, limit: 100, estado: estado || undefined },
  });
  return data.data.items;
}

export async function getObrasActivas() {
  const { data } = await apiClient.get<ApiResponse<Obra[]>>('/obras/activas');
  return data.data;
}

export async function createObra(payload: ObraPayload) {
  const { data } = await apiClient.post<ApiResponse<Obra>>('/obras', payload);
  return data.data;
}

export async function updateObra(id: number, payload: ObraPayload) {
  const { data } = await apiClient.put<ApiResponse<Obra>>(`/obras/${id}`, payload);
  return data.data;
}

export async function finalizarObra(id: number) {
  const { data } = await apiClient.put<ApiResponse<Obra>>(`/obras/${id}/finalizar`);
  return data.data;
}

export async function getObraResumen(id: number) {
  const { data } = await apiClient.get<ApiResponse<ObraResumen>>(`/obras/${id}/resumen`);
  return data.data;
}
