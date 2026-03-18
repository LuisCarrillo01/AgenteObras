import { apiClient } from '../../shared/api/client';
import type { ApiResponse } from '../../shared/api/types';
import type { DashboardActivity, DashboardSummary } from './types';

export async function getDashboardSummary() {
  const { data } = await apiClient.get<ApiResponse<DashboardSummary>>('/dashboard/resumen');
  return data.data;
}

export async function getTodayActivity() {
  const { data } = await apiClient.get<ApiResponse<DashboardActivity[]>>('/dashboard/actividad-hoy');
  return data.data;
}
