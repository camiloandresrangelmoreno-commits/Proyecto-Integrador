/**
 * MÓDULO BACKEND - BASE DE DATOS 1: GESTIÓN ACADÉMICA (UDI)
 * Conexión nativa a PostgreSQL en la Nube (Supabase) con pg Pool
 * Esquema: gestion_academica
 */

import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL_ACADEMICA,
    ssl: { rejectUnauthorized: false }
});

// Almacén en memoria como respaldo de contingencia
let memoriaEstudiantes = [];

export const dbAcademica = {
    nombre: 'Base de Datos 1 - Gestión Académica (Supabase PostgreSQL)',
    estado: 'Conectado a la nube (db.ywadbrsmyswfgmvkfxjn.supabase.co / gestion_academica)',

    // --- ESTUDIANTES ---
    async getEstudiantes() {
        try {
            const { rows } = await pool.query(`
                SELECT documento, nombre, apellido, correo, semestre, telefono 
                FROM gestion_academica.Estudiante 
                ORDER BY nombre ASC
            `);
            return rows;
        } catch (e) {
            console.error('Error getEstudiantes en PostgreSQL, usando fallback:', e.message);
            return memoriaEstudiantes;
        }
    },

    async getEstudianteByDoc(doc) {
        try {
            const { rows } = await pool.query(
                `SELECT * FROM gestion_academica.Estudiante WHERE documento = $1`,
                [doc]
            );
            return rows[0] || null;
        } catch (e) {
            return memoriaEstudiantes.find(e => e.documento === doc) || null;
        }
    },

    async insertEstudiante({ documento, nombre, apellido, correo, semestre, telefono }) {
        try {
            const { rows } = await pool.query(`
                INSERT INTO gestion_academica.Estudiante (documento, nombre, apellido, correo, semestre, telefono)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `, [documento, nombre, apellido || '', correo, parseInt(semestre) || 7, telefono || '']);
            return rows[0];
        } catch (e) {
            console.error('Error insertEstudiante en Postgres:', e.message);
            const nuevo = { documento, nombre, apellido, correo, semestre, telefono };
            memoriaEstudiantes.push(nuevo);
            return nuevo;
        }
    },

    async updateEstudiante(doc, data) {
        try {
            const { rows } = await pool.query(`
                UPDATE gestion_academica.Estudiante 
                SET nombre = COALESCE($2, nombre),
                    apellido = COALESCE($3, apellido),
                    correo = COALESCE($4, correo),
                    semestre = COALESCE($5, semestre),
                    telefono = COALESCE($6, telefono)
                WHERE documento = $1
                RETURNING *
            `, [doc, data.nombre, data.apellido, data.correo, data.semestre, data.telefono]);
            return rows[0] || null;
        } catch (e) {
            console.error('Error updateEstudiante en Postgres:', e.message);
            return null;
        }
    },

    async deleteEstudiante(doc) {
        try {
            const { rowCount } = await pool.query(
                `DELETE FROM gestion_academica.Estudiante WHERE documento = $1`,
                [doc]
            );
            return rowCount > 0;
        } catch (e) {
            console.error('Error deleteEstudiante en Postgres:', e.message);
            return false;
        }
    },

    // --- TUTORES ACADÉMICOS ---
    async getTutores() {
        try {
            const { rows } = await pool.query(`
                SELECT documento_tu, nombre, apellido, correo, especialidad, telefono
                FROM gestion_academica.Tutor_Academico
                ORDER BY nombre ASC
            `);
            return rows;
        } catch (e) {
            return [];
        }
    },

    async insertTutor({ documento_tu, nombre, apellido, correo, especialidad, telefono }) {
        const { rows } = await pool.query(`
            INSERT INTO gestion_academica.Tutor_Academico (documento_tu, nombre, apellido, correo, especialidad, telefono)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [documento_tu, nombre, apellido || '', correo, especialidad || 'Pedagogía', telefono || '']);
        return rows[0];
    },

    // --- INSTITUCIONES ---
    async getInstituciones() {
        try {
            const { rows } = await pool.query(`
                SELECT id_institucion, nombre, direccion, ciudad, telefono
                FROM gestion_academica.Institucion
                ORDER BY nombre ASC
            `);
            return rows;
        } catch (e) {
            return [];
        }
    },

    async insertInstitucion({ id_institucion, nombre, direccion, ciudad, telefono }) {
        const { rows } = await pool.query(`
            INSERT INTO gestion_academica.Institucion (id_institucion, nombre, direccion, ciudad, telefono)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [id_institucion, nombre, direccion, ciudad || 'Bucaramanga', telefono || '']);
        return rows[0];
    },

    // --- TIPOS DE PRÁCTICA ---
    async getTiposPractica() {
        try {
            const { rows } = await pool.query(`
                SELECT id_tipo, nombre, descripcion
                FROM gestion_academica.Tipo_Practica
                ORDER BY id_tipo ASC
            `);
            return rows;
        } catch (e) {
            return [];
        }
    },

    // --- PRÁCTICAS ---
    async getPracticas() {
        try {
            const { rows } = await pool.query(`
                SELECT p.id_practica, p.fecha_ini, p.fecha_fin, p.horas_cumplidas, p.estado, p.nombre_prac,
                       p.documento, p.documento_tu, p.id_institucion, p.id_tipo,
                       e.nombre AS estudiante_nombre, e.apellido AS estudiante_apellido,
                       t.nombre AS tutor_nombre, t.apellido AS tutor_apellido,
                       i.nombre AS institucion_nombre,
                       tp.nombre AS tipo_nombre
                FROM gestion_academica.Practica p
                LEFT JOIN gestion_academica.Estudiante e ON p.documento = e.documento
                LEFT JOIN gestion_academica.Tutor_Academico t ON p.documento_tu = t.documento_tu
                LEFT JOIN gestion_academica.Institucion i ON p.id_institucion = i.id_institucion
                LEFT JOIN gestion_academica.Tipo_Practica tp ON p.id_tipo = tp.id_tipo
                ORDER BY p.id_practica ASC
            `);
            return rows;
        } catch (e) {
            return [];
        }
    },

    async insertPractica(data) {
        const { rows } = await pool.query(`
            INSERT INTO gestion_academica.Practica 
            (id_practica, fecha_ini, fecha_fin, horas_cumplidas, estado, nombre_prac, documento, documento_tu, id_institucion, id_tipo)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [
            data.id_practica,
            data.fecha_ini || '2026-02-01',
            data.fecha_fin || '2026-06-15',
            data.horas_cumplidas || 0,
            data.estado || 'En Curso',
            data.nombre_prac || 'Práctica Pedagógica',
            data.documento,
            data.documento_tu,
            data.id_institucion,
            data.id_tipo
        ]);
        return rows[0];
    }
};
