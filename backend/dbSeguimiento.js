/**
 * ============================================================================
 * SISTEMA INTEGRAL DE GESTIÓN DE PRÁCTICAS ACADÉMICAS (UDI)
 * MÓDULO BACKEND - DATA ACCESS OBJECT (DAO): SEGUIMIENTO DE PRÁCTICAS
 * ============================================================================
 * 
 * Esquema: seguimiento_practicas
 * Motor de Base de Datos: PostgreSQL en la nube (Supabase)
 * 
 * Este módulo gestiona las operaciones para las entidades de seguimiento:
 * - Bitacora (registro diario/semanal de actividades en aula)
 * - Evidencia (documentos, planes de clase y soportes obligatorios)
 * - Evaluacion (calificaciones oficiales emitidas por tutores académicos)
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const SUPABASE_DEFAULT_URL = 'postgresql://postgres:Integrador123%23@db.ywadbrsmyswfgmvkfxjn.supabase.co:5432/postgres';

// Pool de conexiones para el esquema de seguimiento de prácticas
const pool = new Pool({
    connectionString: process.env.DATABASE_URL_SEGUIMIENTO || SUPABASE_DEFAULT_URL,
    ssl: { rejectUnauthorized: false }
});

// Manejador defensivo contra fallos de socket en conexiones inactivas
pool.on('error', (err) => {
    console.error('Advertencia en pool de PostgreSQL (Seguimiento de Prácticas):', err.message);
});

export const dbSeguimiento = {
    nombre: 'Base de Datos 2 - Seguimiento de Prácticas (Supabase PostgreSQL)',
    estado: 'Conectado a la nube (db.ywadbrsmyswfgmvkfxjn.supabase.co / seguimiento_practicas)',

    // ========================================================================
    // GESTIÓN DE BITÁCORAS DE ACTIVIDAD
    // ========================================================================

    /**
     * Obtiene todas las bitácoras ordenadas cronológicamente (más recientes primero).
     * Normaliza el formato de fecha a YYYY-MM-DD mediante TO_CHAR de PostgreSQL.
     * 
     * @async
     * @function getBitacoras
     * @returns {Promise<Array<Object>>} Lista de bitácoras con formato de fecha normalizado.
     * @throws {Error} Si la consulta en PostgreSQL falla.
     */
    async getBitacoras() {
        try {
            const consultaSql = `
                SELECT id_bitacora, 
                       TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, 
                       descripcion, 
                       observaciones, 
                       estado, 
                       id_practica
                FROM seguimiento_practicas.Bitacora
                ORDER BY fecha DESC
            `;
            const { rows } = await pool.query(consultaSql);
            return rows;
        } catch (error) {
            console.error('Error al consultar bitácoras en PostgreSQL:', error.message);
            throw new Error(`Fallo al consultar bitácoras: ${error.message}`);
        }
    },

    /**
     * Inserta una nueva bitácora de actividad formativa (Cumple el Diagrama de Secuencia).
     * @async
     * @param {Object} datos - Atributos de la bitácora.
     * @param {string} datos.id_bitacora - Identificador único correlativo (ej: BIT-001).
     * @param {string} datos.fecha - Fecha de realización en formato YYYY-MM-DD.
     * @param {string} datos.descripcion - Descripción pedagógica detallada.
     * @param {string} [datos.observaciones] - Comentarios adicionales o del tutor.
     * @param {string} [datos.estado] - Estado inicial ('Pendiente', 'Aprobado', 'Rechazado').
     * @param {string} datos.id_practica - Código de la práctica a la que pertenece.
     * @returns {Promise<Object>} Bitácora persistida en la base de datos.
     */
    async insertBitacora({ id_bitacora, fecha, descripcion, observaciones, estado, id_practica }) {
        try {
            const insercionSql = `
                INSERT INTO seguimiento_practicas.Bitacora 
                (id_bitacora, fecha, descripcion, observaciones, estado, id_practica)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id_bitacora, TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, descripcion, observaciones, estado, id_practica
            `;
            const parametros = [
                String(id_bitacora).trim(),
                fecha || new Date().toISOString().split('T')[0],
                String(descripcion).trim(),
                observaciones ? String(observaciones).trim() : null,
                estado || 'Pendiente',
                String(id_practica).trim()
            ];
            const { rows } = await pool.query(insercionSql, parametros);
            return rows[0];
        } catch (error) {
            console.error('Error al insertar bitácora en PostgreSQL:', error.message);
            throw new Error(`Fallo al registrar bitácora: ${error.message}`);
        }
    },

    /**
     * Actualiza el estado de aprobación y observaciones pedagógicas de una bitácora.
     * @async
     * @param {string} idBitacora - Identificador único de la bitácora.
     * @param {Object} datosActualizados - Campos a modificar (estado, observaciones).
     * @returns {Promise<Object|null>} Bitácora actualizada o null si no se encontró.
     */
    async updateBitacora(idBitacora, datosActualizados) {
        try {
            const actualizacionSql = `
                UPDATE seguimiento_practicas.Bitacora
                SET estado = COALESCE($2, estado),
                    observaciones = COALESCE($3, observaciones)
                WHERE id_bitacora = $1
                RETURNING id_bitacora, TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, descripcion, observaciones, estado, id_practica
            `;
            const parametros = [
                idBitacora,
                datosActualizados.estado || null,
                datosActualizados.observaciones || null
            ];
            const { rows } = await pool.query(actualizacionSql, parametros);
            return rows[0] || null;
        } catch (error) {
            console.error(`Error al actualizar bitácora ${idBitacora}:`, error.message);
            throw new Error(`Fallo al actualizar bitácora: ${error.message}`);
        }
    },

    // ========================================================================
    // GESTIÓN DE EVIDENCIAS DIGITALES
    // ========================================================================

    /**
     * Obtiene el listado de evidencias vinculadas a las jornadas de práctica.
     * @async
     * @returns {Promise<Array<Object>>} Lista de soportes y evidencias adjuntas.
     */
    async getEvidencias() {
        try {
            const consultaSql = `
                SELECT id_evidencia, 
                       TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, 
                       nombre, 
                       tipo, 
                       archivo, 
                       descripcion, 
                       id_practica, 
                       id_bitacora
                FROM seguimiento_practicas.Evidencia
                ORDER BY fecha DESC
            `;
            const { rows } = await pool.query(consultaSql);
            return rows;
        } catch (error) {
            console.error('Error al consultar evidencias:', error.message);
            throw new Error(`Fallo al consultar evidencias: ${error.message}`);
        }
    },

    /**
     * Registra un nuevo soporte o evidencia asociado a una bitácora o práctica.
     * @async
     * @param {Object} datos - Atributos de la evidencia.
     * @returns {Promise<Object>} Evidencia almacenada con éxito.
     */
    async insertEvidencia({ id_evidencia, fecha, nombre, tipo, archivo, descripcion, id_practica, id_bitacora }) {
        try {
            const insercionSql = `
                INSERT INTO seguimiento_practicas.Evidencia 
                (id_evidencia, fecha, nombre, tipo, archivo, descripcion, id_practica, id_bitacora)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `;
            const parametros = [
                String(id_evidencia).trim(),
                fecha || new Date().toISOString().split('T')[0],
                String(nombre).trim(),
                tipo ? String(tipo).trim() : 'Documento PDF',
                String(archivo).trim(),
                descripcion ? String(descripcion).trim() : '',
                String(id_practica).trim(),
                id_bitacora ? String(id_bitacora).trim() : null
            ];
            const { rows } = await pool.query(insercionSql, parametros);
            return rows[0];
        } catch (error) {
            console.error('Error al insertar evidencia:', error.message);
            throw new Error(`Fallo al registrar evidencia: ${error.message}`);
        }
    },

    // ========================================================================
    // GESTIÓN DE EVALUACIONES OFICIALES
    // ========================================================================

    /**
     * Obtiene todas las evaluaciones emitidas por los tutores académicos.
     * @async
     * @returns {Promise<Array<Object>>} Lista de evaluaciones oficiales con notas.
     */
    async getEvaluaciones() {
        try {
            const consultaSql = `
                SELECT id_evaluacion, 
                       calificacion, 
                       observaciones, 
                       TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, 
                       id_bitacora, 
                       documento_tu
                FROM seguimiento_practicas.Evaluacion
                ORDER BY fecha DESC
            `;
            const { rows } = await pool.query(consultaSql);
            return rows;
        } catch (error) {
            console.error('Error al consultar evaluaciones:', error.message);
            throw new Error(`Fallo al consultar evaluaciones: ${error.message}`);
        }
    },

    /**
     * Registra una evaluación formal emitida por un docente asesor.
     * @async
     * @param {Object} datos - Atributos de la evaluación.
     * @param {string} datos.id_evaluacion - Código consecutivo (ej: EVAL-001).
     * @param {number|string} datos.calificacion - Nota numérica (0.0 a 5.0).
     * @param {string} datos.observaciones - Concepto pedagógico emitido.
     * @param {string} datos.fecha - Fecha oficial de la evaluación.
     * @param {string} datos.id_bitacora - Bitácora evaluada.
     * @param {string} datos.documento_tu - Documento del tutor académico que califica.
     * @returns {Promise<Object>} Registro de la evaluación generada.
     */
    async insertEvaluacion({ id_evaluacion, calificacion, observaciones, fecha, id_bitacora, documento_tu }) {
        try {
            const notaNumerica = parseFloat(calificacion);
            if (isNaN(notaNumerica) || notaNumerica < 0.0 || notaNumerica > 5.0) {
                throw new Error('La calificación debe ser un valor numérico entre 0.0 y 5.0');
            }

            const insercionSql = `
                INSERT INTO seguimiento_practicas.Evaluacion 
                (id_evaluacion, calificacion, observaciones, fecha, id_bitacora, documento_tu)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `;
            const parametros = [
                String(id_evaluacion).trim(),
                notaNumerica,
                String(observaciones).trim(),
                fecha || new Date().toISOString().split('T')[0],
                String(id_bitacora).trim(),
                String(documento_tu).trim()
            ];
            const { rows } = await pool.query(insercionSql, parametros);
            return rows[0];
        } catch (error) {
            console.error('Error al insertar evaluación en PostgreSQL:', error.message);
            throw new Error(`Fallo al registrar evaluación: ${error.message}`);
        }
    }
};
