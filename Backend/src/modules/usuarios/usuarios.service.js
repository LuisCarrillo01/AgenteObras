const bcrypt = require('bcryptjs');
const { prisma } = require('../../lib/prisma');
const { badRequest, notFound } = require('../../lib/http-errors');

async function createUsuario(payload) {
  const totalUsuarios = await prisma.usuario.count();
  const exists = await prisma.usuario.findUnique({
    where: { email: payload.email }
  });

  if (exists) {
    throw badRequest('Ya existe un usuario con ese email');
  }

  const hashedPassword = await bcrypt.hash(payload.password, 10);

  const usuario = await prisma.usuario.create({
    data: {
      nombre: payload.nombre,
      email: payload.email,
      password: hashedPassword,
      rol: totalUsuarios === 0 ? 'admin' : payload.rol
    },
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      activo: true,
      creadoEn: true
    }
  });

  return usuario;
}

async function hasUsuarios() {
  const totalUsuarios = await prisma.usuario.count();

  return totalUsuarios > 0;
}

async function listUsuarios() {
  return prisma.usuario.findMany({
    orderBy: { creadoEn: 'desc' },
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      activo: true,
      creadoEn: true
    }
  });
}

async function updateUsuario(id, payload) {
  const usuario = await prisma.usuario.findUnique({ where: { id } });

  if (!usuario) {
    throw notFound('Usuario no encontrado');
  }

  const data = { ...payload };

  if (payload.email && payload.email !== usuario.email) {
    const duplicate = await prisma.usuario.findUnique({ where: { email: payload.email } });

    if (duplicate) {
      throw badRequest('Ya existe un usuario con ese email');
    }
  }

  if (payload.password) {
    data.password = await bcrypt.hash(payload.password, 10);
  }

  const updated = await prisma.usuario.update({
    where: { id },
    data,
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      activo: true,
      creadoEn: true
    }
  });

  return updated;
}

module.exports = {
  createUsuario,
  hasUsuarios,
  listUsuarios,
  updateUsuario
};
