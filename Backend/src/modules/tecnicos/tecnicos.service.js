const { prisma } = require('../../lib/prisma');
const { badRequest, notFound } = require('../../lib/http-errors');
const { getPagination } = require('../../utils/pagination');

async function listTecnicos(query) {
  const { page, limit, skip } = getPagination(query);
  const includeInactive = query.includeInactive === 'true';
  const where = includeInactive ? {} : { activo: true };

  const [items, total] = await Promise.all([
    prisma.tecnico.findMany({
      where,
      orderBy: { creadoEn: 'desc' },
      skip,
      take: limit
    }),
    prisma.tecnico.count({ where })
  ]);

  return { items, meta: { page, limit, total } };
}

async function createTecnico(payload) {
  const exists = await prisma.tecnico.findUnique({ where: { telefono: payload.telefono } });

  if (exists) {
    throw badRequest('Ya existe un tecnico con ese telefono');
  }

  return prisma.tecnico.create({ data: payload });
}

async function updateTecnico(id, payload) {
  const tecnico = await prisma.tecnico.findUnique({ where: { id } });

  if (!tecnico) {
    throw notFound('Tecnico no encontrado');
  }

  if (payload.telefono && payload.telefono !== tecnico.telefono) {
    const duplicate = await prisma.tecnico.findUnique({ where: { telefono: payload.telefono } });

    if (duplicate) {
      throw badRequest('Ya existe un tecnico con ese telefono');
    }
  }

  return prisma.tecnico.update({
    where: { id },
    data: payload
  });
}

async function deleteTecnico(id) {
  const tecnico = await prisma.tecnico.findUnique({ where: { id } });

  if (!tecnico) {
    throw notFound('Tecnico no encontrado');
  }

  return prisma.tecnico.update({
    where: { id },
    data: { activo: false }
  });
}

module.exports = {
  listTecnicos,
  createTecnico,
  updateTecnico,
  deleteTecnico
};
