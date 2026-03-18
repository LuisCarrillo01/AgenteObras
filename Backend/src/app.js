const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { env } = require('./config/env');
const { router } = require('./routes');
const { errorMiddleware } = require('./middlewares/error.middleware');
const { notFoundMiddleware } = require('./middlewares/not-found.middleware');

const app = express();

app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (env.CORS_ORIGIN.length === 0 || env.CORS_ORIGIN.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Origen no permitido por CORS'));
    }
  })
);

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'API operativa',
    data: {
      environment: env.APP_ENV
    }
  });
});

app.use('/api', router);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = { app };
