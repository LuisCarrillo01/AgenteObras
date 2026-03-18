import axios from 'axios';

export function getApiErrorMessage(error: unknown, fallback = 'Ocurrio un error inesperado') {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message ?? fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
