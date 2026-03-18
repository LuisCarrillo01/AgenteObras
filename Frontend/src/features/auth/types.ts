export type Rol = 'admin' | 'encargado';

export interface AuthUser {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  usuario: AuthUser;
}

export interface BootstrapStatus {
  hasUsers: boolean;
  requiresSetup: boolean;
}

export interface SetupPayload {
  nombre: string;
  email: string;
  password: string;
  rol?: Rol;
}
