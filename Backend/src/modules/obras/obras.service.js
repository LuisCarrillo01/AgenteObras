const { prisma } = require('../../lib/prisma');
const { notFound } = require('../../lib/http-errors');
const { getPagination } = require('../../utils/pagination');

function normalizeDate(value) {
  return value ? new Date(value) : null;
}

function mapObraPayload(payload) {
  return {
    nombre: payload.nombre,
    direccion: payload.direccion ?? null,
    cliente: payload.cliente ?? null,
    estado: payload.estado,
    fechaInicio: payload.fecha_inicio ? normalizeDate(payload.fecha_inicio) : undefined,
    fechaFin: payload.fecha_fin ? normalizeDate(payload.fecha_fin) : undefined
  };
}

async function listObras(query) {
  const { page, limit, skip } = getPagination(query);
  const where = query.estado ? { estado: query.estado } : {};

  const [items, total] = await Promise.all([
    prisma.obra.findMany({
      where,
      orderBy: { creadoEn: 'desc' },
      skip,
      take: limit
    }),
    prisma.obra.count({ where })
  ]);

  return { items, meta: { page, limit, total } };
}

async function listObrasActivas() {
  return prisma.obra.findMany({
    where: { estado: 'activa' },
    orderBy: { fechaInicio: 'asc' }
  });
}

async function createObra(payload) {
  return prisma.obra.create({
    data: mapObraPayload(payload)
  });
}

async function updateObra(id, payload) {
  const obra = await prisma.obra.findUnique({ where: { id } });

  if (!obra) {
    throw notFound('Obra no encontrada');
  }

  return prisma.obra.update({
    where: { id },
    data: mapObraPayload(payload)
  });
}

async function finalizarObra(id) {
  const obra = await prisma.obra.findUnique({ where: { id } });

  if (!obra) {
    throw notFound('Obra no encontrada');
  }

  return prisma.obra.update({
    where: { id },
    data: {
      estado: 'finalizada',
      fechaFin: new Date()
    }
  });
}

async function getResumenObra(id) {
  const obra = await prisma.obra.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true
    }
  });

  if (!obra) {
    throw notFound('Obra no encontrada');
  }

  const [pendientes, ultimoReporte, reportesTecnicos] = await Promise.all([
    prisma.pendiente.count({
      where: {
        obraId: id,
        estado: 'pendiente'
      }
    }),
    prisma.reporte.findFirst({
      where: { obraId: id },
      orderBy: { fecha: 'desc' },
      select: { fecha: true }
    }),
    prisma.reporte.findMany({
      where: { obraId: id },
      distinct: ['tecnicoId'],
      select: {
        tecnico: {
          select: { nombre: true }
        }
      }
    })
  ]);

  return {
    obra: obra.nombre,
    pendientes,
    ultima_actividad: ultimoReporte ? ultimoReporte.fecha : null,
    tecnicos: reportesTecnicos.map((item) => item.tecnico.nombre)
  };
}

module.exports = {
  listObras,
  listObrasActivas,
  createObra,
  updateObra,
  finalizarObra,
  getResumenObra
};
