const { z } = require('zod');

const usuarioRoles = ['admin', 'encargado'];

const createUsuarioSchema = z.object({
  nombre: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  rol: z.enum(usuarioRoles).default('encargado')
});

const updateUsuarioSchema = z.object({
  nombre: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  rol: z.enum(usuarioRoles).optional(),
  activo: z.boolean().optional()
}).refine((value) => Object.keys(value).length > 0, {
  message: 'Debes enviar al menos un campo para actualizar'
});

module.exports = {
  createUsuarioSchema,
  updateUsuarioSchema
};
