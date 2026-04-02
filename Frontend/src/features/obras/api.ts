import { apiClient } from '../../shared/api/client';
import axios from 'axios';
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

export async function uploadObraImage(id: number, file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await apiClient.post<ApiResponse<Obra>>(`/obras/${id}/foto-referencia`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

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

export async function getObraImageBlob(id: number) {
  try {
    const { data } = await apiClient.get<Blob>(`/obras/${id}/foto-referencia`, {
      responseType: 'blob',
    });
    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }

    throw error;
  }
}
