export interface DashboardSummary {
  obras_activas: number;
  pendientes: number;
  reportes_hoy: number;
}

export interface DashboardActivity {
  id: number;
  mensajeOriginal: string;
  fecha: string;
  tecnico: {
    id: number;
    nombre: string;
  };
  obra: {
    id: number;
    nombre: string;
  };
}
