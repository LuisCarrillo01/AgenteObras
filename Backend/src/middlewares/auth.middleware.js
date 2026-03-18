const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { unauthorized } = require('../lib/http-errors');

function authMiddleware(req, _res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(unauthorized('Token no proporcionado'));
  }

  const token = authHeader.slice('Bearer '.length);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = payload;
    return next();
  } catch (_error) {
    return next(unauthorized('Token invalido o expirado'));
  }
}

module.exports = { authMiddleware };
