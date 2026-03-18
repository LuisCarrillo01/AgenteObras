const { HttpError } = require('../lib/http-errors');

function errorMiddleware(error, _req, res, _next) {
  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      details: error.details || null
    });
  }

  console.error(error);

  return res.status(500).json({
    success: false,
    message: 'Error interno del servidor'
  });
}

module.exports = { errorMiddleware };
