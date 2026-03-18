const { ZodError } = require('zod');
const { badRequest } = require('../lib/http-errors');

function validate(schema, payload) {
  try {
    return schema.parse(payload);
  } catch (error) {
    if (error instanceof ZodError) {
      throw badRequest('Datos invalidos', error.flatten());
    }

    throw error;
  }
}

module.exports = { validate };
