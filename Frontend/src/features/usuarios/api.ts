import { apiClient } from '../../shared/api/client';
import type { ApiResponse } from '../../shared/api/types';
import type { Usuario, UsuarioPayload } from './types';

export async function getUsuarios() {
  const { data } = await apiClient.get<ApiResponse<Usuario[]>>('/usuarios');
  return data.data;
}

export async function createUsuario(payload: UsuarioPayload) {
  const { data } = await apiClient.post<ApiResponse<Usuario>>('/usuarios', payload);
  return data.data;
}

export async function updateUsuario(id: number, payload: Partial<UsuarioPayload>) {
  const { data } = await apiClient.put<ApiResponse<Usuario>>(`/usuarios/${id}`, payload);
  return data.data;
}
