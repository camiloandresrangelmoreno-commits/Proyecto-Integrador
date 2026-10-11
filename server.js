/**
 * SISTEMA INTEGRAL DE GESTIÓN DE PRÁCTICAS ACADÉMICAS - UDI
 * Servidor Backend en Node.js, Express y Nodemon
 * 
 * Gestiona 2 Bases de Datos / Esquemas Relacionales en la Nube (Supabase):
 * 1. dbAcademica (Estudiante, Tutor_Academico, Institucion, Tipo_Practica, Practica)
 * 2. dbSeguimiento (Bitacora, Evidencia, Evaluacion)
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { dbAcademica } from './backend/dbAcademica.js';
import { dbSeguimiento } from './backend/dbSeguimiento.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = 'localhost';

// Middlewares estándar de Express
app.use(cors());
app.use(express.json());

// Enrutamiento de estáticos (HTML, CSS, JS e imágenes)
app.use(express.static(__dirname, { extensions: ['html', 'htm'] }));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/CSS', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));

// ============================================================================
// ENDPOINTS DE MONITOREO Y SALUD DE LAS 2 BASES DE DATOS EN LA NUBE
// ============================================================================
app.get('/api/estado-servidor', async (req, res) => {
    try {
        const estudiantes = await dbAcademica.getEstudiantes();
        const practicas = await dbAcademica.getPracticas();
        const bitacoras = await dbSeguimiento.getBitacoras();
        const evaluaciones = await dbSeguimiento.getEvaluaciones();

        res.json({
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
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================================================
// RUTAS API: BASE DE DATOS 1 (GESTIÓN ACADÉMICA - SUPABASE)
// ============================================================================

// --- Estudiantes (CRUD) ---
app.get('/api/academica/estudiantes', async (req, res) => {
    try {
        const estudiantes = await dbAcademica.getEstudiantes();
        res.json(estudiantes);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/academica/estudiantes', async (req, res) => {
    try {
        const { documento, nombre, apellido, correo, semestre, telefono } = req.body;
        if (!documento || !nombre || !correo || !semestre) {
            return res.status(400).json({ error: 'Campos obligatorios incompletos (documento, nombre, correo, semestre)' });
        }
        const creado = await dbAcademica.insertEstudiante({
            documento,
            nombre,
            apellido: apellido || '',
            correo,
            semestre: parseInt(semestre),
            telefono: telefono || ''
        });
        res.status(201).json(creado);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.put('/api/academica/estudiantes/:documento', async (req, res) => {
    try {
        const actualizado = await dbAcademica.updateEstudiante(req.params.documento, req.body);
        if (!actualizado) return res.status(404).json({ error: 'Estudiante no encontrado' });
        res.json(actualizado);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.delete('/api/academica/estudiantes/:documento', async (req, res) => {
    try {
        const borrado = await dbAcademica.deleteEstudiante(req.params.documento);
        if (!borrado) return res.status(404).json({ error: 'Estudiante no encontrado' });
        res.json({ mensaje: `Estudiante ${req.params.documento} eliminado exitosamente.` });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// --- Tutores Académicos ---
app.get('/api/academica/tutores', async (req, res) => {
    try {
        const tutores = await dbAcademica.getTutores();
        res.json(tutores);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/academica/tutores', async (req, res) => {
    try {
        const nuevo = await dbAcademica.insertTutor(req.body);
        res.status(201).json(nuevo);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// --- Instituciones ---
app.get('/api/academica/instituciones', async (req, res) => {
    try {
        const instituciones = await dbAcademica.getInstituciones();
        res.json(instituciones);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/academica/instituciones', async (req, res) => {
    try {
        const nuevo = await dbAcademica.insertInstitucion(req.body);
        res.status(201).json(nuevo);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// --- Tipos de Práctica ---
app.get('/api/academica/tipos-practica', async (req, res) => {
    try {
        const tipos = await dbAcademica.getTiposPractica();
        res.json(tipos);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- Prácticas (Relación Central) ---
app.get('/api/academica/practicas', async (req, res) => {
    try {
        const practicas = await dbAcademica.getPracticas();
        res.json(practicas);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/academica/practicas', async (req, res) => {
    try {
        const nueva = await dbAcademica.insertPractica(req.body);
        res.status(201).json(nueva);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// ============================================================================
// RUTAS API: BASE DE DATOS 2 (SEGUIMIENTO DE PRÁCTICAS - SUPABASE)
// ============================================================================

// --- Bitácoras (Diagrama de Secuencia UML: POST /api/bitacoras HTTP 201 Created) ---
app.get('/api/seguimiento/bitacoras', async (req, res) => {
    try {
        const bitacoras = await dbSeguimiento.getBitacoras();
        res.json(bitacoras);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post(['/api/seguimiento/bitacoras', '/api/bitacoras'], async (req, res) => {
    try {
        const { id_practica, fecha, descripcion, horas, archivo } = req.body;
        
        const bitacorasActuales = await dbSeguimiento.getBitacoras();
        const total = bitacorasActuales.length;
        const nuevoId = req.body.id_bitacora || `BIT-${String(total + 1).padStart(3, '0')}`;
        
        const nuevaBitacora = {
            id_bitacora: nuevoId,
            fecha: fecha || new Date().toISOString().split('T')[0],
            descripcion: descripcion || 'Registro de actividad pedagógica',
            observaciones: req.body.observaciones || null,
            estado: req.body.estado || 'Pendiente',
            id_practica: id_practica || 'PRAC-001'
        };

        const creada = await dbSeguimiento.insertBitacora(nuevaBitacora);

        // Si se envió archivo de evidencia, se crea la entidad Evidencia asociada (Composición UML)
        if (archivo) {
            const evidenciasActuales = await dbSeguimiento.getEvidencias();
            const idEv = `EVI-${String(evidenciasActuales.length + 1).padStart(3, '0')}`;
            await dbSeguimiento.insertEvidencia({
                id_evidencia: idEv,
                fecha: nuevaBitacora.fecha,
                nombre: `Evidencia_${nuevaBitacora.id_bitacora}`,
                tipo: 'PDF / Archivo',
                archivo: archivo,
                descripcion: 'Soporte adjunto en la jornada de práctica',
                id_practica: nuevaBitacora.id_practica,
                id_bitacora: nuevaBitacora.id_bitacora
            });
        }

        // Respuesta HTTP 201 Created como lo especifica el Diagrama de Secuencia
        res.status(201).json({
            mensaje: 'Bitácora y evidencias registradas exitosamente',
            bitacora: creada
        });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.put('/api/seguimiento/bitacoras/:id', async (req, res) => {
    try {
        const actualizada = await dbSeguimiento.updateBitacora(req.params.id, req.body);
        if (!actualizada) return res.status(404).json({ error: 'Bitácora no encontrada' });
        res.json(actualizada);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// --- Evidencias ---
app.get('/api/seguimiento/evidencias', async (req, res) => {
    try {
        const evidencias = await dbSeguimiento.getEvidencias();
        res.json(evidencias);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/seguimiento/evidencias', async (req, res) => {
    try {
        const nueva = await dbSeguimiento.insertEvidencia(req.body);
        res.status(201).json(nueva);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// --- Evaluaciones ---
app.get('/api/seguimiento/evaluaciones', async (req, res) => {
    try {
        const evaluaciones = await dbSeguimiento.getEvaluaciones();
        res.json(evaluaciones);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/seguimiento/evaluaciones', async (req, res) => {
    try {
        const nueva = await dbSeguimiento.insertEvaluacion(req.body);
        res.status(201).json(nueva);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// Ruta principal para servir index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Iniciar servidor
app.listen(PORT, HOST, () => {
    console.log(`=======================================================`);
    console.log(`  SISTEMA DE GESTIÓN DE PRÁCTICAS UDI (BACKEND ACTIVO) `);
    console.log(`  Servidor Node.js + Express en: http://localhost:${PORT}`);
    console.log(`  BD 1: ${dbAcademica.nombre}`);
    console.log(`  BD 2: ${dbSeguimiento.nombre}`);
    console.log(`=======================================================`);
});
