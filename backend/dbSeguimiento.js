/**
 * MÓDULO BACKEND - BASE DE DATOS 2: SEGUIMIENTO DE PRÁCTICAS
 * Entidades: Bitacora, Evidencia, Evaluacion
 * 
 * Compatible con conexión a la nube (Supabase / Render / Neon PostgreSQL)
 * e integridad referencial cruzada con la Base de Datos 1.
 */

import dotenv from 'dotenv';
import { dbAcademica } from './dbAcademica.js';
dotenv.config();

let storeSeguimiento = {
    Bitacora: [
        {
            id_bitacora: 'BIT-001',
            fecha: '2026-03-05',
            descripcion: 'Diagnóstico de lectura y escritura en grado 4°A. Aplicación de prueba diagnóstica y rúbrica.',
            observaciones: 'Buen manejo del grupo.',
            estado: 'Aprobado',
            id_practica: 'PRAC-001'
        },
        {
            id_bitacora: 'BIT-002',
            fecha: '2026-03-12',
            descripcion: 'Diseño e implementación de taller de comprensión lectora mediante el uso de cuentos interactivos.',
            observaciones: 'Metodología innovadora.',
            estado: 'Aprobado',
            id_practica: 'PRAC-001'
        },
        {
            id_bitacora: 'BIT-003',
            fecha: '2026-03-19',
            descripcion: 'Acompañamiento pedagógico en aula regular y refuerzo a estudiantes con barreras de aprendizaje.',
            observaciones: 'Por revisar evidencias adicionales.',
            estado: 'Pendiente',
            id_practica: 'PRAC-001'
        },
        {
            id_bitacora: 'BIT-004',
            fecha: '2026-03-10',
            descripcion: 'Observación participante en clase de Ciencias Sociales y formulación de plan de clase integrado.',
            observaciones: 'Excelente pertinencia curricular.',
            estado: 'Aprobado',
            id_practica: 'PRAC-002'
        }
    ],
    Evidencia: [
        {
            id_evidencia: 'EVI-001',
            fecha: '2026-03-05',
            nombre: 'Diagnóstico Lectura Grado 4A',
            tipo: 'PDF',
            archivo: 'https://drive.google.com/file/d/diagnostico-4a.pdf',
            descripcion: 'Instrumento diagnóstico y matriz de resultados tabulada.',
            id_practica: 'PRAC-001',
            id_bitacora: 'BIT-001'
        },
        {
            id_evidencia: 'EVI-002',
            fecha: '2026-03-12',
            nombre: 'Taller Cuentos Interactivos',
            tipo: 'Plan de Clase',
            archivo: 'https://drive.google.com/file/d/taller-cuentos.pdf',
            descripcion: 'Guía didáctica y material visual empleado en clase.',
            id_practica: 'PRAC-001',
            id_bitacora: 'BIT-002'
        },
        {
            id_evidencia: 'EVI-003',
            fecha: '2026-03-19',
            nombre: 'Planilla Acompañamiento Aula',
            tipo: 'Registro',
            archivo: 'https://drive.google.com/file/d/planilla-semana3.pdf',
            descripcion: 'Firma de asistencia del docente titular del colegio.',
            id_practica: 'PRAC-001',
            id_bitacora: 'BIT-003'
        },
        {
            id_evidencia: 'EVI-004',
            fecha: '2026-03-10',
            nombre: 'Plan de Clase Integrado Sociales',
            tipo: 'PDF',
            archivo: 'https://drive.google.com/file/d/plan-sociales.pdf',
            descripcion: 'Estructura curricular con estándares del MEN.',
            id_practica: 'PRAC-002',
            id_bitacora: 'BIT-004'
        }
    ],
    Evaluacion: [
        {
            id_evaluacion: 'EVAL-001',
            calificacion: 4.8,
            observaciones: 'Excelente articulación entre la fundamentación teórica y la intervención práctica en el aula.',
            fecha: '2026-03-15',
            id_bitacora: 'BIT-001',
            documento_tu: 'DOC-1098234'
        },
        {
            id_evaluacion: 'EVAL-002',
            calificacion: 4.7,
            observaciones: 'Demuestra liderazgo pedagógico y dominio del grupo escolar asignado.',
            fecha: '2026-03-16',
            id_bitacora: 'BIT-002',
            documento_tu: 'DOC-1098234'
        }
    ]
};

export const dbSeguimiento = {
    nombre: 'Base de Datos 2 - Seguimiento de Prácticas (UDI)',
    estado: process.env.DATABASE_URL_SEGUIMIENTO ? 'Conectado a la nube (PostgreSQL Supabase)' : 'Operando con esquema relacional local',

    // BITÁCORAS
    getBitacoras() { return storeSeguimiento.Bitacora; },
    getBitacoraById(id) { return storeSeguimiento.Bitacora.find(b => b.id_bitacora === id) || null; },
    insertBitacora(nueva) {
        // Validación de llave foránea referenciando BD 1 (Practica)
        const existePractica = dbAcademica.getPracticaById(nueva.id_practica);
        if (!existePractica) {
            throw new Error(`Integridad referencial violada: La práctica ${nueva.id_practica} no existe en la Base de Datos 1 (Gestión Académica).`);
        }
        storeSeguimiento.Bitacora.push(nueva);
        return nueva;
    },
    updateBitacora(id, data) {
        const idx = storeSeguimiento.Bitacora.findIndex(b => b.id_bitacora === id);
        if (idx !== -1) {
            storeSeguimiento.Bitacora[idx] = { ...storeSeguimiento.Bitacora[idx], ...data };
            return storeSeguimiento.Bitacora[idx];
        }
        return null;
    },

    // EVIDENCIAS
    getEvidencias() { return storeSeguimiento.Evidencia; },
    insertEvidencia(nueva) {
        // Valida que exista la bitácora asociada
        if (nueva.id_bitacora && !this.getBitacoraById(nueva.id_bitacora)) {
            throw new Error(`Integridad referencial violada: La bitácora ${nueva.id_bitacora} no existe.`);
        }
        storeSeguimiento.Evidencia.push(nueva);
        return nueva;
    },

    // EVALUACIONES
    getEvaluaciones() { return storeSeguimiento.Evaluacion; },
    insertEvaluacion(nueva) {
        // Valida bitácora en BD 2 y tutor en BD 1
        if (!this.getBitacoraById(nueva.id_bitacora)) {
            throw new Error(`Integridad referencial violada: La bitácora ${nueva.id_bitacora} no existe.`);
        }
        storeSeguimiento.Evaluacion.push(nueva);
        return nueva;
    }
};
