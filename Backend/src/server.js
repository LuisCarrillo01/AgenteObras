const { app } = require('./app');
const { env } = require('./config/env');
const { prisma } = require('./lib/prisma');

async function start() {
  try {
    await prisma.$connect();

    app.listen(env.PORT, () => {
      console.log(`Backend escuchando en el puerto ${env.PORT}`);
    });
  } catch (error) {
    console.error('No se pudo iniciar el backend:', error);
    process.exit(1);
  }
}

start();
