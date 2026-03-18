const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(1, 'La password es obligatoria')
});

module.exports = { loginSchema };
