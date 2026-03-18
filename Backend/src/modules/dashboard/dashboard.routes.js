const express = require('express');
const { asyncHandler } = require('../../utils/async-handler');
const dashboardController = require('./dashboard.controller');

const dashboardRoutes = express.Router();

dashboardRoutes.get('/resumen', asyncHandler(dashboardController.getResumen));
dashboardRoutes.get('/actividad-hoy', asyncHandler(dashboardController.getActividadHoy));

module.exports = { dashboardRoutes };
