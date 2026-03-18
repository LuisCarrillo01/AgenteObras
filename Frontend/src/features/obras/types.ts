export type EstadoObra = 'activa' | 'pausada' | 'finalizada';

export interface Obra {
  id: number;
  nombre: string;
  direccion: string | null;
  cliente: string | null;
  estado: EstadoObra;
  fechaInicio: string | null;
  fechaFin: string | null;
  creadoEn: string;
}

export interface ObraPayload {
  nombre: string;
  direccion?: string | null;
  cliente?: string | null;
  estado?: EstadoObra;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
}

export interface ObraResumen {
  obra: string;
  pendientes: number;
  ultima_actividad: string | null;
  tecnicos: string[];
}
