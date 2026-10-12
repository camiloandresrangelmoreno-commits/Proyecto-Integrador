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

// Clave única para aislamiento de la memoria local en el navegador (V5 con 5 estudiantes oficiales normalizados)
const CLAVE_ALMACENAMIENTO_LOCAL = 'SIGP_DATABASE_UDI_V5';

// Estructura semilla inicial modelada exactamente según el Diagrama de Clases UML
const datosSemillaInicial = {
    Estudiante: [
        { id_estudiante: 'EST-2024-01', documento: '1098234501', nombre: 'Camilo Andrés Rangel Moreno', correo: 'estudiante@udi.edu.co', semestre: 7, clave: 'estudiante123' },
        { id_estudiante: 'EST-2024-02', documento: '1098234502', nombre: 'Edwin Fabián Quiroga Díaz', correo: 'edwin.quiroga@udi.edu.co', semestre: 8, clave: 'edwin123' },
        { id_estudiante: 'EST-2024-03', documento: '1098234503', nombre: 'Laura Valentina Morales Gómez', correo: 'laura.morales@udi.edu.co', semestre: 6, clave: 'laura123' },
        { id_estudiante: 'EST-2024-04', documento: '1098234504', nombre: 'María Camila Sotomayor Peña', correo: 'marias@udi.edu.co', semestre: 6, clave: 'estudiante123' },
        { id_estudiante: 'EST-2024-05', documento: '1098234505', nombre: 'María Fernanda Vargas Suárez', correo: 'maria@udi.edu.co', semestre: 7, clave: 'estudiante123' }
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
            id_institucion: 'INST-02',
            id_tipo: 'TP-03',
            estado: 'En Curso',
            fecha_inicio: '2026-02-01',
            horas_objetivo: 80
        },
        {
            id_practica: 'PRAC-003',
            id_estudiante: 'EST-2024-03',
            documento: 'DOC-1098567',
            id_institucion: 'INST-03',
            id_tipo: 'TP-02',
            estado: 'En Curso',
            fecha_inicio: '2026-03-01',
            horas_objetivo: 60
        },
        {
            id_practica: 'PRAC-004',
            id_estudiante: 'EST-2024-04',
            documento: 'DOC-1098567',
            id_institucion: 'INST-01',
            id_tipo: 'TP-01',
            estado: 'En Curso',
            fecha_inicio: '2026-03-01',
            horas_objetivo: 50
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
        },
        {
            id_actividad: 'ACT-005',
            id_practica: 'PRAC-002',
            fecha: '2026-03-18',
            descripcion: 'Diseño de rúbrica de evaluación formativa y taller de geografía interactiva con mapas temáticos.',
            horas_realizadas: 5,
            estado_aprovacion: 'Aprobado'
        },
        {
            id_actividad: 'ACT-006',
            id_practica: 'PRAC-003',
            fecha: '2026-03-08',
            descripcion: 'Diagnóstico situacional del aula de inclusión y caracterización de estilos de aprendizaje bajo el modelo DUA.',
            horas_realizadas: 5,
            estado_aprovacion: 'Aprobado'
        },
        {
            id_actividad: 'ACT-007',
            id_practica: 'PRAC-003',
            fecha: '2026-03-16',
            descripcion: 'Implementación de material manipulativo para estimulación sensoriomotora en lenguaje inicial.',
            horas_realizadas: 5,
            estado_aprovacion: 'Aprobado'
        },
        {
            id_actividad: 'ACT-008',
            id_practica: 'PRAC-004',
            fecha: '2026-03-14',
            descripcion: 'Observación guiada en aula y registro etnográfico de dinámicas de convivencia escolar.',
            horas_realizadas: 4,
            estado_aprovacion: 'Aprobado'
        },
        {
            id_actividad: 'ACT-009',
            id_practica: 'PRAC-004',
            fecha: '2026-03-21',
            descripcion: 'Apoyo en organización de rincones de lectura y actividades lúdicas de iniciación literaria.',
            horas_realizadas: 4,
            estado_aprovacion: 'Pendiente'
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
        },
        {
            id_evidencia: 'EVI-005',
            id_actividad: 'ACT-005',
            id_practica: 'PRAC-002',
            ruta_archivo: 'https://drive.google.com/file/d/rubrica-geografia-interactiva.pdf'
        },
        {
            id_evidencia: 'EVI-006',
            id_actividad: 'ACT-006',
            id_practica: 'PRAC-003',
            ruta_archivo: 'https://drive.google.com/file/d/diagnostico-aula-inclusion-damaso.pdf'
        },
        {
            id_evidencia: 'EVI-007',
            id_actividad: 'ACT-007',
            id_practica: 'PRAC-003',
            ruta_archivo: 'https://drive.google.com/file/d/guia-material-manipulativo.pdf'
        },
        {
            id_evidencia: 'EVI-008',
            id_actividad: 'ACT-008',
            id_practica: 'PRAC-004',
            ruta_archivo: 'https://drive.google.com/file/d/diario-campo-observacion-santander.pdf'
        },
        {
            id_evidencia: 'EVI-009',
            id_actividad: 'ACT-009',
            id_practica: 'PRAC-004',
            ruta_archivo: 'https://drive.google.com/file/d/registro-rincones-lectura.pdf'
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
        },
        {
            id_evaluacion: 'EVAL-002',
            id_practica: 'PRAC-002',
            documento: 'DOC-1098234',
            calificacion: 4.7,
            observaciones: 'Excelente iniciativa en la formulación de secuencias didácticas de ciencias sociales.',
            fecha_evaluacion: '2026-03-20'
        },
        {
            id_evaluacion: 'EVAL-003',
            id_practica: 'PRAC-003',
            documento: 'DOC-1098567',
            calificacion: 4.9,
            observaciones: 'Compromiso ejemplar con los estudiantes de inclusión y gran sensibilidad pedagógica.',
            fecha_evaluacion: '2026-03-22'
        },
        {
            id_evaluacion: 'EVAL-004',
            id_practica: 'PRAC-004',
            documento: 'DOC-1098567',
            calificacion: 4.6,
            observaciones: 'Muy buena capacidad de observación e identificación de necesidades socioeducativas en aula.',
            fecha_evaluacion: '2026-03-25'
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
                let huboActualizaciones = false;
                if (!datosGuardados.Convenio) {
                    datosGuardados.Convenio = datosSemillaInicial.Convenio;
                    huboActualizaciones = true;
                }
                if (huboActualizaciones) {
                    localStorage.setItem(CLAVE_ALMACENAMIENTO_LOCAL, JSON.stringify(datosGuardados));
                }
            } catch (error) {
                localStorage.setItem(CLAVE_ALMACENAMIENTO_LOCAL, JSON.stringify(datosSemillaInicial));
            }
        }

        // Saneamiento de consistencia: si hay aspirantes en espera en solicitudes_aspirantes,
        // garantizar que no existan aún en la tabla oficial Estudiante hasta que el Coordinador los apruebe
        try {
            const solicitudes = JSON.parse(localStorage.getItem('solicitudes_aspirantes')) || [];
            const correosEnEspera = solicitudes
                .filter(s => s.estado === 'Pendiente' || !s.estado)
                .map(s => String(s.correo || '').trim().toLowerCase());

            if (correosEnEspera.length > 0) {
                const datos = JSON.parse(localStorage.getItem(CLAVE_ALMACENAMIENTO_LOCAL));
                if (datos && Array.isArray(datos.Estudiante)) {
                    const cantOriginal = datos.Estudiante.length;
                    datos.Estudiante = datos.Estudiante.filter(e => 
                        !correosEnEspera.includes(String(e.correo || '').trim().toLowerCase())
                    );
                    if (datos.Estudiante.length !== cantOriginal) {
                        localStorage.setItem(CLAVE_ALMACENAMIENTO_LOCAL, JSON.stringify(datos));
                    }
                }
            }
        } catch (e) {
            // Ignorar errores de parseo
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
     * Sincroniza bidireccionalmente el almacén local con los endpoints del servidor en Supabase.
     * Descarga estudiantes, solicitudes, bitácoras y prácticas actualizadas para que
     * cualquier cambio realizado en la nube o en otro navegador (VS Code o vista previa)
     * se refleje de manera inmediata e idéntica.
     * 
     * @async
     * @function syncWithBackend
     * @returns {Promise<boolean>}
     */
    async syncWithBackend() {
        try {
            const datos = this.getAll();
            let huboCambios = false;

            // 1. Sincronizar estudiantes desde PostgreSQL
            try {
                const resEst = await fetch('/api/academica/estudiantes');
                if (resEst.ok) {
                    const estudiantesNube = await resEst.json();
                    if (Array.isArray(estudiantesNube)) {
                        estudiantesNube.forEach(est => {
                            const doc = String(est.documento || '').trim();
                            const id = doc.startsWith('EST') ? doc : `EST-2024-${doc.slice(-2)}`;
                            const indice = (datos.Estudiante || []).findIndex(e => 
                                String(e.correo || '').toLowerCase() === String(est.correo || '').toLowerCase() ||
                                String(e.id_estudiante || '') === id ||
                                String(e.documento || '') === doc
                            );
                            const nombreCompleto = est.apellido ? `${est.nombre} ${est.apellido}`.trim() : est.nombre;
                            if (indice === -1) {
                                datos.Estudiante.push({
                                    id_estudiante: id,
                                    documento: doc,
                                    nombre: nombreCompleto,
                                    correo: est.correo,
                                    semestre: parseInt(est.semestre) || 7,
                                    clave: 'estudiante123'
                                });
                                huboCambios = true;
                            } else {
                                datos.Estudiante[indice].nombre = nombreCompleto || datos.Estudiante[indice].nombre;
                                datos.Estudiante[indice].semestre = parseInt(est.semestre) || datos.Estudiante[indice].semestre;
                            }
                        });
                    }
                }
            } catch (e) {}

            // 2. Sincronizar solicitudes de aspirantes desde el servidor
            try {
                const resSol = await fetch('/api/solicitudes');
                if (resSol.ok) {
                    const solicitudesNube = await resSol.json();
                    if (Array.isArray(solicitudesNube)) {
                        localStorage.setItem('solicitudes_aspirantes', JSON.stringify(solicitudesNube));
                    }
                }
            } catch (e) {}

            // 3. Sincronizar prácticas desde la base de datos
            try {
                const resPrac = await fetch('/api/academica/practicas');
                if (resPrac.ok) {
                    const practicasNube = await resPrac.json();
                    if (Array.isArray(practicasNube)) {
                        practicasNube.forEach(p => {
                            const existe = (datos.Practica || []).some(pr => pr.id_practica === p.id_practica);
                            if (!existe) {
                                datos.Practica.push({
                                    id_practica: p.id_practica,
                                    id_estudiante: p.documento ? (p.documento.startsWith('EST') ? p.documento : `EST-2024-${p.documento.slice(-2)}`) : 'EST-2024-01',
                                    documento: p.documento_tu || 'DOC-1098234',
                                    id_institucion: p.id_institucion || 'INST-01',
                                    id_tipo: p.id_tipo || 'TP-01',
                                    estado: p.estado || 'En Curso',
                                    fecha_inicio: p.fecha_ini || '2026-02-01',
                                    horas_objetivo: 80
                                });
                                huboCambios = true;
                            }
                        });
                    }
                }
            } catch (e) {}

            if (huboCambios) {
                this.saveAll(datos);
            }

            // Disparar evento para que las interfaces reactivas se actualicen en pantalla
            window.dispatchEvent(new CustomEvent('db:sincronizado'));
            return true;
        } catch (e) {
            return false;
        }
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
                // Determinar el id_practica real del registro
                let idPracticaReal = nuevoRegistro.id_practica;
                if (!idPracticaReal) {
                    const sesionActiva = JSON.parse(sessionStorage.getItem('usuario_sesion') || '{}');
                    const estudianteActual = sesionActiva.id_estudiante || sesionActiva.correo;
                    const prac = (datos.Practica || []).find(p => p.id_estudiante === estudianteActual || p.id_estudiante === sesionActiva.id_estudiante);
                    idPracticaReal = prac ? prac.id_practica : 'PRAC-001';
                }
                fetch('/api/bitacoras', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id_bitacora: nuevoRegistro.id_actividad || nuevoRegistro.id_bitacora,
                        id_practica: idPracticaReal,
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
            // 1. Validar primero si el aspirante tiene una solicitud pendiente de aprobación
            try {
                const solicitudes = JSON.parse(localStorage.getItem('solicitudes_aspirantes')) || [];
                const solicitudEnEspera = solicitudes.find(s => 
                    String(s.correo || '').trim().toLowerCase() === correoLimpio && (s.estado === 'Pendiente' || !s.estado)
                );
                if (solicitudEnEspera) {
                    return {
                        success: false,
                        message: `Acceso restringido: Tu solicitud de inscripción para ${solicitudEnEspera.nombre} está en estado de ESPERA (Pendiente de Aprobación).\n\nEl Coordinador de Práctica debe revisar y aceptar tu solicitud antes de que puedas iniciar sesión.`
                    };
                }
            } catch (e) {}

            // 2. Buscar en la tabla oficial de Estudiantes matriculados
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
            } else {
                // Verificar si el correo existe pero la contraseña no coincide
                const correoCoincide = (datos.Estudiante || []).some(e => e.correo.toLowerCase() === correoLimpio);
                if (correoCoincide) {
                    return { success: false, message: 'Contraseña incorrecta. Por favor verifica tu clave.' };
                }
                return { 
                    success: false, 
                    message: 'Estudiante no registrado o aún no aprobado por el Coordinador de Prácticas.' 
                };
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
if (typeof window !== 'undefined') {
    DB.syncWithBackend();
    window.addEventListener('DOMContentLoaded', () => {
        DB.syncWithBackend();
    });
}
