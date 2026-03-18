const { validate } = require('../../utils/validation');
const { createUsuarioSchema, updateUsuarioSchema } = require('./usuarios.schemas');
const usuariosService = require('./usuarios.service');

async function createUsuario(req, res) {
  const payload = validate(createUsuarioSchema, req.body);
  const data = await usuariosService.createUsuario(payload);

  return res.status(201).json({
    success: true,
    message: 'Usuario creado correctamente',
    data
  });
}

async function listUsuarios(_req, res) {
  const data = await usuariosService.listUsuarios();

  return res.json({
    success: true,
    message: 'Usuarios obtenidos correctamente',
    data
  });
}

async function updateUsuario(req, res) {
  const payload = validate(updateUsuarioSchema, req.body);
  const data = await usuariosService.updateUsuario(Number(req.params.id), payload);

  return res.json({
    success: true,
    message: 'Usuario actualizado correctamente',
    data
  });
}

module.exports = {
  createUsuario,
  listUsuarios,
  updateUsuario
};
