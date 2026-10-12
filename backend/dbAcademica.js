/**
 * ============================================================================
 * SISTEMA INTEGRAL DE GESTIÓN DE PRÁCTICAS ACADÉMICAS (UDI)
 * MÓDULO BACKEND - DATA ACCESS OBJECT (DAO): GESTIÓN ACADÉMICA
 * ============================================================================
 * 
 * Esquema: gestion_academica
 * Motor de Base de Datos: PostgreSQL en la nube (Supabase)
 * 
 * Este módulo gestiona las operaciones CRUD para las entidades maestras:
 * - Estudiante (alumnos matriculados en prácticas)
 * - Tutor_Academico (docentes asesores de práctica)
 * - Institucion (colegios y centros receptores)
 * - Tipo_Practica (niveles y modalidades de práctica)
 * - Practica (entidad relacional central del proceso)
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const SUPABASE_DEFAULT_URL = 'postgresql://postgres:Integrador123%23@db.ywadbrsmyswfgmvkfxjn.supabase.co:5432/postgres';

/// Pool de conexiones reutilizables con soporte SSL obligatorio para Supabase
const pool = new Pool({
    connectionString: process.env.DATABASE_URL_ACADEMICA || SUPABASE_DEFAULT_URL,
    ssl: { rejectUnauthorized: false }
});

// Manejador defensivo contra caídas imprevistas de conexiones inactivas en el pool
pool.on('error', (err) => {
    console.error('Advertencia en pool de PostgreSQL (Gestión Académica):', err.message);
});

export const dbAcademica = {
    nombre: 'Base de Datos 1 - Gestión Académica (Supabase PostgreSQL)',
    estado: 'Conectado a la nube (db.ywadbrsmyswfgmvkfxjn.supabase.co / gestion_academica)',

    // ========================================================================
    // GESTIÓN DE ESTUDIANTES
    // ========================================================================

    /**
     * Consulta y retorna el listado completo de estudiantes registrados en la base de datos.
     * Ordena los resultados alfabéticamente por nombre para facilitar la visualización directiva.
     * 
     * @async
     * @function getEstudiantes
     * @returns {Promise<Array<Object>>} Arreglo con los registros de estudiantes (documento, nombre, apellido, correo, semestre, telefono).
     * @throws {Error} Si ocurre un fallo de red o sintaxis en el motor PostgreSQL.
     */
    async getEstudiantes() {
        try {
            const consultaSql = `
                SELECT documento, nombre, apellido, correo, semestre, telefono 
                FROM gestion_academica.Estudiante 
                ORDER BY nombre ASC
            `;
            const { rows } = await pool.query(consultaSql);
            return rows;
        } catch (error) {
            console.error('Error al consultar estudiantes en PostgreSQL:', error.message);
            throw new Error(`Fallo al consultar estudiantes: ${error.message}`);
        }
    },

    /**
     * Busca un estudiante específico a partir de su documento único de identidad.
     * 
     * @async
     * @function getEstudianteByDoc
     * @param {string} documento - Documento de identidad (cédula o tarjeta de identidad) del estudiante.
     * @returns {Promise<Object|null>} Objeto con los datos del estudiante o null si no existe coincidencia.
     * @throws {Error} Si la consulta falla en la base de datos.
     */
    async getEstudianteByDoc(documento) {
        try {
            const consultaSql = `
                SELECT documento, nombre, apellido, correo, semestre, telefono 
                FROM gestion_academica.Estudiante 
                WHERE documento = $1
            `;
            const { rows } = await pool.query(consultaSql, [documento]);
            return rows[0] || null;
        } catch (error) {
            console.error(`Error al consultar estudiante con documento ${documento}:`, error.message);
            throw new Error(`Fallo al buscar estudiante: ${error.message}`);
        }
    },

    /**
     * Registra un nuevo estudiante en el esquema de gestión académica.
     * Sanea y normaliza los parámetros de entrada (trim, lowercase en correos y parseo numérico).
     * 
     * @async
     * @function insertEstudiante
     * @param {Object} datos - Objeto contenedor de los atributos del estudiante.
     * @param {string} datos.documento - Número de documento único del alumno.
     * @param {string} datos.nombre - Nombres completos del alumno.
     * @param {string} [datos.apellido] - Apellidos del alumno (opcional).
     * @param {string} datos.correo - Correo institucional UDI.
     * @param {number|string} datos.semestre - Semestre académico matriculado (1 - 10).
     * @param {string} [datos.telefono] - Teléfono de contacto (opcional).
     * @returns {Promise<Object>} Registro del estudiante recién creado y persistido.
     * @throws {Error} Si el documento ya existe o la restricción de integridad es violada.
     */
    async insertEstudiante({ documento, nombre, apellido, correo, semestre, telefono }) {
        try {
            const insercionSql = `
                INSERT INTO gestion_academica.Estudiante 
                (documento, nombre, apellido, correo, semestre, telefono)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `;
            const parametros = [
                String(documento).trim(),
                String(nombre).trim(),
                apellido ? String(apellido).trim() : '',
                String(correo).trim().toLowerCase(),
                parseInt(semestre, 10) || 7,
                telefono ? String(telefono).trim() : ''
            ];
            const { rows } = await pool.query(insercionSql, parametros);
            return rows[0];
        } catch (error) {
            console.error('Error al insertar estudiante en PostgreSQL:', error.message);
            throw new Error(`Fallo al registrar estudiante: ${error.message}`);
        }
    },

    /**
     * Actualiza la información de un estudiante existente, empleando la función COALESCE
     * de SQL para preservar los datos previos de los campos no provistos en la solicitud.
     * 
     * @async
     * @function updateEstudiante
     * @param {string} documento - Documento del estudiante que se desea modificar.
     * @param {Object} datosActualizados - Conjunto de campos que serán modificados.
     * @returns {Promise<Object|null>} Objeto actualizado o null si el documento no fue encontrado.
     * @throws {Error} Si ocurre un error de restricción durante la actualización.
     */
    async updateEstudiante(documento, datosActualizados) {
        try {
            const actualizacionSql = `
                UPDATE gestion_academica.Estudiante 
                SET nombre = COALESCE($2, nombre),
                    apellido = COALESCE($3, apellido),
                    correo = COALESCE($4, correo),
                    semestre = COALESCE($5, semestre),
                    telefono = COALESCE($6, telefono)
                WHERE documento = $1
                RETURNING *
            `;
            const parametros = [
                documento,
                datosActualizados.nombre ? String(datosActualizados.nombre).trim() : null,
                datosActualizados.apellido ? String(datosActualizados.apellido).trim() : null,
                datosActualizados.correo ? String(datosActualizados.correo).trim().toLowerCase() : null,
                datosActualizados.semestre ? parseInt(datosActualizados.semestre, 10) : null,
                datosActualizados.telefono ? String(datosActualizados.telefono).trim() : null
            ];
            const { rows } = await pool.query(actualizacionSql, parametros);
            return rows[0] || null;
        } catch (error) {
            console.error(`Error al actualizar estudiante ${documento}:`, error.message);
            throw new Error(`Fallo al actualizar estudiante: ${error.message}`);
        }
    },

    /**
     * Elimina a un estudiante de la base de datos a partir de su documento único.
     * 
     * @async
     * @function deleteEstudiante
     * @param {string} documento - Documento de identidad del estudiante a eliminar.
     * @returns {Promise<boolean>} Retorna true si el registro fue eliminado o false si no existía.
     * @throws {Error} Si existe una llave foránea asociada en la tabla Practica.
     */
    async deleteEstudiante(documento) {
        try {
            const eliminacionSql = `
                DELETE FROM gestion_academica.Estudiante 
                WHERE documento = $1
            `;
            const { rowCount } = await pool.query(eliminacionSql, [documento]);
            return rowCount > 0;
        } catch (error) {
            console.error(`Error al eliminar estudiante ${documento}:`, error.message);
            throw new Error(`Fallo al eliminar estudiante: ${error.message}`);
        }
    },

    // ========================================================================
    // GESTIÓN DE DOCENTES ASESORES (TUTOR ACADÉMICO)
    // ========================================================================

    /**
     * Retorna el listado completo de tutores académicos registrados en la institución.
     * 
     * @async
     * @function getTutores
     * @returns {Promise<Array<Object>>} Lista de tutores con documento, nombres, correo, especialidad y teléfono.
     * @throws {Error} Si falla la consulta en la base de datos.
     */
    async getTutores() {
        try {
            const consultaSql = `
                SELECT documento_tu, nombre, apellido, correo, especialidad, telefono
                FROM gestion_academica.Tutor_Academico
                ORDER BY nombre ASC
            `;
            const { rows } = await pool.query(consultaSql);
            return rows;
        } catch (error) {
            console.error('Error al consultar tutores:', error.message);
            throw new Error(`Fallo al consultar tutores: ${error.message}`);
        }
    },

    /**
     * Registra un nuevo docente asesor / tutor académico en el sistema.
     * 
     * @async
     * @function insertTutor
     * @param {Object} datos - Atributos del docente asesor.
     * @param {string} datos.documento_tu - Documento único de identificación del tutor.
     * @param {string} datos.nombre - Nombres completos del docente.
     * @param {string} [datos.apellido] - Apellidos del docente.
     * @param {string} datos.correo - Correo electrónico institucional.
     * @param {string} [datos.especialidad] - Área pedagógica o disciplina académica de especialidad.
     * @param {string} [datos.telefono] - Teléfono institucional o personal.
     * @returns {Promise<Object>} Registro del tutor creado y persistido.
     * @throws {Error} Si la inserción genera un error en la base de datos.
     */
    async insertTutor({ documento_tu, nombre, apellido, correo, especialidad, telefono }) {
        try {
            const insercionSql = `
                INSERT INTO gestion_academica.Tutor_Academico 
                (documento_tu, nombre, apellido, correo, especialidad, telefono)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `;
            const parametros = [
                String(documento_tu).trim(),
                String(nombre).trim(),
                apellido ? String(apellido).trim() : '',
                String(correo).trim().toLowerCase(),
                especialidad ? String(especialidad).trim() : 'Pedagogía y Didáctica',
                telefono ? String(telefono).trim() : ''
            ];
            const { rows } = await pool.query(insercionSql, parametros);
            return rows[0];
        } catch (error) {
            console.error('Error al insertar tutor académico:', error.message);
            throw new Error(`Fallo al registrar tutor: ${error.message}`);
        }
    },

    // ========================================================================
    // GESTIÓN DE INSTITUCIONES RECEPTORAS
    // ========================================================================

    /**
     * Consulta el catálogo de instituciones educativas y centros de práctica con convenio.
     * 
     * @async
     * @function getInstituciones
     * @returns {Promise<Array<Object>>} Lista de instituciones con id, nombre, dirección, ciudad y teléfono.
     * @throws {Error} Si la consulta en PostgreSQL falla.
     */
    async getInstituciones() {
        try {
            const consultaSql = `
                SELECT id_institucion, nombre, direccion, ciudad, telefono
                FROM gestion_academica.Institucion
                ORDER BY nombre ASC
            `;
            const { rows } = await pool.query(consultaSql);
            return rows;
        } catch (error) {
            console.error('Error al consultar instituciones:', error.message);
            throw new Error(`Fallo al consultar instituciones: ${error.message}`);
        }
    },

    /**
     * Registra una nueva institución receptora de prácticas con sus datos de contacto.
     * 
     * @async
     * @function insertInstitucion
     * @param {Object} datos - Atributos de la institución escolar.
     * @param {string} datos.id_institucion - Código identificador único (ej: INST-01).
     * @param {string} datos.nombre - Nombre oficial de la institución educativa.
     * @param {string} datos.direccion - Dirección física de la sede.
     * @param {string} [datos.ciudad] - Ciudad de ubicación (por defecto: Bucaramanga).
     * @param {string} [datos.telefono] - Teléfono de contacto institucional.
     * @returns {Promise<Object>} Registro persistido de la institución.
     * @throws {Error} Si el código identificador ya se encuentra registrado.
     */
    async insertInstitucion({ id_institucion, nombre, direccion, ciudad, telefono }) {
        try {
            const insercionSql = `
                INSERT INTO gestion_academica.Institucion 
                (id_institucion, nombre, direccion, ciudad, telefono)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `;
            const parametros = [
                String(id_institucion).trim(),
                String(nombre).trim(),
                String(direccion).trim(),
                ciudad ? String(ciudad).trim() : 'Bucaramanga',
                telefono ? String(telefono).trim() : ''
            ];
            const { rows } = await pool.query(insercionSql, parametros);
            return rows[0];
        } catch (error) {
            console.error('Error al insertar institución:', error.message);
            throw new Error(`Fallo al registrar institución: ${error.message}`);
        }
    },

    /**
     * Elimina una institución receptora a partir de su identificador único.
     * 
     * @async
     * @function deleteInstitucion
     * @param {string} id_institucion - Identificador único de la institución a eliminar.
     * @returns {Promise<boolean>} Retorna true si fue eliminada o false si no se encontró.
     * @throws {Error} Si la institución tiene prácticas asociadas por restricción de integridad referencial.
     */
    async deleteInstitucion(id_institucion) {
        try {
            const eliminacionSql = `
                DELETE FROM gestion_academica.Institucion 
                WHERE id_institucion = $1
            `;
            const { rowCount } = await pool.query(eliminacionSql, [id_institucion]);
            return rowCount > 0;
        } catch (error) {
            console.error(`Error al eliminar institución ${id_institucion}:`, error.message);
            throw new Error(`Fallo al eliminar institución: ${error.message}`);
        }
    },

    // ========================================================================
    // TIPOS DE PRÁCTICA (MODALIDADES REGLAMENTARIAS MEN)
    // ========================================================================

    /**
     * Consulta las modalidades de práctica vigentes en el programa según el Decreto 1075 de 2015.
     * 
     * @async
     * @function getTiposPractica
     * @returns {Promise<Array<Object>>} Lista de modalidades formativas (id_tipo, nombre, descripcion).
     * @throws {Error} Si ocurre un error al consultar la tabla Tipo_Practica.
     */
    async getTiposPractica() {
        try {
            const consultaSql = `
                SELECT id_tipo, nombre, descripcion
                FROM gestion_academica.Tipo_Practica
                ORDER BY id_tipo ASC
            `;
            const { rows } = await pool.query(consultaSql);
            return rows;
        } catch (error) {
            console.error('Error al consultar tipos de práctica:', error.message);
            throw new Error(`Fallo al consultar tipos de práctica: ${error.message}`);
        }
    },

    // ========================================================================
    // GESTIÓN DE PRÁCTICAS ACADÉMICAS (ENTIDAD RELACIONAL CENTRAL)
    // ========================================================================

    /**
     * Consulta el listado consolidado de asignaciones de práctica resolviendo
     * todas las relaciones (LEFT JOIN con Estudiante, Tutor, Institución y Tipo_Practica).
     * 
     * @async
     * @function getPracticas
     * @returns {Promise<Array<Object>>} Prácticas con datos consolidados de alumno, tutor y colegio.
     * @throws {Error} Si la consulta relacional con JOINs genera un error.
     */
    async getPracticas() {
        try {
            const consultaSql = `
                SELECT p.id_practica, 
                       TO_CHAR(p.fecha_ini, 'YYYY-MM-DD') AS fecha_ini, 
                       TO_CHAR(p.fecha_fin, 'YYYY-MM-DD') AS fecha_fin, 
                       p.horas_cumplidas, 
                       p.estado, 
                       p.nombre_prac,
                       p.documento, 
                       p.documento_tu, 
                       p.id_institucion, 
                       p.id_tipo,
                       CONCAT(e.nombre, ' ', e.apellido) AS estudiante_completo,
                       CONCAT(t.nombre, ' ', t.apellido) AS tutor_completo,
                       i.nombre AS institucion_nombre,
                       tp.nombre AS tipo_nombre
                FROM gestion_academica.Practica p
                LEFT JOIN gestion_academica.Estudiante e ON p.documento = e.documento
                LEFT JOIN gestion_academica.Tutor_Academico t ON p.documento_tu = t.documento_tu
                LEFT JOIN gestion_academica.Institucion i ON p.id_institucion = i.id_institucion
                LEFT JOIN gestion_academica.Tipo_Practica tp ON p.id_tipo = tp.id_tipo
                ORDER BY p.id_practica ASC
            `;
            const { rows } = await pool.query(consultaSql);
            return rows;
        } catch (error) {
            console.error('Error al consultar prácticas consolidadas:', error.message);
            throw new Error(`Fallo al consultar prácticas: ${error.message}`);
        }
    },

    /**
     * Registra una nueva asignación de práctica vinculando estudiante, tutor, institución y modalidad.
     * 
     * @async
     * @function insertPractica
     * @param {Object} datos - Datos de asignación de la práctica.
     * @param {string} datos.id_practica - Código correlativo de la práctica (ej: PRAC-001).
     * @param {string} [datos.fecha_ini] - Fecha de inicio programada (YYYY-MM-DD).
     * @param {string} [datos.fecha_fin] - Fecha límite o de finalización estimada.
     * @param {number} [datos.horas_cumplidas=0] - Horas iniciales acumuladas.
     * @param {string} [datos.estado='En Curso'] - Estado formativo de la práctica.
     * @param {string} [datos.nombre_prac] - Denominación de la práctica pedagógica.
     * @param {string} datos.documento - Documento del estudiante asignado.
     * @param {string} datos.documento_tu - Documento del tutor académico responsable.
     * @param {string} datos.id_institucion - Código de la institución receptora.
     * @param {string} datos.id_tipo - Modalidad o tipo de práctica.
     * @returns {Promise<Object>} Registro de la práctica creada.
     * @throws {Error} Si alguna de las llaves foráneas no existe en la base de datos.
     */
    async insertPractica(datos) {
        try {
            const insercionSql = `
                INSERT INTO gestion_academica.Practica 
                (id_practica, fecha_ini, fecha_fin, horas_cumplidas, estado, nombre_prac, documento, documento_tu, id_institucion, id_tipo)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *
            `;
            const parametros = [
                String(datos.id_practica).trim(),
                datos.fecha_ini || '2026-02-01',
                datos.fecha_fin || '2026-06-15',
                parseInt(datos.horas_cumplidas, 10) || 0,
                datos.estado || 'En Curso',
                datos.nombre_prac || 'Práctica Pedagógica Integral',
                String(datos.documento).trim(),
                String(datos.documento_tu).trim(),
                String(datos.id_institucion).trim(),
                String(datos.id_tipo).trim()
            ];
            const { rows } = await pool.query(insercionSql, parametros);
            return rows[0];
        } catch (error) {
            console.error('Error al asignar práctica:', error.message);
            throw new Error(`Fallo al registrar práctica: ${error.message}`);
        }
    }
};
