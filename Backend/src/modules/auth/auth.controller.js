const { validate } = require('../../utils/validation');
const { loginSchema } = require('./auth.schemas');
const authService = require('./auth.service');

async function login(req, res) {
  const payload = validate(loginSchema, req.body);
  const data = await authService.login(payload);

  return res.json({
    success: true,
    message: 'Login exitoso',
    data
  });
}

async function getBootstrapStatus(_req, res) {
  const data = await authService.getBootstrapStatus();

  return res.json({
    success: true,
    message: 'Estado de bootstrap obtenido correctamente',
    data
  });
}

module.exports = { getBootstrapStatus, login };
