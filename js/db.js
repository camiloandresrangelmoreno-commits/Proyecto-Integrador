/**
 * SISTEMA INTEGRAL DE GESTIÓN DE PRÁCTICAS ACADÉMICAS - UDI
 * Capa de Datos y Persistencia (JavaScript Vanilla Puro - localStorage)
 * 
 * Basado estrictamente en los Diagramas UML:
 * - Diagrama de Casos de Uso (Estudiante, Tutor Académico, Coordinador, Institución Receptora)
 * - Diagrama de Clases (Estudiante, Tutor_Academico, Coordinador, Institucion, Tipo_Practica, Practica, Actividad, Evidencia, Evaluacion)
 * - Diagrama de Secuencia (Registro de Bitácora y Evidencia)
 */

const DB_KEY = 'SIGP_DATABASE_UDI_V1';

// Estructura inicial semilla alineada 100% al Diagrama de Clases
const initialData = {
    Estudiante: [
        { id_estudiante: 'EST-2024-01', nombre: 'Camilo Andrés Rangel Moreno', correo: 'estudiante@udi.edu.co', semestre: 7, clave: 'estudiante123' },
        { id_estudiante: 'EST-2024-02', nombre: 'Edwin Fabián Quiroga', correo: 'edwin.quiroga@udi.edu.co', semestre: 8, clave: 'edwin123' },
        { id_estudiante: 'EST-2024-03', nombre: 'Laura Valentina Morales', correo: 'laura.morales@udi.edu.co', semestre: 6, clave: 'laura123' }
    ],
    Tutor_Academico: [
        { documento: 'DOC-1098234', nombre: 'Mg. Carlos Alberto Gómez', correo: 'docente@udi.edu.co', clave: 'docente123', especialidad: 'Didáctica de la Lengua' },
        { documento: 'DOC-1098567', nombre: 'Dra. Sandra Milena Peña', correo: 'sandra.pena@udi.edu.co', clave: 'sandra123', especialidad: 'Pedagogía Infantil' }
    ],
    Coordinador: [
        { id_coordinador: 'COORD-001', nombre: 'Dra. María Elena Torres', correo: 'coordinador@udi.edu.co', clave: 'coordinador123', departamento: 'Coordinación de Prácticas Pedagógicas' },
        { id_coordinador: 'DIR-001', nombre: 'Dr. Roberto Mendoza (Director)', correo: 'director@udi.edu.co', clave: 'director123', departamento: 'Dirección de Programa' }
    ],
    Institucion: [
        { id_institucion: 'INST-01', nombre_colegio: 'Colegio Custodio García Rovira', direccion: 'Cra 15 # 45-20, Bucaramanga', correo: 'colegio@udi.edu.co', clave: 'colegio123', telefono: '607-6345000', contacto: 'Lic. Martha Gómez' },
        { id_institucion: 'INST-02', nombre_colegio: 'Instituto Técnico Dámaso Zapata', direccion: 'Calle 10 # 28-35, Bucaramanga', correo: 'damaso@udi.edu.co', clave: 'damaso123', telefono: '607-6452211', contacto: 'Esp. Jairo Ortiz' },
        { id_institucion: 'INST-03', nombre_colegio: 'Colegio Santander Sede A', direccion: 'Calle 9 # 15-40, Bucaramanga', correo: 'santander@udi.edu.co', clave: 'santander123', telefono: '607-6321900', contacto: 'Dra. Beatriz Rico' }
    ],
    Tipo_Practica: [
        { id_tipo: 'TP-01', descripcion: 'Práctica de Observación Pedagógica I' },
        { id_tipo: 'TP-02', descripcion: 'Práctica de Inmersión y Diagnóstico II' },
        { id_tipo: 'TP-03', descripcion: 'Práctica Pedagógica Integral e Intervención III' }
    ],
    Practica: [
        {
            id_practica: 'PRAC-001',
            id_estudiante: 'EST-2024-01',
            documento: 'DOC-1098234',
            id_institucion: 'INST-01',
            id_tipo: 'TP-03',
            estado: 'En Curso',
            fecha_inicio: '2026-02-01',
            horas_objetivo: 80
        },
        {
            id_practica: 'PRAC-002',
            id_estudiante: 'EST-2024-02',
            documento: 'DOC-1098234',
            id_institucion: 'INST-01',
            id_tipo: 'TP-03',
            estado: 'En Curso',
            fecha_inicio: '2026-02-01',
            horas_objetivo: 80
        },
        {
            id_practica: 'PRAC-003',
            id_estudiante: 'EST-2024-03',
            documento: 'DOC-1098567',
            id_institucion: 'INST-02',
            id_tipo: 'TP-02',
            estado: 'Pendiente Aprobación',
            fecha_inicio: '2026-03-01',
            horas_objetivo: 60
        }
    ],
    Actividad: [
        {
            id_actividad: 'ACT-001',
            id_practica: 'PRAC-001',
            fecha: '2026-03-05',
            descripcion: 'Diagnóstico de lectura y escritura en grado 4°A. Aplicación de prueba diagnóstica y rúbrica.',
            horas_realizadas: 4,
            estado_aprovacion: 'Aprobado'
        },
        {
            id_actividad: 'ACT-002',
            id_practica: 'PRAC-001',
            fecha: '2026-03-12',
            descripcion: 'Diseño e implementación de taller de comprensión lectora mediante el uso de cuentos interactivos.',
            horas_realizadas: 5,
            estado_aprovacion: 'Aprobado'
        },
        {
            id_actividad: 'ACT-003',
            id_practica: 'PRAC-001',
            fecha: '2026-03-19',
            descripcion: 'Acompañamiento pedagógico en aula regular y refuerzo a estudiantes con barreras para el aprendizaje.',
            horas_realizadas: 4,
            estado_aprovacion: 'Pendiente'
        },
        {
            id_actividad: 'ACT-004',
            id_practica: 'PRAC-002',
            fecha: '2026-03-10',
            descripcion: 'Observación participante en clase de Ciencias Sociales y formulación de plan de clase integrado.',
            horas_realizadas: 6,
            estado_aprovacion: 'Aprobado'
        }
    ],
    Evidencia: [
        {
            id_evidencia: 'EVI-001',
            id_actividad: 'ACT-001',
            id_practica: 'PRAC-001',
            ruta_archivo: 'https://drive.google.com/file/d/diagnostico-grado-4a.pdf'
        },
        {
            id_evidencia: 'EVI-002',
            id_actividad: 'ACT-002',
            id_practica: 'PRAC-001',
            ruta_archivo: 'https://drive.google.com/file/d/taller-comprension-lectora.pdf'
        },
        {
            id_evidencia: 'EVI-003',
            id_actividad: 'ACT-003',
            id_practica: 'PRAC-001',
            ruta_archivo: 'https://drive.google.com/file/d/registro-acompanamiento-semana3.pdf'
        },
        {
            id_evidencia: 'EVI-004',
            id_actividad: 'ACT-004',
            id_practica: 'PRAC-002',
            ruta_archivo: 'https://drive.google.com/file/d/plan-clase-sociales-evidencia.pdf'
        }
    ],
    Evaluacion: [
        {
            id_evaluacion: 'EVAL-001',
            id_practica: 'PRAC-001',
            documento: 'DOC-1098234',
            calificacion: 4.8,
            observaciones: 'Excelente pertinencia en el diseño de los instrumentos y sólida fundamentación pedagógica.',
            fecha_evaluacion: '2026-03-15'
        }
    ],
    Convenio: [
        {
            id_convenio: 'CONV-2026-01',
            id_institucion: 'INST-01',
            resolucion: 'RES-MEN-045/2026',
            cupos_autorizados: 15,
            fecha_inicio: '2026-01-15',
            fecha_vencimiento: '2027-01-15',
            estado: 'Firmado y Vigente',
            firmado_por: 'Dr. Roberto Mendoza (Director)'
        },
        {
            id_convenio: 'CONV-2026-02',
            id_institucion: 'INST-02',
            resolucion: 'RES-MEN-089/2026',
            cupos_autorizados: 10,
            fecha_inicio: '2026-02-01',
            fecha_vencimiento: '2027-02-01',
            estado: 'Pendiente Firma Rectoral',
            firmado_por: null
        },
        {
            id_convenio: 'CONV-2026-03',
            id_institucion: 'INST-03',
            resolucion: 'RES-MEN-112/2026',
            cupos_autorizados: 12,
            fecha_inicio: '2026-03-01',
            fecha_vencimiento: '2027-03-01',
            estado: 'Pendiente Firma Rectoral',
            firmado_por: null
        }
    ]
};

// Objeto de control de Base de Datos en JavaScript puro
const DB = {
    // Inicializar almacén en localStorage si no existe
    init() {
        if (!localStorage.getItem(DB_KEY)) {
            localStorage.setItem(DB_KEY, JSON.stringify(initialData));
        } else {
            // Asegurar que existan tablas nuevas como Convenio
            try {
                const actual = JSON.parse(localStorage.getItem(DB_KEY));
                if (!actual.Convenio) {
                    actual.Convenio = initialData.Convenio;
                    localStorage.setItem(DB_KEY, JSON.stringify(actual));
                }
            } catch (e) {
                localStorage.setItem(DB_KEY, JSON.stringify(initialData));
            }
        }
    },

    // Obtener toda la base de datos
    getAll() {
        this.init();
        try {
            return JSON.parse(localStorage.getItem(DB_KEY)) || initialData;
        } catch (e) {
            console.error('Error al leer base de datos, restaurando inicial:', e);
            localStorage.setItem(DB_KEY, JSON.stringify(initialData));
            return initialData;
        }
    },

    // Guardar toda la base de datos
    saveAll(data) {
        localStorage.setItem(DB_KEY, JSON.stringify(data));
    },

    // Obtener lista de una tabla (Colección)
    getTable(tableName) {
        const data = this.getAll();
        return data[tableName] || [];
    },

    // Insertar un registro (CREATE)
    insert(tableName, item) {
        const data = this.getAll();
        if (!data[tableName]) {
            data[tableName] = [];
        }
        data[tableName].push(item);
        this.saveAll(data);

        // Sincronización en segundo plano con el Backend Node.js y Supabase
        try {
            if (tableName === 'Estudiante') {
                fetch('/api/academica/estudiantes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        documento: item.documento || item.id_estudiante,
                        nombre: item.nombre,
                        apellido: item.apellido || '',
                        correo: item.correo,
                        semestre: item.semestre || 7,
                        telefono: item.telefono || ''
                    })
                }).catch(() => {});
            } else if (tableName === 'Actividad' || tableName === 'Bitacora') {
                fetch('/api/bitacoras', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id_bitacora: item.id_actividad || item.id_bitacora,
                        id_practica: item.id_practica || 'PRAC-001',
                        fecha: item.fecha,
                        descripcion: item.descripcion,
                        horas: item.horas_realizadas || item.horas || 4,
                        archivo: item.evidencia || item.archivo || ''
                    })
                }).catch(() => {});
            } else if (tableName === 'Tutor_Academico') {
                fetch('/api/academica/tutores', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(item)
                }).catch(() => {});
            } else if (tableName === 'Institucion') {
                fetch('/api/academica/instituciones', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(item)
                }).catch(() => {});
            } else if (tableName === 'Evaluacion') {
                fetch('/api/seguimiento/evaluaciones', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(item)
                }).catch(() => {});
            }
        } catch (e) {
            // Failsafe silencioso
        }

        return item;
    },

    // Actualizar un registro (UPDATE)
    update(tableName, keyField, keyValue, updatedFields) {
        const data = this.getAll();
        if (!data[tableName]) return false;
        const index = data[tableName].findIndex(record => record[keyField] === keyValue);
        if (index !== -1) {
            data[tableName][index] = { ...data[tableName][index], ...updatedFields };
            this.saveAll(data);

            // Sincronización en segundo plano con el Backend y Supabase
            try {
                if (tableName === 'Actividad' || tableName === 'Bitacora') {
                    fetch(`/api/seguimiento/bitacoras/${keyValue}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updatedFields)
                    }).catch(() => {});
                } else if (tableName === 'Estudiante') {
                    fetch(`/api/academica/estudiantes/${keyValue}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updatedFields)
                    }).catch(() => {});
                }
            } catch (e) {}

            return data[tableName][index];
        }
        return false;
    },

    // Eliminar un registro (DELETE)
    delete(tableName, keyField, keyValue) {
        const data = this.getAll();
        if (!data[tableName]) return false;
        const originalLength = data[tableName].length;
        data[tableName] = data[tableName].filter(record => record[keyField] !== keyValue);
        if (data[tableName].length !== originalLength) {
            this.saveAll(data);

            // Sincronización en segundo plano con el Backend y Supabase
            try {
                if (tableName === 'Estudiante') {
                    fetch(`/api/academica/estudiantes/${keyValue}`, { method: 'DELETE' }).catch(() => {});
                } else if (tableName === 'Institucion') {
                    fetch(`/api/academica/instituciones/${keyValue}`, { method: 'DELETE' }).catch(() => {});
                }
            } catch (e) {}

            return true;
        }
        return false;
    },

    // Búsqueda de un registro por campo y valor (READ)
    findBy(tableName, field, value) {
        const table = this.getTable(tableName);
        return table.find(r => r[field] === value) || null;
    },

    // Filtro de múltiples registros por campo y valor
    filterBy(tableName, field, value) {
        const table = this.getTable(tableName);
        return table.filter(r => r[field] === value);
    },

    // Reiniciar base de datos a valores de fábrica
    reset() {
        localStorage.setItem(DB_KEY, JSON.stringify(initialData));
        return true;
    },

    // -------------------------------------------------------------
    // LÓGICA DE NEGOCIO Y AUTENTICACIÓN
    // -------------------------------------------------------------
    login(email, password, rol) {
        const data = this.getAll();
        let user = null;
        let redirectUrl = '';

        const cleanEmail = (email || '').trim().toLowerCase();
        const cleanPass = (password || '').trim();

        if (rol === 'coordinador' || rol === 'director') {
            const coord = (data.Coordinador || []).find(c => 
                c.correo.toLowerCase() === cleanEmail && c.clave === cleanPass
            );
            if (coord) {
                user = {
                    id: coord.id_coordinador,
                    nombre: coord.nombre,
                    correo: coord.correo,
                    rol: coord.id_coordinador.startsWith('DIR') ? 'director' : 'coordinador',
                    departamento: coord.departamento
                };
                redirectUrl = user.rol === 'director' ? 'views/dashboard.html' : 'views/coordinador.html';
            }
        } else if (rol === 'docente') {
            const tutor = (data.Tutor_Academico || []).find(t => 
                t.correo.toLowerCase() === cleanEmail && t.clave === cleanPass
            );
            if (tutor) {
                user = {
                    id: tutor.documento,
                    documento: tutor.documento,
                    nombre: tutor.nombre,
                    correo: tutor.correo,
                    rol: 'docente',
                    especialidad: tutor.especialidad
                };
                redirectUrl = 'views/docente.html';
            }
        } else if (rol === 'estudiante') {
            const est = (data.Estudiante || []).find(e => 
                e.correo.toLowerCase() === cleanEmail && e.clave === cleanPass
            );
            if (est) {
                user = {
                    id: est.id_estudiante,
                    id_estudiante: est.id_estudiante,
                    nombre: est.nombre,
                    correo: est.correo,
                    rol: 'estudiante',
                    semestre: est.semestre
                };
                redirectUrl = 'views/estudiante.html';
            }
        } else if (rol === 'institucion') {
            const inst = (data.Institucion || []).find(i => 
                i.correo.toLowerCase() === cleanEmail && i.clave === cleanPass
            );
            if (inst) {
                user = {
                    id: inst.id_institucion,
                    id_institucion: inst.id_institucion,
                    nombre: inst.nombre_colegio,
                    correo: inst.correo,
                    rol: 'institucion',
                    direccion: inst.direccion
                };
                redirectUrl = 'views/institucion.html';
            }
        }

        if (user) {
            localStorage.setItem('SIGP_SESION_ACTIVA', JSON.stringify(user));
            // Mantenemos retrocompatibilidad con llaves antiguas
            localStorage.setItem('sesion_usuario', user.correo);
            localStorage.setItem('sesion_rol', user.rol);
            localStorage.setItem('sesion_nombre', user.nombre);
            return { success: true, user, redirectUrl };
        } else {
            return { success: false, message: 'Credenciales inválidas para el rol seleccionado.' };
        }
    },

    getSession() {
        try {
            const raw = localStorage.getItem('SIGP_SESION_ACTIVA');
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    },

    logout(relativeRedirectPath = '../index.html') {
        localStorage.removeItem('SIGP_SESION_ACTIVA');
        localStorage.removeItem('sesion_usuario');
        localStorage.removeItem('sesion_rol');
        localStorage.removeItem('sesion_nombre');
        window.location.href = relativeRedirectPath;
    },

    // Comprobador de seguridad para proteger vistas según rol
    requireRole(expectedRoles, fallbackPath = '../index.html') {
        const session = this.getSession();
        if (!session) {
            alert('Debes iniciar sesión para acceder a este módulo.');
            window.location.href = fallbackPath;
            return null;
        }
        const roles = Array.isArray(expectedRoles) ? expectedRoles : [expectedRoles];
        if (!roles.includes(session.rol)) {
            alert(`Acceso no autorizado para tu rol (${session.rol}). Redireccionando...`);
            window.location.href = fallbackPath;
            return null;
        }
        return session;
    }
};

// Inicializar de inmediato al cargar el script
DB.init();
