/**
 * SISTEMA INTEGRAL DE GESTIÓN DE PRÁCTICAS ACADÉMICAS - UDI
 * Servidor Backend en Node.js, Express y Nodemon
 * 
 * Gestiona 2 Bases de Datos / Esquemas Relacionales en la Nube:
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
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

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
app.get('/api/estado-servidor', (req, res) => {
    res.json({
        sistema: 'Sistema de Gestión de Prácticas Pedagógicas UDI',
        version: '2.0.0 (Segunda Entrega)',
        entorno: process.env.NODE_ENV || 'development',
        bases_datos: {
            db_1: {
                nombre: dbAcademica.nombre,
                estado: dbAcademica.estado,
                entidades: ['Estudiante', 'Tutor_Academico', 'Institucion', 'Tipo_Practica', 'Practica'],
                total_estudiantes: dbAcademica.getEstudiantes().length,
                total_practicas: dbAcademica.getPracticas().length
            },
            db_2: {
                nombre: dbSeguimiento.nombre,
                estado: dbSeguimiento.estado,
                entidades: ['Bitacora', 'Evidencia', 'Evaluacion'],
                total_bitacoras: dbSeguimiento.getBitacoras().length,
                total_evaluaciones: dbSeguimiento.getEvaluaciones().length
            }
        }
    });
});

// ============================================================================
// RUTAS API: BASE DE DATOS 1 (GESTIÓN ACADÉMICA)
// ============================================================================

// --- Estudiantes (CRUD) ---
app.get('/api/academica/estudiantes', (req, res) => {
    res.json(dbAcademica.getEstudiantes());
});

app.post('/api/academica/estudiantes', (req, res) => {
    try {
        const { documento, nombre, apellido, correo, semestre, telefono } = req.body;
        if (!documento || !nombre || !apellido || !correo || !semestre) {
            return res.status(400).json({ error: 'Campos obligatorios incompletos' });
        }
        const creado = dbAcademica.insertEstudiante({ documento, nombre, apellido, correo, semestre: parseInt(semestre), telefono });
        res.status(201).json(creado);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.put('/api/academica/estudiantes/:documento', (req, res) => {
    const actualizado = dbAcademica.updateEstudiante(req.params.documento, req.body);
    if (!actualizado) return res.status(404).json({ error: 'Estudiante no encontrado' });
    res.json(actualizado);
});

app.delete('/api/academica/estudiantes/:documento', (req, res) => {
    const borrado = dbAcademica.deleteEstudiante(req.params.documento);
    if (!borrado) return res.status(404).json({ error: 'Estudiante no encontrado' });
    res.json({ mensaje: `Estudiante ${req.params.documento} eliminado exitosamente.` });
});

// --- Tutores Académicos ---
app.get('/api/academica/tutores', (req, res) => {
    res.json(dbAcademica.getTutores());
});

app.post('/api/academica/tutores', (req, res) => {
    const nuevo = dbAcademica.insertTutor(req.body);
    res.status(201).json(nuevo);
});

// --- Instituciones ---
app.get('/api/academica/instituciones', (req, res) => {
    res.json(dbAcademica.getInstituciones());
});

app.post('/api/academica/instituciones', (req, res) => {
    const nuevo = dbAcademica.insertInstitucion(req.body);
    res.status(201).json(nuevo);
});

app.put('/api/academica/instituciones/:id', (req, res) => {
    const actualizado = dbAcademica.updateInstitucion(req.params.id, req.body);
    if (!actualizado) return res.status(404).json({ error: 'Institución no encontrada' });
    res.json(actualizado);
});

app.delete('/api/academica/instituciones/:id', (req, res) => {
    const borrado = dbAcademica.deleteInstitucion(req.params.id);
    if (!borrado) return res.status(404).json({ error: 'Institución no encontrada' });
    res.json({ mensaje: 'Institución eliminada' });
});

// --- Tipos de Práctica ---
app.get('/api/academica/tipos-practica', (req, res) => {
    res.json(dbAcademica.getTiposPractica());
});

// --- Prácticas (Relación Central) ---
app.get('/api/academica/practicas', (req, res) => {
    res.json(dbAcademica.getPracticas());
});

app.post('/api/academica/practicas', (req, res) => {
    try {
        const nueva = dbAcademica.insertPractica(req.body);
        res.status(201).json(nueva);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.put('/api/academica/practicas/:id', (req, res) => {
    const act = dbAcademica.updatePractica(req.params.id, req.body);
    if (!act) return res.status(404).json({ error: 'Práctica no encontrada' });
    res.json(act);
});

// ============================================================================
// RUTAS API: BASE DE DATOS 2 (SEGUIMIENTO DE PRÁCTICAS)
// ============================================================================

// --- Bitácoras (Diagrama de Secuencia UML: POST /api/bitacoras HTTP 201 Created) ---
app.get('/api/seguimiento/bitacoras', (req, res) => {
    res.json(dbSeguimiento.getBitacoras());
});

app.post(['/api/seguimiento/bitacoras', '/api/bitacoras'], (req, res) => {
    try {
        const { id_practica, fecha, descripcion, horas, archivo } = req.body;
        
        const total = dbSeguimiento.getBitacoras().length;
        const nuevoId = req.body.id_bitacora || `BIT-${String(total + 1).padStart(3, '0')}`;
        
        const nuevaBitacora = {
            id_bitacora: nuevoId,
            fecha: fecha || new Date().toISOString().split('T')[0],
            descripcion: descripcion || 'Registro de actividad pedagógica',
            observaciones: req.body.observaciones || null,
            estado: req.body.estado || 'Pendiente',
            id_practica: id_practica || 'PRAC-001'
        };

        const creada = dbSeguimiento.insertBitacora(nuevaBitacora);

        // Si se envió archivo de evidencia, se crea la entidad Evidencia asociada (Composición UML)
        if (archivo) {
            const idEv = `EVI-${String(dbSeguimiento.getEvidencias().length + 1).padStart(3, '0')}`;
            dbSeguimiento.insertEvidencia({
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

app.put('/api/seguimiento/bitacoras/:id', (req, res) => {
    const actualizada = dbSeguimiento.updateBitacora(req.params.id, req.body);
    if (!actualizada) return res.status(404).json({ error: 'Bitácora no encontrada' });
    res.json(actualizada);
});

// --- Evidencias ---
app.get('/api/seguimiento/evidencias', (req, res) => {
    res.json(dbSeguimiento.getEvidencias());
});

app.post('/api/seguimiento/evidencias', (req, res) => {
    try {
        const nueva = dbSeguimiento.insertEvidencia(req.body);
        res.status(201).json(nueva);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// --- Evaluaciones ---
app.get('/api/seguimiento/evaluaciones', (req, res) => {
    res.json(dbSeguimiento.getEvaluaciones());
});

app.post('/api/seguimiento/evaluaciones', (req, res) => {
    try {
        const nueva = dbSeguimiento.insertEvaluacion(req.body);
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
    console.log(`  Servidor Node.js + Express en: http://${HOST}:${PORT}`);
    console.log(`  BD 1: ${dbAcademica.nombre}`);
    console.log(`  BD 2: ${dbSeguimiento.nombre}`);
    console.log(`=======================================================`);
});
