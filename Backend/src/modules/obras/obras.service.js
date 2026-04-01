const { prisma } = require('../../lib/prisma');
const crypto = require('crypto');
const path = require('path');
const { minioClient } = require('../../lib/minio');
const { badRequest, notFound } = require('../../lib/http-errors');
const { env } = require('../../config/env');
const { getPagination } = require('../../utils/pagination');

function normalizeDate(value) {
  return value ? new Date(value) : null;
}

function mapObraPayload(payload) {
  return {
    nombre: payload.nombre,
    direccion: payload.direccion ?? null,
    cliente: payload.cliente ?? null,
    estado: payload.estado,
    fechaInicio: payload.fecha_inicio ? normalizeDate(payload.fecha_inicio) : undefined,
    fechaFin: payload.fecha_fin ? normalizeDate(payload.fecha_fin) : undefined
  };
}

function sanitizeFilename(filename) {
  return filename
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || 'imagen';
}

function buildObjectKey(obraId, originalname) {
  const ext = path.extname(originalname || '').toLowerCase() || '.bin';
  const safeName = sanitizeFilename(path.basename(originalname || 'imagen', ext));
  const uniquePart = crypto.randomUUID();
  const prefix = env.MINIO_OBJECT_PREFIX.replace(/^\/+|\/+$/g, '');
  return `${prefix}/obra-${obraId}/${uniquePart}-${safeName}${ext}`;
}

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

async function listObras(query) {
  const { page, limit, skip } = getPagination(query);
  const where = query.estado ? { estado: query.estado } : {};

  const [items, total] = await Promise.all([
    prisma.obra.findMany({
      where,
      orderBy: { creadoEn: 'desc' },
      skip,
      take: limit
    }),
    prisma.obra.count({ where })
  ]);

  return { items, meta: { page, limit, total } };
}

async function listObrasActivas() {
  return prisma.obra.findMany({
    where: { estado: 'activa' },
    orderBy: { fechaInicio: 'asc' }
  });
}

async function createObra(payload) {
  return prisma.obra.create({
    data: mapObraPayload(payload)
  });
}

async function updateObra(id, payload) {
  const obra = await prisma.obra.findUnique({ where: { id } });

  if (!obra) {
    throw notFound('Obra no encontrada');
  }

  return prisma.obra.update({
    where: { id },
    data: mapObraPayload(payload)
  });
}

async function finalizarObra(id) {
  const obra = await prisma.obra.findUnique({ where: { id } });

  if (!obra) {
    throw notFound('Obra no encontrada');
  }

  return prisma.obra.update({
    where: { id },
    data: {
      estado: 'finalizada',
      fechaFin: new Date()
    }
  });
}

async function getResumenObra(id) {
  const obra = await prisma.obra.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true
    }
  });

  if (!obra) {
    throw notFound('Obra no encontrada');
  }

  const [pendientes, ultimoReporte, reportesTecnicos] = await Promise.all([
    prisma.pendiente.count({
      where: {
        obraId: id,
        estado: 'pendiente'
      }
    }),
    prisma.reporte.findFirst({
      where: { obraId: id },
      orderBy: { fecha: 'desc' },
      select: { fecha: true }
    }),
    prisma.reporte.findMany({
      where: { obraId: id },
      distinct: ['tecnicoId'],
      select: {
        tecnico: {
          select: { nombre: true }
        }
      }
    })
  ]);

  return {
    obra: obra.nombre,
    pendientes,
    ultima_actividad: ultimoReporte ? ultimoReporte.fecha : null,
    tecnicos: reportesTecnicos.map((item) => item.tecnico.nombre)
  };
}

async function uploadObraImage(id, file) {
  const obra = await prisma.obra.findUnique({ where: { id } });

  if (!obra) {
    throw notFound('Obra no encontrada');
  }

  if (!file) {
    throw badRequest('Debes enviar una imagen de referencia');
  }

  if (!env.MINIO_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw badRequest('El archivo debe ser una imagen valida');
  }

  const objectKey = buildObjectKey(id, file.originalname);
  await minioClient.putObject(env.MINIO_BUCKET_OBRAS, objectKey, file.buffer, file.size, {
    'Content-Type': file.mimetype,
  });

  if (obra.fotoReferenciaKey) {
    await minioClient.removeObject(env.MINIO_BUCKET_OBRAS, obra.fotoReferenciaKey).catch(() => {});
  }

  return prisma.obra.update({
    where: { id },
    data: {
      fotoReferenciaKey: objectKey,
      fotoReferenciaMimeType: file.mimetype,
      fotoReferenciaNombre: file.originalname,
    },
  });
}

async function getObraImage(id) {
  const obra = await prisma.obra.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      fotoReferenciaKey: true,
      fotoReferenciaMimeType: true,
      fotoReferenciaNombre: true,
    },
  });

  if (!obra) {
    throw notFound('Obra no encontrada');
  }

  if (!obra.fotoReferenciaKey) {
    throw notFound('La obra no tiene imagen de referencia');
  }

  const stream = await minioClient.getObject(env.MINIO_BUCKET_OBRAS, obra.fotoReferenciaKey);
  const buffer = await streamToBuffer(stream);

  return {
    buffer,
    mimeType: obra.fotoReferenciaMimeType || 'application/octet-stream',
    fileName: obra.fotoReferenciaNombre || `${obra.nombre}.bin`,
  };
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
