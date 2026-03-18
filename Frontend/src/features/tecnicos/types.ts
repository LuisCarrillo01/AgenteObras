export interface Tecnico {
  id: number;
  nombre: string;
  telefono: string;
  activo: boolean;
  creadoEn: string;
}

export interface TecnicoPayload {
  nombre: string;
  telefono: string;
  activo?: boolean;
}
