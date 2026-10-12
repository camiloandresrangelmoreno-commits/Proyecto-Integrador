-- ============================================================================
-- SISTEMA INTEGRAL DE GESTIÓN DE PRÁCTICAS ACADÉMICAS (UDI)
-- SCRIPT DE INICIALIZACIÓN DDL Y DATOS SEMILLA PARA POSTGRESQL (SUPABASE)
-- ============================================================================
-- Este script crea los dos esquemas relacionales del sistema, sus tablas,
-- llaves primarias, foráneas, restricciones y carga los datos de prueba oficiales.
-- Puedes ejecutar este script completo en el SQL Editor de tu panel de Supabase.
-- ============================================================================

-- 1. CREACIÓN DE ESQUEMAS RELACIONALES
CREATE SCHEMA IF NOT EXISTS gestion_academica;
CREATE SCHEMA IF NOT EXISTS seguimiento_practicas;

-- ============================================================================
-- ESQUEMA 1: GESTIÓN ACADÉMICA (gestion_academica)
-- ============================================================================

-- 1.1 Tabla: Estudiante (Alumnos matriculados en prácticas pedagógicas)
CREATE TABLE IF NOT EXISTS gestion_academica.Estudiante (
    documento VARCHAR(20) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) DEFAULT '',
    correo VARCHAR(100) UNIQUE NOT NULL,
    semestre INT NOT NULL CHECK (semestre >= 1 AND semestre <= 10),
    telefono VARCHAR(30) DEFAULT ''
);

-- 1.2 Tabla: Tutor_Academico (Docentes asesores de práctica)
CREATE TABLE IF NOT EXISTS gestion_academica.Tutor_Academico (
    documento_tu VARCHAR(20) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) DEFAULT '',
    correo VARCHAR(100) UNIQUE NOT NULL,
    especialidad VARCHAR(150) DEFAULT 'Pedagogía y Didáctica',
    telefono VARCHAR(30) DEFAULT ''
);

-- 1.3 Tabla: Institucion (Colegios y centros de práctica con convenio)
CREATE TABLE IF NOT EXISTS gestion_academica.Institucion (
    id_institucion VARCHAR(20) PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    direccion VARCHAR(200) NOT NULL,
    ciudad VARCHAR(100) DEFAULT 'Bucaramanga',
    telefono VARCHAR(30) DEFAULT ''
);

-- 1.4 Tabla: Tipo_Practica (Modalidades normativas según MEN)
CREATE TABLE IF NOT EXISTS gestion_academica.Tipo_Practica (
    id_tipo VARCHAR(20) PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT
);

-- 1.5 Tabla: Practica (Entidad relacional central del proceso formativo)
CREATE TABLE IF NOT EXISTS gestion_academica.Practica (
    id_practica VARCHAR(20) PRIMARY KEY,
    fecha_ini DATE DEFAULT CURRENT_DATE,
    fecha_fin DATE DEFAULT (CURRENT_DATE + INTERVAL '120 days'),
    horas_cumplidas INT DEFAULT 0,
    estado VARCHAR(50) DEFAULT 'En Curso',
    nombre_prac VARCHAR(150) DEFAULT 'Práctica Pedagógica Integral',
    documento VARCHAR(20) REFERENCES gestion_academica.Estudiante(documento) ON DELETE CASCADE,
    documento_tu VARCHAR(20) REFERENCES gestion_academica.Tutor_Academico(documento_tu) ON DELETE SET NULL,
    id_institucion VARCHAR(20) REFERENCES gestion_academica.Institucion(id_institucion) ON DELETE SET NULL,
    id_tipo VARCHAR(20) REFERENCES gestion_academica.Tipo_Practica(id_tipo) ON DELETE RESTRICT
);

-- ============================================================================
-- ESQUEMA 2: SEGUIMIENTO DE PRÁCTICAS (seguimiento_practicas)
-- ============================================================================

-- 2.1 Tabla: Bitacora (Diario de campo pedagógico)
CREATE TABLE IF NOT EXISTS seguimiento_practicas.Bitacora (
    id_bitacora VARCHAR(20) PRIMARY KEY,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    descripcion TEXT NOT NULL,
    observaciones TEXT,
    estado VARCHAR(50) DEFAULT 'Pendiente',
    id_practica VARCHAR(20) REFERENCES gestion_academica.Practica(id_practica) ON DELETE CASCADE
);

-- 2.2 Tabla: Evidencia (Planes de clase, guías y soportes documentales)
CREATE TABLE IF NOT EXISTS seguimiento_practicas.Evidencia (
    id_evidencia VARCHAR(20) PRIMARY KEY,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    nombre VARCHAR(150) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'Documento PDF',
    archivo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    id_practica VARCHAR(20) REFERENCES gestion_academica.Practica(id_practica) ON DELETE CASCADE,
    id_bitacora VARCHAR(20) REFERENCES seguimiento_practicas.Bitacora(id_bitacora) ON DELETE SET NULL
);

-- 2.3 Tabla: Evaluacion (Calificaciones formales emitidas por tutores asesores)
CREATE TABLE IF NOT EXISTS seguimiento_practicas.Evaluacion (
    id_evaluacion VARCHAR(20) PRIMARY KEY,
    calificacion NUMERIC(3,1) NOT NULL CHECK (calificacion >= 0.0 AND calificacion <= 5.0),
    observaciones TEXT,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    id_bitacora VARCHAR(20) REFERENCES seguimiento_practicas.Bitacora(id_bitacora) ON DELETE CASCADE,
    documento_tu VARCHAR(20) REFERENCES gestion_academica.Tutor_Academico(documento_tu) ON DELETE SET NULL
);

-- ============================================================================
-- DATOS SEMILLA INICIALES (5 ESTUDIANTES, TUTORES, COLEGIOS Y PRÁCTICAS)
-- ============================================================================

-- Inserción de Estudiantes
INSERT INTO gestion_academica.Estudiante (documento, nombre, apellido, correo, semestre, telefono)
VALUES 
    ('1098234501', 'Camilo Andrés', 'Rangel Moreno', 'estudiante@udi.edu.co', 7, '3158901234'),
    ('1098234502', 'Edwin Fabián', 'Quiroga Díaz', 'edwin.quiroga@udi.edu.co', 8, '3167894512'),
    ('1098234503', 'Laura Valentina', 'Morales Gómez', 'laura.morales@udi.edu.co', 6, '3123456789'),
    ('1098234504', 'María Camila', 'Sotomayor Peña', 'marias@udi.edu.co', 6, '3145678901'),
    ('1098234505', 'María Fernanda', 'Vargas Suárez', 'maria@udi.edu.co', 7, '3189012345')
ON CONFLICT (documento) DO UPDATE 
SET nombre = EXCLUDED.nombre, apellido = EXCLUDED.apellido, correo = EXCLUDED.correo, semestre = EXCLUDED.semestre;

-- Inserción de Tutores Académicos
INSERT INTO gestion_academica.Tutor_Academico (documento_tu, nombre, apellido, correo, especialidad, telefono)
VALUES 
    ('DOC-1098234', 'Mg. Carlos Alberto', 'Gómez Silva', 'docente@udi.edu.co', 'Didáctica de la Lengua y Literatura', '3187654321'),
    ('DOC-1098567', 'Dra. Sandra Milena', 'Peña Castillo', 'sandra.pena@udi.edu.co', 'Pedagogía Infantil y Currículo', '3109876543')
ON CONFLICT (documento_tu) DO NOTHING;

-- Inserción de Instituciones Educativas
INSERT INTO gestion_academica.Institucion (id_institucion, nombre, direccion, ciudad, telefono)
VALUES 
    ('INST-01', 'Colegio Custodio García Rovira', 'Cra 15 # 45-20', 'Bucaramanga', '607-6345000'),
    ('INST-02', 'Instituto Técnico Dámaso Zapata', 'Calle 10 # 28-35', 'Bucaramanga', '607-6452211'),
    ('INST-03', 'Colegio Santander Sede A', 'Calle 9 # 15-40', 'Bucaramanga', '607-6321900')
ON CONFLICT (id_institucion) DO NOTHING;

-- Inserción de Tipos de Práctica
INSERT INTO gestion_academica.Tipo_Practica (id_tipo, nombre, descripcion)
VALUES 
    ('TP-01', 'Práctica de Observación Pedagógica I', 'Diagnóstico inicial de aula, análisis institucional y registro etnográfico.'),
    ('TP-02', 'Práctica de Inmersión y Diagnóstico II', 'Acompañamiento docente, diseño de secuencias didácticas y microenseñanza.'),
    ('TP-03', 'Práctica Pedagógica Integral e Intervención III', 'Titularidad de aula, ejecución curricular y proyecto pedagógico de aula.')
ON CONFLICT (id_tipo) DO NOTHING;

-- Inserción de Prácticas
INSERT INTO gestion_academica.Practica (id_practica, fecha_ini, fecha_fin, horas_cumplidas, estado, nombre_prac, documento, documento_tu, id_institucion, id_tipo)
VALUES 
    ('PRAC-001', '2026-02-01', '2026-06-15', 52, 'En Curso', 'Práctica Pedagógica Integral', '1098234501', 'DOC-1098234', 'INST-01', 'TP-03'),
    ('PRAC-002', '2026-02-01', '2026-06-15', 45, 'En Curso', 'Práctica Pedagógica Integral', '1098234502', 'DOC-1098567', 'INST-02', 'TP-03'),
    ('PRAC-003', '2026-02-01', '2026-06-15', 28, 'En Curso', 'Práctica de Inmersión y Diagnóstico', '1098234503', 'DOC-1098234', 'INST-03', 'TP-02'),
    ('PRAC-004', '2026-02-01', '2026-06-15', 18, 'En Curso', 'Práctica de Observación Pedagógica', '1098234504', 'DOC-1098567', 'INST-01', 'TP-01')
ON CONFLICT (id_practica) DO NOTHING;

-- Inserción de Bitácoras de Seguimiento
INSERT INTO seguimiento_practicas.Bitacora (id_bitacora, fecha, descripcion, observaciones, estado, id_practica)
VALUES 
    ('BIT-001', '2026-02-15', 'Diagnóstico del grupo y presentación del plan semestral.', 'Aprobado satisfactoriamente por el tutor.', 'Aprobado', 'PRAC-001'),
    ('BIT-002', '2026-03-02', 'Desarrollo de taller de lectura crítica con grado 8°.', 'Excelente interacción pedagógica.', 'Aprobado', 'PRAC-001'),
    ('BIT-003', '2026-03-20', 'Evaluación formativa y retroalimentación grupal.', 'Revisión en proceso.', 'Pendiente', 'PRAC-001')
ON CONFLICT (id_bitacora) DO NOTHING;
