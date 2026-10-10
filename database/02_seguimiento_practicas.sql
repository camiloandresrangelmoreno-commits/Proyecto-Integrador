-- ============================================================================
-- BASE DE DATOS 2 / ESQUEMA 2: SEGUIMIENTO DE PRÁCTICAS (UDI)
-- Basado exactamente en el diseño manuscrito E-R y Relacional (Páginas 2 y 4)
-- Compatible con: Supabase (PostgreSQL Cloud Gratuito) / Render / Neon
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS seguimiento_practicas;
SET search_path TO seguimiento_practicas, gestion_academica, public;

-- 1. TABLA: Bitacora
CREATE TABLE IF NOT EXISTS seguimiento_practicas.Bitacora (
    id_bitacora VARCHAR(20) PRIMARY KEY,
    fecha DATE NOT NULL,
    descripcion TEXT NOT NULL,
    observaciones TEXT,
    estado VARCHAR(50) NOT NULL, -- 'Aprobado', 'Pendiente', 'Rechazado'
    id_practica VARCHAR(20) NOT NULL,
    CONSTRAINT fk_bitacora_practica FOREIGN KEY (id_practica)
        REFERENCES gestion_academica.Practica(id_practica) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- 2. TABLA: Evidencia (Relación 'tiene' 1 a 1..* con Bitacora y enlazada a Practica)
CREATE TABLE IF NOT EXISTS seguimiento_practicas.Evidencia (
    id_evidencia VARCHAR(20) PRIMARY KEY,
    fecha DATE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    tipo VARCHAR(50) NOT NULL, -- 'PDF', 'Plan de Clase', 'Registro Fotográfico', 'Guía Didáctica'
    archivo VARCHAR(255) NOT NULL, -- URL Drive o ruta de archivo en la nube
    descripcion TEXT,
    id_practica VARCHAR(20) NOT NULL,
    id_bitacora VARCHAR(20),
    CONSTRAINT fk_evidencia_bitacora FOREIGN KEY (id_bitacora)
        REFERENCES seguimiento_practicas.Bitacora(id_bitacora) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_evidencia_practica FOREIGN KEY (id_practica)
        REFERENCES gestion_academica.Practica(id_practica) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- 3. TABLA: Evaluacion (Emitida por el Tutor Académico sobre la Bitácora / Proceso)
CREATE TABLE IF NOT EXISTS seguimiento_practicas.Evaluacion (
    id_evaluacion VARCHAR(20) PRIMARY KEY,
    calificacion NUMERIC(3,1) NOT NULL CHECK (calificacion >= 0.0 AND calificacion <= 5.0),
    observaciones TEXT NOT NULL,
    fecha DATE NOT NULL,
    id_bitacora VARCHAR(20) NOT NULL,
    documento_tu VARCHAR(20) NOT NULL,
    CONSTRAINT fk_evaluacion_bitacora FOREIGN KEY (id_bitacora)
        REFERENCES seguimiento_practicas.Bitacora(id_bitacora) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_evaluacion_tutor FOREIGN KEY (documento_tu)
        REFERENCES gestion_academica.Tutor_Academico(documento_tu) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- ============================================================================
-- DATOS SEMILLA (INSERT INICIAL)
-- ============================================================================

INSERT INTO seguimiento_practicas.Bitacora (id_bitacora, fecha, descripcion, observaciones, estado, id_practica) VALUES
('BIT-001', '2026-03-05', 'Diagnóstico de lectura y escritura en grado 4°A. Aplicación de prueba diagnóstica y rúbrica.', 'Buen manejo del grupo.', 'Aprobado', 'PRAC-001'),
('BIT-002', '2026-03-12', 'Diseño e implementación de taller de comprensión lectora mediante el uso de cuentos interactivos.', 'Metodología innovadora.', 'Aprobado', 'PRAC-001'),
('BIT-003', '2026-03-19', 'Acompañamiento pedagógico en aula regular y refuerzo a estudiantes con barreras de aprendizaje.', 'Por revisar evidencias adicionales.', 'Pendiente', 'PRAC-001'),
('BIT-004', '2026-03-10', 'Observación participante en clase de Ciencias Sociales y formulación de plan de clase integrado.', 'Excelente pertinencia curricular.', 'Aprobado', 'PRAC-002')
ON CONFLICT (id_bitacora) DO NOTHING;

INSERT INTO seguimiento_practicas.Evidencia (id_evidencia, fecha, nombre, tipo, archivo, descripcion, id_practica, id_bitacora) VALUES
('EVI-001', '2026-03-05', 'Diagnóstico Lectura Grado 4A', 'PDF', 'https://drive.google.com/file/d/diagnostico-4a.pdf', 'Instrumento diagnóstico y matriz de resultados tabulada.', 'PRAC-001', 'BIT-001'),
('EVI-002', '2026-03-12', 'Taller Cuentos Interactivos', 'Plan de Clase', 'https://drive.google.com/file/d/taller-cuentos.pdf', 'Guía didáctica y material visual empleado en clase.', 'PRAC-001', 'BIT-002'),
('EVI-003', '2026-03-19', 'Planilla Acompañamiento Aula', 'Registro', 'https://drive.google.com/file/d/planilla-semana3.pdf', 'Firma de asistencia del docente titular del colegio.', 'PRAC-001', 'BIT-003'),
('EVI-004', '2026-03-10', 'Plan de Clase Integrado Sociales', 'PDF', 'https://drive.google.com/file/d/plan-sociales.pdf', 'Estructura curricular con estándares del MEN.', 'PRAC-002', 'BIT-004')
ON CONFLICT (id_evidencia) DO NOTHING;

INSERT INTO seguimiento_practicas.Evaluacion (id_evaluacion, calificacion, observaciones, fecha, id_bitacora, documento_tu) VALUES
('EVAL-001', 4.8, 'Excelente articulación entre la fundamentación teórica y la intervención práctica en el aula.', '2026-03-15', 'BIT-001', 'DOC-1098234'),
('EVAL-002', 4.7, 'Demuestra liderazgo pedagógico y dominio del grupo escolar asignado.', '2026-03-16', 'BIT-002', 'DOC-1098234')
ON CONFLICT (id_evaluacion) DO NOTHING;
