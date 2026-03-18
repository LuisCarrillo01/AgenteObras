export interface Reporte {
  id: number;
  tecnicoId: number;
  obraId: number;
  mensajeOriginal: string;
  fecha: string;
  tecnico: {
    id: number;
    nombre: string;
    telefono: string;
  };
  obra: {
    id: number;
    nombre: string;
    cliente: string | null;
    estado: string;
  };
}
