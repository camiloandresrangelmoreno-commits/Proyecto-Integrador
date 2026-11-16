/**
 * ============================================================================
 * SOFTWARE PARA LA GESTIÓN Y SEGUIMIENTO DE PRÁCTICAS ACADÉMICAS (UDI)
 * MICROSERVICIO 1 - CAPA DE ACCESO A DATOS (DAO): GESTIÓN ACADÉMICA
 * ============================================================================
 *
 * Esquema PostgreSQL: gestion_academica
 * Entidades administradas:
 *  - Estudiante       (alumnos matriculados en prácticas; semestre opcional)
 *  - Tutor_Academico  (docentes asesores identificados por documento_tu / documento)
 *  - Institucion      (colegios y centros receptores con correo y credenciales)
 *  - Tipo_Practica    (modalidades reglamentarias según Decreto 1075 de 2015)
 *  - Practica         (entidad relacional central identificada por id_practica)
 *  - Solicitudes      (bandeja de postulaciones radicadas desde el inicio de sesión)
 *  - Convenio         (convenios interinstitucionales y firmas rectorales)
 *  - Coordinador      (cuentas administrativas de coordinación y dirección)
 *
 * Comunicación inter-servicios:
 *  Este módulo NO realiza consultas cruzadas al esquema seguimiento_practicas.
 *  Toda integración con seguimiento se realiza vía API REST usando los
 *  identificadores de referencia `id_practica` y `documento_tu`.
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
const RUTA_RESPALDO_ACADEMICA = path.join(__dirname, 'local_academica.json');
const RUTA_ESTUDIANTES_LEGACY = path.join(__dirname, 'estudiantes.json');
const RUTA_SOLICITUDES_LEGACY = path.join(__dirname, 'solicitudes.json');

/**
 * Cadena de conexión por defecto al Pooler IPv4 de Supabase.
 * Se prioriza siempre la variable de entorno DATABASE_URL_ACADEMICA.
 */
const SUPABASE_DEFAULT_URL = 'postgresql://postgres.ywadbrsmyswfgmvkfxjn:Integrador123%23@aws-0-us-east-1.pooler.supabase.com:5432/postgres';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL_ACADEMICA || SUPABASE_DEFAULT_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
});

pool.on('error', (err) => {
    console.error('[Gestión Académica] Error en pool PostgreSQL:', err.message);
});

/**
 * Determina si un error proviene de indisponibilidad de red/conexión con PostgreSQL
 * y NO de un error SQL lógico (restricción única, clave foránea, columna o tipo).
 *
 * @param {Error} err - Excepción lanzada por el cliente `pg`.
 * @returns {boolean} Verdadero si es error de conectividad.
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
 * Limpia cadenas evitando valores nulos o texto literal "undefined"/"null".
 * @param {*} valor - Dato recibido.
 * @param {string} [porDefecto=''] - Valor sustituto.
 * @returns {string} Cadena saneada.
 */
function limpiarTexto(valor, porDefecto = '') {
    if (valor === undefined || valor === null) return porDefecto;
    const str = String(valor).trim();
    if (!str || str.toLowerCase() === 'undefined' || str.toLowerCase() === 'null') {
        return porDefecto;
    }
    return str;
}

/**
 * Normaliza el campo opcional `semestre` permitiendo nulos o ausencia en el modelo.
 * @param {number|string|null|undefined} valor - Valor de semestre recibido.
 * @returns {number|null} Entero válido (1-10) o null si no aplica.
 */
function normalizarSemestre(valor) {
    if (valor === undefined || valor === null || valor === '' || String(valor).toLowerCase() === 'undefined') return null;
    const numero = parseInt(valor, 10);
    if (Number.isNaN(numero) || numero < 1 || numero > 10) return null;
    return numero;
}

/**
 * Unifica la estructura de Estudiante garantizando `documento`, `id_estudiante`, `nombre` y `semestre`.
 * @param {Object} r - Fila proveniente de PostgreSQL o JSON.
 * @returns {Object} Objeto normalizado.
 */
function normalizarEstudiante(r) {
    const doc = limpiarTexto(r.documento || r.id_estudiante);
    const idEst = limpiarTexto(r.id_estudiante) || (doc.startsWith('EST') ? doc : `EST-2024-${doc.slice(-2)}`);
    const nombreBase = limpiarTexto(r.nombre);
    const apellidoBase = limpiarTexto(r.apellido);
    const nombreCompleto = apellidoBase && !nombreBase.includes(apellidoBase)
        ? `${nombreBase} ${apellidoBase}`.trim()
        : nombreBase;

    return {
        documento: doc,
        id_estudiante: idEst,
        nombre: nombreCompleto,
        apellido: apellidoBase,
        correo: limpiarTexto(r.correo).toLowerCase(),
        semestre: normalizarSemestre(r.semestre),
        telefono: limpiarTexto(r.telefono),
        clave: limpiarTexto(r.password || r.clave, 'estudiante123')
    };
}

/**
 * Unifica el mapeo entre `documento_tu` y `documento` en Tutor_Academico.
 * @param {Object} r - Fila proveniente de PostgreSQL o JSON.
 * @returns {Object} Registro normalizado sin valores undefined.
 */
function normalizarTutor(r) {
    const docTu = limpiarTexto(r.documento_tu || r.documento);
    const nombreBase = limpiarTexto(r.nombre);
    const apellidoBase = limpiarTexto(r.apellido);
    const nombreCompleto = apellidoBase && !nombreBase.includes(apellidoBase)
        ? `${nombreBase} ${apellidoBase}`.trim()
        : nombreBase;

    return {
        documento_tu: docTu,
        documento: docTu,
        nombre: nombreCompleto,
        apellido: apellidoBase,
        correo: limpiarTexto(r.correo).toLowerCase(),
        especialidad: limpiarTexto(r.especialidad, 'Pedagogía y Didáctica'),
        telefono: limpiarTexto(r.telefono),
        clave: limpiarTexto(r.password || r.clave, 'docente123')
    };
}

/**
 * Unifica el mapeo entre `nombre` y `nombre_colegio` en Institucion.
 * @param {Object} r - Fila proveniente de PostgreSQL o JSON.
 * @returns {Object} Institución normalizada sin valores undefined.
 */
function normalizarInstitucion(r) {
    const idInst = limpiarTexto(r.id_institucion);
    const nombreUnificado = limpiarTexto(r.nombre || r.nombre_colegio, idInst || 'Institución Educativa');
    const tel = limpiarTexto(r.telefono);
    const contacto = limpiarTexto(r.contacto, tel);
    const correo = limpiarTexto(r.correo) || (idInst ? `${idInst.toLowerCase()}@udi.edu.co` : '');

    return {
        id_institucion: idInst,
        nombre: nombreUnificado,
        nombre_colegio: nombreUnificado,
        direccion: limpiarTexto(r.direccion, 'Por definir'),
        ciudad: limpiarTexto(r.ciudad, 'Bucaramanga'),
        telefono: tel || contacto,
        contacto: contacto || tel,
        correo: correo.toLowerCase(),
        clave: limpiarTexto(r.password || r.clave, 'colegio123')
    };
}

/**
 * Normaliza una solicitud de aspirante garantizando institución de preferencia legible.
 * @param {Object} s - Registro de solicitud.
 * @returns {Object} Solicitud saneada.
 */
function normalizarSolicitud(s) {
    const idSol = limpiarTexto(s.id_solicitud || s.id);
    const idPref = limpiarTexto(s.id_institucion_preferencia, 'POR_ASIGNAR');
    const nomPref = limpiarTexto(s.institucion_preferencia) || (
        idPref === 'POR_ASIGNAR' ? 'A criterio del Coordinador' : idPref
    );

    return {
        id_solicitud: idSol,
        id: idSol,
        nombre: limpiarTexto(s.nombre),
        correo: limpiarTexto(s.correo).toLowerCase(),
        semestre: normalizarSemestre(s.semestre),
        id_institucion_preferencia: idPref,
        institucion_preferencia: nomPref,
        clave: limpiarTexto(s.password || s.clave, 'estudiante123'),
        estado: limpiarTexto(s.estado, 'Pendiente'),
        fecha: limpiarTexto(s.fecha, new Date().toLocaleDateString('es-CO'))
    };
}

/**
 * Normaliza un registro de convenio interinstitucional.
 * @param {Object} c - Fila de convenio.
 * @returns {Object} Convenio saneado.
 */
function normalizarConvenio(c) {
    return {
        id_convenio: limpiarTexto(c.id_convenio),
        id_institucion: limpiarTexto(c.id_institucion),
        resolucion: limpiarTexto(c.resolucion, 'RES-MEN-2026'),
        cupos_autorizados: parseInt(c.cupos_autorizados, 10) || 10,
        fecha_inicio: limpiarTexto(c.fecha_inicio, '2026-01-15'),
        fecha_vencimiento: limpiarTexto(c.fecha_vencimiento, '2027-01-15'),
        estado: limpiarTexto(c.estado, 'Pendiente Firma Rectoral'),
        firmado_por: limpiarTexto(c.firmado_por, '') || null
    };
}

/**
 * Semilla inicial utilizada únicamente cuando PostgreSQL no está disponible y no
 * existe aún archivo de respaldo local en disco.
 * @returns {Object} Estructura inicial del esquema gestion_academica.
 */
function crearSemillaAcademica() {
    let estudiantesIniciales = [
        { documento: '1098234501', id_estudiante: 'EST-2024-01', nombre: 'Camilo Andrés Rangel Moreno', apellido: '', correo: 'estudiante@udi.edu.co', semestre: 7, telefono: '3158901234', password: 'estudiante123' },
        { documento: '1098234502', id_estudiante: 'EST-2024-02', nombre: 'Edwin Fabián Quiroga Díaz', apellido: '', correo: 'edwin.quiroga@udi.edu.co', semestre: 8, telefono: '3167894512', password: 'edwin123' },
        { documento: '1098234503', id_estudiante: 'EST-2024-03', nombre: 'Laura Valentina Morales Gómez', apellido: '', correo: 'laura.morales@udi.edu.co', semestre: 6, telefono: '3123456789', password: 'laura123' },
        { documento: '1098234504', id_estudiante: 'EST-2024-04', nombre: 'María Camila Sotomayor Peña', apellido: '', correo: 'marias@udi.edu.co', semestre: 6, telefono: '3145678901', password: 'estudiante123' },
        { documento: '1098234505', id_estudiante: 'EST-2024-05', nombre: 'María Fernanda Vargas Suárez', apellido: '', correo: 'maria@udi.edu.co', semestre: null, telefono: '3189012345', password: 'estudiante123' }
    ];
    try {
        if (fs.existsSync(RUTA_ESTUDIANTES_LEGACY)) {
            const leidos = JSON.parse(fs.readFileSync(RUTA_ESTUDIANTES_LEGACY, 'utf-8') || '[]');
            if (Array.isArray(leidos) && leidos.length > 0) {
                estudiantesIniciales = leidos.filter(e => limpiarTexto(e.nombre) !== '');
            }
        }
    } catch (_) {}

    let solicitudesIniciales = [];
    try {
        if (fs.existsSync(RUTA_SOLICITUDES_LEGACY)) {
            const leidas = JSON.parse(fs.readFileSync(RUTA_SOLICITUDES_LEGACY, 'utf-8') || '[]');
            if (Array.isArray(leidas)) {
                solicitudesIniciales = leidas.map(normalizarSolicitud);
            }
        }
    } catch (_) {}

    return {
        Estudiante: estudiantesIniciales.map(normalizarEstudiante),
        Tutor_Academico: [
            { documento_tu: 'DOC-1098234', documento: 'DOC-1098234', nombre: 'Mg. Carlos Alberto Gómez Silva', apellido: '', correo: 'docente@udi.edu.co', especialidad: 'Didáctica de la Lengua y Literatura', telefono: '3187654321', password: 'docente123' },
            { documento_tu: 'DOC-1098567', documento: 'DOC-1098567', nombre: 'Dra. Sandra Milena Peña Castillo', apellido: '', correo: 'sandra.pena@udi.edu.co', especialidad: 'Pedagogía Infantil y Currículo', telefono: '3109876543', password: 'sandra123' }
        ],
        Institucion: [
            { id_institucion: 'INST-01', nombre: 'Colegio Custodio García Rovira', nombre_colegio: 'Colegio Custodio García Rovira', direccion: 'Cra 15 # 45-20', ciudad: 'Bucaramanga', telefono: '607-6345000', contacto: 'Lic. Martha Gómez', correo: 'colegio@udi.edu.co', password: 'colegio123' },
            { id_institucion: 'INST-02', nombre: 'Instituto Técnico Dámaso Zapata', nombre_colegio: 'Instituto Técnico Dámaso Zapata', direccion: 'Calle 10 # 28-35', ciudad: 'Bucaramanga', telefono: '607-6452211', contacto: 'Esp. Jairo Ortiz', correo: 'damaso@udi.edu.co', password: 'damaso123' },
            { id_institucion: 'INST-03', nombre: 'Colegio Santander Sede A', nombre_colegio: 'Colegio Santander Sede A', direccion: 'Calle 9 # 15-40', ciudad: 'Bucaramanga', telefono: '607-6321900', contacto: 'Dra. Beatriz Rico', correo: 'santander@udi.edu.co', password: 'santander123' }
        ],
        Tipo_Practica: [
            { id_tipo: 'TP-01', nombre: 'Práctica de Observación Pedagógica I', descripcion: 'Diagnóstico inicial de aula, análisis institucional y registro etnográfico.' },
            { id_tipo: 'TP-02', nombre: 'Práctica de Inmersión y Diagnóstico II', descripcion: 'Acompañamiento docente, diseño de secuencias didácticas y microenseñanza.' },
            { id_tipo: 'TP-03', nombre: 'Práctica Pedagógica Integral e Intervención III', descripcion: 'Titularidad de aula, ejecución curricular y proyecto pedagógico de aula.' }
        ],
        Practica: [
            { id_practica: 'PRAC-001', fecha_ini: '2026-02-01', fecha_fin: '2026-06-15', horas_cumplidas: 52, horas_objetivo: 80, estado: 'En Curso', nombre_prac: 'Práctica Pedagógica Integral', documento: '1098234501', documento_tu: 'DOC-1098234', id_institucion: 'INST-01', id_tipo: 'TP-03', validado_institucion: false, autorizado_director: false },
            { id_practica: 'PRAC-002', fecha_ini: '2026-02-01', fecha_fin: '2026-06-15', horas_cumplidas: 45, horas_objetivo: 80, estado: 'En Curso', nombre_prac: 'Práctica Pedagógica Integral', documento: '1098234502', documento_tu: 'DOC-1098234', id_institucion: 'INST-02', id_tipo: 'TP-03', validado_institucion: false, autorizado_director: false },
            { id_practica: 'PRAC-003', fecha_ini: '2026-02-01', fecha_fin: '2026-06-15', horas_cumplidas: 28, horas_objetivo: 60, estado: 'En Curso', nombre_prac: 'Práctica de Inmersión y Diagnóstico', documento: '1098234503', documento_tu: 'DOC-1098567', id_institucion: 'INST-03', id_tipo: 'TP-02', validado_institucion: false, autorizado_director: false },
            { id_practica: 'PRAC-004', fecha_ini: '2026-02-01', fecha_fin: '2026-06-15', horas_cumplidas: 18, horas_objetivo: 50, estado: 'En Curso', nombre_prac: 'Práctica de Observación Pedagógica', documento: '1098234504', documento_tu: 'DOC-1098567', id_institucion: 'INST-01', id_tipo: 'TP-01', validado_institucion: false, autorizado_director: false }
        ],
        Solicitudes: solicitudesIniciales,
        Convenio: [
            { id_convenio: 'CONV-2026-01', id_institucion: 'INST-01', resolucion: 'RES-MEN-045/2026', cupos_autorizados: 15, fecha_inicio: '2026-01-15', fecha_vencimiento: '2027-01-15', estado: 'Firmado y Vigente', firmado_por: 'Dr. Roberto Mendoza (Director)' },
            { id_convenio: 'CONV-2026-02', id_institucion: 'INST-02', resolucion: 'RES-MEN-089/2026', cupos_autorizados: 10, fecha_inicio: '2026-02-01', fecha_vencimiento: '2027-02-01', estado: 'Pendiente Firma Rectoral', firmado_por: null },
            { id_convenio: 'CONV-2026-03', id_institucion: 'INST-03', resolucion: 'RES-MEN-112/2026', cupos_autorizados: 12, fecha_inicio: '2026-03-01', fecha_vencimiento: '2027-03-01', estado: 'Pendiente Firma Rectoral', firmado_por: null }
        ],
        Coordinador: [
            { id_coordinador: 'COORD-001', nombre: 'Dra. María Elena Torres', correo: 'coordinador@udi.edu.co', password: 'coordinador123', clave: 'coordinador123', departamento: 'Coordinación de Prácticas Pedagógicas', rol: 'coordinador' },
            { id_coordinador: 'DIR-001', nombre: 'Dr. Roberto Mendoza (Director)', correo: 'director@udi.edu.co', password: 'director123', clave: 'director123', departamento: 'Dirección de Programa', rol: 'director' }
        ]
    };
}

/**
 * Lee el respaldo local del esquema gestion_academica en formato JSON,
 * asegurando que existan todas las colecciones y sin registros corruptos.
 * @returns {Object} Colecciones locales de entidades académicas.
 */
function leerRespaldoAcademica() {
    try {
        if (fs.existsSync(RUTA_RESPALDO_ACADEMICA)) {
            const data = JSON.parse(fs.readFileSync(RUTA_RESPALDO_ACADEMICA, 'utf-8'));
            const semilla = crearSemillaAcademica();
            return {
                Estudiante: (data.Estudiante || semilla.Estudiante).map(normalizarEstudiante),
                Tutor_Academico: (data.Tutor_Academico || semilla.Tutor_Academico).map(normalizarTutor),
                Institucion: (data.Institucion || semilla.Institucion).map(normalizarInstitucion),
                Tipo_Practica: data.Tipo_Practica || semilla.Tipo_Practica,
                Practica: data.Practica || semilla.Practica,
                Solicitudes: (data.Solicitudes || semilla.Solicitudes).map(normalizarSolicitud),
                Convenio: (data.Convenio || semilla.Convenio).map(normalizarConvenio),
                Coordinador: data.Coordinador || semilla.Coordinador
            };
        }
    } catch (_) {}
    const semilla = crearSemillaAcademica();
    guardarRespaldoAcademica(semilla);
    return semilla;
}

/**
 * Persiste el respaldo local del esquema gestion_academica en disco.
 * @param {Object} datos - Objeto completo con las entidades académicas.
 */
function guardarRespaldoAcademica(datos) {
    try {
        fs.writeFileSync(RUTA_RESPALDO_ACADEMICA, JSON.stringify(datos, null, 2), 'utf-8');
        if (Array.isArray(datos.Estudiante)) {
            fs.writeFileSync(RUTA_ESTUDIANTES_LEGACY, JSON.stringify(datos.Estudiante, null, 2), 'utf-8');
        }
        if (Array.isArray(datos.Solicitudes)) {
            fs.writeFileSync(RUTA_SOLICITUDES_LEGACY, JSON.stringify(datos.Solicitudes, null, 2), 'utf-8');
        }
    } catch (err) {
        console.error('[Gestión Académica] Error al guardar respaldo local:', err.message);
    }
}

let columnaSemestreDisponible = null;
let esquemaInicializado = false;

/**
 * Verifica dinámicamente si la columna `semestre` existe en `gestion_academica.Estudiante`.
 * @returns {Promise<boolean>} Verdadero si la columna existe en PostgreSQL.
 */
async function existeColumnaSemestre() {
    if (columnaSemestreDisponible !== null) return columnaSemestreDisponible;
    try {
        const { rows } = await pool.query(`
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'gestion_academica'
              AND LOWER(table_name) = 'estudiante'
              AND LOWER(column_name) = 'semestre'
            LIMIT 1
        `);
        columnaSemestreDisponible = rows.length > 0;
        return columnaSemestreDisponible;
    } catch (_) {
        return false;
    }
}

export const dbAcademica = {
    nombre: 'Microservicio 1 - Gestión Académica (gestion_academica)',
    estado: 'PostgreSQL Supabase (Sincronización directa en la nube)',

    /**
     * Inicializa y actualiza automáticamente en Supabase las tablas y columnas
     * requeridas del esquema `gestion_academica`, además de sanear registros corruptos.
     *
     * @async
     * @returns {Promise<{ok: boolean, mensaje: string}>} Resultado de la migración inicial.
     */
    async inicializarEsquema() {
        if (esquemaInicializado) return { ok: true, mensaje: 'Esquema ya inicializado.' };
        try {
            await pool.query(`CREATE SCHEMA IF NOT EXISTS gestion_academica;`);

            // 1. Tablas base y columnas requeridas
            await pool.query(`
                CREATE TABLE IF NOT EXISTS gestion_academica.Estudiante (
                    documento VARCHAR(20) PRIMARY KEY,
                    id_estudiante VARCHAR(30),
                    nombre VARCHAR(100) NOT NULL,
                    apellido VARCHAR(100) DEFAULT '',
                    correo VARCHAR(120) UNIQUE NOT NULL,
                    semestre INT NULL,
                    telefono VARCHAR(30) DEFAULT '',
                    password VARCHAR(150) DEFAULT 'estudiante123'
                );
                ALTER TABLE IF EXISTS gestion_academica.Estudiante ALTER COLUMN semestre DROP NOT NULL;
                ALTER TABLE IF EXISTS gestion_academica.Estudiante ADD COLUMN IF NOT EXISTS id_estudiante VARCHAR(30);
                ALTER TABLE IF EXISTS gestion_academica.Estudiante ADD COLUMN IF NOT EXISTS password VARCHAR(150) DEFAULT 'estudiante123';
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS gestion_academica.Tutor_Academico (
                    documento_tu VARCHAR(20) PRIMARY KEY,
                    nombre VARCHAR(100) NOT NULL,
                    apellido VARCHAR(100) DEFAULT '',
                    correo VARCHAR(120) UNIQUE NOT NULL,
                    especialidad VARCHAR(150) DEFAULT 'Pedagogía y Didáctica',
                    telefono VARCHAR(30) DEFAULT '',
                    password VARCHAR(150) DEFAULT 'docente123'
                );
                ALTER TABLE IF EXISTS gestion_academica.Tutor_Academico ADD COLUMN IF NOT EXISTS apellido VARCHAR(100) DEFAULT '';
                ALTER TABLE IF EXISTS gestion_academica.Tutor_Academico ADD COLUMN IF NOT EXISTS especialidad VARCHAR(150) DEFAULT 'Pedagogía y Didáctica';
                ALTER TABLE IF EXISTS gestion_academica.Tutor_Academico ADD COLUMN IF NOT EXISTS telefono VARCHAR(30) DEFAULT '';
                ALTER TABLE IF EXISTS gestion_academica.Tutor_Academico ADD COLUMN IF NOT EXISTS password VARCHAR(150) DEFAULT 'docente123';
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS gestion_academica.Institucion (
                    id_institucion VARCHAR(20) PRIMARY KEY,
                    nombre VARCHAR(150) NOT NULL,
                    direccion VARCHAR(200) NOT NULL,
                    ciudad VARCHAR(100) DEFAULT 'Bucaramanga',
                    telefono VARCHAR(60) DEFAULT '',
                    correo VARCHAR(120),
                    password VARCHAR(150) DEFAULT 'colegio123',
                    contacto VARCHAR(150) DEFAULT ''
                );
                ALTER TABLE IF EXISTS gestion_academica.Institucion ADD COLUMN IF NOT EXISTS ciudad VARCHAR(100) DEFAULT 'Bucaramanga';
                ALTER TABLE IF EXISTS gestion_academica.Institucion ADD COLUMN IF NOT EXISTS telefono VARCHAR(60) DEFAULT '';
                ALTER TABLE IF EXISTS gestion_academica.Institucion ADD COLUMN IF NOT EXISTS correo VARCHAR(120);
                ALTER TABLE IF EXISTS gestion_academica.Institucion ADD COLUMN IF NOT EXISTS password VARCHAR(150) DEFAULT 'colegio123';
                ALTER TABLE IF EXISTS gestion_academica.Institucion ADD COLUMN IF NOT EXISTS contacto VARCHAR(150) DEFAULT '';
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS gestion_academica.Tipo_Practica (
                    id_tipo VARCHAR(20) PRIMARY KEY,
                    nombre VARCHAR(150) NOT NULL,
                    descripcion TEXT
                );
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS gestion_academica.Practica (
                    id_practica VARCHAR(20) PRIMARY KEY,
                    fecha_ini DATE DEFAULT CURRENT_DATE,
                    fecha_fin DATE DEFAULT (CURRENT_DATE + INTERVAL '120 days'),
                    horas_cumplidas INT DEFAULT 0,
                    horas_objetivo INT DEFAULT 80,
                    estado VARCHAR(50) DEFAULT 'En Curso',
                    nombre_prac VARCHAR(150) DEFAULT 'Práctica Pedagógica Integral',
                    validado_institucion BOOLEAN DEFAULT FALSE,
                    fecha_validacion_sede DATE NULL,
                    autorizado_director BOOLEAN DEFAULT FALSE,
                    documento VARCHAR(20) REFERENCES gestion_academica.Estudiante(documento) ON DELETE CASCADE,
                    documento_tu VARCHAR(20) REFERENCES gestion_academica.Tutor_Academico(documento_tu) ON DELETE SET NULL,
                    id_institucion VARCHAR(20) REFERENCES gestion_academica.Institucion(id_institucion) ON DELETE SET NULL,
                    id_tipo VARCHAR(20) REFERENCES gestion_academica.Tipo_Practica(id_tipo) ON DELETE RESTRICT
                );
                ALTER TABLE IF EXISTS gestion_academica.Practica ADD COLUMN IF NOT EXISTS horas_objetivo INT DEFAULT 80;
                ALTER TABLE IF EXISTS gestion_academica.Practica ADD COLUMN IF NOT EXISTS validado_institucion BOOLEAN DEFAULT FALSE;
                ALTER TABLE IF EXISTS gestion_academica.Practica ADD COLUMN IF NOT EXISTS fecha_validacion_sede DATE NULL;
                ALTER TABLE IF EXISTS gestion_academica.Practica ADD COLUMN IF NOT EXISTS autorizado_director BOOLEAN DEFAULT FALSE;
                ALTER TABLE IF EXISTS gestion_academica.Practica ALTER COLUMN documento_tu DROP NOT NULL;
                ALTER TABLE IF EXISTS gestion_academica.Practica ALTER COLUMN id_institucion DROP NOT NULL;
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS gestion_academica.solicitudes (
                    id_solicitud VARCHAR(30) PRIMARY KEY,
                    nombre VARCHAR(150) NOT NULL,
                    correo VARCHAR(120) UNIQUE NOT NULL,
                    semestre INT NULL,
                    id_institucion_preferencia VARCHAR(40),
                    institucion_preferencia VARCHAR(180),
                    password VARCHAR(150) DEFAULT 'estudiante123',
                    estado VARCHAR(40) DEFAULT 'Pendiente',
                    fecha VARCHAR(40) DEFAULT TO_CHAR(CURRENT_DATE, 'DD/MM/YYYY'),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                ALTER TABLE IF EXISTS gestion_academica.solicitudes ADD COLUMN IF NOT EXISTS id_institucion_preferencia VARCHAR(40);
                ALTER TABLE IF EXISTS gestion_academica.solicitudes ADD COLUMN IF NOT EXISTS institucion_preferencia VARCHAR(180);
                ALTER TABLE IF EXISTS gestion_academica.solicitudes ADD COLUMN IF NOT EXISTS password VARCHAR(150) DEFAULT 'estudiante123';
                ALTER TABLE IF EXISTS gestion_academica.solicitudes ADD COLUMN IF NOT EXISTS estado VARCHAR(40) DEFAULT 'Pendiente';
                ALTER TABLE IF EXISTS gestion_academica.solicitudes ADD COLUMN IF NOT EXISTS fecha VARCHAR(40) DEFAULT TO_CHAR(CURRENT_DATE, 'DD/MM/YYYY');
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS gestion_academica.convenio (
                    id_convenio VARCHAR(30) PRIMARY KEY,
                    id_institucion VARCHAR(20) REFERENCES gestion_academica.Institucion(id_institucion) ON DELETE CASCADE,
                    resolucion VARCHAR(100) DEFAULT 'RES-MEN-2026',
                    cupos_autorizados INT DEFAULT 10,
                    fecha_inicio DATE DEFAULT CURRENT_DATE,
                    fecha_vencimiento DATE DEFAULT (CURRENT_DATE + INTERVAL '365 days'),
                    estado VARCHAR(60) DEFAULT 'Pendiente Firma Rectoral',
                    firmado_por VARCHAR(150) NULL
                );
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS gestion_academica.coordinador (
                    id_coordinador VARCHAR(30) PRIMARY KEY,
                    nombre VARCHAR(150) NOT NULL,
                    correo VARCHAR(120) UNIQUE NOT NULL,
                    password VARCHAR(150) DEFAULT 'coordinador123',
                    departamento VARCHAR(150) DEFAULT 'Coordinación de Prácticas Pedagógicas',
                    rol VARCHAR(30) DEFAULT 'coordinador'
                );
            `);

            // 2. Limpiar registros corruptos con literal 'undefined'
            await pool.query(`
                DELETE FROM gestion_academica.Tutor_Academico
                WHERE documento_tu IS NULL OR TRIM(documento_tu) = '' OR LOWER(documento_tu) = 'undefined' OR LOWER(nombre) = 'undefined';
                DELETE FROM gestion_academica.Institucion
                WHERE id_institucion IS NULL OR TRIM(id_institucion) = '' OR LOWER(nombre) = 'undefined';
                DELETE FROM gestion_academica.solicitudes
                WHERE LOWER(nombre) = 'undefined' OR LOWER(correo) = 'undefined';
                UPDATE gestion_academica.solicitudes
                SET id_institucion_preferencia = 'POR_ASIGNAR',
                    institucion_preferencia = 'A criterio del Coordinador'
                WHERE id_institucion_preferencia IS NULL OR LOWER(id_institucion_preferencia) = 'undefined';
                UPDATE gestion_academica.Institucion
                SET correo = CASE id_institucion
                    WHEN 'INST-01' THEN COALESCE(NULLIF(correo, ''), 'colegio@udi.edu.co')
                    WHEN 'INST-02' THEN COALESCE(NULLIF(correo, ''), 'damaso@udi.edu.co')
                    WHEN 'INST-03' THEN COALESCE(NULLIF(correo, ''), 'santander@udi.edu.co')
                    ELSE COALESCE(NULLIF(correo, ''), LOWER(id_institucion) || '@udi.edu.co')
                END,
                password = COALESCE(NULLIF(password, ''), CASE id_institucion
                    WHEN 'INST-02' THEN 'damaso123'
                    WHEN 'INST-03' THEN 'santander123'
                    ELSE 'colegio123'
                END);
            `);

            // 3. Semillas iniciales si las tablas están vacías
            const { rows: tpCount } = await pool.query(`SELECT COUNT(*)::int AS total FROM gestion_academica.Tipo_Practica`);
            if (tpCount[0].total === 0) {
                await pool.query(`
                    INSERT INTO gestion_academica.Tipo_Practica (id_tipo, nombre, descripcion) VALUES
                        ('TP-01', 'Práctica de Observación Pedagógica I', 'Diagnóstico inicial de aula, análisis institucional y registro etnográfico.'),
                        ('TP-02', 'Práctica de Inmersión y Diagnóstico II', 'Acompañamiento docente, diseño de secuencias didácticas y microenseñanza.'),
                        ('TP-03', 'Práctica Pedagógica Integral e Intervención III', 'Titularidad de aula, ejecución curricular y proyecto pedagógico de aula.')
                    ON CONFLICT (id_tipo) DO NOTHING;
                `);
            }

            await pool.query(`
                INSERT INTO gestion_academica.coordinador (id_coordinador, nombre, correo, password, departamento, rol) VALUES
                    ('COORD-001', 'Dra. María Elena Torres', 'coordinador@udi.edu.co', 'coordinador123', 'Coordinación de Prácticas Pedagógicas', 'coordinador'),
                    ('DIR-001', 'Dr. Roberto Mendoza (Director)', 'director@udi.edu.co', 'director123', 'Dirección de Programa', 'director')
                ON CONFLICT (id_coordinador) DO NOTHING;
            `);

            const { rows: estCount } = await pool.query(`SELECT COUNT(*)::int AS total FROM gestion_academica.Estudiante`);
            if (estCount[0].total === 0) {
                await pool.query(`
                    INSERT INTO gestion_academica.Estudiante (documento, id_estudiante, nombre, apellido, correo, semestre, telefono, password) VALUES
                        ('1098234501', 'EST-2024-01', 'Camilo Andrés', 'Rangel Moreno', 'estudiante@udi.edu.co', 7, '3158901234', 'estudiante123'),
                        ('1098234502', 'EST-2024-02', 'Edwin Fabián', 'Quiroga Díaz', 'edwin.quiroga@udi.edu.co', 8, '3167894512', 'edwin123'),
                        ('1098234503', 'EST-2024-03', 'Laura Valentina', 'Morales Gómez', 'laura.morales@udi.edu.co', 6, '3123456789', 'laura123'),
                        ('1098234504', 'EST-2024-04', 'María Camila', 'Sotomayor Peña', 'marias@udi.edu.co', 6, '3145678901', 'estudiante123'),
                        ('1098234505', 'EST-2024-05', 'María Fernanda', 'Vargas Suárez', 'maria@udi.edu.co', NULL, '3189012345', 'estudiante123')
                    ON CONFLICT (documento) DO NOTHING;
                `);
            }

            const { rows: tutCount } = await pool.query(`SELECT COUNT(*)::int AS total FROM gestion_academica.Tutor_Academico`);
            if (tutCount[0].total === 0) {
                await pool.query(`
                    INSERT INTO gestion_academica.Tutor_Academico (documento_tu, nombre, apellido, correo, especialidad, telefono, password) VALUES
                        ('DOC-1098234', 'Mg. Carlos Alberto', 'Gómez Silva', 'docente@udi.edu.co', 'Didáctica de la Lengua y Literatura', '3187654321', 'docente123'),
                        ('DOC-1098567', 'Dra. Sandra Milena', 'Peña Castillo', 'sandra.pena@udi.edu.co', 'Pedagogía Infantil y Currículo', '3109876543', 'sandra123')
                    ON CONFLICT (documento_tu) DO NOTHING;
                `);
            }

            const { rows: instCount } = await pool.query(`SELECT COUNT(*)::int AS total FROM gestion_academica.Institucion`);
            if (instCount[0].total === 0) {
                await pool.query(`
                    INSERT INTO gestion_academica.Institucion (id_institucion, nombre, direccion, ciudad, telefono, correo, password, contacto) VALUES
                        ('INST-01', 'Colegio Custodio García Rovira', 'Cra 15 # 45-20', 'Bucaramanga', '607-6345000', 'colegio@udi.edu.co', 'colegio123', 'Lic. Martha Gómez'),
                        ('INST-02', 'Instituto Técnico Dámaso Zapata', 'Calle 10 # 28-35', 'Bucaramanga', '607-6452211', 'damaso@udi.edu.co', 'damaso123', 'Esp. Jairo Ortiz'),
                        ('INST-03', 'Colegio Santander Sede A', 'Calle 9 # 15-40', 'Bucaramanga', '607-6321900', 'santander@udi.edu.co', 'santander123', 'Dra. Beatriz Rico')
                    ON CONFLICT (id_institucion) DO NOTHING;
                `);
            }

            const { rows: pracCount } = await pool.query(`SELECT COUNT(*)::int AS total FROM gestion_academica.Practica`);
            if (pracCount[0].total === 0) {
                await pool.query(`
                    INSERT INTO gestion_academica.Practica (id_practica, fecha_ini, fecha_fin, horas_cumplidas, horas_objetivo, estado, nombre_prac, documento, documento_tu, id_institucion, id_tipo) VALUES
                        ('PRAC-001', '2026-02-01', '2026-06-15', 52, 80, 'En Curso', 'Práctica Pedagógica Integral', '1098234501', 'DOC-1098234', 'INST-01', 'TP-03'),
                        ('PRAC-002', '2026-02-01', '2026-06-15', 45, 80, 'En Curso', 'Práctica Pedagógica Integral', '1098234502', 'DOC-1098234', 'INST-02', 'TP-03'),
                        ('PRAC-003', '2026-02-01', '2026-06-15', 28, 60, 'En Curso', 'Práctica de Inmersión y Diagnóstico', '1098234503', 'DOC-1098567', 'INST-03', 'TP-02'),
                        ('PRAC-004', '2026-02-01', '2026-06-15', 18, 50, 'En Curso', 'Práctica de Observación Pedagógica', '1098234504', 'DOC-1098567', 'INST-01', 'TP-01')
                    ON CONFLICT (id_practica) DO NOTHING;
                `);
            }

            const { rows: convCount } = await pool.query(`SELECT COUNT(*)::int AS total FROM gestion_academica.convenio`);
            if (convCount[0].total === 0) {
                await pool.query(`
                    INSERT INTO gestion_academica.convenio (id_convenio, id_institucion, resolucion, cupos_autorizados, fecha_inicio, fecha_vencimiento, estado, firmado_por) VALUES
                        ('CONV-2026-01', 'INST-01', 'RES-MEN-045/2026', 15, '2026-01-15', '2027-01-15', 'Firmado y Vigente', 'Dr. Roberto Mendoza (Director)'),
                        ('CONV-2026-02', 'INST-02', 'RES-MEN-089/2026', 10, '2026-02-01', '2027-02-01', 'Pendiente Firma Rectoral', NULL),
                        ('CONV-2026-03', 'INST-03', 'RES-MEN-112/2026', 12, '2026-03-01', '2027-03-01', 'Pendiente Firma Rectoral', NULL)
                    ON CONFLICT (id_convenio) DO NOTHING;
                `);
            }

            columnaSemestreDisponible = true;
            esquemaInicializado = true;
            return { ok: true, mensaje: 'Esquema gestion_academica verificado y actualizado en Supabase.' };
        } catch (err) {
            return { ok: false, mensaje: err.message };
        }
    },

    /**
     * Comprueba la conectividad activa contra PostgreSQL en Supabase.
     * @async
     * @returns {Promise<{conectado: boolean, mensaje: string}>} Diagnóstico de conexión.
     */
    async verificarConexion() {
        try {
            await pool.query('SELECT 1 AS ok');
            if (!esquemaInicializado) {
                await this.inicializarEsquema();
            }
            return {
                conectado: true,
                mensaje: 'Conectado exitosamente a PostgreSQL en Supabase (esquema gestion_academica).'
            };
        } catch (err) {
            return {
                conectado: false,
                mensaje: `PostgreSQL en la nube no disponible (${err.message}). Operando con persistencia local JSON.`
            };
        }
    },

    // ========================================================================
    // GESTIÓN DE SOLICITUDES DE ASPIRANTES (gestion_academica.solicitudes)
    // ========================================================================

    /**
     * Consulta todas las solicitudes de inscripción pendientes en la base de datos.
     * @async
     * @returns {Promise<Array<Object>>} Listado de solicitudes.
     */
    async getSolicitudes() {
        try {
            const { rows } = await pool.query(`
                SELECT s.id_solicitud,
                       s.nombre,
                       s.correo,
                       s.semestre,
                       s.id_institucion_preferencia,
                       COALESCE(NULLIF(s.institucion_preferencia, ''), i.nombre) AS institucion_preferencia,
                       s.password,
                       s.estado,
                       s.fecha
                FROM gestion_academica.solicitudes s
                LEFT JOIN gestion_academica.Institucion i
                    ON s.id_institucion_preferencia = i.id_institucion
                ORDER BY s.created_at ASC, s.id_solicitud ASC
            `);
            return rows.map(normalizarSolicitud);
        } catch (err) {
            if (!esErrorDeConexion(err)) throw new Error(`Error al consultar solicitudes: ${err.message}`);
            return leerRespaldoAcademica().Solicitudes || [];
        }
    },

    /**
     * Radica una nueva solicitud de inscripción en `gestion_academica.solicitudes`.
     * @async
     * @param {Object} datos - Datos del aspirante.
     * @returns {Promise<Object>} Solicitud persistida.
     */
    async insertSolicitud(datos) {
        const idPref = limpiarTexto(datos.id_institucion_preferencia, 'POR_ASIGNAR');
        let nombrePref = limpiarTexto(datos.institucion_preferencia);
        if (!nombrePref) {
            if (idPref === 'POR_ASIGNAR') {
                nombrePref = 'A criterio del Coordinador';
            } else {
                const insts = await this.getInstituciones();
                const instFound = insts.find(i => i.id_institucion === idPref);
                nombrePref = instFound ? instFound.nombre : idPref;
            }
        }

        const idSol = limpiarTexto(datos.id_solicitud || datos.id) || `ASP-${Date.now().toString().slice(-6)}`;
        const registro = normalizarSolicitud({
            id_solicitud: idSol,
            nombre: datos.nombre,
            correo: datos.correo,
            semestre: datos.semestre,
            id_institucion_preferencia: idPref,
            institucion_preferencia: nombrePref,
            password: datos.clave || datos.password || 'estudiante123',
            estado: datos.estado || 'Pendiente',
            fecha: datos.fecha || new Date().toLocaleDateString('es-CO')
        });

        try {
            const { rows } = await pool.query(
                `INSERT INTO gestion_academica.solicitudes
                 (id_solicitud, nombre, correo, semestre, id_institucion_preferencia, institucion_preferencia, password, estado, fecha)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 ON CONFLICT (correo) DO UPDATE SET
                    nombre = EXCLUDED.nombre,
                    semestre = EXCLUDED.semestre,
                    id_institucion_preferencia = EXCLUDED.id_institucion_preferencia,
                    institucion_preferencia = EXCLUDED.institucion_preferencia,
                    password = EXCLUDED.password,
                    estado = EXCLUDED.estado
                 RETURNING *`,
                [
                    registro.id_solicitud,
                    registro.nombre,
                    registro.correo,
                    registro.semestre,
                    registro.id_institucion_preferencia,
                    registro.institucion_preferencia,
                    registro.clave,
                    registro.estado,
                    registro.fecha
                ]
            );
            return normalizarSolicitud(rows[0]);
        } catch (err) {
            if (!esErrorDeConexion(err)) throw new Error(`Error al guardar solicitud en Supabase: ${err.message}`);
            const db = leerRespaldoAcademica();
            const idx = db.Solicitudes.findIndex(s => s.correo === registro.correo);
            if (idx >= 0) db.Solicitudes[idx] = registro;
            else db.Solicitudes.push(registro);
            guardarRespaldoAcademica(db);
            return registro;
        }
    },

    /**
     * Elimina una solicitud procesada (aprobada o rechazada) por id_solicitud o correo.
     * @async
     * @param {string} identificador - Código `id_solicitud` o correo del aspirante.
     * @returns {Promise<boolean>} Verdadero si fue removida.
     */
    async deleteSolicitud(identificador) {
        const key = limpiarTexto(identificador);
        if (!key) return false;
        try {
            const { rowCount } = await pool.query(
                `DELETE FROM gestion_academica.solicitudes
                 WHERE LOWER(id_solicitud) = LOWER($1) OR LOWER(correo) = LOWER($1)`,
                [key]
            );
            return rowCount > 0;
        } catch (err) {
            if (!esErrorDeConexion(err)) throw new Error(`Error al eliminar solicitud: ${err.message}`);
            const db = leerRespaldoAcademica();
            const orig = db.Solicitudes.length;
            db.Solicitudes = db.Solicitudes.filter(s =>
                s.id_solicitud.toLowerCase() !== key.toLowerCase() &&
                s.correo.toLowerCase() !== key.toLowerCase()
            );
            if (db.Solicitudes.length !== orig) {
                guardarRespaldoAcademica(db);
                return true;
            }
            return false;
        }
    },

    // ========================================================================
    // GESTIÓN DE ESTUDIANTES (semestre opcional o ausente)
    // ========================================================================

    /**
     * Obtiene el listado completo de estudiantes ordenados alfabéticamente por nombre.
     * @async
     * @returns {Promise<Array<Object>>} Arreglo de registros de estudiantes.
     */
    async getEstudiantes() {
        try {
            const { rows } = await pool.query(`
                SELECT *
                FROM gestion_academica.Estudiante
                ORDER BY nombre ASC
            `);
            return rows.map(normalizarEstudiante);
        } catch (err) {
            if (!esErrorDeConexion(err)) throw new Error(`Error al consultar estudiantes: ${err.message}`);
            return leerRespaldoAcademica().Estudiante || [];
        }
    },

    /**
     * Consulta un estudiante específico por su documento o id_estudiante.
     * @async
     * @param {string} identificador - Documento o id_estudiante.
     * @returns {Promise<Object|null>} Registro del estudiante o null si no existe.
     */
    async getEstudianteByDoc(identificador) {
        const doc = limpiarTexto(identificador);
        try {
            const { rows } = await pool.query(
                `SELECT * FROM gestion_academica.Estudiante
                 WHERE documento = $1 OR id_estudiante = $1
                 LIMIT 1`,
                [doc]
            );
            return rows[0] ? normalizarEstudiante(rows[0]) : null;
        } catch (err) {
            if (!esErrorDeConexion(err)) throw new Error(`Error al consultar estudiante: ${err.message}`);
            const lista = leerRespaldoAcademica().Estudiante || [];
            return lista.find(e => e.documento === doc || e.id_estudiante === doc) || null;
        }
    },

    /**
     * Registra un nuevo estudiante en `gestion_academica.Estudiante`.
     * No exige `semestre` como campo obligatorio; lo almacena como NULL si se omite.
     *
     * @async
     * @param {Object} datos - Atributos del estudiante.
     * @returns {Promise<Object>} Registro creado.
     */
    async insertEstudiante(datos) {
        const semestreVal = normalizarSemestre(datos.semestre);
        const docBase = limpiarTexto(datos.documento || datos.id_estudiante) || String(Date.now()).slice(-10);
        const idEst = limpiarTexto(datos.id_estudiante) || (docBase.startsWith('EST') ? docBase : `EST-2024-${docBase.slice(-2)}`);
        const password = limpiarTexto(datos.clave || datos.password, 'estudiante123');

        const registro = {
            documento: docBase,
            id_estudiante: idEst,
            nombre: limpiarTexto(datos.nombre),
            apellido: limpiarTexto(datos.apellido),
            correo: limpiarTexto(datos.correo).toLowerCase(),
            semestre: semestreVal,
            telefono: limpiarTexto(datos.telefono),
            password
        };

        try {
            const conSemestre = await existeColumnaSemestre();
            const sql = conSemestre
                ? `INSERT INTO gestion_academica.Estudiante (documento, id_estudiante, nombre, apellido, correo, semestre, telefono, password)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                   ON CONFLICT (documento) DO UPDATE SET
                     id_estudiante = COALESCE(EXCLUDED.id_estudiante, gestion_academica.Estudiante.id_estudiante),
                     nombre = EXCLUDED.nombre,
                     apellido = EXCLUDED.apellido,
                     correo = EXCLUDED.correo,
                     semestre = EXCLUDED.semestre,
                     telefono = EXCLUDED.telefono,
                     password = EXCLUDED.password
                   RETURNING *`
                : `INSERT INTO gestion_academica.Estudiante (documento, id_estudiante, nombre, apellido, correo, telefono, password)
                   VALUES ($1, $2, $3, $4, $5, $6, $7)
                   ON CONFLICT (documento) DO UPDATE SET
                     nombre = EXCLUDED.nombre,
                     apellido = EXCLUDED.apellido,
                     correo = EXCLUDED.correo,
                     telefono = EXCLUDED.telefono,
                     password = EXCLUDED.password
                   RETURNING *`;
            const params = conSemestre
                ? [registro.documento, registro.id_estudiante, registro.nombre, registro.apellido, registro.correo, registro.semestre, registro.telefono, registro.password]
                : [registro.documento, registro.id_estudiante, registro.nombre, registro.apellido, registro.correo, registro.telefono, registro.password];

            const { rows } = await pool.query(sql, params);
            return normalizarEstudiante(rows[0]);
        } catch (err) {
            if (!esErrorDeConexion(err)) throw new Error(`Fallo al registrar estudiante en Supabase: ${err.message}`);
            const db = leerRespaldoAcademica();
            const norm = normalizarEstudiante(registro);
            const idx = db.Estudiante.findIndex(e => e.documento === norm.documento || e.correo === norm.correo);
            if (idx >= 0) db.Estudiante[idx] = { ...db.Estudiante[idx], ...norm };
            else db.Estudiante.push(norm);
            guardarRespaldoAcademica(db);
            return norm;
        }
    },

    /**
     * Actualiza los datos de un estudiante existente por su documento o id_estudiante.
     * @async
     * @param {string} identificador - Documento o id_estudiante.
     * @param {Object} datosActualizados - Campos a modificar.
     * @returns {Promise<Object|null>} Registro actualizado o null si no existe.
     */
    async updateEstudiante(identificador, datosActualizados) {
        const doc = limpiarTexto(identificador);
        try {
            const conSemestre = await existeColumnaSemestre();
            const semestreParam = datosActualizados.semestre !== undefined
                ? normalizarSemestre(datosActualizados.semestre)
                : null;
            const claveParam = limpiarTexto(datosActualizados.clave || datosActualizados.password, '') || null;
            const apellidoParam = datosActualizados.apellido !== undefined
                ? limpiarTexto(datosActualizados.apellido)
                : (datosActualizados.nombre ? '' : null);

            const sql = conSemestre
                ? `UPDATE gestion_academica.Estudiante
                   SET nombre = COALESCE($2, nombre),
                       apellido = COALESCE($3, apellido),
                       correo = COALESCE($4, correo),
                       semestre = $5,
                       telefono = COALESCE($6, telefono),
                       password = COALESCE($7, password)
                   WHERE documento = $1 OR id_estudiante = $1
                   RETURNING *`
                : `UPDATE gestion_academica.Estudiante
                   SET nombre = COALESCE($2, nombre),
                       apellido = COALESCE($3, apellido),
                       correo = COALESCE($4, correo),
                       telefono = COALESCE($5, telefono),
                       password = COALESCE($6, password)
                   WHERE documento = $1 OR id_estudiante = $1
                   RETURNING *`;

            const baseParams = [
                doc,
                datosActualizados.nombre ? limpiarTexto(datosActualizados.nombre) : null,
                apellidoParam,
                datosActualizados.correo ? limpiarTexto(datosActualizados.correo).toLowerCase() : null
            ];
            const params = conSemestre
                ? [...baseParams, semestreParam, datosActualizados.telefono !== undefined ? limpiarTexto(datosActualizados.telefono) : null, claveParam]
                : [...baseParams, datosActualizados.telefono !== undefined ? limpiarTexto(datosActualizados.telefono) : null, claveParam];

            const { rows } = await pool.query(sql, params);
            return rows[0] ? normalizarEstudiante(rows[0]) : null;
        } catch (err) {
            if (!esErrorDeConexion(err)) throw new Error(`Fallo al actualizar estudiante en Supabase: ${err.message}`);
            const db = leerRespaldoAcademica();
            const idx = db.Estudiante.findIndex(e => e.documento === doc || e.id_estudiante === doc);
            if (idx === -1) return null;
            db.Estudiante[idx] = normalizarEstudiante({
                ...db.Estudiante[idx],
                ...(datosActualizados.nombre ? { nombre: limpiarTexto(datosActualizados.nombre), apellido: '' } : {}),
                ...(datosActualizados.correo ? { correo: limpiarTexto(datosActualizados.correo).toLowerCase() } : {}),
                ...(datosActualizados.semestre !== undefined ? { semestre: normalizarSemestre(datosActualizados.semestre) } : {}),
                ...(datosActualizados.telefono !== undefined ? { telefono: limpiarTexto(datosActualizados.telefono) } : {}),
                ...(datosActualizados.clave || datosActualizados.password ? { password: limpiarTexto(datosActualizados.clave || datosActualizados.password) } : {})
            });
            guardarRespaldoAcademica(db);
            return db.Estudiante[idx];
        }
    },

    /**
     * Obtiene los identificadores `id_practica` asociados a un estudiante antes de su eliminación.
     * @async
     * @param {string} identificador - Documento o id_estudiante.
     * @returns {Promise<Array<string>>} Lista de códigos `id_practica`.
     */
    async getPracticasByEstudiante(identificador) {
        const doc = limpiarTexto(identificador);
        if (!doc) return [];
        try {
            const { rows: estRows } = await pool.query(
                `SELECT documento FROM gestion_academica.Estudiante
                 WHERE LOWER(documento) = LOWER($1) OR LOWER(id_estudiante) = LOWER($1)`,
                [doc]
            );
            const docs = estRows.map(r => r.documento).filter(Boolean);
            if (docs.length === 0) return [];
            const { rows: pracRows } = await pool.query(
                `SELECT id_practica FROM gestion_academica.Practica WHERE documento = ANY($1::varchar[])`,
                [docs]
            );
            return pracRows.map(p => p.id_practica).filter(Boolean);
        } catch (err) {
            if (!esErrorDeConexion(err)) throw new Error(`Fallo al consultar prácticas del estudiante: ${err.message}`);
            const db = leerRespaldoAcademica();
            const docLow = doc.toLowerCase();
            const docsSet = new Set(
                (db.Estudiante || [])
                    .filter(e => String(e.documento || '').toLowerCase() === docLow || String(e.id_estudiante || '').toLowerCase() === docLow)
                    .map(e => String(e.documento || '').toLowerCase())
            );
            return (db.Practica || [])
                .filter(p => docsSet.has(String(p.documento || '').toLowerCase()) || String(p.id_estudiante || '').toLowerCase() === docLow)
                .map(p => p.id_practica);
        }
    },

    /**
     * Elimina un estudiante y sus prácticas asociadas de forma segura en Supabase.
     * Retorna además la lista de `id_practica` eliminadas para limpiar bitácoras y evaluaciones.
     * @async
     * @param {string} identificador - Documento o id_estudiante.
     * @returns {Promise<{deleted: boolean, practicasEliminadas: Array<string>}>} Resultado de eliminación.
     */
    async deleteEstudiante(identificador) {
        const doc = limpiarTexto(identificador);
        if (!doc) return { deleted: false, practicasEliminadas: [] };
        try {
            const { rows: estRows } = await pool.query(
                `SELECT documento, id_estudiante
                 FROM gestion_academica.Estudiante
                 WHERE LOWER(documento) = LOWER($1) OR LOWER(id_estudiante) = LOWER($1)`,
                [doc]
            );
            const docs = estRows.map(r => r.documento).filter(Boolean);
            if (docs.length === 0) {
                return { deleted: false, practicasEliminadas: [] };
            }

            const { rows: pracRows } = await pool.query(
                `SELECT id_practica FROM gestion_academica.Practica WHERE documento = ANY($1::varchar[])`,
                [docs]
            );
            const practicasEliminadas = pracRows.map(p => p.id_practica);

            await pool.query(
                `DELETE FROM gestion_academica.Practica WHERE documento = ANY($1::varchar[])`,
                [docs]
            );
            const { rowCount } = await pool.query(
                `DELETE FROM gestion_academica.Estudiante WHERE documento = ANY($1::varchar[])`,
                [docs]
            );
            return { deleted: rowCount > 0, practicasEliminadas };
        } catch (err) {
            if (!esErrorDeConexion(err)) throw new Error(`Fallo al eliminar estudiante en Supabase: ${err.message}`);
            const db = leerRespaldoAcademica();
            const docLow = doc.toLowerCase();
            const estMatches = (db.Estudiante || []).filter(e =>
                String(e.documento || '').toLowerCase() === docLow ||
                String(e.id_estudiante || '').toLowerCase() === docLow
            );
            const docsSet = new Set(estMatches.map(e => String(e.documento || '').toLowerCase()));
            const practicasEliminadas = (db.Practica || [])
                .filter(p => docsSet.has(String(p.documento || '').toLowerCase()) || String(p.id_estudiante || '').toLowerCase() === docLow)
                .map(p => p.id_practica);
            const orig = (db.Estudiante || []).length;
            db.Practica = (db.Practica || []).filter(p => !practicasEliminadas.includes(p.id_practica));
            db.Estudiante = (db.Estudiante || []).filter(e =>
                String(e.documento || '').toLowerCase() !== docLow &&
                String(e.id_estudiante || '').toLowerCase() !== docLow
            );
            if (db.Estudiante.length !== orig) {
                guardarRespaldoAcademica(db);
                return { deleted: true, practicasEliminadas };
            }
            return { deleted: false, practicasEliminadas: [] };
        }
    },

    // ========================================================================
    // GESTIÓN DE DOCENTES ASESORES (TUTOR_ACADEMICO)
    // ========================================================================

    /**
     * Obtiene el listado completo de tutores académicos con mapeo unificado `documento_tu` / `documento`.
     * @async
     * @returns {Promise<Array<Object>>} Lista de tutores académicos.
     */
    async getTutores() {
        try {
            const { rows } = await pool.query(`
                SELECT documento_tu, nombre, apellido, correo, especialidad, telefono, password
                FROM gestion_academica.Tutor_Academico
                ORDER BY nombre ASC
            `);
            return rows.map(normalizarTutor);
        } catch (err) {
            if (!esErrorDeConexion(err)) throw new Error(`Error al consultar tutores: ${err.message}`);
            return leerRespaldoAcademica().Tutor_Academico || [];
        }
    },

    /**
     * Registra un nuevo tutor académico en `gestion_academica.Tutor_Academico`.
     * @async
     * @param {Object} datos - Atributos del docente asesor.
     * @returns {Promise<Object>} Registro creado.
     */
    async insertTutor(datos) {
        const docFinal = limpiarTexto(datos.documento_tu || datos.documento);
        if (!docFinal) {
            throw new Error('El documento de identidad del docente asesor (documento_tu) es obligatorio.');
        }
        const registro = {
            documento_tu: docFinal,
            nombre: limpiarTexto(datos.nombre),
            apellido: limpiarTexto(datos.apellido),
            correo: limpiarTexto(datos.correo).toLowerCase(),
            especialidad: limpiarTexto(datos.especialidad, 'Pedagogía y Didáctica'),
            telefono: limpiarTexto(datos.telefono),
            password: limpiarTexto(datos.clave || datos.password, 'docente123')
        };

        try {
            const { rows } = await pool.query(
                `INSERT INTO gestion_academica.Tutor_Academico
                 (documento_tu, nombre, apellido, correo, especialidad, telefono, password)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING *`,
                [registro.documento_tu, registro.nombre, registro.apellido, registro.correo, registro.especialidad, registro.telefono, registro.password]
            );
            return normalizarTutor(rows[0]);
        } catch (err) {
            if (!esErrorDeConexion(err)) throw new Error(`Fallo al registrar docente en Supabase: ${err.message}`);
            const db = leerRespaldoAcademica();
            const norm = normalizarTutor(registro);
            db.Tutor_Academico.push(norm);
            guardarRespaldoAcademica(db);
            return norm;
        }
    },

    /**
     * Actualiza la información de un docente asesor existente.
     * @async
     * @param {string} documento_tu - Documento del tutor académico.
     * @param {Object} datosActualizados - Campos a modificar.
     * @returns {Promise<Object|null>} Registro actualizado o null.
     */
    async updateTutor(documento_tu, datosActualizados) {
        const doc = limpiarTexto(documento_tu);
        const claveParam = limpiarTexto(datosActualizados.clave || datosActualizados.password, '') || null;
        const apellidoParam = datosActualizados.apellido !== undefined
            ? limpiarTexto(datosActualizados.apellido)
            : (datosActualizados.nombre ? '' : null);

        try {
            const { rows } = await pool.query(
                `UPDATE gestion_academica.Tutor_Academico
                 SET nombre = COALESCE($2, nombre),
                     apellido = COALESCE($3, apellido),
                     correo = COALESCE($4, correo),
                     especialidad = COALESCE($5, especialidad),
                     telefono = COALESCE($6, telefono),
                     password = COALESCE($7, password)
                 WHERE documento_tu = $1
                 RETURNING *`,
                [
                    doc,
                    datosActualizados.nombre ? limpiarTexto(datosActualizados.nombre) : null,
                    apellidoParam,
                    datosActualizados.correo ? limpiarTexto(datosActualizados.correo).toLowerCase() : null,
                    datosActualizados.especialidad !== undefined ? limpiarTexto(datosActualizados.especialidad, 'Pedagogía y Didáctica') : null,
                    datosActualizados.telefono !== undefined ? limpiarTexto(datosActualizados.telefono) : null,
                    claveParam
                ]
            );
            return rows[0] ? normalizarTutor(rows[0]) : null;
        } catch (err) {
            if (!esErrorDeConexion(err)) throw new Error(`Fallo al actualizar docente en Supabase: ${err.message}`);
            const db = leerRespaldoAcademica();
            const idx = db.Tutor_Academico.findIndex(t => t.documento_tu === doc || t.documento === doc);
            if (idx === -1) return null;
            db.Tutor_Academico[idx] = normalizarTutor({
                ...db.Tutor_Academico[idx],
                ...datosActualizados,
                apellido: apellidoParam !== null ? apellidoParam : db.Tutor_Academico[idx].apellido,
                documento_tu: doc
            });
            guardarRespaldoAcademica(db);
            return db.Tutor_Academico[idx];
        }
    },

    /**
     * Elimina un docente asesor del sistema desvinculando previamente sus prácticas asignadas.
     * @async
     * @param {string} documento_tu - Documento del tutor a eliminar.
     * @returns {Promise<boolean>} Verdadero si se eliminó.
     */
    async deleteTutor(documento_tu) {
        const doc = limpiarTexto(documento_tu);
        if (!doc) return false;
        try {
            await pool.query(
                `UPDATE gestion_academica.Practica
                 SET documento_tu = NULL
                 WHERE LOWER(documento_tu) = LOWER($1)`,
                [doc]
            );
            const { rowCount } = await pool.query(
                `DELETE FROM gestion_academica.Tutor_Academico WHERE LOWER(documento_tu) = LOWER($1)`,
                [doc]
            );
            return rowCount > 0;
        } catch (err) {
            if (!esErrorDeConexion(err)) throw new Error(`Fallo al eliminar docente en Supabase: ${err.message}`);
            const db = leerRespaldoAcademica();
            const docLow = doc.toLowerCase();
            db.Practica = (db.Practica || []).map(p =>
                String(p.documento_tu || p.documento || '').toLowerCase() === docLow
                    ? { ...p, documento_tu: null }
                    : p
            );
            const orig = (db.Tutor_Academico || []).length;
            db.Tutor_Academico = (db.Tutor_Academico || []).filter(t =>
                String(t.documento_tu || '').toLowerCase() !== docLow &&
                String(t.documento || '').toLowerCase() !== docLow
            );
            if (db.Tutor_Academico.length !== orig) {
                guardarRespaldoAcademica(db);
                return true;
            }
            return false;
        }
    },

    // ========================================================================
    // GESTIÓN DE INSTITUCIONES RECEPTORAS (unificando nombre / nombre_colegio)
    // ========================================================================

    /**
     * Consulta todas las instituciones educativas con convenio.
     * @async
     * @returns {Promise<Array<Object>>} Catálogo de instituciones.
     */
    async getInstituciones() {
        try {
            const { rows } = await pool.query(`
                SELECT id_institucion, nombre, direccion, ciudad, telefono, correo, password, contacto
                FROM gestion_academica.Institucion
                ORDER BY id_institucion ASC
            `);
            return rows.map(normalizarInstitucion);
        } catch (err) {
            if (!esErrorDeConexion(err)) throw new Error(`Error al consultar instituciones: ${err.message}`);
            return leerRespaldoAcademica().Institucion || [];
        }
    },

    /**
     * Registra una nueva institución receptora de prácticas en Supabase.
     * @async
     * @param {Object} datos - Atributos de la institución.
     * @returns {Promise<Object>} Registro persistido.
     */
    async insertInstitucion(datos) {
        const idFinal = limpiarTexto(datos.id_institucion) || `INST-${Date.now().toString().slice(-4)}`;
        const nombreFinal = limpiarTexto(datos.nombre || datos.nombre_colegio);
        if (!nombreFinal) {
            throw new Error('El nombre de la institución receptora es obligatorio.');
        }

        const registro = {
            id_institucion: idFinal,
            nombre: nombreFinal,
            direccion: limpiarTexto(datos.direccion, 'Por definir'),
            ciudad: limpiarTexto(datos.ciudad, 'Bucaramanga'),
            telefono: limpiarTexto(datos.telefono || datos.contacto),
            correo: limpiarTexto(datos.correo, `${idFinal.toLowerCase()}@udi.edu.co`).toLowerCase(),
            password: limpiarTexto(datos.clave || datos.password, 'colegio123'),
            contacto: limpiarTexto(datos.contacto || datos.telefono)
        };

        try {
            const { rows } = await pool.query(
                `INSERT INTO gestion_academica.Institucion
                 (id_institucion, nombre, direccion, ciudad, telefono, correo, password, contacto)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING *`,
                [
                    registro.id_institucion,
                    registro.nombre,
                    registro.direccion,
                    registro.ciudad,
                    registro.telefono,
                    registro.correo,
                    registro.password,
                    registro.contacto
                ]
            );
            return normalizarInstitucion(rows[0]);
        } catch (err) {
            if (!esErrorDeConexion(err)) throw new Error(`Fallo al registrar institución en Supabase: ${err.message}`);
            const db = leerRespaldoAcademica();
            const norm = normalizarInstitucion(registro);
            db.Institucion.push(norm);
            guardarRespaldoAcademica(db);
            return norm;
        }
    },

    /**
     * Actualiza una institución receptora existente.
     * @async
     * @param {string} id_institucion - Código de la institución.
     * @param {Object} datosActualizados - Campos modificados.
     * @returns {Promise<Object|null>} Institución actualizada o null.
     */
    async updateInstitucion(id_institucion, datosActualizados) {
        const id = limpiarTexto(id_institucion);
        const nombreFinal = limpiarTexto(datosActualizados.nombre || datosActualizados.nombre_colegio, '') || null;
        const telFinal = limpiarTexto(datosActualizados.telefono || datosActualizados.contacto, '') || null;
        const contactoFinal = limpiarTexto(datosActualizados.contacto || datosActualizados.telefono, '') || null;
        const correoFinal = limpiarTexto(datosActualizados.correo, '') ? limpiarTexto(datosActualizados.correo).toLowerCase() : null;
        const claveFinal = limpiarTexto(datosActualizados.clave || datosActualizados.password, '') || null;

        try {
            const { rows } = await pool.query(
                `UPDATE gestion_academica.Institucion
                 SET nombre = COALESCE($2, nombre),
                     direccion = COALESCE($3, direccion),
                     ciudad = COALESCE($4, ciudad),
                     telefono = COALESCE($5, telefono),
                     correo = COALESCE($6, correo),
                     contacto = COALESCE($7, contacto),
                     password = COALESCE($8, password)
                 WHERE id_institucion = $1
                 RETURNING *`,
                [
                    id,
                    nombreFinal,
                    datosActualizados.direccion ? limpiarTexto(datosActualizados.direccion) : null,
                    datosActualizados.ciudad ? limpiarTexto(datosActualizados.ciudad) : null,
                    telFinal,
                    correoFinal,
                    contactoFinal,
                    claveFinal
                ]
            );
            return rows[0] ? normalizarInstitucion(rows[0]) : null;
        } catch (err) {
            if (!esErrorDeConexion(err)) throw new Error(`Fallo al actualizar institución en Supabase: ${err.message}`);
            const db = leerRespaldoAcademica();
            const idx = db.Institucion.findIndex(i => i.id_institucion === id);
            if (idx === -1) return null;
            db.Institucion[idx] = normalizarInstitucion({
                ...db.Institucion[idx],
                ...(nombreFinal ? { nombre: nombreFinal, nombre_colegio: nombreFinal } : {}),
                ...(datosActualizados.direccion ? { direccion: limpiarTexto(datosActualizados.direccion) } : {}),
                ...(datosActualizados.ciudad ? { ciudad: limpiarTexto(datosActualizados.ciudad) } : {}),
                ...(telFinal ? { telefono: telFinal } : {}),
                ...(contactoFinal ? { contacto: contactoFinal } : {}),
                ...(correoFinal ? { correo: correoFinal } : {}),
                ...(claveFinal ? { password: claveFinal } : {})
            });
            guardarRespaldoAcademica(db);
            return db.Institucion[idx];
        }
    },

    /**
     * Elimina una institución receptora desvinculando prácticas, limpiando preferencias
     * en solicitudes y eliminando sus convenios asociados antes de borrar la sede.
     * @async
     * @param {string} id_institucion - Código de la institución.
     * @returns {Promise<boolean>} Verdadero si se eliminó.
     */
    async deleteInstitucion(id_institucion) {
        const id = limpiarTexto(id_institucion);
        if (!id) return false;
        try {
            await pool.query(
                `UPDATE gestion_academica.Practica
                 SET id_institucion = NULL
                 WHERE LOWER(id_institucion) = LOWER($1)`,
                [id]
            );
            await pool.query(
                `DELETE FROM gestion_academica.convenio
                 WHERE LOWER(id_institucion) = LOWER($1)`,
                [id]
            );
            await pool.query(
                `UPDATE gestion_academica.solicitudes
                 SET id_institucion_preferencia = 'POR_ASIGNAR',
                     institucion_preferencia = 'A criterio del Coordinador'
                 WHERE LOWER(id_institucion_preferencia) = LOWER($1)`,
                [id]
            );
            const { rowCount } = await pool.query(
                `DELETE FROM gestion_academica.Institucion WHERE LOWER(id_institucion) = LOWER($1)`,
                [id]
            );
            return rowCount > 0;
        } catch (err) {
            if (!esErrorDeConexion(err)) throw new Error(`Fallo al eliminar institución en Supabase: ${err.message}`);
            const db = leerRespaldoAcademica();
            const idLow = id.toLowerCase();
            db.Practica = (db.Practica || []).map(p =>
                String(p.id_institucion || '').toLowerCase() === idLow ? { ...p, id_institucion: null } : p
            );
            db.Convenio = (db.Convenio || []).filter(c => String(c.id_institucion || '').toLowerCase() !== idLow);
            db.Solicitudes = (db.Solicitudes || []).map(s =>
                String(s.id_institucion_preferencia || '').toLowerCase() === idLow
                    ? { ...s, id_institucion_preferencia: 'POR_ASIGNAR', institucion_preferencia: 'A criterio del Coordinador' }
                    : s
            );
            const orig = (db.Institucion || []).length;
            db.Institucion = (db.Institucion || []).filter(i => String(i.id_institucion || '').toLowerCase() !== idLow);
            if (db.Institucion.length !== orig) {
                guardarRespaldoAcademica(db);
                return true;
            }
            return false;
        }
    },

    // ========================================================================
    // GESTIÓN DE CONVENIOS INTERINSTITUCIONALES (gestion_academica.convenio)
    // ========================================================================

    /**
     * Obtiene todos los convenios interinstitucionales almacenados en PostgreSQL.
     * @async
     * @returns {Promise<Array<Object>>} Catálogo de convenios.
     */
    async getConvenios() {
        try {
            const { rows } = await pool.query(`
                SELECT id_convenio,
                       id_institucion,
                       resolucion,
                       cupos_autorizados,
                       TO_CHAR(fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
                       TO_CHAR(fecha_vencimiento, 'YYYY-MM-DD') AS fecha_vencimiento,
                       estado,
                       firmado_por
                FROM gestion_academica.convenio
                ORDER BY id_convenio ASC
            `);
            return rows.map(normalizarConvenio);
        } catch (err) {
            if (!esErrorDeConexion(err)) throw new Error(`Error al consultar convenios: ${err.message}`);
            return leerRespaldoAcademica().Convenio || [];
        }
    },

    /**
     * Registra un nuevo convenio institucional en Supabase.
     * @async
     * @param {Object} datos - Atributos del convenio.
     * @returns {Promise<Object>} Convenio registrado.
     */
    async insertConvenio(datos) {
        const registro = normalizarConvenio({
            id_convenio: limpiarTexto(datos.id_convenio) || `CONV-${Date.now().toString().slice(-5)}`,
            id_institucion: datos.id_institucion,
            resolucion: datos.resolucion || 'RES-MEN-2026',
            cupos_autorizados: datos.cupos_autorizados || 10,
            fecha_inicio: datos.fecha_inicio || new Date().toISOString().split('T')[0],
            fecha_vencimiento: datos.fecha_vencimiento || '2027-06-15',
            estado: datos.estado || 'Pendiente Firma Rectoral',
            firmado_por: datos.firmado_por || null
        });

        try {
            const { rows } = await pool.query(
                `INSERT INTO gestion_academica.convenio
                 (id_convenio, id_institucion, resolucion, cupos_autorizados, fecha_inicio, fecha_vencimiento, estado, firmado_por)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING id_convenio, id_institucion, resolucion, cupos_autorizados,
                           TO_CHAR(fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
                           TO_CHAR(fecha_vencimiento, 'YYYY-MM-DD') AS fecha_vencimiento,
                           estado, firmado_por`,
                [
                    registro.id_convenio,
                    registro.id_institucion,
                    registro.resolucion,
                    registro.cupos_autorizados,
                    registro.fecha_inicio,
                    registro.fecha_vencimiento,
                    registro.estado,
                    registro.firmado_por
                ]
            );
            return normalizarConvenio(rows[0]);
        } catch (err) {
            if (!esErrorDeConexion(err)) throw new Error(`Fallo al registrar convenio en Supabase: ${err.message}`);
            const db = leerRespaldoAcademica();
            db.Convenio.push(registro);
            guardarRespaldoAcademica(db);
            return registro;
        }
    },

    /**
     * Actualiza un convenio (por ejemplo al firmar rectoralmente).
     * @async
     * @param {string} id_convenio - Código único del convenio.
     * @param {Object} datosActualizados - Campos modificados.
     * @returns {Promise<Object|null>} Convenio actualizado o null.
     */
    async updateConvenio(id_convenio, datosActualizados) {
        const id = limpiarTexto(id_convenio);
        try {
            const { rows } = await pool.query(
                `UPDATE gestion_academica.convenio
                 SET id_institucion = COALESCE($2, id_institucion),
                     resolucion = COALESCE($3, resolucion),
                     cupos_autorizados = COALESCE($4, cupos_autorizados),
                     estado = COALESCE($5, estado),
                     firmado_por = COALESCE($6, firmado_por)
                 WHERE id_convenio = $1
                 RETURNING id_convenio, id_institucion, resolucion, cupos_autorizados,
                           TO_CHAR(fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
                           TO_CHAR(fecha_vencimiento, 'YYYY-MM-DD') AS fecha_vencimiento,
                           estado, firmado_por`,
                [
                    id,
                    datosActualizados.id_institucion || null,
                    datosActualizados.resolucion || null,
                    datosActualizados.cupos_autorizados !== undefined ? parseInt(datosActualizados.cupos_autorizados, 10) : null,
                    datosActualizados.estado || null,
                    datosActualizados.firmado_por || null
                ]
            );
            return rows[0] ? normalizarConvenio(rows[0]) : null;
        } catch (err) {
            if (!esErrorDeConexion(err)) throw new Error(`Fallo al actualizar convenio en Supabase: ${err.message}`);
            const db = leerRespaldoAcademica();
            const idx = db.Convenio.findIndex(c => c.id_convenio === id);
            if (idx === -1) return null;
            db.Convenio[idx] = normalizarConvenio({ ...db.Convenio[idx], ...datosActualizados, id_convenio: id });
            guardarRespaldoAcademica(db);
            return db.Convenio[idx];
        }
    },

    /**
     * Elimina un convenio del sistema.
     * @async
     * @param {string} id_convenio - Código único del convenio.
     * @returns {Promise<boolean>} Verdadero si se eliminó.
     */
    async deleteConvenio(id_convenio) {
        const id = limpiarTexto(id_convenio);
        if (!id) return false;
        try {
            const { rowCount } = await pool.query(
                `DELETE FROM gestion_academica.convenio WHERE LOWER(id_convenio) = LOWER($1)`,
                [id]
            );
            return rowCount > 0;
        } catch (err) {
            if (!esErrorDeConexion(err)) throw new Error(`Fallo al eliminar convenio en Supabase: ${err.message}`);
            const db = leerRespaldoAcademica();
            const idLow = id.toLowerCase();
            const orig = (db.Convenio || []).length;
            db.Convenio = (db.Convenio || []).filter(c => String(c.id_convenio || '').toLowerCase() !== idLow);
            if (db.Convenio.length !== orig) {
                guardarRespaldoAcademica(db);
                return true;
            }
            return false;
        }
    },

    // ========================================================================
    // COORDINADORES Y DIRECTORES (gestion_academica.coordinador)
    // ========================================================================

    /**
     * Consulta los coordinadores y directores registrados en la base de datos.
     * @async
     * @returns {Promise<Array<Object>>} Cuentas administrativas.
     */
    async getCoordinadores() {
        try {
            const { rows } = await pool.query(`
                SELECT id_coordinador, nombre, correo, password, departamento, rol
                FROM gestion_academica.coordinador
                ORDER BY id_coordinador ASC
            `);
            return rows.map(c => ({ ...c, clave: c.password || 'coordinador123' }));
        } catch (err) {
            if (!esErrorDeConexion(err)) throw new Error(`Error al consultar coordinadores: ${err.message}`);
            return leerRespaldoAcademica().Coordinador || [];
        }
    },

    /**
     * Registra un nuevo coordinador en la base de datos.
     * @async
     * @param {Object} datos - Datos del coordinador.
     * @returns {Promise<Object>} Registro creado.
     */
    async insertCoordinador(datos) {
        const registro = {
            id_coordinador: limpiarTexto(datos.id_coordinador) || `COORD-${Date.now().toString().slice(-4)}`,
            nombre: limpiarTexto(datos.nombre),
            correo: limpiarTexto(datos.correo).toLowerCase(),
            password: limpiarTexto(datos.clave || datos.password, 'coordinador123'),
            departamento: limpiarTexto(datos.departamento, 'Coordinación de Prácticas Pedagógicas'),
            rol: limpiarTexto(datos.rol, 'coordinador')
        };
        try {
            const { rows } = await pool.query(
                `INSERT INTO gestion_academica.coordinador
                 (id_coordinador, nombre, correo, password, departamento, rol)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING *`,
                [registro.id_coordinador, registro.nombre, registro.correo, registro.password, registro.departamento, registro.rol]
            );
            return { ...rows[0], clave: rows[0].password };
        } catch (err) {
            if (!esErrorDeConexion(err)) throw new Error(`Fallo al registrar coordinador en Supabase: ${err.message}`);
            const db = leerRespaldoAcademica();
            db.Coordinador.push({ ...registro, clave: registro.password });
            guardarRespaldoAcademica(db);
            return { ...registro, clave: registro.password };
        }
    },

    // ========================================================================
    // TIPOS DE PRÁCTICA (MODALIDADES MEN)
    // ========================================================================

    /**
     * Consulta las modalidades de práctica vigentes según el Decreto 1075 de 2015.
     * @async
     * @returns {Promise<Array<Object>>} Lista de modalidades.
     */
    async getTiposPractica() {
        try {
            const { rows } = await pool.query(`
                SELECT id_tipo, nombre, descripcion
                FROM gestion_academica.Tipo_Practica
                ORDER BY id_tipo ASC
            `);
            return rows;
        } catch (err) {
            if (!esErrorDeConexion(err)) throw new Error(`Error al consultar tipos de práctica: ${err.message}`);
            return leerRespaldoAcademica().Tipo_Practica || [];
        }
    },

    // ========================================================================
    // GESTIÓN DE PRÁCTICAS ACADÉMICAS (ENTIDAD RELACIONAL CENTRAL)
    // ========================================================================

    /**
     * Consulta el listado consolidado de asignaciones de práctica dentro del
     * esquema `gestion_academica`.
     * @async
     * @returns {Promise<Array<Object>>} Prácticas con datos de estudiante, tutor, colegio y tipo.
     */
    async getPracticas() {
        try {
            const { rows } = await pool.query(`
                SELECT p.id_practica,
                       TO_CHAR(p.fecha_ini, 'YYYY-MM-DD') AS fecha_ini,
                       TO_CHAR(p.fecha_fin, 'YYYY-MM-DD') AS fecha_fin,
                       p.horas_cumplidas,
                       COALESCE(p.horas_objetivo, 80) AS horas_objetivo,
                       p.estado,
                       p.nombre_prac,
                       COALESCE(p.validado_institucion, FALSE) AS validado_institucion,
                       TO_CHAR(p.fecha_validacion_sede, 'YYYY-MM-DD') AS fecha_validacion_sede,
                       COALESCE(p.autorizado_director, FALSE) AS autorizado_director,
                       p.documento,
                       COALESCE(e.id_estudiante, p.documento) AS id_estudiante,
                       p.documento_tu,
                       p.id_institucion,
                       p.id_tipo,
                       TRIM(CONCAT(e.nombre, ' ', COALESCE(e.apellido, ''))) AS estudiante_completo,
                       e.correo AS estudiante_correo,
                       TRIM(CONCAT(t.nombre, ' ', COALESCE(t.apellido, ''))) AS tutor_completo,
                       t.correo AS tutor_correo,
                       i.nombre AS institucion_nombre,
                       tp.nombre AS tipo_nombre
                FROM gestion_academica.Practica p
                LEFT JOIN gestion_academica.Estudiante e ON p.documento = e.documento
                LEFT JOIN gestion_academica.Tutor_Academico t ON p.documento_tu = t.documento_tu
                LEFT JOIN gestion_academica.Institucion i ON p.id_institucion = i.id_institucion
                LEFT JOIN gestion_academica.Tipo_Practica tp ON p.id_tipo = tp.id_tipo
                ORDER BY p.id_practica ASC
            `);
            return rows.map(r => ({
                ...r,
                fecha_inicio: r.fecha_ini,
                documento_estudiante: r.documento,
                institucion_nombre: r.institucion_nombre || r.id_institucion
            }));
        } catch (err) {
            if (!esErrorDeConexion(err)) throw new Error(`Error al consultar prácticas: ${err.message}`);
            const db = leerRespaldoAcademica();
            return (db.Practica || []).map(p => {
                const est = (db.Estudiante || []).find(e => e.documento === p.documento || e.id_estudiante === p.documento);
                const tut = (db.Tutor_Academico || []).find(t => t.documento_tu === p.documento_tu);
                const inst = (db.Institucion || []).find(i => i.id_institucion === p.id_institucion);
                const tp = (db.Tipo_Practica || []).find(t => t.id_tipo === p.id_tipo);
                return {
                    ...p,
                    fecha_inicio: p.fecha_ini,
                    documento_estudiante: p.documento,
                    id_estudiante: est ? est.id_estudiante : p.documento,
                    estudiante_completo: est ? est.nombre : p.documento,
                    estudiante_correo: est ? est.correo : null,
                    tutor_completo: tut ? tut.nombre : p.documento_tu,
                    tutor_correo: tut ? tut.correo : null,
                    institucion_nombre: inst ? inst.nombre : p.id_institucion,
                    tipo_nombre: tp ? tp.nombre : p.id_tipo
                };
            });
        }
    },

    /**
     * Crea una nueva asignación de práctica relacionando estudiante, tutor, colegio y tipo.
     * @async
     * @param {Object} datos - Datos de asignación de la práctica.
     * @returns {Promise<Object>} Práctica registrada.
     */
    async insertPractica(datos) {
        // Resolver el documento real del estudiante (FK -> Estudiante.documento)
        let docEstudiante = limpiarTexto(datos.documento_estudiante || datos.documento);
        const estBuscado = await this.getEstudianteByDoc(datos.id_estudiante || docEstudiante);
        if (estBuscado) {
            docEstudiante = estBuscado.documento;
        }

        // Resolver documento del tutor (FK -> Tutor_Academico.documento_tu)
        const docTu = limpiarTexto(datos.documento_tu || datos.tutor_documento || (String(datos.documento || '').startsWith('DOC-') ? datos.documento : '')) || 'DOC-1098234';

        const registro = {
            id_practica: limpiarTexto(datos.id_practica) || `PRAC-${Date.now().toString().slice(-4)}`,
            fecha_ini: limpiarTexto(datos.fecha_ini || datos.fecha_inicio, '2026-02-01'),
            fecha_fin: limpiarTexto(datos.fecha_fin, '2026-06-15'),
            horas_cumplidas: parseInt(datos.horas_cumplidas, 10) || 0,
            horas_objetivo: parseInt(datos.horas_objetivo, 10) || 80,
            estado: limpiarTexto(datos.estado, 'En Curso'),
            nombre_prac: limpiarTexto(datos.nombre_prac, 'Práctica Pedagógica Integral'),
            validado_institucion: Boolean(datos.validado_institucion),
            autorizado_director: Boolean(datos.autorizado_director),
            documento: docEstudiante,
            documento_tu: docTu,
            id_institucion: limpiarTexto(datos.id_institucion, 'INST-01'),
            id_tipo: limpiarTexto(datos.id_tipo, 'TP-01')
        };

        try {
            const { rows } = await pool.query(
                `INSERT INTO gestion_academica.Practica
                 (id_practica, fecha_ini, fecha_fin, horas_cumplidas, horas_objetivo, estado, nombre_prac, validado_institucion, autorizado_director, documento, documento_tu, id_institucion, id_tipo)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                 RETURNING *`,
                [
                    registro.id_practica,
                    registro.fecha_ini,
                    registro.fecha_fin,
                    registro.horas_cumplidas,
                    registro.horas_objetivo,
                    registro.estado,
                    registro.nombre_prac,
                    registro.validado_institucion,
                    registro.autorizado_director,
                    registro.documento,
                    registro.documento_tu,
                    registro.id_institucion,
                    registro.id_tipo
                ]
            );
            return rows[0];
        } catch (err) {
            if (!esErrorDeConexion(err)) throw new Error(`Fallo al registrar práctica en Supabase: ${err.message}`);
            const db = leerRespaldoAcademica();
            const idx = db.Practica.findIndex(p => p.id_practica === registro.id_practica);
            if (idx >= 0) db.Practica[idx] = registro;
            else db.Practica.push(registro);
            guardarRespaldoAcademica(db);
            return registro;
        }
    },

    /**
     * Actualiza el estado, tutor, institución, horas o validación de sede de una práctica.
     * @async
     * @param {string} id_practica - Identificador único de la práctica.
     * @param {Object} datosActualizados - Campos a modificar.
     * @returns {Promise<Object|null>} Práctica actualizada o null.
     */
    async updatePractica(id_practica, datosActualizados) {
        const id = limpiarTexto(id_practica);

        let docEst = null;
        if (datosActualizados.documento_estudiante || datosActualizados.id_estudiante) {
            const est = await this.getEstudianteByDoc(datosActualizados.documento_estudiante || datosActualizados.id_estudiante);
            docEst = est ? est.documento : limpiarTexto(datosActualizados.documento_estudiante || datosActualizados.id_estudiante);
        }
        const docTu = limpiarTexto(datosActualizados.documento_tu || (String(datosActualizados.documento || '').startsWith('DOC-') ? datosActualizados.documento : ''), '') || null;

        try {
            const { rows } = await pool.query(
                `UPDATE gestion_academica.Practica
                 SET estado = COALESCE($2, estado),
                     horas_cumplidas = COALESCE($3, horas_cumplidas),
                     horas_objetivo = COALESCE($4, horas_objetivo),
                     documento = COALESCE($5, documento),
                     documento_tu = COALESCE($6, documento_tu),
                     id_institucion = COALESCE($7, id_institucion),
                     id_tipo = COALESCE($8, id_tipo),
                     validado_institucion = COALESCE($9, validado_institucion),
                     fecha_validacion_sede = COALESCE($10, fecha_validacion_sede),
                     autorizado_director = COALESCE($11, autorizado_director)
                 WHERE id_practica = $1
                 RETURNING *`,
                [
                    id,
                    datosActualizados.estado || null,
                    datosActualizados.horas_cumplidas !== undefined ? parseInt(datosActualizados.horas_cumplidas, 10) : null,
                    datosActualizados.horas_objetivo !== undefined ? parseInt(datosActualizados.horas_objetivo, 10) : null,
                    docEst,
                    docTu,
                    datosActualizados.id_institucion || null,
                    datosActualizados.id_tipo || null,
                    datosActualizados.validado_institucion !== undefined ? Boolean(datosActualizados.validado_institucion) : null,
                    datosActualizados.fecha_validacion_sede || null,
                    datosActualizados.autorizado_director !== undefined ? Boolean(datosActualizados.autorizado_director) : null
                ]
            );
            return rows[0] || null;
        } catch (err) {
            if (!esErrorDeConexion(err)) throw new Error(`Fallo al actualizar práctica en Supabase: ${err.message}`);
            const db = leerRespaldoAcademica();
            const idx = db.Practica.findIndex(p => p.id_practica === id);
            if (idx === -1) return null;
            db.Practica[idx] = {
                ...db.Practica[idx],
                ...datosActualizados,
                ...(docEst ? { documento: docEst } : {}),
                ...(docTu ? { documento_tu: docTu } : {}),
                id_practica: id
            };
            guardarRespaldoAcademica(db);
            return db.Practica[idx];
        }
    },

    /**
     * Elimina una asignación de práctica por su identificador único.
     * @async
     * @param {string} id_practica - Código de la práctica.
     * @returns {Promise<boolean>} Verdadero si se eliminó.
     */
    async deletePractica(id_practica) {
        const id = limpiarTexto(id_practica);
        if (!id) return false;
        try {
            const { rowCount } = await pool.query(
                `DELETE FROM gestion_academica.Practica WHERE LOWER(id_practica) = LOWER($1)`,
                [id]
            );
            return rowCount > 0;
        } catch (err) {
            if (!esErrorDeConexion(err)) throw new Error(`Fallo al eliminar práctica en Supabase: ${err.message}`);
            const db = leerRespaldoAcademica();
            const idLow = id.toLowerCase();
            const orig = (db.Practica || []).length;
            db.Practica = (db.Practica || []).filter(p => String(p.id_practica || '').toLowerCase() !== idLow);
            if (db.Practica.length !== orig) {
                guardarRespaldoAcademica(db);
                return true;
            }
            return false;
        }
    }
};
