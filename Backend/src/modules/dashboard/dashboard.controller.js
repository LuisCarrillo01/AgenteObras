const dashboardService = require('./dashboard.service');

async function getResumen(_req, res) {
  const data = await dashboardService.getResumen();

  return res.json({
    success: true,
    message: 'Resumen del dashboard obtenido correctamente',
    data
  });
}

async function getActividadHoy(_req, res) {
  const data = await dashboardService.getActividadHoy();

  return res.json({
    success: true,
    message: 'Actividad del dia obtenida correctamente',
    data
  });
}

module.exports = {
  getResumen,
  getActividadHoy
};
