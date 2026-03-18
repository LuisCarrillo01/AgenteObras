const express = require('express');
const { asyncHandler } = require('../../utils/async-handler');
const obrasController = require('./obras.controller');

const obrasRoutes = express.Router();

obrasRoutes.get('/', asyncHandler(obrasController.listObras));
obrasRoutes.get('/activas', asyncHandler(obrasController.listObrasActivas));
obrasRoutes.post('/', asyncHandler(obrasController.createObra));
obrasRoutes.put('/:id', asyncHandler(obrasController.updateObra));
obrasRoutes.put('/:id/finalizar', asyncHandler(obrasController.finalizarObra));
obrasRoutes.get('/:id/resumen', asyncHandler(obrasController.getResumenObra));

module.exports = { obrasRoutes };
