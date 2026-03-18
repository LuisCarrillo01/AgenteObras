const express = require('express');
const { asyncHandler } = require('../../utils/async-handler');
const pendientesController = require('./pendientes.controller');

const pendientesRoutes = express.Router();

pendientesRoutes.get('/', asyncHandler(pendientesController.listPendientes));
pendientesRoutes.get('/obra/:id', asyncHandler(pendientesController.listPendientesByObra));
pendientesRoutes.put('/:id/resolver', asyncHandler(pendientesController.resolverPendiente));
pendientesRoutes.put('/:id/reabrir', asyncHandler(pendientesController.reabrirPendiente));

module.exports = { pendientesRoutes };
