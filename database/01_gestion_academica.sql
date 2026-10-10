-- ============================================================================
-- BASE DE DATOS 1 / ESQUEMA 1: GESTIÓN ACADÉMICA (UDI)
-- Basado exactamente en el diseño manuscrito E-R y Relacional (Páginas 1 y 3)
-- Compatible con: Supabase (PostgreSQL Cloud Gratuito) / Render / Neon
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS gestion_academica;
SET search_path TO gestion_academica, public;

-- 1. TABLA: Estudiante
CREATE TABLE IF NOT EXISTS gestion_academica.Estudiante (
    documento VARCHAR(20) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    correo VARCHAR(100) NOT NULL UNIQUE,
    semestre INT NOT NULL,
    telefono VARCHAR(20)
);

-- 2. TABLA: Tutor_Academico (Docente Asesor)
CREATE TABLE IF NOT EXISTS gestion_academica.Tutor_Academico (
    documento_tu VARCHAR(20) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    correo VARCHAR(100) NOT NULL UNIQUE,
    especialidad VARCHAR(150),
    telefono VARCHAR(20)
);

-- 3. TABLA: Institucion (Colegio Receptor)
CREATE TABLE IF NOT EXISTS gestion_academica.Institucion (
    id_institucion VARCHAR(20) PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    direccion VARCHAR(200) NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    telefono VARCHAR(20)
);

-- 4. TABLA: Tipo_Practica
CREATE TABLE IF NOT EXISTS gestion_academica.Tipo_Practica (
    id_tipo VARCHAR(20) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT
);

-- 5. TABLA: Practica (Entidad Central de Gestión Académica)
CREATE TABLE IF NOT EXISTS gestion_academica.Practica (
    id_practica VARCHAR(20) PRIMARY KEY,
    fecha_ini DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    horas_cumplidas INT DEFAULT 0,
    estado VARCHAR(50) NOT NULL,
    nombre_prac VARCHAR(150) NOT NULL,
    documento VARCHAR(20) NOT NULL,
    documento_tu VARCHAR(20) NOT NULL,
    id_institucion VARCHAR(20) NOT NULL,
    id_tipo VARCHAR(20) NOT NULL,
    CONSTRAINT fk_practica_estudiante FOREIGN KEY (documento) 
        REFERENCES gestion_academica.Estudiante(documento) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_practica_tutor FOREIGN KEY (documento_tu) 
        REFERENCES gestion_academica.Tutor_Academico(documento_tu) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_practica_institucion FOREIGN KEY (id_institucion) 
        REFERENCES gestion_academica.Institucion(id_institucion) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_practica_tipo FOREIGN KEY (id_tipo) 
        REFERENCES gestion_academica.Tipo_Practica(id_tipo) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- ============================================================================
-- DATOS SEMILLA (INSERT INICIAL)
-- ============================================================================

INSERT INTO gestion_academica.Estudiante (documento, nombre, apellido, correo, semestre, telefono) VALUES
('1098234501', 'Camilo Andrés', 'Rangel Moreno', 'estudiante@udi.edu.co', 7, '3158901234'),
('1098234502', 'Edwin Fabián', 'Quiroga Díaz', 'edwin.quiroga@udi.edu.co', 8, '3167894512'),
('1098234503', 'Laura Valentina', 'Morales Gómez', 'laura.morales@udi.edu.co', 6, '3123456789')
ON CONFLICT (documento) DO NOTHING;

INSERT INTO gestion_academica.Tutor_Academico (documento_tu, nombre, apellido, correo, especialidad, telefono) VALUES
('DOC-1098234', 'Carlos Alberto', 'Gómez Silva', 'docente@udi.edu.co', 'Didáctica de la Lengua y Literatura', '3104567890'),
('DOC-1098567', 'Sandra Milena', 'Peña Castillo', 'sandra.pena@udi.edu.co', 'Pedagogía Infantil y Evaluación', '3189012345')
ON CONFLICT (documento_tu) DO NOTHING;

INSERT INTO gestion_academica.Institucion (id_institucion, nombre, direccion, ciudad, telefono) VALUES
('INST-01', 'Colegio Custodio García Rovira', 'Cra 15 # 45-20', 'Bucaramanga', '607-6345000'),
('INST-02', 'Instituto Técnico Dámaso Zapata', 'Calle 10 # 28-35', 'Bucaramanga', '607-6452211'),
('INST-03', 'Colegio Santander Sede A', 'Calle 9 # 15-40', 'Bucaramanga', '607-6321900')
ON CONFLICT (id_institucion) DO NOTHING;

INSERT INTO gestion_academica.Tipo_Practica (id_tipo, nombre, descripcion) VALUES
('TP-01', 'Práctica de Observación I', 'Observación pedagógica no participante y diagnóstico de contexto institucional.'),
('TP-02', 'Práctica de Inmersión II', 'Ayudantía pedagógica y diseño colaborativo de planes de clase.'),
('TP-03', 'Práctica Pedagógica Integral III', 'Intervención pedagógica directa en aula regular y proyecto integrador.')
ON CONFLICT (id_tipo) DO NOTHING;

INSERT INTO gestion_academica.Practica (id_practica, fecha_ini, fecha_fin, horas_cumplidas, estado, nombre_prac, documento, documento_tu, id_institucion, id_tipo) VALUES
('PRAC-001', '2026-02-01', '2026-06-15', 24, 'En Curso', 'Práctica Integral 2026-I', '1098234501', 'DOC-1098234', 'INST-01', 'TP-03'),
('PRAC-002', '2026-02-01', '2026-06-15', 20, 'En Curso', 'Práctica Integral 2026-I', '1098234502', 'DOC-1098234', 'INST-01', 'TP-03'),
('PRAC-003', '2026-03-01', '2026-06-30', 10, 'Pendiente', 'Práctica Inmersión 2026-I', '1098234503', 'DOC-1098567', 'INST-02', 'TP-02')
ON CONFLICT (id_practica) DO NOTHING;
