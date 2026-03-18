import { Tool, registerTool } from './registry.js';
import { getPgPool } from '../db/postgres.js';

export const createReportTool: Tool = {
    definition: {
        name: "create_tech_report",
        description: "Registra en la base de datos un reporte completo de trabajo incluyendo las actividades realizadas y los nuevos pendientes. Usa el telegram_id del técnico para identificarlo.",
        parameters: {
            type: "object",
            properties: {
                telegram_id: {
                    type: "number",
                    description: "El telegram_id del técnico que envía el reporte"
                },
                obra_nombre: {
                    type: "string",
                    description: "Nombre o palabra clave de la obra (ej: 'San Miguel')"
                },
                mensaje_original: {
                    type: "string",
                    description: "El texto completo y limpio de lo que el técnico comunicó"
                },
                actividades: {
                    type: "array",
                    items: { type: "string" },
                    description: "Lista de actividades realizadas extraídas del mensaje"
                },
                nuevos_pendientes: {
                    type: "array",
                    items: { type: "string" },
                    description: "Lista de pendientes detectados en el mensaje"
                }
            },
            required: ["telegram_id", "obra_nombre", "mensaje_original", "actividades"]
        }
    },
    handler: async (args: { telegram_id: number, obra_nombre: string, mensaje_original: string, actividades: string[], nuevos_pendientes?: string[] }) => {
        const pool = getPgPool();
        if (!pool) return { error: "Base de datos externa (PostgreSQL) no conectada." };
        
        let client;
        try {
            client = await pool.connect();
            await client.query('BEGIN');
            
            // 1. Resolve tecnico_id from telegram_id
            const telegramRes = await client.query(`
                SELECT tt.tecnico_id, t.nombre 
                FROM tecnicos_telegram tt
                JOIN tecnicos t ON t.id = tt.tecnico_id
                WHERE tt.telegram_id = $1 AND tt.autorizado = true
            `, [args.telegram_id]);
            
            if (telegramRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return { error: "Técnico no encontrado o no autorizado. Comparte tu número primero." };
            }
            
            const tecnico_id = telegramRes.rows[0].tecnico_id;
            const nombreTecnico = telegramRes.rows[0].nombre;
            
            // 2. Get obra ID
            const obraRes = await client.query(
                'SELECT id, nombre FROM obras WHERE nombre ILIKE $1 LIMIT 1',
                [`%${args.obra_nombre}%`]
            );
            if (obraRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return { error: `Obra no encontrada: ${args.obra_nombre}` };
            }
            const obra_id = obraRes.rows[0].id;
            const nombreObra = obraRes.rows[0].nombre;
            
            // 3. Insert the report
            const reporteRes = await client.query(
                'INSERT INTO reportes (tecnico_id, obra_id, mensaje_original) VALUES ($1, $2, $3) RETURNING id',
                [tecnico_id, obra_id, args.mensaje_original]
            );
            const reporte_id = reporteRes.rows[0].id;
            
            // 4. Insert activities
            for (const actividad of args.actividades) {
                await client.query(
                    'INSERT INTO actividades (reporte_id, descripcion) VALUES ($1, $2)',
                    [reporte_id, actividad]
                );
            }
            
            // 5. Insert pending tasks
            if (args.nuevos_pendientes && args.nuevos_pendientes.length > 0) {
                for (const pendiente of args.nuevos_pendientes) {
                    await client.query(
                        'INSERT INTO pendientes (obra_id, descripcion) VALUES ($1, $2)',
                        [obra_id, pendiente]
                    );
                }
            }
            
            await client.query('COMMIT');
            
            return {
                exito: true,
                mensaje: "Registro guardado correctamente.",
                detalles: {
                    obra: nombreObra,
                    tecnico: nombreTecnico,
                    actividades: args.actividades,
                    pendientes: args.nuevos_pendientes ?? []
                }
            };
        } catch (error: any) {
            if (client) await client.query('ROLLBACK');
            return { error: `Transaction failed: ${error.message}` };
        } finally {
            if (client) client.release();
        }
    }
};

registerTool(createReportTool);
