const { prisma } = require('../../lib/prisma');
const { getPagination } = require('../../utils/pagination');

const reporteInclude = {
  tecnico: {
    select: {
      id: true,
      nombre: true,
      telefono: true
    }
  },
  obra: {
    select: {
      id: true,
      nombre: true,
      cliente: true,
      estado: true
    }
  },
  actividades: true,
  fotos: true
};

async function listReportes(query) {
  const { page, limit, skip } = getPagination(query);

  const [items, total] = await Promise.all([
    prisma.reporte.findMany({
      include: reporteInclude,
      orderBy: { fecha: 'desc' },
      skip,
      take: limit
    }),
    prisma.reporte.count()
  ]);

  return { items, meta: { page, limit, total } };
}

async function listReportesByObra(obraId, query) {
  const { page, limit, skip } = getPagination(query);
  const where = { obraId };

  const [items, total] = await Promise.all([
    prisma.reporte.findMany({
      where,
      include: reporteInclude,
      orderBy: { fecha: 'desc' },
      skip,
      take: limit
    }),
    prisma.reporte.count({ where })
  ]);

  return { items, meta: { page, limit, total } };
}

async function listReportesByTecnico(tecnicoId, query) {
  const { page, limit, skip } = getPagination(query);
  const where = { tecnicoId };

  const [items, total] = await Promise.all([
    prisma.reporte.findMany({
      where,
      include: reporteInclude,
      orderBy: { fecha: 'desc' },
      skip,
      take: limit
    }),
    prisma.reporte.count({ where })
  ]);

  return { items, meta: { page, limit, total } };
}

module.exports = {
  listReportes,
  listReportesByObra,
  listReportesByTecnico
};
