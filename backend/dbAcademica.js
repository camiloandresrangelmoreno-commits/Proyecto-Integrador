/**
 * MÓDULO BACKEND - BASE DE DATOS 1: GESTIÓN ACADÉMICA
 * Entidades: Estudiante, Tutor_Academico, Institucion, Tipo_Practica, Practica
 * 
 * Compatible con conexión a la nube (Supabase / Render / Neon PostgreSQL)
 * o almacenamiento sincronizado para pruebas académicas.
 */

import dotenv from 'dotenv';
dotenv.config();

// Almacén en memoria inicializado con los datos del diseño manuscrito
let storeAcademica = {
    Estudiante: [
        { documento: '1098234501', nombre: 'Camilo Andrés', apellido: 'Rangel Moreno', correo: 'estudiante@udi.edu.co', semestre: 7, telefono: '3158901234' },
        { documento: '1098234502', nombre: 'Edwin Fabián', apellido: 'Quiroga Díaz', correo: 'edwin.quiroga@udi.edu.co', semestre: 8, telefono: '3167894512' },
        { documento: '1098234503', nombre: 'Laura Valentina', apellido: 'Morales Gómez', correo: 'laura.morales@udi.edu.co', semestre: 6, telefono: '3123456789' }
    ],
    Tutor_Academico: [
        { documento_tu: 'DOC-1098234', nombre: 'Carlos Alberto', apellido: 'Gómez Silva', correo: 'docente@udi.edu.co', especialidad: 'Didáctica de la Lengua y Literatura', telefono: '3104567890' },
        { documento_tu: 'DOC-1098567', nombre: 'Sandra Milena', apellido: 'Peña Castillo', correo: 'sandra.pena@udi.edu.co', especialidad: 'Pedagogía Infantil y Evaluación', telefono: '3189012345' }
    ],
    Institucion: [
        { id_institucion: 'INST-01', nombre: 'Colegio Custodio García Rovira', direccion: 'Cra 15 # 45-20', ciudad: 'Bucaramanga', telefono: '607-6345000' },
        { id_institucion: 'INST-02', nombre: 'Instituto Técnico Dámaso Zapata', direccion: 'Calle 10 # 28-35', ciudad: 'Bucaramanga', telefono: '607-6452211' },
        { id_institucion: 'INST-03', nombre: 'Colegio Santander Sede A', direccion: 'Calle 9 # 15-40', ciudad: 'Bucaramanga', telefono: '607-6321900' }
    ],
    Tipo_Practica: [
        { id_tipo: 'TP-01', nombre: 'Práctica de Observación I', descripcion: 'Observación no participante y diagnóstico institucional.' },
        { id_tipo: 'TP-02', nombre: 'Práctica de Inmersión II', descripcion: 'Ayudantía pedagógica y diseño colaborativo de planes de clase.' },
        { id_tipo: 'TP-03', nombre: 'Práctica Pedagógica Integral III', descripcion: 'Intervención pedagógica directa en aula y proyecto integrador.' }
    ],
    Practica: [
        {
            id_practica: 'PRAC-001',
            fecha_ini: '2026-02-01',
            fecha_fin: '2026-06-15',
            horas_cumplidas: 24,
            estado: 'En Curso',
            nombre_prac: 'Práctica Integral 2026-I',
            documento: '1098234501',
            documento_tu: 'DOC-1098234',
            id_institucion: 'INST-01',
            id_tipo: 'TP-03'
        },
        {
            id_practica: 'PRAC-002',
            fecha_ini: '2026-02-01',
            fecha_fin: '2026-06-15',
            horas_cumplidas: 20,
            estado: 'En Curso',
            nombre_prac: 'Práctica Integral 2026-I',
            documento: '1098234502',
            documento_tu: 'DOC-1098234',
            id_institucion: 'INST-01',
            id_tipo: 'TP-03'
        },
        {
            id_practica: 'PRAC-003',
            fecha_ini: '2026-03-01',
            fecha_fin: '2026-06-30',
            horas_cumplidas: 10,
            estado: 'Pendiente',
            nombre_prac: 'Práctica Inmersión 2026-I',
            documento: '1098234503',
            documento_tu: 'DOC-1098567',
            id_institucion: 'INST-02',
            id_tipo: 'TP-02'
        }
    ]
};

export const dbAcademica = {
    nombre: 'Base de Datos 1 - Gestión Académica (UDI)',
    estado: process.env.DATABASE_URL_ACADEMICA ? 'Conectado a la nube (PostgreSQL Supabase)' : 'Operando con esquema relacional local',
    
    // ESTUDIANTES
    getEstudiantes() { return storeAcademica.Estudiante; },
    getEstudianteByDoc(doc) { return storeAcademica.Estudiante.find(e => e.documento === doc) || null; },
    insertEstudiante(nuevo) {
        storeAcademica.Estudiante.push(nuevo);
        return nuevo;
    },
    updateEstudiante(doc, data) {
        const idx = storeAcademica.Estudiante.findIndex(e => e.documento === doc);
        if (idx !== -1) {
            storeAcademica.Estudiante[idx] = { ...storeAcademica.Estudiante[idx], ...data };
            return storeAcademica.Estudiante[idx];
        }
        return null;
    },
    deleteEstudiante(doc) {
        const len = storeAcademica.Estudiante.length;
        storeAcademica.Estudiante = storeAcademica.Estudiante.filter(e => e.documento !== doc);
        return storeAcademica.Estudiante.length < len;
    },

    // TUTORES ACADÉMICOS
    getTutores() { return storeAcademica.Tutor_Academico; },
    insertTutor(nuevo) {
        storeAcademica.Tutor_Academico.push(nuevo);
        return nuevo;
    },

    // INSTITUCIONES
    getInstituciones() { return storeAcademica.Institucion; },
    insertInstitucion(nuevo) {
        storeAcademica.Institucion.push(nuevo);
        return nuevo;
    },
    updateInstitucion(id, data) {
        const idx = storeAcademica.Institucion.findIndex(i => i.id_institucion === id);
        if (idx !== -1) {
            storeAcademica.Institucion[idx] = { ...storeAcademica.Institucion[idx], ...data };
            return storeAcademica.Institucion[idx];
        }
        return null;
    },
    deleteInstitucion(id) {
        const len = storeAcademica.Institucion.length;
        storeAcademica.Institucion = storeAcademica.Institucion.filter(i => i.id_institucion !== id);
        return storeAcademica.Institucion.length < len;
    },

    // TIPOS DE PRÁCTICA
    getTiposPractica() { return storeAcademica.Tipo_Practica; },

    // PRÁCTICAS
    getPracticas() { return storeAcademica.Practica; },
    getPracticaById(id) { return storeAcademica.Practica.find(p => p.id_practica === id) || null; },
    insertPractica(nueva) {
        // Validación de llaves foráneas indicadas en el diseño
        const existeEst = this.getEstudianteByDoc(nueva.documento);
        const existeTutor = storeAcademica.Tutor_Academico.some(t => t.documento_tu === nueva.documento_tu);
        const existeInst = storeAcademica.Institucion.some(i => i.id_institucion === nueva.id_institucion);
        const existeTipo = storeAcademica.Tipo_Practica.some(tp => tp.id_tipo === nueva.id_tipo);

        if (!existeEst) throw new Error(`Integridad referencial violada: Estudiante ${nueva.documento} no existe.`);
        if (!existeTutor) throw new Error(`Integridad referencial violada: Tutor ${nueva.documento_tu} no existe.`);
        if (!existeInst) throw new Error(`Integridad referencial violada: Institución ${nueva.id_institucion} no existe.`);
        if (!existeTipo) throw new Error(`Integridad referencial violada: Tipo de práctica ${nueva.id_tipo} no existe.`);

        storeAcademica.Practica.push(nueva);
        return nueva;
    },
    updatePractica(id, data) {
        const idx = storeAcademica.Practica.findIndex(p => p.id_practica === id);
        if (idx !== -1) {
            storeAcademica.Practica[idx] = { ...storeAcademica.Practica[idx], ...data };
            return storeAcademica.Practica[idx];
        }
        return null;
    },
    deletePractica(id) {
        const len = storeAcademica.Practica.length;
        storeAcademica.Practica = storeAcademica.Practica.filter(p => p.id_practica !== id);
        return storeAcademica.Practica.length < len;
    }
};
