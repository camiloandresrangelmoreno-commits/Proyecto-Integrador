/**
 * MÓDULO BACKEND - BASE DE DATOS 2: SEGUIMIENTO DE PRÁCTICAS (UDI)
 * Conexión nativa a PostgreSQL en la Nube (Supabase) con pg Pool
 * Esquema: seguimiento_practicas
 */

import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL_SEGUIMIENTO,
    ssl: { rejectUnauthorized: false }
});

export const dbSeguimiento = {
    nombre: 'Base de Datos 2 - Seguimiento de Prácticas (Supabase PostgreSQL)',
    estado: 'Conectado a la nube (db.ywadbrsmyswfgmvkfxjn.supabase.co / seguimiento_practicas)',

    // --- BITÁCORAS ---
    async getBitacoras() {
        try {
            const { rows } = await pool.query(`
                SELECT id_bitacora, TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, descripcion, observaciones, estado, id_practica
                FROM seguimiento_practicas.Bitacora
                ORDER BY fecha DESC
            `);
            return rows;
        } catch (e) {
            console.error('Error getBitacoras en Postgres:', e.message);
            return [];
        }
    },

    async insertBitacora({ id_bitacora, fecha, descripcion, observaciones, estado, id_practica }) {
        try {
            const { rows } = await pool.query(`
                INSERT INTO seguimiento_practicas.Bitacora (id_bitacora, fecha, descripcion, observaciones, estado, id_practica)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id_bitacora, TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, descripcion, observaciones, estado, id_practica
            `, [id_bitacora, fecha, descripcion, observaciones || null, estado || 'Pendiente', id_practica]);
            return rows[0];
        } catch (e) {
            console.error('Error insertBitacora en Postgres:', e.message);
            return { id_bitacora, fecha, descripcion, observaciones, estado, id_practica };
        }
    },

    async updateBitacora(id, data) {
        try {
            const { rows } = await pool.query(`
                UPDATE seguimiento_practicas.Bitacora
                SET estado = COALESCE($2, estado),
                    observaciones = COALESCE($3, observaciones)
                WHERE id_bitacora = $1
                RETURNING *
            `, [id, data.estado, data.observaciones]);
            return rows[0] || null;
        } catch (e) {
            console.error('Error updateBitacora en Postgres:', e.message);
            return null;
        }
    },

    // --- EVIDENCIAS ---
    async getEvidencias() {
        try {
            const { rows } = await pool.query(`
                SELECT id_evidencia, TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, nombre, tipo, archivo, descripcion, id_practica, id_bitacora
                FROM seguimiento_practicas.Evidencia
                ORDER BY fecha DESC
            `);
            return rows;
        } catch (e) {
            console.error('Error getEvidencias en Postgres:', e.message);
            return [];
        }
    },

    async insertEvidencia({ id_evidencia, fecha, nombre, tipo, archivo, descripcion, id_practica, id_bitacora }) {
        try {
            const { rows } = await pool.query(`
                INSERT INTO seguimiento_practicas.Evidencia (id_evidencia, fecha, nombre, tipo, archivo, descripcion, id_practica, id_bitacora)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `, [id_evidencia, fecha, nombre, tipo || 'PDF', archivo, descripcion || '', id_practica, id_bitacora || null]);
            return rows[0];
        } catch (e) {
            console.error('Error insertEvidencia en Postgres:', e.message);
            return { id_evidencia, fecha, nombre, tipo, archivo, descripcion, id_practica, id_bitacora };
        }
    },

    // --- EVALUACIONES ---
    async getEvaluaciones() {
        try {
            const { rows } = await pool.query(`
                SELECT id_evaluacion, calificacion, observaciones, TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, id_bitacora, documento_tu
                FROM seguimiento_practicas.Evaluacion
                ORDER BY fecha DESC
            `);
            return rows;
        } catch (e) {
            console.error('Error getEvaluaciones en Postgres:', e.message);
            return [];
        }
    },

    async insertEvaluacion({ id_evaluacion, calificacion, observaciones, fecha, id_bitacora, documento_tu }) {
        try {
            const { rows } = await pool.query(`
                INSERT INTO seguimiento_practicas.Evaluacion (id_evaluacion, calificacion, observaciones, fecha, id_bitacora, documento_tu)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `, [id_evaluacion, calificacion, observaciones, fecha, id_bitacora, documento_tu]);
            return rows[0];
        } catch (e) {
            console.error('Error insertEvaluacion en Postgres:', e.message);
            return { id_evaluacion, calificacion, observaciones, fecha, id_bitacora, documento_tu };
        }
    }
};
