const express = require('express');
const { asyncHandler } = require('../../utils/async-handler');
const reportesController = require('./reportes.controller');

const reportesRoutes = express.Router();

reportesRoutes.get('/', asyncHandler(reportesController.listReportes));
reportesRoutes.get('/obra/:id', asyncHandler(reportesController.listReportesByObra));
reportesRoutes.get('/tecnico/:id', asyncHandler(reportesController.listReportesByTecnico));

module.exports = { reportesRoutes };
