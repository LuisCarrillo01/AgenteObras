const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../../lib/prisma');
const { env } = require('../../config/env');
const { unauthorized } = require('../../lib/http-errors');

async function login(payload) {
  const usuario = await prisma.usuario.findUnique({
    where: { email: payload.email }
  });

  if (!usuario || !usuario.activo) {
    throw unauthorized('Credenciales invalidas');
  }

  const isPasswordValid = await bcrypt.compare(payload.password, usuario.password);

  if (!isPasswordValid) {
    throw unauthorized('Credenciales invalidas');
  }

  const token = jwt.sign(
    {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  return {
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      activo: usuario.activo
    }
  };
}

async function getBootstrapStatus() {
  const totalUsuarios = await prisma.usuario.count();

  return {
    hasUsers: totalUsuarios > 0,
    requiresSetup: totalUsuarios === 0
  };
}

module.exports = { getBootstrapStatus, login };
