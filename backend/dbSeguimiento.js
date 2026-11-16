/**
 * ============================================================================
 * SOFTWARE PARA LA GESTIÓN Y SEGUIMIENTO DE PRÁCTICAS ACADÉMICAS (UDI)
 * MICROSERVICIO 2 - CAPA DE ACCESO A DATOS (DAO): SEGUIMIENTO DE PRÁCTICAS
 * ============================================================================
 *
 * Esquema PostgreSQL: seguimiento_practicas
 * Entidades administradas:
 *  - Bitacora    (registro cronológico de actividades; referenciado por id_practica)
 *  - Evidencia   (documentos y soportes adjuntos vinculados a id_practica / id_bitacora)
 *  - Evaluacion  (calificaciones formales emitidas por documento_tu)
 *
 * Comunicación inter-servicios:
 *  Este módulo opera de forma estrictamente desacoplada del esquema gestion_academica.
 *  Toda correlación con estudiantes, tutores o prácticas se realiza mediante los
 *  identificadores de referencia `id_practica` y `documento_tu` vía API REST.
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RUTA_RESPALDO_SEGUIMIENTO = path.join(__dirname, 'local_seguimiento.json');

/**
 * Cadena de conexión por defecto al Pooler IPv4 de Supabase.
 * Puede ser sobreescrita mediante la variable de entorno DATABASE_URL_SEGUIMIENTO.
 */
const SUPABASE_DEFAULT_URL = 'postgresql://postgres.ywadbrsmyswfgmvkfxjn:Integrador123%23@aws-0-us-east-1.pooler.supabase.com:5432/postgres';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL_SEGUIMIENTO || SUPABASE_DEFAULT_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
});

pool.on('error', (err) => {
    console.error('[Seguimiento Prácticas] Error en pool PostgreSQL:', err.message);
});

/**
 * Determina si una excepción proviene de indisponibilidad de red con PostgreSQL.
 * @param {Error} err - Excepción de PostgreSQL.
 * @returns {boolean} Verdadero si es fallo de conexión.
 */
function esErrorDeConexion(err) {
    if (!err) return false;
    const codigo = String(err.code || '').toUpperCase();
    const msg = String(err.message || '').toLowerCase();
    const codigosRed = ['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'EHOSTUNREACH', 'ECONNRESET', 'EAI_AGAIN', '08001', '08006', '57P01', '57P02', '57P03'];
    if (codigosRed.includes(codigo)) return true;
    return /tenant or user not found|connection terminated|timeout|could not connect|getaddrinfo/i.test(msg);
}

/**
 * Semilla inicial para respaldo local cuando PostgreSQL en Supabase no responde.
 * @returns {Object} Estructura inicial del esquema seguimiento_practicas.
 */
function crearSemillaSeguimiento() {
    return {
        Bitacora: [
            { id_bitacora: 'BIT-001', fecha: '2026-03-05', descripcion: 'Diagnóstico de lectura y escritura en grado 4°A. Aplicación de prueba diagnóstica y rúbrica.', observaciones: 'Aprobado satisfactoriamente por el tutor.', estado: 'Aprobado', horas: 4, id_practica: 'PRAC-001' },
            { id_bitacora: 'BIT-002', fecha: '2026-03-12', descripcion: 'Diseño e implementación de taller de comprensión lectora mediante cuentos interactivos.', observaciones: 'Excelente interacción pedagógica.', estado: 'Aprobado', horas: 5, id_practica: 'PRAC-001' },
            { id_bitacora: 'BIT-003', fecha: '2026-03-19', descripcion: 'Acompañamiento pedagógico en aula regular y refuerzo a estudiantes.', observaciones: 'Revisión en proceso.', estado: 'Pendiente', horas: 4, id_practica: 'PRAC-001' },
            { id_bitacora: 'BIT-004', fecha: '2026-03-10', descripcion: 'Observación participante en clase de Ciencias Sociales y plan de clase integrado.', observaciones: 'Plan de clase validado.', estado: 'Aprobado', horas: 6, id_practica: 'PRAC-002' },
            { id_bitacora: 'BIT-005', fecha: '2026-03-18', descripcion: 'Diseño de rúbrica de evaluación formativa y taller de geografía interactiva.', observaciones: 'Buena retroalimentación grupal.', estado: 'Aprobado', horas: 5, id_practica: 'PRAC-002' },
            { id_bitacora: 'BIT-006', fecha: '2026-03-08', descripcion: 'Diagnóstico situacional del aula de inclusión bajo modelo DUA.', observaciones: 'Aprobado.', estado: 'Aprobado', horas: 5, id_practica: 'PRAC-003' },
            { id_bitacora: 'BIT-007', fecha: '2026-03-16', descripcion: 'Implementación de material manipulativo para estimulación sensoriomotora.', observaciones: 'Aprobado.', estado: 'Aprobado', horas: 5, id_practica: 'PRAC-003' },
            { id_bitacora: 'BIT-008', fecha: '2026-03-14', descripcion: 'Observación guiada en aula y registro etnográfico de convivencia escolar.', observaciones: 'Aprobado.', estado: 'Aprobado', horas: 4, id_practica: 'PRAC-004' },
            { id_bitacora: 'BIT-009', fecha: '2026-03-21', descripcion: 'Apoyo en organización de rincones de lectura y actividades lúdicas.', observaciones: null, estado: 'Pendiente', horas: 4, id_practica: 'PRAC-004' }
        ],
        Evidencia: [
            { id_evidencia: 'EVI-001', fecha: '2026-03-05', nombre: 'Evidencia_BIT-001', tipo: 'Documento PDF', archivo: 'https://drive.google.com/file/d/diagnostico-grado-4a.pdf', descripcion: 'Soporte de 4 horas de práctica', id_practica: 'PRAC-001', id_bitacora: 'BIT-001' },
            { id_evidencia: 'EVI-002', fecha: '2026-03-12', nombre: 'Evidencia_BIT-002', tipo: 'Documento PDF', archivo: 'https://drive.google.com/file/d/taller-comprension-lectora.pdf', descripcion: 'Soporte de 5 horas de práctica', id_practica: 'PRAC-001', id_bitacora: 'BIT-002' },
            { id_evidencia: 'EVI-003', fecha: '2026-03-19', nombre: 'Evidencia_BIT-003', tipo: 'Documento PDF', archivo: 'https://drive.google.com/file/d/registro-acompanamiento-semana3.pdf', descripcion: 'Soporte de 4 horas de práctica', id_practica: 'PRAC-001', id_bitacora: 'BIT-003' },
            { id_evidencia: 'EVI-004', fecha: '2026-03-10', nombre: 'Evidencia_BIT-004', tipo: 'Documento PDF', archivo: 'https://drive.google.com/file/d/plan-clase-sociales-evidencia.pdf', descripcion: 'Soporte de 6 horas de práctica', id_practica: 'PRAC-002', id_bitacora: 'BIT-004' },
            { id_evidencia: 'EVI-005', fecha: '2026-03-18', nombre: 'Evidencia_BIT-005', tipo: 'Documento PDF', archivo: 'https://drive.google.com/file/d/rubrica-geografia-interactiva.pdf', descripcion: 'Soporte de 5 horas de práctica', id_practica: 'PRAC-002', id_bitacora: 'BIT-005' },
            { id_evidencia: 'EVI-006', fecha: '2026-03-08', nombre: 'Evidencia_BIT-006', tipo: 'Documento PDF', archivo: 'https://drive.google.com/file/d/diagnostico-aula-inclusion-damaso.pdf', descripcion: 'Soporte de 5 horas de práctica', id_practica: 'PRAC-003', id_bitacora: 'BIT-006' },
            { id_evidencia: 'EVI-007', fecha: '2026-03-16', nombre: 'Evidencia_BIT-007', tipo: 'Documento PDF', archivo: 'https://drive.google.com/file/d/guia-material-manipulativo.pdf', descripcion: 'Soporte de 5 horas de práctica', id_practica: 'PRAC-003', id_bitacora: 'BIT-007' },
            { id_evidencia: 'EVI-008', fecha: '2026-03-14', nombre: 'Evidencia_BIT-008', tipo: 'Documento PDF', archivo: 'https://drive.google.com/file/d/diario-campo-observacion-santander.pdf', descripcion: 'Soporte de 4 horas de práctica', id_practica: 'PRAC-004', id_bitacora: 'BIT-008' },
            { id_evidencia: 'EVI-009', fecha: '2026-03-21', nombre: 'Evidencia_BIT-009', tipo: 'Documento PDF', archivo: 'https://drive.google.com/file/d/registro-rincones-lectura.pdf', descripcion: 'Soporte de 4 horas de práctica', id_practica: 'PRAC-004', id_bitacora: 'BIT-009' }
        ],
        Evaluacion: [
            { id_evaluacion: 'EVAL-001', calificacion: 4.8, observaciones: 'Excelente pertinencia en el diseño de los instrumentos y sólida fundamentación pedagógica.', fecha: '2026-03-15', id_bitacora: 'BIT-001', id_practica: 'PRAC-001', documento_tu: 'DOC-1098234' },
            { id_evaluacion: 'EVAL-002', calificacion: 4.7, observaciones: 'Excelente iniciativa en la formulación de secuencias didácticas de ciencias sociales.', fecha: '2026-03-20', id_bitacora: 'BIT-004', id_practica: 'PRAC-002', documento_tu: 'DOC-1098234' },
            { id_evaluacion: 'EVAL-003', calificacion: 4.9, observaciones: 'Compromiso ejemplar con los estudiantes de inclusión y gran sensibilidad pedagógica.', fecha: '2026-03-22', id_bitacora: 'BIT-006', id_practica: 'PRAC-003', documento_tu: 'DOC-1098567' },
            { id_evaluacion: 'EVAL-004', calificacion: 4.6, observaciones: 'Muy buena capacidad de observación e identificación de necesidades socioeducativas en aula.', fecha: '2026-03-25', id_bitacora: 'BIT-008', id_practica: 'PRAC-004', documento_tu: 'DOC-1098567' }
        ]
    };
}

/**
 * Lee el respaldo local del esquema seguimiento_practicas desde disco.
 * @returns {Object} Colecciones locales de bitácoras, evidencias y evaluaciones.
 */
function leerRespaldoSeguimiento() {
    try {
        if (fs.existsSync(RUTA_RESPALDO_SEGUIMIENTO)) {
            return JSON.parse(fs.readFileSync(RUTA_RESPALDO_SEGUIMIENTO, 'utf-8'));
        }
    } catch (_) {}
    const semilla = crearSemillaSeguimiento();
    guardarRespaldoSeguimiento(semilla);
    return semilla;
}

/**
 * Persiste en disco el respaldo local del esquema seguimiento_practicas.
 * @param {Object} datos - Datos actualizados del microservicio de seguimiento.
 */
function guardarRespaldoSeguimiento(datos) {
    try {
        fs.writeFileSync(RUTA_RESPALDO_SEGUIMIENTO, JSON.stringify(datos, null, 2), 'utf-8');
    } catch (err) {
        console.error('[Seguimiento Prácticas] Error al guardar respaldo local:', err.message);
    }
}

let esquemaSeguimientoInicializado = false;

export const dbSeguimiento = {
    nombre: 'Microservicio 2 - Seguimiento de Prácticas (seguimiento_practicas)',
    estado: 'PostgreSQL Supabase (Sincronización directa en la nube)',

    /**
     * Inicializa y actualiza automáticamente en Supabase las tablas y columnas
     * requeridas del esquema `seguimiento_practicas`.
     * @async
     * @returns {Promise<{ok: boolean, mensaje: string}>} Resultado de la verificación DDL.
     */
    async inicializarEsquema() {
        if (esquemaSeguimientoInicializado) return { ok: true, mensaje: 'Esquema de seguimiento ya inicializado.' };
        try {
            await pool.query(`CREATE SCHEMA IF NOT EXISTS seguimiento_practicas;`);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS seguimiento_practicas.Bitacora (
                    id_bitacora VARCHAR(20) PRIMARY KEY,
                    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
                    descripcion TEXT NOT NULL,
                    observaciones TEXT,
                    estado VARCHAR(50) DEFAULT 'Pendiente',
                    horas INT DEFAULT 4,
                    id_practica VARCHAR(20) NOT NULL
                );
                ALTER TABLE IF EXISTS seguimiento_practicas.Bitacora ADD COLUMN IF NOT EXISTS horas INT DEFAULT 4;
                CREATE INDEX IF NOT EXISTS idx_bitacora_id_practica ON seguimiento_practicas.Bitacora(id_practica);
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS seguimiento_practicas.Evidencia (
                    id_evidencia VARCHAR(20) PRIMARY KEY,
                    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
                    nombre VARCHAR(150) NOT NULL,
                    tipo VARCHAR(50) DEFAULT 'Documento PDF',
                    archivo VARCHAR(255) NOT NULL,
                    descripcion TEXT,
                    id_practica VARCHAR(20) NOT NULL,
                    id_bitacora VARCHAR(20) REFERENCES seguimiento_practicas.Bitacora(id_bitacora) ON DELETE SET NULL
                );
                CREATE INDEX IF NOT EXISTS idx_evidencia_id_practica ON seguimiento_practicas.Evidencia(id_practica);
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS seguimiento_practicas.Evaluacion (
                    id_evaluacion VARCHAR(20) PRIMARY KEY,
                    calificacion NUMERIC(3,1) NOT NULL CHECK (calificacion >= 0.0 AND calificacion <= 5.0),
                    observaciones TEXT,
                    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
                    id_bitacora VARCHAR(20) REFERENCES seguimiento_practicas.Bitacora(id_bitacora) ON DELETE SET NULL,
                    id_practica VARCHAR(20),
                    documento_tu VARCHAR(20)
                );
                ALTER TABLE IF EXISTS seguimiento_practicas.Evaluacion ADD COLUMN IF NOT EXISTS id_practica VARCHAR(20);
                ALTER TABLE IF EXISTS seguimiento_practicas.Evaluacion ADD COLUMN IF NOT EXISTS documento_tu VARCHAR(20);
                ALTER TABLE IF EXISTS seguimiento_practicas.Evaluacion ALTER COLUMN documento_tu DROP NOT NULL;
                CREATE INDEX IF NOT EXISTS idx_evaluacion_documento_tu ON seguimiento_practicas.Evaluacion(documento_tu);
            `);

            const semilla = crearSemillaSeguimiento();
            const { rows: bitCount } = await pool.query(`SELECT COUNT(*)::int AS total FROM seguimiento_practicas.Bitacora`);
            if (bitCount[0].total === 0) {
                for (const b of semilla.Bitacora) {
                    await pool.query(
                        `INSERT INTO seguimiento_practicas.Bitacora (id_bitacora, fecha, descripcion, observaciones, estado, horas, id_practica)
                         VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id_bitacora) DO NOTHING`,
                        [b.id_bitacora, b.fecha, b.descripcion, b.observaciones, b.estado, b.horas, b.id_practica]
                    );
                }
            }

            const { rows: eviCount } = await pool.query(`SELECT COUNT(*)::int AS total FROM seguimiento_practicas.Evidencia`);
            if (eviCount[0].total === 0) {
                for (const ev of semilla.Evidencia) {
                    await pool.query(
                        `INSERT INTO seguimiento_practicas.Evidencia (id_evidencia, fecha, nombre, tipo, archivo, descripcion, id_practica, id_bitacora)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id_evidencia) DO NOTHING`,
                        [ev.id_evidencia, ev.fecha, ev.nombre, ev.tipo, ev.archivo, ev.descripcion, ev.id_practica, ev.id_bitacora]
                    );
                }
            }

            const { rows: evalCount } = await pool.query(`SELECT COUNT(*)::int AS total FROM seguimiento_practicas.Evaluacion`);
            if (evalCount[0].total === 0) {
                for (const ev of semilla.Evaluacion) {
                    await pool.query(
                        `INSERT INTO seguimiento_practicas.Evaluacion (id_evaluacion, calificacion, observaciones, fecha, id_bitacora, id_practica, documento_tu)
                         VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id_evaluacion) DO NOTHING`,
                        [ev.id_evaluacion, ev.calificacion, ev.observaciones, ev.fecha, ev.id_bitacora, ev.id_practica, ev.documento_tu]
                    );
                }
            }

            esquemaSeguimientoInicializado = true;
            return { ok: true, mensaje: 'Esquema seguimiento_practicas verificado y actualizado en Supabase.' };
        } catch (err) {
            return { ok: false, mensaje: err.message };
        }
    },

    /**
     * Comprueba la conectividad activa contra PostgreSQL en Supabase.
     * @async
     * @returns {Promise<{conectado: boolean, mensaje: string}>} Resultado del diagnóstico.
     */
    async verificarConexion() {
        try {
            await pool.query('SELECT 1 AS ok');
            if (!esquemaSeguimientoInicializado) {
                await this.inicializarEsquema();
            }
            return {
                conectado: true,
                mensaje: 'Conectado exitosamente a PostgreSQL en Supabase (esquema seguimiento_practicas).'
            };
        } catch (err) {
            return {
                conectado: false,
                mensaje: `PostgreSQL en la nube no disponible (${err.message}). Operando con persistencia local JSON.`
            };
        }
    },

    // ========================================================================
    // GESTIÓN DE BITÁCORAS DE ACTIVIDAD
    // ========================================================================

    /**
     * Obtiene todas las bitácoras registradas ordenadas de la más reciente a la más antigua.
     * @async
     * @returns {Promise<Array<Object>>} Arreglo de bitácoras.
     */
    async getBitacoras() {
        try {
            const { rows } = await pool.query(`
                SELECT id_bitacora,
                       TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha,
                       descripcion,
                       observaciones,
                       estado,
                       COALESCE(horas, 4) AS horas,
                       id_practica
                FROM seguimiento_practicas.Bitacora
                ORDER BY fecha DESC
            `);
            return rows;
        } catch (err) {
            if (!esErrorDeConexion(err)) throw new Error(`Error al consultar bitácoras: ${err.message}`);
            return leerRespaldoSeguimiento().Bitacora || [];
        }
    },

    /**
     * Inserta una nueva bitácora vinculada mediante `id_practica`.
     * @async
     * @param {Object} datos - Atributos de la bitácora.
     * @returns {Promise<Object>} Registro creado.
     */
    async insertBitacora({ id_bitacora, fecha, descripcion, observaciones = null, estado = 'Pendiente', horas = 4, id_practica }) {
        const registro = {
            id_bitacora: String(id_bitacora).trim(),
            fecha: fecha || new Date().toISOString().split('T')[0],
            descripcion: String(descripcion).trim(),
            observaciones: observaciones ? String(observaciones).trim() : null,
            estado: estado || 'Pendiente',
            horas: parseInt(horas, 10) || 4,
            id_practica: String(id_practica).trim()
        };
        try {
            const { rows } = await pool.query(
                `INSERT INTO seguimiento_practicas.Bitacora
                 (id_bitacora, fecha, descripcion, observaciones, estado, horas, id_practica)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING id_bitacora, TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, descripcion, observaciones, estado, horas, id_practica`,
                [registro.id_bitacora, registro.fecha, registro.descripcion, registro.observaciones, registro.estado, registro.horas, registro.id_practica]
            );
            return rows[0];
        } catch (err) {
            if (!esErrorDeConexion(err)) throw new Error(`Fallo al registrar bitácora en Supabase: ${err.message}`);
            const db = leerRespaldoSeguimiento();
            db.Bitacora.unshift(registro);
            guardarRespaldoSeguimiento(db);
            return registro;
        }
    },

    /**
     * Actualiza el estado ('Aprobado', 'Rechazado', 'Pendiente') y observaciones de una bitácora.
     * @async
     * @param {string} idBitacora - Código de la bitácora.
     * @param {Object} datosActualizados - Campos a modificar.
     * @returns {Promise<Object|null>} Bitácora actualizada o null.
     */
    async updateBitacora(idBitacora, datosActualizados) {
        const id = String(idBitacora).trim();
        const estadoFinal = datosActualizados.estado || datosActualizados.estado_aprovacion || null;
        try {
            const { rows } = await pool.query(
                `UPDATE seguimiento_practicas.Bitacora
                 SET estado = COALESCE($2, estado),
                     observaciones = COALESCE($3, observaciones)
                 WHERE id_bitacora = $1
                 RETURNING id_bitacora, TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, descripcion, observaciones, estado, COALESCE(horas, 4) AS horas, id_practica`,
                [id, estadoFinal, datosActualizados.observaciones || null]
            );
            return rows[0] || null;
        } catch (err) {
            if (!esErrorDeConexion(err)) throw new Error(`Fallo al actualizar bitácora en Supabase: ${err.message}`);
            const db = leerRespaldoSeguimiento();
            const idx = db.Bitacora.findIndex(b => b.id_bitacora === id);
            if (idx === -1) return null;
            db.Bitacora[idx] = {
                ...db.Bitacora[idx],
                ...(estadoFinal ? { estado: estadoFinal } : {}),
                ...(datosActualizados.observaciones !== undefined ? { observaciones: datosActualizados.observaciones } : {})
            };
            guardarRespaldoSeguimiento(db);
            return db.Bitacora[idx];
        }
    },

    // ========================================================================
    // GESTIÓN DE EVIDENCIAS DIGITALES
    // ========================================================================

    /**
     * Consulta todas las evidencias digitales vinculadas a las prácticas.
     * @async
     * @returns {Promise<Array<Object>>} Lista de evidencias.
     */
    async getEvidencias() {
        try {
            const { rows } = await pool.query(`
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
            `);
            return rows;
        } catch (err) {
            if (!esErrorDeConexion(err)) throw new Error(`Error al consultar evidencias: ${err.message}`);
            return leerRespaldoSeguimiento().Evidencia || [];
        }
    },

    /**
     * Registra un soporte documental asociado a una bitácora y práctica.
     * @async
     * @param {Object} datos - Atributos de la evidencia.
     * @returns {Promise<Object>} Evidencia registrada.
     */
    async insertEvidencia({ id_evidencia, fecha, nombre, tipo = 'Documento PDF', archivo, descripcion = '', id_practica, id_bitacora = null }) {
        const registro = {
            id_evidencia: String(id_evidencia).trim(),
            fecha: fecha || new Date().toISOString().split('T')[0],
            nombre: String(nombre).trim(),
            tipo: tipo ? String(tipo).trim() : 'Documento PDF',
            archivo: String(archivo).trim(),
            descripcion: descripcion ? String(descripcion).trim() : '',
            id_practica: String(id_practica).trim(),
            id_bitacora: id_bitacora ? String(id_bitacora).trim() : null
        };
        try {
            const { rows } = await pool.query(
                `INSERT INTO seguimiento_practicas.Evidencia
                 (id_evidencia, fecha, nombre, tipo, archivo, descripcion, id_practica, id_bitacora)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING *`,
                [registro.id_evidencia, registro.fecha, registro.nombre, registro.tipo, registro.archivo, registro.descripcion, registro.id_practica, registro.id_bitacora]
            );
            return rows[0];
        } catch (err) {
            if (!esErrorDeConexion(err)) throw new Error(`Fallo al registrar evidencia en Supabase: ${err.message}`);
            const db = leerRespaldoSeguimiento();
            db.Evidencia.unshift(registro);
            guardarRespaldoSeguimiento(db);
            return registro;
        }
    },

    // ========================================================================
    // GESTIÓN DE EVALUACIONES OFICIALES
    // ========================================================================

    /**
     * Obtiene todas las evaluaciones emitidas por tutores académicos.
     * @async
     * @returns {Promise<Array<Object>>} Lista de evaluaciones.
     */
    async getEvaluaciones() {
        try {
            const { rows } = await pool.query(`
                SELECT e.id_evaluacion,
                       e.calificacion,
                       e.observaciones,
                       TO_CHAR(e.fecha, 'YYYY-MM-DD') AS fecha,
                       e.id_bitacora,
                       COALESCE(e.id_practica, b.id_practica) AS id_practica,
                       e.documento_tu
                FROM seguimiento_practicas.Evaluacion e
                LEFT JOIN seguimiento_practicas.Bitacora b ON e.id_bitacora = b.id_bitacora
                ORDER BY e.fecha DESC
            `);
            return rows;
        } catch (err) {
            if (!esErrorDeConexion(err)) throw new Error(`Error al consultar evaluaciones: ${err.message}`);
            return leerRespaldoSeguimiento().Evaluacion || [];
        }
    },

    /**
     * Registra una evaluación oficial emitida por un tutor académico (`documento_tu`).
     * @async
     * @param {Object} datos - Atributos de la evaluación (calificación 0.0 a 5.0).
     * @returns {Promise<Object>} Evaluación registrada.
     */
    async insertEvaluacion({ id_evaluacion, calificacion, observaciones, fecha, fecha_evaluacion, id_bitacora, id_practica, documento_tu, documento }) {
        const notaNumerica = parseFloat(calificacion);
        if (Number.isNaN(notaNumerica) || notaNumerica < 0.0 || notaNumerica > 5.0) {
            throw new Error('La calificación debe ser un valor numérico entre 0.0 y 5.0.');
        }

        let bitacoraDestino = id_bitacora ? String(id_bitacora).trim() : null;
        if (!bitacoraDestino && id_practica) {
            const bitacoras = await this.getBitacoras();
            const encontrada = bitacoras.find(b => b.id_practica === id_practica) || bitacoras[0];
            bitacoraDestino = encontrada ? encontrada.id_bitacora : null;
        }

        const registro = {
            id_evaluacion: String(id_evaluacion || `EVAL-${Date.now().toString().slice(-4)}`).trim(),
            calificacion: notaNumerica,
            observaciones: String(observaciones || '').trim(),
            fecha: fecha || fecha_evaluacion || new Date().toISOString().split('T')[0],
            id_bitacora: bitacoraDestino,
            id_practica: id_practica || null,
            documento_tu: String(documento_tu || documento || 'DOC-1098234').trim()
        };

        try {
            const { rows } = await pool.query(
                `INSERT INTO seguimiento_practicas.Evaluacion
                 (id_evaluacion, calificacion, observaciones, fecha, id_bitacora, id_practica, documento_tu)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING id_evaluacion, calificacion, observaciones, TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, id_bitacora, id_practica, documento_tu`,
                [registro.id_evaluacion, registro.calificacion, registro.observaciones, registro.fecha, registro.id_bitacora, registro.id_practica, registro.documento_tu]
            );
            return rows[0];
        } catch (err) {
            if (!esErrorDeConexion(err)) throw new Error(`Fallo al registrar evaluación en Supabase: ${err.message}`);
            const db = leerRespaldoSeguimiento();
            db.Evaluacion.unshift(registro);
            guardarRespaldoSeguimiento(db);
            return registro;
        }
    },

    /**
     * Elimina en cascada evidencias, evaluaciones y bitácoras asociadas a una práctica
     * dentro del esquema `seguimiento_practicas` antes de borrar la práctica principal.
     * @async
     * @param {string} idPractica - Identificador de la práctica eliminada.
     * @returns {Promise<{evidencias: number, evaluaciones: number, bitacoras: number}>} Conteo eliminado.
     */
    async deleteByPractica(idPractica) {
        const id = String(idPractica || '').trim();
        if (!id) return { evidencias: 0, evaluaciones: 0, bitacoras: 0 };
        try {
            const resEvi = await pool.query(
                `DELETE FROM seguimiento_practicas.Evidencia
                 WHERE LOWER(id_practica) = LOWER($1)
                    OR id_bitacora IN (
                        SELECT id_bitacora FROM seguimiento_practicas.Bitacora WHERE LOWER(id_practica) = LOWER($1)
                    )`,
                [id]
            );
            const resEval = await pool.query(
                `DELETE FROM seguimiento_practicas.Evaluacion
                 WHERE LOWER(id_practica) = LOWER($1)
                    OR id_bitacora IN (
                        SELECT id_bitacora FROM seguimiento_practicas.Bitacora WHERE LOWER(id_practica) = LOWER($1)
                    )`,
                [id]
            );
            const resBit = await pool.query(
                `DELETE FROM seguimiento_practicas.Bitacora WHERE LOWER(id_practica) = LOWER($1)`,
                [id]
            );
            return {
                evidencias: resEvi.rowCount || 0,
                evaluaciones: resEval.rowCount || 0,
                bitacoras: resBit.rowCount || 0
            };
        } catch (err) {
            if (!esErrorDeConexion(err)) throw new Error(`Fallo al limpiar seguimiento de práctica en Supabase: ${err.message}`);
            const db = leerRespaldoSeguimiento();
            const idLow = id.toLowerCase();
            const bitIds = new Set(
                (db.Bitacora || [])
                    .filter(b => String(b.id_practica || '').trim().toLowerCase() === idLow)
                    .map(b => b.id_bitacora)
            );
            const origEvi = (db.Evidencia || []).length;
            const origEval = (db.Evaluacion || []).length;
            const origBit = (db.Bitacora || []).length;
            db.Evidencia = (db.Evidencia || []).filter(e =>
                String(e.id_practica || '').trim().toLowerCase() !== idLow && !bitIds.has(e.id_bitacora)
            );
            db.Evaluacion = (db.Evaluacion || []).filter(e =>
                String(e.id_practica || '').trim().toLowerCase() !== idLow && !bitIds.has(e.id_bitacora)
            );
            db.Bitacora = (db.Bitacora || []).filter(b =>
                String(b.id_practica || '').trim().toLowerCase() !== idLow
            );
            guardarRespaldoSeguimiento(db);
            return {
                evidencias: origEvi - db.Evidencia.length,
                evaluaciones: origEval - db.Evaluacion.length,
                bitacoras: origBit - db.Bitacora.length
            };
        }
    },

    /**
     * Desvincula el documento de un tutor académico en las evaluaciones registradas
     * antes de eliminar al docente asesor.
     * @async
     * @param {string} documentoTu - Documento del tutor académico.
     * @returns {Promise<number>} Cantidad de evaluaciones desvinculadas.
     */
    async unlinkTutor(documentoTu) {
        const doc = String(documentoTu || '').trim();
        if (!doc) return 0;
        try {
            const { rowCount } = await pool.query(
                `UPDATE seguimiento_practicas.Evaluacion
                 SET documento_tu = NULL
                 WHERE LOWER(documento_tu) = LOWER($1)`,
                [doc]
            );
            return rowCount || 0;
        } catch (err) {
            if (!esErrorDeConexion(err)) throw new Error(`Fallo al desvincular tutor en evaluaciones: ${err.message}`);
            const db = leerRespaldoSeguimiento();
            let count = 0;
            db.Evaluacion = (db.Evaluacion || []).map(e => {
                if (String(e.documento_tu || '').trim().toLowerCase() === doc.toLowerCase()) {
                    count++;
                    return { ...e, documento_tu: null };
                }
                return e;
            });
            if (count > 0) guardarRespaldoSeguimiento(db);
            return count;
        }
    }
};
