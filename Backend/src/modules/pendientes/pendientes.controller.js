const pendientesService = require('./pendientes.service');

async function listPendientes(req, res) {
  const data = await pendientesService.listPendientes(req.query);

  return res.json({
    success: true,
    message: 'Pendientes obtenidos correctamente',
    data
  });
}

async function listPendientesByObra(req, res) {
  const data = await pendientesService.listPendientesByObra(Number(req.params.id), req.query);

  return res.json({
    success: true,
    message: 'Pendientes por obra obtenidos correctamente',
    data
  });
}

async function resolverPendiente(req, res) {
  const data = await pendientesService.resolverPendiente(Number(req.params.id));

  return res.json({
    success: true,
    message: 'Pendiente resuelto correctamente',
    data
  });
}

async function reabrirPendiente(req, res) {
  const data = await pendientesService.reabrirPendiente(Number(req.params.id));

  return res.json({
    success: true,
    message: 'Pendiente reabierto correctamente',
    data
  });
}

module.exports = {
  listPendientes,
  listPendientesByObra,
  resolverPendiente,
  reabrirPendiente
};
