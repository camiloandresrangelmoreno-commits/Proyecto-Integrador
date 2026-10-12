/**
 * ============================================================================
 * SISTEMA INTEGRAL DE GESTIÓN DE PRÁCTICAS ACADÉMICAS (UDI)
 * CAPA DE DATOS Y PERSISTENCIA CLIENTE (JAVASCRIPT VANILLA PURO)
 * ============================================================================
 * 
 * Basado estrictamente en los diagramas UML del proyecto:
 * - Diagrama de Casos de Uso (Estudiante, Tutor Académico, Coordinador, Institución)
 * - Diagrama de Secuencia (Registro de Bitácora y Evidencia: HTTP 201 Created)
 * - Diagrama de Clases (Estudiante, Tutor, Institución, Tipo, Práctica, Actividad, Evidencia, Evaluación)
 * 
 * Funcionalidad:
 * Provee almacenamiento local de contingencia (localStorage) y sincronización
 * asíncrona bidireccional con el backend en Node.js y PostgreSQL en Supabase.
 */

// Clave única para aislamiento de la memoria local en el navegador
const CLAVE_ALMACENAMIENTO_LOCAL = 'SIGP_DATABASE_UDI_V1';

// Estructura semilla inicial modelada exactamente según el Diagrama de Clases UML
const datosSemillaInicial = {
    Estudiante: [
        { id_estudiante: 'EST-2024-01', documento: '1098234501', nombre: 'Camilo Andrés Rangel Moreno', correo: 'estudiante@udi.edu.co', semestre: 7, clave: 'estudiante123' },
        { id_estudiante: 'EST-2024-02', documento: '1098234502', nombre: 'Edwin Fabián Quiroga Díaz', correo: 'edwin.quiroga@udi.edu.co', semestre: 8, clave: 'edwin123' },
        { id_estudiante: 'EST-2024-03', documento: '1098234503', nombre: 'Laura Valentina Morales Gómez', correo: 'laura.morales@udi.edu.co', semestre: 6, clave: 'laura123' }
    ],
    Tutor_Academico: [
        { documento: 'DOC-1098234', documento_tu: 'DOC-1098234', nombre: 'Mg. Carlos Alberto Gómez Silva', correo: 'docente@udi.edu.co', clave: 'docente123', especialidad: 'Didáctica de la Lengua' },
        { documento: 'DOC-1098567', documento_tu: 'DOC-1098567', nombre: 'Dra. Sandra Milena Peña Castillo', correo: 'sandra.pena@udi.edu.co', clave: 'sandra123', especialidad: 'Pedagogía Infantil' }
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

/**
 * Objeto singleton que encapsula las operaciones de datos, sesiones y sincronización.
 */
const DB = {
    /**
     * Inicializa el almacén en localStorage si no existe o sincroniza tablas nuevas.
     */
    init() {
        if (!localStorage.getItem(CLAVE_ALMACENAMIENTO_LOCAL)) {
            localStorage.setItem(CLAVE_ALMACENAMIENTO_LOCAL, JSON.stringify(datosSemillaInicial));
        } else {
            try {
                const datosGuardados = JSON.parse(localStorage.getItem(CLAVE_ALMACENAMIENTO_LOCAL));
                if (!datosGuardados.Convenio) {
                    datosGuardados.Convenio = datosSemillaInicial.Convenio;
                    localStorage.setItem(CLAVE_ALMACENAMIENTO_LOCAL, JSON.stringify(datosGuardados));
                }
            } catch (error) {
                localStorage.setItem(CLAVE_ALMACENAMIENTO_LOCAL, JSON.stringify(datosSemillaInicial));
            }
        }
    },

    /**
     * Lee y retorna todas las colecciones de datos almacenadas.
     * @returns {Object} Objeto completo con todas las tablas.
     */
    getAll() {
        this.init();
        try {
            return JSON.parse(localStorage.getItem(CLAVE_ALMACENAMIENTO_LOCAL)) || datosSemillaInicial;
        } catch (error) {
            console.error('Error al parsear base de datos local:', error);
            return datosSemillaInicial;
        }
    },

    /**
     * Persiste el objeto completo en localStorage.
     * @param {Object} datos - Estructura de datos a guardar.
     */
    saveAll(datos) {
        localStorage.setItem(CLAVE_ALMACENAMIENTO_LOCAL, JSON.stringify(datos));
    },

    /**
     * Retorna el arreglo de registros correspondiente a una tabla específica.
     * @param {string} nombreTabla - Nombre de la entidad (ej: 'Estudiante', 'Practica').
     * @returns {Array<Object>} Arreglo de registros.
     */
    getTable(nombreTabla) {
        const datos = this.getAll();
        return datos[nombreTabla] || [];
    },

    /**
     * Inserta un nuevo registro en una tabla y dispara sincronización con la API en la nube.
     * @param {string} nombreTabla - Nombre de la entidad destino.
     * @param {Object} nuevoRegistro - Datos a insertar.
     * @returns {Object} Registro insertado.
     */
    insert(nombreTabla, nuevoRegistro) {
        const datos = this.getAll();
        if (!datos[nombreTabla]) {
            datos[nombreTabla] = [];
        }
        datos[nombreTabla].push(nuevoRegistro);
        this.saveAll(datos);

        // Sincronización asíncrona en segundo plano con la base de datos PostgreSQL en Supabase
        try {
            if (nombreTabla === 'Estudiante') {
                fetch('/api/academica/estudiantes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        documento: nuevoRegistro.documento || nuevoRegistro.id_estudiante,
                        nombre: nuevoRegistro.nombre,
                        apellido: nuevoRegistro.apellido || '',
                        correo: nuevoRegistro.correo,
                        semestre: nuevoRegistro.semestre || 7,
                        telefono: nuevoRegistro.telefono || ''
                    })
                }).catch(() => {});
            } else if (nombreTabla === 'Actividad' || nombreTabla === 'Bitacora') {
                fetch('/api/bitacoras', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id_bitacora: nuevoRegistro.id_actividad || nuevoRegistro.id_bitacora,
                        id_practica: nuevoRegistro.id_practica || 'PRAC-001',
                        fecha: nuevoRegistro.fecha,
                        descripcion: nuevoRegistro.descripcion,
                        horas: nuevoRegistro.horas_realizadas || nuevoRegistro.horas || 4,
                        archivo: nuevoRegistro.evidencia || nuevoRegistro.archivo || ''
                    })
                }).catch(() => {});
            } else if (nombreTabla === 'Tutor_Academico') {
                fetch('/api/academica/tutores', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(nuevoRegistro)
                }).catch(() => {});
            } else if (nombreTabla === 'Institucion') {
                fetch('/api/academica/instituciones', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(nuevoRegistro)
                }).catch(() => {});
            } else if (nombreTabla === 'Practica') {
                fetch('/api/academica/practicas', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id_practica: nuevoRegistro.id_practica,
                        fecha_ini: nuevoRegistro.fecha_inicio || nuevoRegistro.fecha_ini || '2026-02-01',
                        fecha_fin: nuevoRegistro.fecha_fin || '2026-06-15',
                        horas_cumplidas: nuevoRegistro.horas_cumplidas || 0,
                        estado: nuevoRegistro.estado || 'En Curso',
                        nombre_prac: nuevoRegistro.nombre_prac || 'Práctica Pedagógica Integral',
                        documento: nuevoRegistro.id_estudiante || nuevoRegistro.documento || '1098234501',
                        documento_tu: nuevoRegistro.documento || nuevoRegistro.documento_tu || 'DOC-1098234',
                        id_institucion: nuevoRegistro.id_institucion || 'INST-01',
                        id_tipo: nuevoRegistro.id_tipo || 'TP-01'
                    })
                }).catch(() => {});
            } else if (nombreTabla === 'Evaluacion') {
                fetch('/api/seguimiento/evaluaciones', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(nuevoRegistro)
                }).catch(() => {});
            }
        } catch (error) {
            // Failsafe silencioso para garantizar operatividad offline
        }

        return nuevoRegistro;
    },

    /**
     * Actualiza un registro existente buscando por su campo identificador clave.
     * @param {string} nombreTabla - Entidad a modificar.
     * @param {string} campoClave - Nombre del campo clave (ej: 'id_estudiante', 'id_practica').
     * @param {*} valorClave - Valor del identificador.
     * @param {Object} camposActualizados - Nuevos valores a combinar.
     * @returns {Object|boolean} Registro modificado o false si no fue encontrado.
     */
    update(nombreTabla, campoClave, valorClave, camposActualizados) {
        const datos = this.getAll();
        if (!datos[nombreTabla]) return false;
        const indice = datos[nombreTabla].findIndex(item => item[campoClave] === valorClave);
        if (indice !== -1) {
            datos[nombreTabla][indice] = { ...datos[nombreTabla][indice], ...camposActualizados };
            this.saveAll(datos);

            // Sincronización en segundo plano con el Backend y Supabase
            try {
                if (nombreTabla === 'Actividad' || nombreTabla === 'Bitacora') {
                    fetch(`/api/seguimiento/bitacoras/${valorClave}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(camposActualizados)
                    }).catch(() => {});
                } else if (nombreTabla === 'Estudiante') {
                    fetch(`/api/academica/estudiantes/${valorClave}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(camposActualizados)
                    }).catch(() => {});
                }
            } catch (error) {}

            return datos[nombreTabla][indice];
        }
        return false;
    },

    /**
     * Elimina un registro de una tabla por su identificador clave.
     * @param {string} nombreTabla - Entidad de la cual eliminar.
     * @param {string} campoClave - Nombre del campo identificador.
     * @param {*} valorClave - Valor único a eliminar.
     * @returns {boolean} Verdadero si fue eliminado, falso si no existía.
     */
    delete(nombreTabla, campoClave, valorClave) {
        const datos = this.getAll();
        if (!datos[nombreTabla]) return false;
        const longitudOriginal = datos[nombreTabla].length;
        datos[nombreTabla] = datos[nombreTabla].filter(item => item[campoClave] !== valorClave);
        if (datos[nombreTabla].length !== longitudOriginal) {
            this.saveAll(datos);

            // Sincronización de borrado con la nube
            try {
                if (nombreTabla === 'Estudiante') {
                    fetch(`/api/academica/estudiantes/${valorClave}`, { method: 'DELETE' }).catch(() => {});
                } else if (nombreTabla === 'Institucion') {
                    fetch(`/api/academica/instituciones/${valorClave}`, { method: 'DELETE' }).catch(() => {});
                }
            } catch (error) {}

            return true;
        }
        return false;
    },

    /**
     * Busca el primer registro que coincida con un campo y valor específico.
     * @param {string} nombreTabla - Entidad donde buscar.
     * @param {string} campo - Nombre del atributo.
     * @param {*} valor - Valor buscado.
     * @returns {Object|null} Objeto encontrado o null.
     */
    findBy(nombreTabla, campo, valor) {
        const tabla = this.getTable(nombreTabla);
        return tabla.find(item => item[campo] === valor) || null;
    },

    /**
     * Filtra y retorna todos los registros que coincidan con un campo y valor.
     * @param {string} nombreTabla - Entidad a filtrar.
     * @param {string} campo - Nombre del atributo.
     * @param {*} valor - Valor a comparar.
     * @returns {Array<Object>} Arreglo con los registros coincidentes.
     */
    filterBy(nombreTabla, campo, valor) {
        const tabla = this.getTable(nombreTabla);
        return tabla.filter(item => item[campo] === valor);
    },

    // ========================================================================
    // AUTENTICACIÓN Y CONTROL DE SESIONES POR ROL ACADÉMICO
    // ========================================================================

    /**
     * Autentica credenciales contra la base de datos y genera la sesión activa.
     * @param {string} correo - Correo institucional UDI.
     * @param {string} password - Contraseña ingresada.
     * @param {string} rol - Rol seleccionado ('estudiante', 'docente', 'coordinador', 'director', 'institucion').
     * @returns {Object} Resultado con indicador success, datos de usuario y URL de redirección.
     */
    login(correo, password, rol) {
        const datos = this.getAll();
        let usuarioValido = null;
        let urlDestino = '';

        const correoLimpio = String(correo || '').trim().toLowerCase();
        const claveLimpia = String(password || '').trim();

        if (rol === 'director') {
            const director = (datos.Coordinador || []).find(c => 
                c.correo.toLowerCase() === correoLimpio && c.clave === claveLimpia && c.id_coordinador.startsWith('DIR')
            );
            if (director) {
                usuarioValido = {
                    id: director.id_coordinador,
                    nombre: director.nombre,
                    correo: director.correo,
                    rol: 'director',
                    departamento: director.departamento
                };
                urlDestino = 'views/dashboard.html';
            }
        } else if (rol === 'coordinador') {
            const coordinador = (datos.Coordinador || []).find(c => 
                c.correo.toLowerCase() === correoLimpio && c.clave === claveLimpia && !c.id_coordinador.startsWith('DIR')
            );
            if (coordinador) {
                usuarioValido = {
                    id: coordinador.id_coordinador,
                    nombre: coordinador.nombre,
                    correo: coordinador.correo,
                    rol: 'coordinador',
                    departamento: coordinador.departamento
                };
                urlDestino = 'views/coordinador.html';
            }
        } else if (rol === 'docente') {
            const tutor = (datos.Tutor_Academico || []).find(t => 
                t.correo.toLowerCase() === correoLimpio && t.clave === claveLimpia
            );
            if (tutor) {
                usuarioValido = {
                    id: tutor.documento,
                    documento: tutor.documento,
                    nombre: tutor.nombre,
                    correo: tutor.correo,
                    rol: 'docente',
                    especialidad: tutor.especialidad
                };
                urlDestino = 'views/docente.html';
            }
        } else if (rol === 'estudiante') {
            const estudiante = (datos.Estudiante || []).find(e => 
                e.correo.toLowerCase() === correoLimpio && e.clave === claveLimpia
            );
            if (estudiante) {
                usuarioValido = {
                    id: estudiante.id_estudiante,
                    id_estudiante: estudiante.id_estudiante,
                    documento: estudiante.documento,
                    nombre: estudiante.nombre,
                    correo: estudiante.correo,
                    rol: 'estudiante',
                    semestre: estudiante.semestre
                };
                urlDestino = 'views/estudiante.html';
            }
        } else if (rol === 'institucion') {
            const institucion = (datos.Institucion || []).find(i => 
                i.correo.toLowerCase() === correoLimpio && i.clave === claveLimpia
            );
            if (institucion) {
                usuarioValido = {
                    id: institucion.id_institucion,
                    id_institucion: institucion.id_institucion,
                    nombre: institucion.nombre_colegio,
                    correo: institucion.correo,
                    rol: 'institucion',
                    direccion: institucion.direccion
                };
                urlDestino = 'views/institucion.html';
            }
        }

        if (usuarioValido) {
            localStorage.setItem('SIGP_SESION_ACTIVA', JSON.stringify(usuarioValido));
            localStorage.setItem('sesion_usuario', usuarioValido.correo);
            localStorage.setItem('sesion_rol', usuarioValido.rol);
            localStorage.setItem('sesion_nombre', usuarioValido.nombre);
            return { success: true, user: usuarioValido, redirectUrl: urlDestino };
        }

        return { success: false, message: 'Credenciales inválidas para el rol académico seleccionado.' };
    },

    /**
     * Obtiene el objeto de sesión del usuario actualmente autenticado.
     * @returns {Object|null} Objeto con datos del usuario en sesión o null.
     */
    getSession() {
        try {
            const sesionSerializada = localStorage.getItem('SIGP_SESION_ACTIVA');
            return sesionSerializada ? JSON.parse(sesionSerializada) : null;
        } catch (error) {
            return null;
        }
    },

    /**
     * Cierra la sesión activa y redirige al portal de login.
     * @param {string} [rutaRedireccion='../index.html'] - Destino tras el cierre.
     */
    logout(rutaRedireccion = '../index.html') {
        localStorage.removeItem('SIGP_SESION_ACTIVA');
        localStorage.removeItem('sesion_usuario');
        localStorage.removeItem('sesion_rol');
        localStorage.removeItem('sesion_nombre');
        window.location.href = rutaRedireccion;
    },

    /**
     * Guardia de seguridad que protege vistas validando roles autorizados.
     * @param {string|Array<string>} rolesEsperados - Roles que tienen acceso a la vista.
     * @param {string} [rutaRetorno='../index.html'] - Ruta hacia donde expulsar si no está autorizado.
     * @returns {Object|null} Objeto de sesión válido o null si es rechazado.
     */
    requireRole(rolesEsperados, rutaRetorno = '../index.html') {
        const sesion = this.getSession();
        if (!sesion) {
            alert('Debes iniciar sesión para acceder a este módulo.');
            window.location.href = rutaRetorno;
            return null;
        }
        const listaRoles = Array.isArray(rolesEsperados) ? rolesEsperados : [rolesEsperados];
        if (!listaRoles.includes(sesion.rol)) {
            alert(`Acceso no autorizado para tu rol (${sesion.rol}). Redirigiendo...`);
            window.location.href = rutaRetorno;
            return null;
        }
        return sesion;
    }
};

// Inicialización inmediata al importar el script
DB.init();
