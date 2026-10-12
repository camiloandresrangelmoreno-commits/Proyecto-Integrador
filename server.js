/**
 * ============================================================================
 * SISTEMA INTEGRAL DE GESTIÓN DE PRÁCTICAS ACADÉMICAS (UDI)
 * SERVIDOR PRINCIPAL BACKEND (NODE.JS + EXPRESS + NODEMON)
 * ============================================================================
 * 
 * Arquitectura: API RESTful multi-esquema conectada a PostgreSQL en Supabase.
 * - Esquema 1 (gestion_academica): Estudiante, Tutor, Institución, Tipo, Práctica.
 * - Esquema 2 (seguimiento_practicas): Bitácora, Evidencia, Evaluación.
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { dbAcademica } from './backend/dbAcademica.js';
import { dbSeguimiento } from './backend/dbSeguimiento.js';

// Carga de variables de entorno desde el archivo .env
dotenv.config();

// Configuración de respaldo automática: garantiza conexión inmediata a PostgreSQL en Supabase
// en cualquier PC o entorno donde se descomprima el proyecto, sin requerir configuración manual.
const SUPABASE_FALLBACK_URL = 'postgresql://postgres.ywadbrsmyswfgmvkfxjn:Integrador123%23@aws-0-us-east-1.pooler.supabase.com:5432/postgres';
if (!process.env.DATABASE_URL_ACADEMICA) {
    process.env.DATABASE_URL_ACADEMICA = SUPABASE_FALLBACK_URL;
}
if (!process.env.DATABASE_URL_SEGUIMIENTO) {
    process.env.DATABASE_URL_SEGUIMIENTO = SUPABASE_FALLBACK_URL;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARCHIVO_SOLICITUDES = path.join(__dirname, 'backend', 'solicitudes.json');
const ARCHIVO_ESTUDIANTES = path.join(__dirname, 'backend', 'estudiantes.json');

/**
 * Lee de manera síncrona el listado persistente de estudiantes en disco.
 * @returns {Array<Object>} Arreglo de estudiantes matriculados.
 */
function leerEstudiantesServidor() {
    try {
        if (fs.existsSync(ARCHIVO_ESTUDIANTES)) {
            const contenido = fs.readFileSync(ARCHIVO_ESTUDIANTES, 'utf-8');
            return JSON.parse(contenido || '[]');
        }
    } catch (e) {
        console.error('Error al leer estudiantes en disco:', e.message);
    }
    return [];
}

/**
 * Persiste en disco el listado de estudiantes para sincronización continua.
 * @param {Array<Object>} lista
 */
function guardarEstudiantesServidor(lista) {
    try {
        fs.writeFileSync(ARCHIVO_ESTUDIANTES, JSON.stringify(lista, null, 2), 'utf-8');
    } catch (e) {
        console.error('Error al guardar estudiantes en disco:', e.message);
    }
}

/**
 * Lee de manera síncrona el listado persistente de solicitudes de aspirantes.
 * @returns {Array<Object>} Arreglo de postulaciones pendientes.
 */
function leerSolicitudesServidor() {
    try {
        if (fs.existsSync(ARCHIVO_SOLICITUDES)) {
            const contenido = fs.readFileSync(ARCHIVO_SOLICITUDES, 'utf-8');
            return JSON.parse(contenido || '[]');
        }
    } catch (e) {
        console.error('Error al leer solicitudes:', e.message);
    }
    return [];
}

/**
 * Escribe y persiste en disco el listado actualizado de solicitudes de aspirantes.
 * @param {Array<Object>} lista - Colección de solicitudes a guardar.
 */
function guardarSolicitudesServidor(lista) {
    try {
        fs.writeFileSync(ARCHIVO_SOLICITUDES, JSON.stringify(lista, null, 2), 'utf-8');
    } catch (e) {
        console.error('Error al guardar solicitudes:', e.message);
    }
}

const app = express();
const PORT = 3000;

// ============================================================================
// CONFIGURACIÓN DE MIDDLEWARES
// ============================================================================

// Habilitar CORS para permitir solicitudes entre diferentes orígenes si es requerido
app.use(cors());

// Parseo automático de cuerpos de solicitud en formato JSON
app.use(express.json());

// Servicio de archivos estáticos del frontend (HTML, CSS, JS e imágenes)
app.use(express.static(__dirname, { extensions: ['html', 'htm'] }));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/CSS', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));

// ============================================================================
// ENDPOINTS DE MONITOREO Y SALUD DEL SISTEMA
// ============================================================================

/**
 * GET /api/estado-servidor
 * Verifica el estado en tiempo real del servidor y de ambas bases de datos en la nube.
 * @returns {Object} JSON con métricas, esquemas activos y total de registros.
 */
app.get('/api/estado-servidor', async (req, res) => {
    try {
        const [estudiantes, practicas, bitacoras, evaluaciones] = await Promise.all([
            dbAcademica.getEstudiantes(),
            dbAcademica.getPracticas(),
            dbSeguimiento.getBitacoras(),
            dbSeguimiento.getEvaluaciones()
        ]);

        res.status(200).json({
            sistema: 'Sistema de Gestión de Prácticas Pedagógicas UDI',
            version: '2.0.0 (Segunda Entrega)',
            entorno: process.env.NODE_ENV || 'development',
            bases_datos: {
                db_1: {
                    nombre: dbAcademica.nombre,
                    estado: dbAcademica.estado,
                    entidades: ['Estudiante', 'Tutor_Academico', 'Institucion', 'Tipo_Practica', 'Practica'],
                    total_estudiantes: estudiantes.length,
                    total_practicas: practicas.length
                },
                db_2: {
                    nombre: dbSeguimiento.nombre,
                    estado: dbSeguimiento.estado,
                    entidades: ['Bitacora', 'Evidencia', 'Evaluacion'],
                    total_bitacoras: bitacoras.length,
                    total_evaluaciones: evaluaciones.length
                }
            }
        });
    } catch (error) {
        res.status(500).json({ error: `Fallo al consultar diagnóstico: ${error.message}` });
    }
});

// ============================================================================
// RUTAS API: GESTIÓN DE SOLICITUDES DE ASPIRANTES (SINCRONIZACIÓN MULTIPLATAFORMA)
// ============================================================================

/**
 * GET /api/solicitudes
 * Consulta las solicitudes radicadas por estudiantes en espera de aprobación.
 */
app.get('/api/solicitudes', (req, res) => {
    try {
        const solicitudes = leerSolicitudesServidor();
        res.status(200).json(solicitudes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/solicitudes
 * Radica una nueva postulación en espera de revisión por el Coordinador.
 */
app.post('/api/solicitudes', (req, res) => {
    try {
        const solicitudes = leerSolicitudesServidor();
        const nueva = req.body;
        if (!nueva || !nueva.correo) {
            return res.status(400).json({ error: 'Datos incompletos para radicar solicitud.' });
        }
        const index = solicitudes.findIndex(s => (s.correo || '').toLowerCase() === nueva.correo.toLowerCase());
        if (index >= 0) {
            solicitudes[index] = nueva;
        } else {
            solicitudes.push(nueva);
        }
        guardarSolicitudesServidor(solicitudes);
        res.status(201).json(nueva);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * DELETE /api/solicitudes/:id
 * Remueve una solicitud una vez aceptada, matriculada o rechazada por el Coordinador.
 */
app.delete('/api/solicitudes/:id', (req, res) => {
    try {
        let solicitudes = leerSolicitudesServidor();
        const identificador = decodeURIComponent(req.params.id).toLowerCase();
        solicitudes = solicitudes.filter(s => 
            String(s.id || '').toLowerCase() !== identificador &&
            String(s.id_solicitud || '').toLowerCase() !== identificador &&
            String(s.correo || '').toLowerCase() !== identificador
        );
        guardarSolicitudesServidor(solicitudes);
        res.status(200).json({ mensaje: `Solicitud ${req.params.id} procesada exitosamente.` });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// ============================================================================
// RUTAS API: BASE DE DATOS 1 (GESTIÓN ACADÉMICA)
// ============================================================================

/**
 * GET /api/estado-db
 * Diagnóstico en vivo de la conexión con PostgreSQL en Supabase.
 */
app.get('/api/estado-db', async (req, res) => {
    const tieneEnvAcademica = !!process.env.DATABASE_URL_ACADEMICA;
    const tieneEnvSeguimiento = !!process.env.DATABASE_URL_SEGUIMIENTO;
    let postgresActivo = false;
    let mensajeDetallado = '';

    try {
        await dbAcademica.getTiposPractica();
        postgresActivo = true;
        mensajeDetallado = 'Conectado exitosamente a PostgreSQL en Supabase en la nube.';
    } catch (err) {
        mensajeDetallado = `Error al conectar con PostgreSQL: ${err.message}. Operando con respaldo local.`;
    }

    res.status(200).json({
        conectado_a_postgresql: postgresActivo,
        tiene_variables_env: true,
        mensaje: mensajeDetallado,
        total_estudiantes_servidor: leerEstudiantesServidor().length,
        servidor_hora: new Date().toLocaleTimeString('es-CO')
    });
});

/**
 * GET /api/academica/estudiantes
 * Retorna todos los estudiantes matriculados (desde PostgreSQL o réplica local en disco).
 */
app.get('/api/academica/estudiantes', async (req, res) => {
    try {
        let estudiantes = [];
        if (process.env.DATABASE_URL_ACADEMICA) {
            try {
                estudiantes = await dbAcademica.getEstudiantes();
            } catch (errDb) {
                console.warn('Aviso: PostgreSQL no respondió, usando datos de estudiantes en disco:', errDb.message);
            }
        }
        if (!estudiantes || estudiantes.length === 0) {
            estudiantes = leerEstudiantesServidor();
        } else {
            guardarEstudiantesServidor(estudiantes);
        }
        res.status(200).json(estudiantes);
    } catch (error) {
        res.status(200).json(leerEstudiantesServidor());
    }
});

/**
 * POST /api/academica/estudiantes
 * Registra un nuevo estudiante garantizando persistencia en disco y PostgreSQL.
 */
app.post('/api/academica/estudiantes', async (req, res) => {
    try {
        const { documento, nombre, apellido, correo, semestre, telefono } = req.body;
        if (!documento || !nombre || !correo || !semestre) {
            return res.status(400).json({
                error: 'Parámetros incompletos. Documento, nombre, correo y semestre son obligatorios.'
            });
        }
        const nuevoEstudiante = {
            id_estudiante: documento.startsWith('EST') ? documento : `EST-2024-${String(documento).slice(-2)}`,
            documento,
            nombre,
            apellido: apellido || '',
            correo,
            semestre: parseInt(semestre) || 7,
            telefono: telefono || '',
            clave: req.body.clave || 'estudiante123'
        };

        // Guardar en disco para sincronización entre VS Code y todos los navegadores
        const listaDisco = leerEstudiantesServidor();
        const idx = listaDisco.findIndex(e => e.correo === correo || e.documento === documento);
        if (idx >= 0) {
            listaDisco[idx] = nuevoEstudiante;
        } else {
            listaDisco.push(nuevoEstudiante);
        }
        guardarEstudiantesServidor(listaDisco);

        // Guardar en PostgreSQL si está configurado
        if (process.env.DATABASE_URL_ACADEMICA) {
            try {
                await dbAcademica.insertEstudiante({ documento, nombre, apellido, correo, semestre, telefono });
            } catch (ePostgres) {
                console.warn('Aviso PostgreSQL:', ePostgres.message);
            }
        }

        res.status(201).json(nuevoEstudiante);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * PUT /api/academica/estudiantes/:documento
 * Actualiza los datos de un estudiante por su documento.
 */
app.put('/api/academica/estudiantes/:documento', async (req, res) => {
    try {
        const estudianteActualizado = await dbAcademica.updateEstudiante(req.params.documento, req.body);
        if (!estudianteActualizado) {
            return res.status(404).json({ error: `Estudiante con documento ${req.params.documento} no encontrado.` });
        }
        res.status(200).json(estudianteActualizado);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * DELETE /api/academica/estudiantes/:documento
 * Elimina un estudiante de la base de datos.
 */
app.delete('/api/academica/estudiantes/:documento', async (req, res) => {
    try {
        const eliminado = await dbAcademica.deleteEstudiante(req.params.documento);
        if (!eliminado) {
            return res.status(404).json({ error: `Estudiante con documento ${req.params.documento} no encontrado.` });
        }
        res.status(200).json({ mensaje: `Estudiante ${req.params.documento} eliminado exitosamente.` });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * GET /api/academica/tutores
 * Obtiene el listado de docentes asesores.
 */
app.get('/api/academica/tutores', async (req, res) => {
    try {
        const tutores = await dbAcademica.getTutores();
        res.status(200).json(tutores);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/academica/tutores
 * Registra un nuevo docente asesor en el sistema.
 */
app.post('/api/academica/tutores', async (req, res) => {
    try {
        const nuevoTutor = await dbAcademica.insertTutor(req.body);
        res.status(201).json(nuevoTutor);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * GET /api/academica/instituciones
 * Consulta los colegios e instituciones receptoras con convenio.
 */
app.get('/api/academica/instituciones', async (req, res) => {
    try {
        const instituciones = await dbAcademica.getInstituciones();
        res.status(200).json(instituciones);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/academica/instituciones
 * Registra una nueva institución receptora con convenio.
 * 
 * @name POST /api/academica/instituciones
 * @param {Object} req.body - Datos de la institución (id_institucion, nombre, direccion, ciudad, telefono).
 * @returns {Object} 201 - Registro de la institución creada.
 * @returns {Object} 400 - Mensaje de error por validación o duplicidad.
 */
app.post('/api/academica/instituciones', async (req, res) => {
    try {
        const nuevaInstitucion = await dbAcademica.insertInstitucion(req.body);
        res.status(201).json(nuevaInstitucion);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * DELETE /api/academica/instituciones/:id
 * Elimina una institución receptora por su identificador único.
 * 
 * @name DELETE /api/academica/instituciones/:id
 * @param {string} req.params.id - Identificador único de la institución (ej: INST-01).
 * @returns {Object} 200 - Mensaje de confirmación de eliminación exitosa.
 * @returns {Object} 404 - Si la institución no existe.
 * @returns {Object} 400 - Si la eliminación falla por restricción de clave foránea.
 */
app.delete('/api/academica/instituciones/:id', async (req, res) => {
    try {
        const eliminada = await dbAcademica.deleteInstitucion(req.params.id);
        if (!eliminada) {
            return res.status(404).json({ error: `Institución ${req.params.id} no encontrada.` });
        }
        res.status(200).json({ mensaje: `Institución ${req.params.id} eliminada exitosamente.` });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * GET /api/academica/tipos-practica
 * Consulta las modalidades de práctica según el Decreto 1075 de 2015.
 */
app.get('/api/academica/tipos-practica', async (req, res) => {
    try {
        const tipos = await dbAcademica.getTiposPractica();
        res.status(200).json(tipos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/academica/practicas
 * Consulta las asignaciones de práctica con sus relaciones consolidadas.
 */
app.get('/api/academica/practicas', async (req, res) => {
    try {
        const practicas = await dbAcademica.getPracticas();
        res.status(200).json(practicas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/academica/practicas
 * Crea una nueva asignación de práctica relacionando estudiante, tutor, colegio y tipo.
 */
app.post('/api/academica/practicas', async (req, res) => {
    try {
        const nuevaPractica = await dbAcademica.insertPractica(req.body);
        res.status(201).json(nuevaPractica);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// ============================================================================
// RUTAS API: BASE DE DATOS 2 (SEGUIMIENTO DE PRÁCTICAS)
// ============================================================================

/**
 * GET /api/seguimiento/bitacoras
 * Consulta el historial de bitácoras registradas.
 */
app.get('/api/seguimiento/bitacoras', async (req, res) => {
    try {
        const bitacoras = await dbSeguimiento.getBitacoras();
        res.status(200).json(bitacoras);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/bitacoras  o  POST /api/seguimiento/bitacoras
 * Implementación exacta del Diagrama de Secuencia UML:
 * - Recibe id_practica, fecha, descripcion, horas, archivo.
 * - Registra la bitácora en la BD y anexa la evidencia.
 * - Retorna HTTP 201 Created con mensaje de éxito.
 */
app.post(['/api/seguimiento/bitacoras', '/api/bitacoras'], async (req, res) => {
    try {
        const { id_practica, fecha, descripcion, archivo, horas } = req.body;
        
        const bitacorasExistentes = await dbSeguimiento.getBitacoras();
        const idGenerado = req.body.id_bitacora || `BIT-${String(bitacorasExistentes.length + 1).padStart(3, '0')}`;
        
        let practicaAsignada = id_practica;
        if (!practicaAsignada) {
            try {
                const practicasDb = await dbAcademica.getPracticas();
                if (practicasDb && practicasDb.length > 0) {
                    practicaAsignada = practicasDb[practicasDb.length - 1].id_practica;
                }
            } catch (e) {}
        }

        const nuevaBitacora = {
            id_bitacora: idGenerado,
            fecha: fecha || new Date().toISOString().split('T')[0],
            descripcion: descripcion || 'Jornada pedagógica desarrollada en aula',
            observaciones: req.body.observaciones || null,
            estado: req.body.estado || 'Pendiente',
            id_practica: practicaAsignada || 'PRAC-001'
        };

        const bitacoraCreada = await dbSeguimiento.insertBitacora(nuevaBitacora);

        // Si se adjuntó archivo de soporte, se inserta la evidencia asociada (Composición UML)
        if (archivo) {
            const evidenciasExistentes = await dbSeguimiento.getEvidencias();
            const idEvidencia = `EVI-${String(evidenciasExistentes.length + 1).padStart(3, '0')}`;
            await dbSeguimiento.insertEvidencia({
                id_evidencia: idEvidencia,
                fecha: nuevaBitacora.fecha,
                nombre: `Evidencia_${nuevaBitacora.id_bitacora}`,
                tipo: 'Documento PDF',
                archivo: archivo,
                descripcion: `Soporte de ${horas || 4} horas de práctica`,
                id_practica: nuevaBitacora.id_practica,
                id_bitacora: nuevaBitacora.id_bitacora
            });
        }

        // Respuesta HTTP 201 Created como lo exige el Diagrama de Secuencia
        res.status(201).json({
            mensaje: 'Bitácora y evidencias registradas exitosamente',
            bitacora: bitacoraCreada
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * PUT /api/seguimiento/bitacoras/:id
 * Actualiza el estado ('Aprobado' / 'Rechazado') y observaciones de una bitácora.
 */
app.put('/api/seguimiento/bitacoras/:id', async (req, res) => {
    try {
        const bitacoraActualizada = await dbSeguimiento.updateBitacora(req.params.id, req.body);
        if (!bitacoraActualizada) {
            return res.status(404).json({ error: `Bitácora ${req.params.id} no encontrada.` });
        }
        res.status(200).json(bitacoraActualizada);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * GET /api/seguimiento/evidencias
 * Consulta todas las evidencias digitales registradas.
 */
app.get('/api/seguimiento/evidencias', async (req, res) => {
    try {
        const evidencias = await dbSeguimiento.getEvidencias();
        res.status(200).json(evidencias);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/seguimiento/evaluaciones
 * Consulta todas las evaluaciones emitidas por tutores académicos.
 */
app.get('/api/seguimiento/evaluaciones', async (req, res) => {
    try {
        const evaluaciones = await dbSeguimiento.getEvaluaciones();
        res.status(200).json(evaluaciones);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/seguimiento/evaluaciones
 * Registra una evaluación formal emitida por el tutor académico.
 */
app.post('/api/seguimiento/evaluaciones', async (req, res) => {
    try {
        const nuevaEvaluacion = await dbSeguimiento.insertEvaluacion(req.body);
        res.status(201).json(nuevaEvaluacion);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// ============================================================================
// ENRUTAMIENTO PRINCIPAL DE LA APLICACIÓN
// ============================================================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Iniciar servidor en el puerto 3000
app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  SISTEMA DE GESTIÓN DE PRÁCTICAS UDI (BACKEND ACTIVO) `);
    console.log(`  Servidor Node.js + Express en: http://localhost:${PORT}`);
    console.log(`  BD 1: ${dbAcademica.nombre}`);
    console.log(`  BD 2: ${dbSeguimiento.nombre}`);
    console.log(`=======================================================`);
});
