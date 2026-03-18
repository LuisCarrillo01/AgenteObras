const { z } = require('zod');

const obraEstados = ['activa', 'pausada', 'finalizada'];

const createObraSchema = z.object({
  nombre: z.string().min(2),
  direccion: z.string().optional().nullable(),
  cliente: z.string().optional().nullable(),
  estado: z.enum(obraEstados).optional(),
  fecha_inicio: z.string().optional().nullable()
});

const updateObraSchema = z.object({
  nombre: z.string().min(2).optional(),
  direccion: z.string().optional().nullable(),
  cliente: z.string().optional().nullable(),
  estado: z.enum(obraEstados).optional(),
  fecha_inicio: z.string().optional().nullable(),
  fecha_fin: z.string().optional().nullable()
}).refine((value) => Object.keys(value).length > 0, {
  message: 'Debes enviar al menos un campo para actualizar'
});

module.exports = {
  createObraSchema,
  updateObraSchema
};
