const reportesService = require('./reportes.service');

async function listReportes(req, res) {
  const data = await reportesService.listReportes(req.query);

  return res.json({
    success: true,
    message: 'Reportes obtenidos correctamente',
    data
  });
}

async function listReportesByObra(req, res) {
  const data = await reportesService.listReportesByObra(Number(req.params.id), req.query);

  return res.json({
    success: true,
    message: 'Reportes por obra obtenidos correctamente',
    data
  });
}

async function listReportesByTecnico(req, res) {
  const data = await reportesService.listReportesByTecnico(Number(req.params.id), req.query);

  return res.json({
    success: true,
    message: 'Reportes por tecnico obtenidos correctamente',
    data
  });
}

module.exports = {
  listReportes,
  listReportesByObra,
  listReportesByTecnico
};
