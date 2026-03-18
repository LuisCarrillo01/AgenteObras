export function formatDate(value?: string | null) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatBooleanStatus(active: boolean) {
  return active ? 'Activo' : 'Inactivo';
}

export function mapEstadoTone(estado?: string | null) {
  switch (estado) {
    case 'activa':
    case 'activo':
    case 'resuelto':
      return 'success';
    case 'pausada':
    case 'pendiente':
      return 'warning';
    case 'finalizada':
    case 'inactivo':
      return 'neutral';
    default:
      return 'neutral';
  }
}
