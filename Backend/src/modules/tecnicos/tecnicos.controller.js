const { validate } = require('../../utils/validation');
const { createTecnicoSchema, updateTecnicoSchema } = require('./tecnicos.schemas');
const tecnicosService = require('./tecnicos.service');

async function listTecnicos(req, res) {
  const data = await tecnicosService.listTecnicos(req.query);

  return res.json({
    success: true,
    message: 'Tecnicos obtenidos correctamente',
    data
  });
}

async function createTecnico(req, res) {
  const payload = validate(createTecnicoSchema, req.body);
  const data = await tecnicosService.createTecnico(payload);

  return res.status(201).json({
    success: true,
    message: 'Tecnico creado correctamente',
    data
  });
}

async function updateTecnico(req, res) {
  const payload = validate(updateTecnicoSchema, req.body);
  const data = await tecnicosService.updateTecnico(Number(req.params.id), payload);

  return res.json({
    success: true,
    message: 'Tecnico actualizado correctamente',
    data
  });
}

async function deleteTecnico(req, res) {
  const data = await tecnicosService.deleteTecnico(Number(req.params.id));

  return res.json({
    success: true,
    message: 'Tecnico desactivado correctamente',
    data
  });
}

module.exports = {
  listTecnicos,
  createTecnico,
  updateTecnico,
  deleteTecnico
};
