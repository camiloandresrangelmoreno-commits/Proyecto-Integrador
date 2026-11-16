/**
 * ============================================================================
 * SOFTWARE PARA LA GESTIÓN Y SEGUIMIENTO DE PRÁCTICAS ACADÉMICAS (UDI)
 * SERVIDOR PRINCIPAL BACKEND - VERSIÓN RELEASE 1.0 (NODE.JS + EXPRESS)
 * ============================================================================
 *
 * Arquitectura de Microservicios:
 *  - Microservicio 1 (gestion_academica): Estudiante, Tutor_Academico,
 *    Institucion, Tipo_Practica, Practica, Solicitudes, Convenio y Coordinador.
 *  - Microservicio 2 (seguimiento_practicas): Bitacora, Evidencia y Evaluacion.
 *  - Orquestación API REST (/api/reportes/consolidado): Integra ambos
 *    microservicios exclusivamente mediante los identificadores `id_practica`
 *    y `documento_tu`.
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { dbAcademica } from './backend/dbAcademica.js';
import { dbSeguimiento } from './backend/dbSeguimiento.js';

// Priorizar las variables declaradas en el archivo .env local sobre variables heredadas
dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARCHIVO_ENV = path.join(__dirname, '.env');

/**
 * Extrae de forma segura el identificador de proyecto o host de una URI PostgreSQL
 * sin exponer credenciales ni contraseñas.
 *
 * @param {string|undefined} uri - Cadena de conexión PostgreSQL.
 * @returns {string} Host o referencia de proyecto detectada.
 */
function obtenerReferenciaConexion(uri) {
    if (!uri) return 'No configurada';
    try {
        const matchUsuario = uri.match(/postgres\.([a-z0-9]+)/i);
        const url = new URL(uri);
        if (matchUsuario && matchUsuario[1]) {
            return `Supabase (${matchUsuario[1]} @ ${url.hostname})`;
        }
        return url.hostname;
    } catch (_) {
        return 'Configuración personalizada';
    }
}

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// CONFIGURACIÓN DE MIDDLEWARES Y ARCHIVOS ESTÁTICOS
// ============================================================================

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname, { extensions: ['html', 'htm'] }));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/CSS', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));

// ============================================================================
// ENDPOINTS DE MONITOREO Y AUTENTICACIÓN EN LA NUBE
// ============================================================================

/**
 * GET /api/estado-servidor
 * Retorna el estado de salud de los dos microservicios y métricas globales en tiempo real.
 */
app.get('/api/estado-servidor', async (req, res) => {
    try {
        const [diagAcad, diagSeg, estudiantes, practicas, solicitudes, convenios, bitacoras, evaluaciones] = await Promise.all([
            dbAcademica.verificarConexion(),
            dbSeguimiento.verificarConexion(),
            dbAcademica.getEstudiantes(),
            dbAcademica.getPracticas(),
            dbAcademica.getSolicitudes(),
            dbAcademica.getConvenios(),
            dbSeguimiento.getBitacoras(),
            dbSeguimiento.getEvaluaciones()
        ]);

        res.status(200).json({
            sistema: 'Software para la Gestión y Seguimiento de Prácticas Académicas',
            version: '1.0.0 (Release)',
            entorno: process.env.NODE_ENV || 'production',
            modo_operacion: diagAcad.conectado && diagSeg.conectado ? 'Nube (PostgreSQL Supabase)' : 'Local Persistente (JSON Failover)',
            bases_datos: {
                db_1: {
                    nombre: dbAcademica.nombre,
                    conectado_postgresql: diagAcad.conectado,
                    estado: diagAcad.mensaje,
                    entidades: ['Estudiante', 'Tutor_Academico', 'Institucion', 'Tipo_Practica', 'Practica', 'Solicitudes', 'Convenio', 'Coordinador'],
                    total_estudiantes: estudiantes.length,
                    total_practicas: practicas.length,
                    total_solicitudes: solicitudes.length,
                    total_convenios: convenios.length
                },
                db_2: {
                    nombre: dbSeguimiento.nombre,
                    conectado_postgresql: diagSeg.conectado,
                    estado: diagSeg.mensaje,
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

/**
 * GET /api/estado-db
 * Diagnóstico en vivo de la conectividad PostgreSQL en Supabase y conteo real en servidor.
 */
app.get('/api/estado-db', async (req, res) => {
    const tieneArchivoEnv = fs.existsSync(ARCHIVO_ENV);
    const tieneEnvAcademica = !!process.env.DATABASE_URL_ACADEMICA;
    const tieneEnvSeguimiento = !!process.env.DATABASE_URL_SEGUIMIENTO;

    const [diagAcad, diagSeg, estudiantes] = await Promise.all([
        dbAcademica.verificarConexion(),
        dbSeguimiento.verificarConexion(),
        dbAcademica.getEstudiantes()
    ]);

    const postgresActivo = diagAcad.conectado && diagSeg.conectado;
    const destino = obtenerReferenciaConexion(process.env.DATABASE_URL_ACADEMICA);

    res.status(200).json({
        conectado_a_postgresql: postgresActivo,
        tiene_archivo_env: tieneArchivoEnv,
        tiene_variables_env: tieneEnvAcademica && tieneEnvSeguimiento,
        destino_configurado: destino,
        mensaje: postgresActivo
            ? `Conectado exitosamente a PostgreSQL en ${destino}.`
            : `${diagAcad.mensaje} Destino configurado: ${destino}.`,
        total_estudiantes_servidor: estudiantes.length,
        servidor_hora: new Date().toLocaleTimeString('es-CO')
    });
});

/**
 * POST /api/auth/login
 * Autentica al usuario directamente contra las tablas persistidas en Supabase PostgreSQL.
 */
app.post('/api/auth/login', async (req, res) => {
    try {
        const correoLimpio = String(req.body.correo || '').trim().toLowerCase();
        const claveLimpia = String(req.body.password || req.body.clave || '').trim();
        const rol = String(req.body.rol || '').trim().toLowerCase();

        if (!correoLimpio || !claveLimpia || !rol) {
            return res.status(400).json({ success: false, message: 'Debes diligenciar correo, contraseña y rol.' });
        }

        if (rol === 'director' || rol === 'coordinador') {
            const coordinadores = await dbAcademica.getCoordinadores();
            const match = coordinadores.find(c => {
                const esDir = String(c.id_coordinador || '').startsWith('DIR') || c.rol === 'director';
                const rolCorrecto = rol === 'director' ? esDir : !esDir;
                return rolCorrecto && String(c.correo || '').toLowerCase() === correoLimpio && (c.clave === claveLimpia || c.password === claveLimpia);
            });
            if (match) {
                return res.status(200).json({
                    success: true,
                    user: {
                        id: match.id_coordinador,
                        nombre: match.nombre,
                        correo: match.correo,
                        rol,
                        departamento: match.departamento
                    },
                    redirectUrl: rol === 'director' ? 'views/dashboard.html' : 'views/coordinador.html'
                });
            }
        } else if (rol === 'docente') {
            const tutores = await dbAcademica.getTutores();
            const tutor = tutores.find(t =>
                String(t.correo || '').toLowerCase() === correoLimpio && (t.clave === claveLimpia || t.password === claveLimpia)
            );
            if (tutor) {
                return res.status(200).json({
                    success: true,
                    user: {
                        id: tutor.documento_tu,
                        documento: tutor.documento_tu,
                        documento_tu: tutor.documento_tu,
                        nombre: tutor.nombre,
                        correo: tutor.correo,
                        rol: 'docente',
                        especialidad: tutor.especialidad
                    },
                    redirectUrl: 'views/docente.html'
                });
            }
        } else if (rol === 'estudiante') {
            const [solicitudes, estudiantes] = await Promise.all([
                dbAcademica.getSolicitudes(),
                dbAcademica.getEstudiantes()
            ]);

            const solicitudEnEspera = solicitudes.find(s =>
                String(s.correo || '').toLowerCase() === correoLimpio && (s.estado === 'Pendiente' || !s.estado)
            );
            if (solicitudEnEspera) {
                return res.status(403).json({
                    success: false,
                    message: `Acceso restringido: Tu solicitud de inscripción para ${solicitudEnEspera.nombre} está en estado de ESPERA (Pendiente de Aprobación).\n\nEl Coordinador de Práctica debe revisar y aceptar tu solicitud antes de que puedas iniciar sesión.`
                });
            }

            const estudiante = estudiantes.find(e =>
                String(e.correo || '').toLowerCase() === correoLimpio && (e.clave === claveLimpia || e.password === claveLimpia)
            );
            if (estudiante) {
                return res.status(200).json({
                    success: true,
                    user: {
                        id: estudiante.id_estudiante,
                        id_estudiante: estudiante.id_estudiante,
                        documento: estudiante.documento,
                        nombre: estudiante.nombre,
                        correo: estudiante.correo,
                        rol: 'estudiante',
                        semestre: estudiante.semestre ?? null
                    },
                    redirectUrl: 'views/estudiante.html'
                });
            }

            if (estudiantes.some(e => String(e.correo || '').toLowerCase() === correoLimpio)) {
                return res.status(401).json({ success: false, message: 'Contraseña incorrecta. Por favor verifica tu clave.' });
            }
            return res.status(404).json({
                success: false,
                message: 'Estudiante no registrado o aún no aprobado por el Coordinador de Prácticas.'
            });
        } else if (rol === 'institucion') {
            const instituciones = await dbAcademica.getInstituciones();
            const institucion = instituciones.find(i =>
                String(i.correo || '').toLowerCase() === correoLimpio && (i.clave === claveLimpia || i.password === claveLimpia)
            );
            if (institucion) {
                return res.status(200).json({
                    success: true,
                    user: {
                        id: institucion.id_institucion,
                        id_institucion: institucion.id_institucion,
                        nombre: institucion.nombre_colegio || institucion.nombre,
                        correo: institucion.correo,
                        rol: 'institucion',
                        direccion: institucion.direccion
                    },
                    redirectUrl: 'views/institucion.html'
                });
            }
        }

        return res.status(401).json({ success: false, message: 'Credenciales inválidas para el rol académico seleccionado.' });
    } catch (error) {
        res.status(500).json({ success: false, message: `Error de autenticación: ${error.message}` });
    }
});

// ============================================================================
// RUTAS API: SOLICITUDES DE ASPIRANTES (PostgreSQL gestion_academica.solicitudes)
// ============================================================================

/**
 * GET /api/solicitudes
 * Consulta las solicitudes radicadas por aspirantes directamente en PostgreSQL.
 */
app.get('/api/solicitudes', async (req, res) => {
    try {
        res.status(200).json(await dbAcademica.getSolicitudes());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/solicitudes
 * Radica una nueva postulación de práctica en `gestion_academica.solicitudes`.
 */
app.post('/api/solicitudes', async (req, res) => {
    try {
        const nueva = req.body;
        if (!nueva || !nueva.correo || !nueva.nombre) {
            return res.status(400).json({ error: 'Nombre y correo son obligatorios para radicar solicitud.' });
        }

        const [estudiantes, solicitudes] = await Promise.all([
            dbAcademica.getEstudiantes(),
            dbAcademica.getSolicitudes()
        ]);
        const correoNorm = String(nueva.correo).trim().toLowerCase();

        if (estudiantes.some(e => String(e.correo || '').toLowerCase() === correoNorm)) {
            return res.status(409).json({ error: `El correo ${correoNorm} ya se encuentra matriculado en el sistema.` });
        }

        if (solicitudes.some(s => String(s.correo || '').toLowerCase() === correoNorm)) {
            return res.status(409).json({ error: `Ya existe una solicitud pendiente para el correo ${correoNorm}.` });
        }

        const creada = await dbAcademica.insertSolicitud(nueva);
        res.status(201).json(creada);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * DELETE /api/solicitudes/:id
 * Remueve una solicitud procesada (aprobada o rechazada) de PostgreSQL.
 */
app.delete('/api/solicitudes/:id', async (req, res) => {
    try {
        const identificador = decodeURIComponent(req.params.id || '').trim();
        const eliminada = await dbAcademica.deleteSolicitud(identificador);
        res.status(200).json({
            ok: true,
            eliminado: eliminada,
            mensaje: `Solicitud ${identificador} procesada exitosamente.`
        });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

// ============================================================================
// RUTAS API: MICROSERVICIO 1 (GESTIÓN ACADÉMICA - gestion_academica)
// ============================================================================

/**
 * GET /api/academica/estudiantes
 * Lista todos los estudiantes matriculados en `gestion_academica.Estudiante`.
 */
app.get('/api/academica/estudiantes', async (req, res) => {
    try {
        res.status(200).json(await dbAcademica.getEstudiantes());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/academica/estudiantes
 * Registra un nuevo estudiante en `gestion_academica.Estudiante` (semestre opcional).
 */
app.post('/api/academica/estudiantes', async (req, res) => {
    try {
        const { documento, id_estudiante, nombre, correo } = req.body;
        if ((!documento && !id_estudiante) || !nombre || !correo) {
            return res.status(400).json({
                error: 'Parámetros incompletos. Documento/ID, nombre y correo son obligatorios.'
            });
        }
        const creado = await dbAcademica.insertEstudiante(req.body);
        res.status(201).json(creado);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * PUT /api/academica/estudiantes/:documento
 * Actualiza los datos académicos o credenciales de un estudiante por documento o ID.
 */
app.put('/api/academica/estudiantes/:documento', async (req, res) => {
    try {
        const estudianteActualizado = await dbAcademica.updateEstudiante(req.params.documento, req.body);
        if (!estudianteActualizado) {
            return res.status(404).json({ error: `Estudiante ${req.params.documento} no encontrado.` });
        }
        res.status(200).json(estudianteActualizado);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * DELETE /api/academica/estudiantes/:documento
 * Elimina en cascada primero bitácoras/evidencias/evaluaciones de sus prácticas
 * en el Microservicio 2 (`seguimiento_practicas`) y luego borra prácticas y estudiante
 * en `gestion_academica`.
 */
app.delete('/api/academica/estudiantes/:documento', async (req, res) => {
    try {
        const doc = decodeURIComponent(req.params.documento || '').trim();
        const practicasAsociadas = await dbAcademica.getPracticasByEstudiante(doc);
        for (const idPrac of practicasAsociadas) {
            await dbSeguimiento.deleteByPractica(idPrac);
        }
        const resultado = await dbAcademica.deleteEstudiante(doc);
        res.status(200).json({
            ok: true,
            eliminado: resultado.deleted,
            practicasEliminadas: practicasAsociadas,
            mensaje: `Estudiante ${doc} eliminado exitosamente.`
        });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

/**
 * GET /api/academica/tutores
 * Lista los docentes asesores registrados en `gestion_academica.Tutor_Academico`.
 */
app.get('/api/academica/tutores', async (req, res) => {
    try {
        res.status(200).json(await dbAcademica.getTutores());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/academica/tutores
 * Crea un nuevo tutor académico identificado por `documento_tu`.
 */
app.post('/api/academica/tutores', async (req, res) => {
    try {
        res.status(201).json(await dbAcademica.insertTutor(req.body));
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * PUT /api/academica/tutores/:documento
 * Actualiza los datos o especialidad de un docente asesor.
 */
app.put('/api/academica/tutores/:documento', async (req, res) => {
    try {
        const actualizado = await dbAcademica.updateTutor(req.params.documento, req.body);
        if (!actualizado) {
            return res.status(404).json({ error: `Tutor ${req.params.documento} no encontrado.` });
        }
        res.status(200).json(actualizado);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * DELETE /api/academica/tutores/:documento
 * Desvincula primero evaluaciones en `seguimiento_practicas` y prácticas en
 * `gestion_academica` antes de eliminar al docente asesor.
 */
app.delete('/api/academica/tutores/:documento', async (req, res) => {
    try {
        const doc = decodeURIComponent(req.params.documento || '').trim();
        await dbSeguimiento.unlinkTutor(doc);
        const eliminado = await dbAcademica.deleteTutor(doc);
        res.status(200).json({
            ok: true,
            eliminado,
            mensaje: `Tutor ${doc} eliminado exitosamente.`
        });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

/**
 * GET /api/academica/instituciones
 * Consulta las instituciones receptoras registradas en `gestion_academica.Institucion`.
 */
app.get('/api/academica/instituciones', async (req, res) => {
    try {
        res.status(200).json(await dbAcademica.getInstituciones());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/academica/instituciones
 * Registra una nueva institución educativa receptora con sus credenciales de acceso.
 */
app.post('/api/academica/instituciones', async (req, res) => {
    try {
        res.status(201).json(await dbAcademica.insertInstitucion(req.body));
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * PUT /api/academica/instituciones/:id
 * Actualiza información de contacto, dirección o correo de una sede escolar.
 */
app.put('/api/academica/instituciones/:id', async (req, res) => {
    try {
        const actualizada = await dbAcademica.updateInstitucion(req.params.id, req.body);
        if (!actualizada) {
            return res.status(404).json({ error: `Institución ${req.params.id} no encontrada.` });
        }
        res.status(200).json(actualizada);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * DELETE /api/academica/instituciones/:id
 * Desvincula prácticas, actualiza preferencias en solicitudes y elimina convenios
 * dependientes antes de borrar la institución receptora.
 */
app.delete('/api/academica/instituciones/:id', async (req, res) => {
    try {
        const idInst = decodeURIComponent(req.params.id || '').trim();
        const eliminada = await dbAcademica.deleteInstitucion(idInst);
        res.status(200).json({
            ok: true,
            eliminado: eliminada,
            mensaje: `Institución ${idInst} eliminada exitosamente.`
        });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

// CONVENIOS INTERINSTITUCIONALES

/**
 * GET /api/academica/convenios
 * Lista todos los convenios interinstitucionales almacenados en `gestion_academica.convenio`.
 */
app.get('/api/academica/convenios', async (req, res) => {
    try {
        res.status(200).json(await dbAcademica.getConvenios());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/academica/convenios
 * Registra un nuevo convenio institucional con vigencia y cupos autorizados.
 */
app.post('/api/academica/convenios', async (req, res) => {
    try {
        res.status(201).json(await dbAcademica.insertConvenio(req.body));
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * PUT /api/academica/convenios/:id
 * Actualiza un convenio (por ejemplo al estampar firma rectoral del Director).
 */
app.put('/api/academica/convenios/:id', async (req, res) => {
    try {
        const actualizado = await dbAcademica.updateConvenio(req.params.id, req.body);
        if (!actualizado) {
            return res.status(404).json({ error: `Convenio ${req.params.id} no encontrado.` });
        }
        res.status(200).json(actualizado);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * DELETE /api/academica/convenios/:id
 * Elimina un convenio institucional por su código único `id_convenio`.
 */
app.delete('/api/academica/convenios/:id', async (req, res) => {
    try {
        const idConv = decodeURIComponent(req.params.id || '').trim();
        const eliminado = await dbAcademica.deleteConvenio(idConv);
        res.status(200).json({
            ok: true,
            eliminado,
            mensaje: `Convenio ${idConv} eliminado exitosamente.`
        });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

// COORDINADORES

/**
 * GET /api/academica/coordinadores
 * Consulta las cuentas administrativas de Coordinación y Dirección de Programa.
 */
app.get('/api/academica/coordinadores', async (req, res) => {
    try {
        res.status(200).json(await dbAcademica.getCoordinadores());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/academica/coordinadores
 * Crea una nueva cuenta administrativa en `gestion_academica.coordinador`.
 */
app.post('/api/academica/coordinadores', async (req, res) => {
    try {
        res.status(201).json(await dbAcademica.insertCoordinador(req.body));
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// TIPOS DE PRÁCTICA Y PRÁCTICAS

/**
 * GET /api/academica/tipos-practica
 * Lista las modalidades oficiales de práctica según el Decreto 1075 de 2015.
 */
app.get('/api/academica/tipos-practica', async (req, res) => {
    try {
        res.status(200).json(await dbAcademica.getTiposPractica());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/academica/practicas
 * Lista las asignaciones de prácticas académicas con datos resueltos de estudiante, tutor e institución.
 */
app.get('/api/academica/practicas', async (req, res) => {
    try {
        res.status(200).json(await dbAcademica.getPracticas());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/academica/practicas
 * Asigna una nueva práctica académica vinculando estudiante, tutor, sede y modalidad.
 */
app.post('/api/academica/practicas', async (req, res) => {
    try {
        res.status(201).json(await dbAcademica.insertPractica(req.body));
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * PUT /api/academica/practicas/:id
 * Actualiza estado, horas, validación presencial de sede o autorización final de culminación.
 */
app.put('/api/academica/practicas/:id', async (req, res) => {
    try {
        const actualizada = await dbAcademica.updatePractica(req.params.id, req.body);
        if (!actualizada) {
            return res.status(404).json({ error: `Práctica ${req.params.id} no encontrada.` });
        }
        res.status(200).json(actualizada);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * DELETE /api/academica/practicas/:id
 * Elimina en cascada las bitácoras, evidencias y evaluaciones asociadas en el
 * Microservicio 2 (`seguimiento_practicas`) antes de borrar la práctica principal.
 */
app.delete('/api/academica/practicas/:id', async (req, res) => {
    try {
        const idPrac = decodeURIComponent(req.params.id || '').trim();
        await dbSeguimiento.deleteByPractica(idPrac);
        const eliminada = await dbAcademica.deletePractica(idPrac);
        res.status(200).json({
            ok: true,
            eliminado: eliminada,
            mensaje: `Práctica ${idPrac} eliminada exitosamente.`
        });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

// ============================================================================
// RUTAS API: MICROSERVICIO 2 (SEGUIMIENTO DE PRÁCTICAS - seguimiento_practicas)
// ============================================================================

/**
 * GET /api/seguimiento/bitacoras
 * Consulta todas las bitácoras registradas ordenadas de la más reciente a la más antigua.
 */
app.get('/api/seguimiento/bitacoras', async (req, res) => {
    try {
        res.status(200).json(await dbSeguimiento.getBitacoras());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/seguimiento/bitacoras | POST /api/bitacoras
 * Registra una bitácora de jornada formativa y, si incluye archivo soporte,
 * persiste automáticamente el registro vinculado en `seguimiento_practicas.Evidencia`.
 */
app.post(['/api/seguimiento/bitacoras', '/api/bitacoras'], async (req, res) => {
    try {
        const { id_practica, fecha, descripcion, archivo, horas } = req.body;
        const bitacorasExistentes = await dbSeguimiento.getBitacoras();
        const idGenerado = req.body.id_bitacora || `BIT-${Date.now().toString().slice(-4)}`;

        let practicaAsignada = id_practica;
        if (!practicaAsignada) {
            const practicasDb = await dbAcademica.getPracticas();
            if (practicasDb && practicasDb.length > 0) {
                practicaAsignada = practicasDb[practicasDb.length - 1].id_practica;
            }
        }

        const nuevaBitacora = {
            id_bitacora: idGenerado,
            fecha: fecha || new Date().toISOString().split('T')[0],
            descripcion: descripcion || 'Jornada pedagógica desarrollada en aula',
            observaciones: req.body.observaciones || null,
            estado: req.body.estado || 'Pendiente',
            horas: parseInt(horas, 10) || 4,
            id_practica: practicaAsignada || 'PRAC-001'
        };

        const bitacoraCreada = await dbSeguimiento.insertBitacora(nuevaBitacora);

        if (archivo) {
            const evidenciasExistentes = await dbSeguimiento.getEvidencias();
            const idEvidencia = `EVI-${String(evidenciasExistentes.length + 1).padStart(3, '0')}-${Date.now().toString().slice(-3)}`;
            await dbSeguimiento.insertEvidencia({
                id_evidencia: idEvidencia,
                fecha: nuevaBitacora.fecha,
                nombre: `Evidencia_${nuevaBitacora.id_bitacora}`,
                tipo: 'Documento PDF',
                archivo,
                descripcion: `Soporte de ${nuevaBitacora.horas} horas de práctica`,
                id_practica: nuevaBitacora.id_practica,
                id_bitacora: nuevaBitacora.id_bitacora
            });
        }

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
 * Actualiza el estado de aprobación ('Aprobado', 'Rechazado', 'Pendiente') y observaciones docentes.
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
 * Lista todos los soportes digitales registrados en `seguimiento_practicas.Evidencia`.
 */
app.get('/api/seguimiento/evidencias', async (req, res) => {
    try {
        res.status(200).json(await dbSeguimiento.getEvidencias());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/seguimiento/evaluaciones
 * Lista todas las evaluaciones pedagógicas emitidas en `seguimiento_practicas.Evaluacion`.
 */
app.get('/api/seguimiento/evaluaciones', async (req, res) => {
    try {
        res.status(200).json(await dbSeguimiento.getEvaluaciones());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/seguimiento/evaluaciones
 * Registra una calificación cuantitativa (0.0 a 5.0) emitida por un tutor (`documento_tu`).
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
// ORQUESTACIÓN INTER-MICROSERVICIOS: REPORTES E INFORMES CONSOLIDADOS
// ============================================================================

/**
 * GET /api/reportes/consolidado
 * Orquestador REST de auditoría académica entre ambos microservicios.
 */
app.get('/api/reportes/consolidado', async (req, res) => {
    try {
        const [
            estudiantes,
            tutores,
            instituciones,
            tiposPractica,
            practicas,
            convenios,
            solicitudes,
            bitacoras,
            evidencias,
            evaluaciones
        ] = await Promise.all([
            dbAcademica.getEstudiantes(),
            dbAcademica.getTutores(),
            dbAcademica.getInstituciones(),
            dbAcademica.getTiposPractica(),
            dbAcademica.getPracticas(),
            dbAcademica.getConvenios(),
            dbAcademica.getSolicitudes(),
            dbSeguimiento.getBitacoras(),
            dbSeguimiento.getEvidencias(),
            dbSeguimiento.getEvaluaciones()
        ]);

        const filtroEstado = (req.query.estado || '').trim().toLowerCase();
        const filtroBusqueda = (req.query.q || '').trim().toLowerCase();

        let registrosConsolidados = practicas.map(p => {
            const estudiante = estudiantes.find(e => e.documento === p.documento || e.id_estudiante === p.id_estudiante);
            const tutor = tutores.find(t => t.documento_tu === p.documento_tu);
            const institucion = instituciones.find(i => i.id_institucion === p.id_institucion);
            const tipo = tiposPractica.find(tp => tp.id_tipo === p.id_tipo);

            const bitacorasPractica = bitacoras.filter(b => b.id_practica === p.id_practica);
            const bitacorasAprobadas = bitacorasPractica.filter(b => b.estado === 'Aprobado');
            const bitacorasPendientes = bitacorasPractica.filter(b => b.estado === 'Pendiente');
            const evidenciasPractica = evidencias.filter(ev => ev.id_practica === p.id_practica);

            const idsBitacoras = bitacorasPractica.map(b => b.id_bitacora);
            const evaluacionesPractica = evaluaciones.filter(ev =>
                ev.id_practica === p.id_practica ||
                (ev.id_bitacora && idsBitacoras.includes(ev.id_bitacora))
            );

            const horasAprobadasBitacoras = bitacorasAprobadas.reduce((acc, b) => acc + (parseInt(b.horas, 10) || 4), 0);
            const horasRegistradasBitacoras = bitacorasPractica.reduce((acc, b) => acc + (parseInt(b.horas, 10) || 4), 0);
            const horasAprobadas = Math.max(horasAprobadasBitacoras, parseInt(p.horas_cumplidas, 10) || 0);
            const horasObjetivo = parseInt(p.horas_objetivo, 10) || 80;
            const porcentajeCumplimiento = horasObjetivo > 0
                ? Math.min(100, Math.round((horasAprobadas / horasObjetivo) * 100))
                : 0;

            const calificacionPromedio = evaluacionesPractica.length > 0
                ? Number((evaluacionesPractica.reduce((acc, ev) => acc + parseFloat(ev.calificacion || 0), 0) / evaluacionesPractica.length).toFixed(1))
                : null;

            const nombreEstudiante = estudiante
                ? estudiante.nombre
                : (p.estudiante_completo || p.documento);
            const nombreTutor = tutor
                ? tutor.nombre
                : (p.tutor_completo || p.documento_tu);

            return {
                id_practica: p.id_practica,
                documento_estudiante: p.documento,
                estudiante_nombre: nombreEstudiante,
                estudiante_correo: estudiante ? estudiante.correo : (p.estudiante_correo || '-'),
                semestre: estudiante ? estudiante.semestre : null,
                documento_tu: p.documento_tu,
                tutor_nombre: nombreTutor,
                id_institucion: p.id_institucion,
                institucion_nombre: institucion ? (institucion.nombre_colegio || institucion.nombre) : (p.institucion_nombre || p.id_institucion),
                id_tipo: p.id_tipo,
                tipo_nombre: tipo ? tipo.nombre : (p.tipo_nombre || p.id_tipo),
                fecha_ini: p.fecha_ini,
                fecha_fin: p.fecha_fin,
                horas_aprobadas: horasAprobadas,
                horas_registradas: horasRegistradasBitacoras,
                horas_objetivo: horasObjetivo,
                porcentaje_cumplimiento: porcentajeCumplimiento,
                total_bitacoras: bitacorasPractica.length,
                bitacoras_aprobadas: bitacorasAprobadas.length,
                bitacoras_pendientes: bitacorasPendientes.length,
                total_evidencias: evidenciasPractica.length,
                calificacion_promedio: calificacionPromedio,
                validado_institucion: Boolean(p.validado_institucion),
                estado: p.estado || 'En Curso'
            };
        });

        if (filtroEstado && filtroEstado !== 'todos') {
            registrosConsolidados = registrosConsolidados.filter(r =>
                r.estado.toLowerCase() === filtroEstado
            );
        }

        if (filtroBusqueda) {
            registrosConsolidados = registrosConsolidados.filter(r =>
                r.id_practica.toLowerCase().includes(filtroBusqueda) ||
                r.estudiante_nombre.toLowerCase().includes(filtroBusqueda) ||
                r.tutor_nombre.toLowerCase().includes(filtroBusqueda) ||
                r.institucion_nombre.toLowerCase().includes(filtroBusqueda)
            );
        }

        const notasValidas = registrosConsolidados
            .map(r => r.calificacion_promedio)
            .filter(n => n !== null);
        const promedioCalificaciones = notasValidas.length > 0
            ? Number((notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length).toFixed(2))
            : 0;

        const cumplimientoPromedioPct = registrosConsolidados.length > 0
            ? Math.round(registrosConsolidados.reduce((acc, r) => acc + r.porcentaje_cumplimiento, 0) / registrosConsolidados.length)
            : 0;

        const horasAprobadasTotales = registrosConsolidados.reduce((acc, r) => acc + r.horas_aprobadas, 0);

        res.status(200).json({
            fecha_generacion: new Date().toISOString(),
            normativa: 'Decreto 1075 de 2015 - MEN',
            resumen_auditoria: {
                total_practicas: registrosConsolidados.length,
                total_estudiantes: estudiantes.length,
                total_tutores: tutores.length,
                total_instituciones: instituciones.length,
                total_convenios: convenios.length,
                total_solicitudes: solicitudes.length,
                practicas_en_curso: registrosConsolidados.filter(r => r.estado === 'En Curso').length,
                practicas_culminadas: registrosConsolidados.filter(r => r.estado === 'Culminada').length,
                horas_aprobadas_totales: horasAprobadasTotales,
                cumplimiento_promedio_pct: cumplimientoPromedioPct,
                promedio_calificaciones: promedioCalificaciones,
                total_bitacoras: bitacoras.length,
                total_evidencias: evidencias.length
            },
            registros: registrosConsolidados
        });
    } catch (error) {
        res.status(500).json({ error: `Error al generar informe consolidado: ${error.message}` });
    }
});

// ============================================================================
// ENRUTAMIENTO PRINCIPAL Y AUTO-MIGRACIÓN AL ARRANCAR
// ============================================================================

/**
 * GET /
 * Sirve el portal de inicio de sesión principal (`index.html`).
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

/**
 * Inicialización del servidor HTTP y verificación/auto-migración de ambos
 * esquemas PostgreSQL en Supabase (`gestion_academica` y `seguimiento_practicas`).
 */
app.listen(PORT, async () => {
    await Promise.all([
        dbAcademica.inicializarEsquema(),
        dbSeguimiento.inicializarEsquema()
    ]);
    console.log(`[Release 1.0] Software para la Gestión y Seguimiento de Prácticas Académicas activo en http://localhost:${PORT}`);
});
