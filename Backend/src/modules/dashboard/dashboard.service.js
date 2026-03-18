const { prisma } = require('../../lib/prisma');

function getTodayRange() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

async function getResumen() {
  const { start, end } = getTodayRange();

  const [obrasActivas, pendientes, reportesHoy] = await Promise.all([
    prisma.obra.count({ where: { estado: 'activa' } }),
    prisma.pendiente.count({ where: { estado: 'pendiente' } }),
    prisma.reporte.count({
      where: {
        fecha: {
          gte: start,
          lte: end
        }
      }
    })
  ]);

  return {
    obras_activas: obrasActivas,
    pendientes,
    reportes_hoy: reportesHoy
  };
}

async function getActividadHoy() {
  const { start, end } = getTodayRange();

  return prisma.reporte.findMany({
    where: {
      fecha: {
        gte: start,
        lte: end
      }
    },
    orderBy: { fecha: 'desc' },
    select: {
      id: true,
      mensajeOriginal: true,
      fecha: true,
      tecnico: {
        select: {
          id: true,
          nombre: true
        }
      },
      obra: {
        select: {
          id: true,
          nombre: true
        }
      }
    }
  });
}

module.exports = {
  getResumen,
  getActividadHoy
};
