const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { authRoutes } = require('../modules/auth/auth.routes');
const { usuariosRoutes } = require('../modules/usuarios/usuarios.routes');
const { tecnicosRoutes } = require('../modules/tecnicos/tecnicos.routes');
const { obrasRoutes } = require('../modules/obras/obras.routes');
const { reportesRoutes } = require('../modules/reportes/reportes.routes');
const { pendientesRoutes } = require('../modules/pendientes/pendientes.routes');
const { dashboardRoutes } = require('../modules/dashboard/dashboard.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/tecnicos', authMiddleware, tecnicosRoutes);
router.use('/obras', authMiddleware, obrasRoutes);
router.use('/reportes', authMiddleware, reportesRoutes);
router.use('/pendientes', authMiddleware, pendientesRoutes);
router.use('/dashboard', authMiddleware, dashboardRoutes);

module.exports = { router };
