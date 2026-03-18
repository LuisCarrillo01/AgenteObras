import { apiClient } from '../../shared/api/client';
import type { ApiResponse } from '../../shared/api/types';
import type { BootstrapStatus, LoginPayload, LoginResponse, SetupPayload } from './types';

export async function getBootstrapStatus() {
  const { data } = await apiClient.get<ApiResponse<BootstrapStatus>>('/auth/bootstrap-status');
  return data.data;
}

export async function login(payload: LoginPayload) {
  const { data } = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', payload);
  return data.data;
}

export async function createInitialUser(payload: SetupPayload) {
  const { data } = await apiClient.post('/usuarios', payload);
  return data.data;
}
