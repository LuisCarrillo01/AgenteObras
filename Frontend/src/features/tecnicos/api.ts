import { apiClient } from '../../shared/api/client';
import type { ApiResponse, PaginatedData } from '../../shared/api/types';
import type { Tecnico, TecnicoPayload } from './types';

export async function getTecnicos(includeInactive = true) {
  const { data } = await apiClient.get<ApiResponse<PaginatedData<Tecnico>>>('/tecnicos', {
    params: { page: 1, limit: 100, includeInactive },
  });

  return data.data.items;
}

export async function createTecnico(payload: TecnicoPayload) {
  const { data } = await apiClient.post<ApiResponse<Tecnico>>('/tecnicos', payload);
  return data.data;
}

export async function updateTecnico(id: number, payload: Partial<TecnicoPayload>) {
  const { data } = await apiClient.put<ApiResponse<Tecnico>>(`/tecnicos/${id}`, payload);
  return data.data;
}

export async function deactivateTecnico(id: number) {
  const { data } = await apiClient.delete<ApiResponse<Tecnico>>(`/tecnicos/${id}`);
  return data.data;
}
