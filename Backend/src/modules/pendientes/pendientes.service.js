const { prisma } = require('../../lib/prisma');
const { notFound } = require('../../lib/http-errors');
const { getPagination } = require('../../utils/pagination');

async function listPendientes(query) {
  const { page, limit, skip } = getPagination(query);
  const where = query.estado ? { estado: query.estado } : {};

  const [items, total] = await Promise.all([
    prisma.pendiente.findMany({
      where,
      include: {
        obra: {
          select: {
            id: true,
            nombre: true,
            cliente: true,
            estado: true
          }
        }
      },
      orderBy: { creadoEn: 'desc' },
      skip,
      take: limit
    }),
    prisma.pendiente.count({ where })
  ]);

  return { items, meta: { page, limit, total } };
}

async function listPendientesByObra(obraId, query) {
  const { page, limit, skip } = getPagination(query);
  const where = { obraId };

  const [items, total] = await Promise.all([
    prisma.pendiente.findMany({
      where,
      include: {
        obra: {
          select: {
            id: true,
            nombre: true,
            cliente: true,
            estado: true
          }
        }
      },
      orderBy: { creadoEn: 'desc' },
      skip,
      take: limit
    }),
    prisma.pendiente.count({ where })
  ]);

  return { items, meta: { page, limit, total } };
}

async function resolverPendiente(id) {
  const pendiente = await prisma.pendiente.findUnique({ where: { id } });

  if (!pendiente) {
    throw notFound('Pendiente no encontrado');
  }

  return prisma.pendiente.update({
    where: { id },
    data: {
      estado: 'resuelto',
      resueltoEn: new Date()
    },
    include: {
      obra: {
        select: {
          id: true,
          nombre: true
        }
      }
    }
  });
}

async function reabrirPendiente(id) {
  const pendiente = await prisma.pendiente.findUnique({ where: { id } });

  if (!pendiente) {
    throw notFound('Pendiente no encontrado');
  }

  return prisma.pendiente.update({
    where: { id },
    data: {
      estado: 'pendiente',
      resueltoEn: null
    },
    include: {
      obra: {
        select: {
          id: true,
          nombre: true
        }
      }
    }
  });
}

module.exports = {
  listPendientes,
  listPendientesByObra,
  resolverPendiente,
  reabrirPendiente
};
