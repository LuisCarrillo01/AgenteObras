const { validate } = require('../../utils/validation');
const { createObraSchema, updateObraSchema } = require('./obras.schemas');
const obrasService = require('./obras.service');

async function listObras(req, res) {
  const data = await obrasService.listObras(req.query);

  return res.json({
    success: true,
    message: 'Obras obtenidas correctamente',
    data
  });
}

async function listObrasActivas(_req, res) {
  const data = await obrasService.listObrasActivas();

  return res.json({
    success: true,
    message: 'Obras activas obtenidas correctamente',
    data
  });
}

async function createObra(req, res) {
  const payload = validate(createObraSchema, req.body);
  const data = await obrasService.createObra(payload);

  return res.status(201).json({
    success: true,
    message: 'Obra creada correctamente',
    data
  });
}

async function updateObra(req, res) {
  const payload = validate(updateObraSchema, req.body);
  const data = await obrasService.updateObra(Number(req.params.id), payload);

  return res.json({
    success: true,
    message: 'Obra actualizada correctamente',
    data
  });
}

async function finalizarObra(req, res) {
  const data = await obrasService.finalizarObra(Number(req.params.id));

  return res.json({
    success: true,
    message: 'Obra finalizada correctamente',
    data
  });
}

async function getResumenObra(req, res) {
  const data = await obrasService.getResumenObra(Number(req.params.id));

  return res.json({
    success: true,
    message: 'Resumen de obra obtenido correctamente',
    data
  });
}

async function uploadObraImage(req, res) {
  const data = await obrasService.uploadObraImage(Number(req.params.id), req.file);

  return res.json({
    success: true,
    message: 'Imagen de referencia actualizada correctamente',
    data,
  });
}

async function getObraImage(req, res) {
  const image = await obrasService.getObraImage(Number(req.params.id));

  res.setHeader('Content-Type', image.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(image.fileName)}"`);
  return res.send(image.buffer);
}

module.exports = {
  listObras,
  listObrasActivas,
  createObra,
  updateObra,
  finalizarObra,
  getResumenObra,
  uploadObraImage,
  getObraImage,
};
