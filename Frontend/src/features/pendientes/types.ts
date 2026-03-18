export interface Pendiente {
  id: number;
  obraId: number;
  descripcion: string;
  estado: 'pendiente' | 'resuelto';
  creadoEn: string;
  resueltoEn: string | null;
  obra: {
    id: number;
    nombre: string;
    cliente?: string | null;
    estado?: string;
  };
}
