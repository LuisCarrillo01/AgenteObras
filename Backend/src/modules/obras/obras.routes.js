const express = require('express');
const multer = require('multer');
const { asyncHandler } = require('../../utils/async-handler');
const { env } = require('../../config/env');
const { badRequest } = require('../../lib/http-errors');
const obrasController = require('./obras.controller');

const obrasRoutes = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MINIO_MAX_FILE_SIZE_MB * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (!env.MINIO_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      callback(badRequest('Solo se permiten imagenes JPG, PNG o WEBP'));
      return;
    }
    callback(null, true);
  },
});

obrasRoutes.get('/', asyncHandler(obrasController.listObras));
obrasRoutes.get('/activas', asyncHandler(obrasController.listObrasActivas));
obrasRoutes.get('/:id/foto-referencia', asyncHandler(obrasController.getObraImage));
obrasRoutes.post('/', asyncHandler(obrasController.createObra));
obrasRoutes.post('/:id/foto-referencia', upload.single('file'), asyncHandler(obrasController.uploadObraImage));
obrasRoutes.put('/:id', asyncHandler(obrasController.updateObra));
obrasRoutes.put('/:id/finalizar', asyncHandler(obrasController.finalizarObra));
obrasRoutes.get('/:id/resumen', asyncHandler(obrasController.getResumenObra));

module.exports = { obrasRoutes };
