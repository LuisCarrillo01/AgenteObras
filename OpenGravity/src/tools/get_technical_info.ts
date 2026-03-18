import { Tool, registerTool } from './registry.js';
import { getPgPool } from '../db/postgres.js';

export const checkTechnicianTool: Tool = {
    definition: {
        name: "check_technician",
        description: "Verifica si el usuario de Telegram está registrado como técnico autorizado en el sistema, usando su telegram_id.",
        parameters: {
            type: "object",
            properties: {
                telegram_id: {
                    type: "number",
                    description: "El ID numérico de Telegram del usuario (siempre disponible en el contexto del mensaje)"
                }
            },
            required: ["telegram_id"]
        }
    },
    handler: async (args: { telegram_id: number }) => {
        const pool = getPgPool();
        if (!pool) return { error: "Base de datos externa (PostgreSQL) no conectada." };
        
        try {
            const result = await pool.query(`
                SELECT tt.telegram_id, tt.autorizado, tt.nombre, tt.telefono,
                       t.id as tecnico_id, t.nombre as nombre_tecnico
                FROM tecnicos_telegram tt
                LEFT JOIN tecnicos t ON t.id = tt.tecnico_id
                WHERE tt.telegram_id = $1
            `, [args.telegram_id]);
            
            if (result.rows.length === 0) {
                return { isRegistered: false, message: "Usuario no encontrado en el sistema." };
            }
            
            const row = result.rows[0];
            if (!row.autorizado) {
                return { isRegistered: true, autorizado: false, message: "El usuario existe pero no está autorizado aún." };
            }
            
            return { isRegistered: true, autorizado: true, tecnico: { id: row.tecnico_id, nombre: row.nombre_tecnico, telefono: row.telefono } };
        } catch (error: any) {
            return { error: `Database error: ${error.message}` };
        }
    }
};

export const checkConstructionTool: Tool = {
    definition: {
        name: "check_construction_status",
        description: "Consulta el estado actual de una obra por palabras clave en su nombre. Devuelve la lista de pendientes abiertos y reportes recientes.",
        parameters: {
            type: "object",
            properties: {
                keyword: {
                    type: "string",
                    description: "Palabra clave o nombre de la obra (ej. 'San Miguel')"
                }
            },
            required: ["keyword"]
        }
    },
    handler: async (args: { keyword: string }) => {
        const pool = getPgPool();
        if (!pool) return { error: "Base de datos externa (PostgreSQL) no conectada." };
        
        try {
            const queryObra = await pool.query(
                "SELECT id, nombre, estado FROM obras WHERE nombre ILIKE $1 LIMIT 1",
                [`%${args.keyword}%`]
            );
            if (queryObra.rows.length === 0) {
                return { error: "Obra no encontrada coincidente con: " + args.keyword };
            }
            
            const obraInfo = queryObra.rows[0];
            
            const queryPendientes = await pool.query(`
                SELECT descripcion, creado_en 
                FROM pendientes 
                WHERE obra_id = $1 AND estado = 'pendiente'
                ORDER BY creado_en ASC
            `, [obraInfo.id]);
            
            const queryReportes = await pool.query(`
                SELECT t.nombre, r.mensaje_original, r.fecha
                FROM reportes r
                JOIN tecnicos t ON r.tecnico_id = t.id
                WHERE r.obra_id = $1
                ORDER BY r.fecha DESC
                LIMIT 5
            `, [obraInfo.id]);
            
            return {
                obra: obraInfo,
                pendientes_abiertos: queryPendientes.rows,
                ultimos_reportes: queryReportes.rows
            };
        } catch (error: any) {
            return { error: `Database error: ${error.message}` };
        }
    }
};

registerTool(checkTechnicianTool);
registerTool(checkConstructionTool);
