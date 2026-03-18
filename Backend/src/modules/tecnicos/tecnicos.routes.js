const express = require('express');
const { asyncHandler } = require('../../utils/async-handler');
const tecnicosController = require('./tecnicos.controller');

const tecnicosRoutes = express.Router();

tecnicosRoutes.get('/', asyncHandler(tecnicosController.listTecnicos));
tecnicosRoutes.post('/', asyncHandler(tecnicosController.createTecnico));
tecnicosRoutes.put('/:id', asyncHandler(tecnicosController.updateTecnico));
tecnicosRoutes.delete('/:id', asyncHandler(tecnicosController.deleteTecnico));

module.exports = { tecnicosRoutes };
