const { z } = require('zod');

const createTecnicoSchema = z.object({
  nombre: z.string().min(2),
  telefono: z.string().min(7)
});

const updateTecnicoSchema = z.object({
  nombre: z.string().min(2).optional(),
  telefono: z.string().min(7).optional(),
  activo: z.boolean().optional()
}).refine((value) => Object.keys(value).length > 0, {
  message: 'Debes enviar al menos un campo para actualizar'
});

module.exports = {
  createTecnicoSchema,
  updateTecnicoSchema
};
