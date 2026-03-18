export type UsuarioRol = 'admin' | 'encargado';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: UsuarioRol;
  activo: boolean;
  creadoEn: string;
}

export interface UsuarioPayload {
  nombre: string;
  email: string;
  rol: UsuarioRol;
  password?: string;
  activo?: boolean;
}
