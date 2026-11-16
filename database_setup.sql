-- ============================================================================
-- SOFTWARE PARA LA GESTIÓN Y SEGUIMIENTO DE PRÁCTICAS ACADÉMICAS (UDI)
-- SCRIPT DE INICIALIZACIÓN DDL Y DATOS SEMILLA PARA POSTGRESQL (SUPABASE)
-- ============================================================================
-- Arquitectura de Microservicios Desacoplados:
--   1. Esquema gestion_academica: Estudiante, Tutor_Academico, Institucion,
--      Tipo_Practica, Practica, Solicitudes, Convenio y Coordinador.
--   2. Esquema seguimiento_practicas: Bitacora, Evidencia y Evaluacion.
--
-- Nota de diseño:
--   Los dos esquemas no mantienen llaves foráneas físicas entre sí para
--   garantizar independencia de despliegue; la integración se realiza
--   exclusivamente mediante API REST usando `id_practica` y `documento_tu`.
-- ============================================================================

-- 1. CREACIÓN DE ESQUEMAS INDEPENDIENTES
CREATE SCHEMA IF NOT EXISTS gestion_academica;
CREATE SCHEMA IF NOT EXISTS seguimiento_practicas;

-- ============================================================================
-- MICROSERVICIO 1: ESQUEMA GESTIÓN ACADÉMICA (gestion_academica)
-- ============================================================================

-- 1.1 Tabla: Estudiante (semestre opcional: puede ser NULL o retirado)
CREATE TABLE IF NOT EXISTS gestion_academica.Estudiante (
    documento VARCHAR(20) PRIMARY KEY,
    id_estudiante VARCHAR(30),
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) DEFAULT '',
    correo VARCHAR(120) UNIQUE NOT NULL,
    semestre INT NULL CHECK (semestre IS NULL OR (semestre >= 1 AND semestre <= 10)),
    telefono VARCHAR(30) DEFAULT '',
    password VARCHAR(150) DEFAULT 'estudiante123'
);

ALTER TABLE IF EXISTS gestion_academica.Estudiante
    ALTER COLUMN semestre DROP NOT NULL;
ALTER TABLE IF EXISTS gestion_academica.Estudiante
    ADD COLUMN IF NOT EXISTS id_estudiante VARCHAR(30);
ALTER TABLE IF EXISTS gestion_academica.Estudiante
    ADD COLUMN IF NOT EXISTS password VARCHAR(150) DEFAULT 'estudiante123';

-- 1.2 Tabla: Tutor_Academico (Docentes asesores identificados por documento_tu)
CREATE TABLE IF NOT EXISTS gestion_academica.Tutor_Academico (
    documento_tu VARCHAR(20) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) DEFAULT '',
    correo VARCHAR(120) UNIQUE NOT NULL,
    especialidad VARCHAR(150) DEFAULT 'Pedagogía y Didáctica',
    telefono VARCHAR(30) DEFAULT '',
    password VARCHAR(150) DEFAULT 'docente123'
);

ALTER TABLE IF EXISTS gestion_academica.Tutor_Academico
    ADD COLUMN IF NOT EXISTS password VARCHAR(150) DEFAULT 'docente123';

-- 1.3 Tabla: Institucion (Colegios y centros receptores con convenio)
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

ALTER TABLE IF EXISTS gestion_academica.Institucion
    ADD COLUMN IF NOT EXISTS correo VARCHAR(120);
ALTER TABLE IF EXISTS gestion_academica.Institucion
    ADD COLUMN IF NOT EXISTS password VARCHAR(150) DEFAULT 'colegio123';
ALTER TABLE IF EXISTS gestion_academica.Institucion
    ADD COLUMN IF NOT EXISTS contacto VARCHAR(150) DEFAULT '';

-- 1.4 Tabla: Tipo_Practica (Modalidades normativas según Decreto 1075 de 2015)
CREATE TABLE IF NOT EXISTS gestion_academica.Tipo_Practica (
    id_tipo VARCHAR(20) PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT
);

-- 1.5 Tabla: Practica (Entidad relacional central identificada por id_practica)
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

ALTER TABLE IF EXISTS gestion_academica.Practica
    ADD COLUMN IF NOT EXISTS horas_objetivo INT DEFAULT 80;
ALTER TABLE IF EXISTS gestion_academica.Practica
    ADD COLUMN IF NOT EXISTS validado_institucion BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS gestion_academica.Practica
    ADD COLUMN IF NOT EXISTS fecha_validacion_sede DATE NULL;
ALTER TABLE IF EXISTS gestion_academica.Practica
    ADD COLUMN IF NOT EXISTS autorizado_director BOOLEAN DEFAULT FALSE;

-- 1.6 Tabla: Solicitudes (Postulaciones radicadas desde el inicio de sesión)
CREATE TABLE IF NOT EXISTS gestion_academica.solicitudes (
    id_solicitud VARCHAR(30) PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    correo VARCHAR(120) UNIQUE NOT NULL,
    semestre INT NULL CHECK (semestre IS NULL OR (semestre >= 1 AND semestre <= 10)),
    id_institucion_preferencia VARCHAR(40),
    institucion_preferencia VARCHAR(180),
    password VARCHAR(150) DEFAULT 'estudiante123',
    estado VARCHAR(40) DEFAULT 'Pendiente',
    fecha VARCHAR(40) DEFAULT TO_CHAR(CURRENT_DATE, 'DD/MM/YYYY'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.7 Tabla: Convenio (Acuerdos interinstitucionales firmados por Dirección)
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

-- 1.8 Tabla: Coordinador (Coordinadores y Directores del programa)
CREATE TABLE IF NOT EXISTS gestion_academica.coordinador (
    id_coordinador VARCHAR(30) PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    correo VARCHAR(120) UNIQUE NOT NULL,
    password VARCHAR(150) DEFAULT 'coordinador123',
    departamento VARCHAR(150) DEFAULT 'Coordinación de Prácticas Pedagógicas',
    rol VARCHAR(30) DEFAULT 'coordinador'
);

-- ============================================================================
-- MICROSERVICIO 2: ESQUEMA SEGUIMIENTO DE PRÁCTICAS (seguimiento_practicas)
-- ============================================================================

-- 2.1 Tabla: Bitacora (Referencia lógica id_practica hacia Microservicio 1)
CREATE TABLE IF NOT EXISTS seguimiento_practicas.Bitacora (
    id_bitacora VARCHAR(20) PRIMARY KEY,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    descripcion TEXT NOT NULL,
    observaciones TEXT,
    estado VARCHAR(50) DEFAULT 'Pendiente',
    horas INT DEFAULT 4,
    id_practica VARCHAR(20) NOT NULL
);

ALTER TABLE IF EXISTS seguimiento_practicas.Bitacora
    ADD COLUMN IF NOT EXISTS horas INT DEFAULT 4;

CREATE INDEX IF NOT EXISTS idx_bitacora_id_practica
    ON seguimiento_practicas.Bitacora(id_practica);

-- 2.2 Tabla: Evidencia (Referencia lógica id_practica y FK local a Bitacora)
CREATE TABLE IF NOT EXISTS seguimiento_practicas.Evidencia (
    id_evidencia VARCHAR(20) PRIMARY KEY,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    nombre VARCHAR(150) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'Documento PDF',
    archivo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    id_practica VARCHAR(20) NOT NULL,
    id_bitacora VARCHAR(20) REFERENCES seguimiento_practicas.Bitacora(id_bitacora) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_evidencia_id_practica
    ON seguimiento_practicas.Evidencia(id_practica);

-- 2.3 Tabla: Evaluacion (Referencias lógicas id_practica y documento_tu vía API REST)
CREATE TABLE IF NOT EXISTS seguimiento_practicas.Evaluacion (
    id_evaluacion VARCHAR(20) PRIMARY KEY,
    calificacion NUMERIC(3,1) NOT NULL CHECK (calificacion >= 0.0 AND calificacion <= 5.0),
    observaciones TEXT,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    id_bitacora VARCHAR(20) REFERENCES seguimiento_practicas.Bitacora(id_bitacora) ON DELETE SET NULL,
    id_practica VARCHAR(20),
    documento_tu VARCHAR(20)
);

ALTER TABLE IF EXISTS seguimiento_practicas.Evaluacion
    ADD COLUMN IF NOT EXISTS id_practica VARCHAR(20);
ALTER TABLE IF EXISTS seguimiento_practicas.Evaluacion
    ADD COLUMN IF NOT EXISTS documento_tu VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_evaluacion_documento_tu
    ON seguimiento_practicas.Evaluacion(documento_tu);

-- ============================================================================
-- DATOS SEMILLA INICIALES (VERSIÓN RELEASE 1.0)
-- ============================================================================

INSERT INTO gestion_academica.Estudiante (documento, id_estudiante, nombre, apellido, correo, semestre, telefono, password)
VALUES
    ('1098234501', 'EST-2024-01', 'Camilo Andrés', 'Rangel Moreno', 'estudiante@udi.edu.co', 7, '3158901234', 'estudiante123'),
    ('1098234502', 'EST-2024-02', 'Edwin Fabián', 'Quiroga Díaz', 'edwin.quiroga@udi.edu.co', 8, '3167894512', 'edwin123'),
    ('1098234503', 'EST-2024-03', 'Laura Valentina', 'Morales Gómez', 'laura.morales@udi.edu.co', 6, '3123456789', 'laura123'),
    ('1098234504', 'EST-2024-04', 'María Camila', 'Sotomayor Peña', 'marias@udi.edu.co', 6, '3145678901', 'estudiante123'),
    ('1098234505', 'EST-2024-05', 'María Fernanda', 'Vargas Suárez', 'maria@udi.edu.co', NULL, '3189012345', 'estudiante123')
ON CONFLICT (documento) DO NOTHING;

INSERT INTO gestion_academica.Tutor_Academico (documento_tu, nombre, apellido, correo, especialidad, telefono, password)
VALUES
    ('DOC-1098234', 'Mg. Carlos Alberto', 'Gómez Silva', 'docente@udi.edu.co', 'Didáctica de la Lengua y Literatura', '3187654321', 'docente123'),
    ('DOC-1098567', 'Dra. Sandra Milena', 'Peña Castillo', 'sandra.pena@udi.edu.co', 'Pedagogía Infantil y Currículo', '3109876543', 'sandra123')
ON CONFLICT (documento_tu) DO NOTHING;

INSERT INTO gestion_academica.Institucion (id_institucion, nombre, direccion, ciudad, telefono, correo, password, contacto)
VALUES
    ('INST-01', 'Colegio Custodio García Rovira', 'Cra 15 # 45-20', 'Bucaramanga', '607-6345000', 'colegio@udi.edu.co', 'colegio123', 'Lic. Martha Gómez'),
    ('INST-02', 'Instituto Técnico Dámaso Zapata', 'Calle 10 # 28-35', 'Bucaramanga', '607-6452211', 'damaso@udi.edu.co', 'damaso123', 'Esp. Jairo Ortiz'),
    ('INST-03', 'Colegio Santander Sede A', 'Calle 9 # 15-40', 'Bucaramanga', '607-6321900', 'santander@udi.edu.co', 'santander123', 'Dra. Beatriz Rico')
ON CONFLICT (id_institucion) DO NOTHING;

INSERT INTO gestion_academica.Tipo_Practica (id_tipo, nombre, descripcion)
VALUES
    ('TP-01', 'Práctica de Observación Pedagógica I', 'Diagnóstico inicial de aula, análisis institucional y registro etnográfico.'),
    ('TP-02', 'Práctica de Inmersión y Diagnóstico II', 'Acompañamiento docente, diseño de secuencias didácticas y microenseñanza.'),
    ('TP-03', 'Práctica Pedagógica Integral e Intervención III', 'Titularidad de aula, ejecución curricular y proyecto pedagógico de aula.')
ON CONFLICT (id_tipo) DO NOTHING;

INSERT INTO gestion_academica.Practica (id_practica, fecha_ini, fecha_fin, horas_cumplidas, horas_objetivo, estado, nombre_prac, documento, documento_tu, id_institucion, id_tipo)
VALUES
    ('PRAC-001', '2026-02-01', '2026-06-15', 52, 80, 'En Curso', 'Práctica Pedagógica Integral', '1098234501', 'DOC-1098234', 'INST-01', 'TP-03'),
    ('PRAC-002', '2026-02-01', '2026-06-15', 45, 80, 'En Curso', 'Práctica Pedagógica Integral', '1098234502', 'DOC-1098234', 'INST-02', 'TP-03'),
    ('PRAC-003', '2026-02-01', '2026-06-15', 28, 60, 'En Curso', 'Práctica de Inmersión y Diagnóstico', '1098234503', 'DOC-1098567', 'INST-03', 'TP-02'),
    ('PRAC-004', '2026-02-01', '2026-06-15', 18, 50, 'En Curso', 'Práctica de Observación Pedagógica', '1098234504', 'DOC-1098567', 'INST-01', 'TP-01')
ON CONFLICT (id_practica) DO NOTHING;

INSERT INTO gestion_academica.convenio (id_convenio, id_institucion, resolucion, cupos_autorizados, fecha_inicio, fecha_vencimiento, estado, firmado_por)
VALUES
    ('CONV-2026-01', 'INST-01', 'RES-MEN-045/2026', 15, '2026-01-15', '2027-01-15', 'Firmado y Vigente', 'Dr. Roberto Mendoza (Director)'),
    ('CONV-2026-02', 'INST-02', 'RES-MEN-089/2026', 10, '2026-02-01', '2027-02-01', 'Pendiente Firma Rectoral', NULL),
    ('CONV-2026-03', 'INST-03', 'RES-MEN-112/2026', 12, '2026-03-01', '2027-03-01', 'Pendiente Firma Rectoral', NULL)
ON CONFLICT (id_convenio) DO NOTHING;

INSERT INTO gestion_academica.coordinador (id_coordinador, nombre, correo, password, departamento, rol)
VALUES
    ('COORD-001', 'Dra. María Elena Torres', 'coordinador@udi.edu.co', 'coordinador123', 'Coordinación de Prácticas Pedagógicas', 'coordinador'),
    ('DIR-001', 'Dr. Roberto Mendoza (Director)', 'director@udi.edu.co', 'director123', 'Dirección de Programa', 'director')
ON CONFLICT (id_coordinador) DO NOTHING;

INSERT INTO seguimiento_practicas.Bitacora (id_bitacora, fecha, descripcion, observaciones, estado, horas, id_practica)
VALUES
    ('BIT-001', '2026-02-15', 'Diagnóstico de lectura y escritura en grado 4°A.', 'Aprobado satisfactoriamente por el tutor.', 'Aprobado', 4, 'PRAC-001'),
    ('BIT-002', '2026-03-02', 'Desarrollo de taller de lectura crítica con grado 8°.', 'Excelente interacción pedagógica.', 'Aprobado', 5, 'PRAC-001'),
    ('BIT-003', '2026-03-20', 'Evaluación formativa y retroalimentación grupal.', 'Revisión en proceso.', 'Pendiente', 4, 'PRAC-001')
ON CONFLICT (id_bitacora) DO NOTHING;
