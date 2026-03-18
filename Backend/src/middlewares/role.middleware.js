const { forbidden } = require('../lib/http-errors');

function requireRole(...roles) {
  return function roleMiddleware(req, _res, next) {
    if (!req.user || !roles.includes(req.user.rol)) {
      return next(forbidden());
    }

    return next();
  };
}

module.exports = { requireRole };
