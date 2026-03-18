const express = require('express');
const { asyncHandler } = require('../../utils/async-handler');
const { authMiddleware } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/role.middleware');
const usuariosController = require('./usuarios.controller');
const usuariosService = require('./usuarios.service');

const usuariosRoutes = express.Router();

const requireBootstrapOrAdmin = asyncHandler(async (req, res, next) => {
  const hasUsuarios = await usuariosService.hasUsuarios();

  if (!hasUsuarios) {
    return next();
  }

  return authMiddleware(req, res, (error) => {
    if (error) {
      return next(error);
    }

    return requireRole('admin')(req, res, next);
  });
});

usuariosRoutes.get('/', authMiddleware, asyncHandler(usuariosController.listUsuarios));
usuariosRoutes.post('/', requireBootstrapOrAdmin, asyncHandler(usuariosController.createUsuario));
usuariosRoutes.put('/:id', authMiddleware, requireRole('admin'), asyncHandler(usuariosController.updateUsuario));

module.exports = { usuariosRoutes };
