/**
 * ============================================================================
 * SOFTWARE PARA LA GESTIÓN Y SEGUIMIENTO DE PRÁCTICAS ACADÉMICAS (UDI)
 * CAPA DE DATOS Y SINCRONIZACIÓN CLIENTE (100% API REST / SUPABASE)
 * ============================================================================
 *
 * Arquitectura Cliente:
 *  Todos los listados y entidades operativas se consultan y persisten
 *  exclusivamente contra la API REST conectada a Supabase PostgreSQL:
 *   - Microservicio 1: Gestión Académica (`/api/academica/*`, `/api/solicitudes`)
 *   - Microservicio 2: Seguimiento de Prácticas (`/api/seguimiento/*`)
 *   - Orquestación y Reportes (`/api/reportes/consolidado`)
 *
 * Nota: `localStorage` se utiliza únicamente para mantener la sesión activa
 * del usuario autenticado (`SIGP_SESION_ACTIVA`).
 */

/**
 * Normaliza el campo `semestre` permitiendo nulos o ausencia en Estudiante.
 * @param {*} valor - Valor recibido del formulario o backend.
 * @returns {number|null} Entero válido o null.
 */
function normalizarSemestreCliente(valor) {
    if (valor === undefined || valor === null || valor === '' || String(valor).toLowerCase() === 'undefined') return null;
    const parsed = parseInt(valor, 10);
    return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Sanea cadenas de texto evitando literales "undefined" o "null".
 * @param {*} valor - Valor a limpiar.
 * @param {string} [porDefecto=''] - Valor por defecto.
 * @returns {string} Texto saneado.
 */
function limpiarTextoCliente(valor, porDefecto = '') {
    if (valor === undefined || valor === null) return porDefecto;
    const s = String(valor).trim();
    if (!s || s.toLowerCase() === 'undefined' || s.toLowerCase() === 'null') return porDefecto;
    return s;
}

/**
 * Almacén reactivo en memoria (RAM), poblado exclusivamente desde la API del servidor.
 */
const almacenMemoria = {
    Estudiante: [],
    Tutor_Academico: [],
    Coordinador: [],
    Institucion: [],
    Tipo_Practica: [
        { id_tipo: 'TP-01', nombre: 'Práctica de Observación Pedagógica I', descripcion: 'Práctica de Observación Pedagógica I' },
        { id_tipo: 'TP-02', nombre: 'Práctica de Inmersión y Diagnóstico II', descripcion: 'Práctica de Inmersión y Diagnóstico II' },
        { id_tipo: 'TP-03', nombre: 'Práctica Pedagógica Integral e Intervención III', descripcion: 'Práctica Pedagógica Integral e Intervención III' }
    ],
    Practica: [],
    Actividad: [],
    Evidencia: [],
    Evaluacion: [],
    Convenio: [],
    Solicitudes: []
};

let sincronizacionEnCurso = null;

/**
 * Objeto singleton que encapsula las operaciones CRUD contra la API REST,
 * control de sesión y generación de informes consolidados.
 */
const DB = {
    /**
     * Inicializa el cliente eliminando cualquier caché obsoleta de tablas en `localStorage`
     * para garantizar sincronización real multi-computador desde Supabase.
     * @returns {void}
     */
    init() {
        try {
            localStorage.removeItem('SIGP_DATABASE_UDI_V5');
            localStorage.removeItem('solicitudes_aspirantes');
        } catch (_) {}
    },

    /**
     * Retorna el almacén en memoria actual con todas las colecciones cargadas desde el servidor.
     * @returns {Object} Diccionario completo de entidades.
     */
    getAll() {
        return almacenMemoria;
    },

    /**
     * Sincroniza todas las entidades en tiempo real directamente desde la API REST conectada a Supabase.
     * Reemplaza los listados en memoria con el estado exacto del servidor.
     *
     * @async
     * @returns {Promise<boolean>} Verdadero si la sincronización finalizó correctamente.
     */
    async syncWithBackend() {
        if (sincronizacionEnCurso) return sincronizacionEnCurso;

        sincronizacionEnCurso = (async () => {
            try {
                const [
                    resEst,
                    resSol,
                    resTut,
                    resInst,
                    resTipos,
                    resPrac,
                    resConv,
                    resCoord,
                    resBit,
                    resEvi,
                    resEval
                ] = await Promise.allSettled([
                    fetch('/api/academica/estudiantes', { cache: 'no-store' }),
                    fetch('/api/solicitudes', { cache: 'no-store' }),
                    fetch('/api/academica/tutores', { cache: 'no-store' }),
                    fetch('/api/academica/instituciones', { cache: 'no-store' }),
                    fetch('/api/academica/tipos-practica', { cache: 'no-store' }),
                    fetch('/api/academica/practicas', { cache: 'no-store' }),
                    fetch('/api/academica/convenios', { cache: 'no-store' }),
                    fetch('/api/academica/coordinadores', { cache: 'no-store' }),
                    fetch('/api/seguimiento/bitacoras', { cache: 'no-store' }),
                    fetch('/api/seguimiento/evidencias', { cache: 'no-store' }),
                    fetch('/api/seguimiento/evaluaciones', { cache: 'no-store' })
                ]);

                // 1. Estudiantes
                if (resEst.status === 'fulfilled' && resEst.value.ok) {
                    const lista = await resEst.value.json();
                    if (Array.isArray(lista)) {
                        almacenMemoria.Estudiante = lista.map(est => {
                            const doc = limpiarTextoCliente(est.documento || est.id_estudiante);
                            const idEst = limpiarTextoCliente(est.id_estudiante) || (doc.startsWith('EST') ? doc : `EST-2024-${doc.slice(-2)}`);
                            return {
                                id_estudiante: idEst,
                                documento: doc,
                                nombre: limpiarTextoCliente(est.nombre),
                                correo: limpiarTextoCliente(est.correo).toLowerCase(),
                                semestre: normalizarSemestreCliente(est.semestre),
                                telefono: limpiarTextoCliente(est.telefono),
                                clave: limpiarTextoCliente(est.clave || est.password, 'estudiante123')
                            };
                        });
                    }
                }

                // 2. Instituciones (unificando nombre y nombre_colegio)
                if (resInst.status === 'fulfilled' && resInst.value.ok) {
                    const lista = await resInst.value.json();
                    if (Array.isArray(lista)) {
                        almacenMemoria.Institucion = lista.map(i => {
                            const nombreUnificado = limpiarTextoCliente(i.nombre_colegio || i.nombre, i.id_institucion);
                            return {
                                id_institucion: limpiarTextoCliente(i.id_institucion),
                                nombre: nombreUnificado,
                                nombre_colegio: nombreUnificado,
                                direccion: limpiarTextoCliente(i.direccion, 'Por definir'),
                                ciudad: limpiarTextoCliente(i.ciudad, 'Bucaramanga'),
                                correo: limpiarTextoCliente(i.correo, `${String(i.id_institucion || '').toLowerCase()}@udi.edu.co`).toLowerCase(),
                                clave: limpiarTextoCliente(i.clave || i.password, 'colegio123'),
                                telefono: limpiarTextoCliente(i.telefono || i.contacto),
                                contacto: limpiarTextoCliente(i.contacto || i.telefono)
                            };
                        });
                    }
                }

                // 3. Solicitudes de aspirantes
                if (resSol.status === 'fulfilled' && resSol.value.ok) {
                    const lista = await resSol.value.json();
                    if (Array.isArray(lista)) {
                        almacenMemoria.Solicitudes = lista.map(s => {
                            const idPref = limpiarTextoCliente(s.id_institucion_preferencia, 'POR_ASIGNAR');
                            const instMatch = almacenMemoria.Institucion.find(i => i.id_institucion === idPref);
                            const nomPref = instMatch
                                ? instMatch.nombre_colegio
                                : (limpiarTextoCliente(s.institucion_preferencia) || (idPref === 'POR_ASIGNAR' ? 'A criterio del Coordinador' : idPref));
                            return {
                                id_solicitud: limpiarTextoCliente(s.id_solicitud || s.id),
                                id: limpiarTextoCliente(s.id_solicitud || s.id),
                                nombre: limpiarTextoCliente(s.nombre),
                                correo: limpiarTextoCliente(s.correo).toLowerCase(),
                                semestre: normalizarSemestreCliente(s.semestre),
                                id_institucion_preferencia: idPref,
                                institucion_preferencia: nomPref,
                                estado: limpiarTextoCliente(s.estado, 'Pendiente'),
                                fecha: limpiarTextoCliente(s.fecha, 'Reciente'),
                                clave: limpiarTextoCliente(s.clave || s.password, 'estudiante123')
                            };
                        });
                    }
                }

                // 4. Tutores académicos (unificando documento_tu y documento)
                if (resTut.status === 'fulfilled' && resTut.value.ok) {
                    const lista = await resTut.value.json();
                    if (Array.isArray(lista)) {
                        almacenMemoria.Tutor_Academico = lista.map(t => {
                            const docTu = limpiarTextoCliente(t.documento_tu || t.documento);
                            return {
                                documento_tu: docTu,
                                documento: docTu,
                                nombre: limpiarTextoCliente(t.nombre),
                                correo: limpiarTextoCliente(t.correo).toLowerCase(),
                                especialidad: limpiarTextoCliente(t.especialidad, 'Pedagogía y Didáctica'),
                                telefono: limpiarTextoCliente(t.telefono),
                                clave: limpiarTextoCliente(t.clave || t.password, 'docente123')
                            };
                        }).filter(t => t.documento_tu !== '');
                    }
                }

                // 5. Tipos de Práctica
                if (resTipos.status === 'fulfilled' && resTipos.value.ok) {
                    const lista = await resTipos.value.json();
                    if (Array.isArray(lista) && lista.length > 0) {
                        almacenMemoria.Tipo_Practica = lista.map(tp => ({
                            id_tipo: tp.id_tipo,
                            nombre: tp.nombre || tp.descripcion,
                            descripcion: tp.nombre || tp.descripcion
                        }));
                    }
                }

                // 6. Prácticas
                if (resPrac.status === 'fulfilled' && resPrac.value.ok) {
                    const lista = await resPrac.value.json();
                    if (Array.isArray(lista)) {
                        almacenMemoria.Practica = lista.map(p => {
                            const estMatch = almacenMemoria.Estudiante.find(e =>
                                e.documento === p.documento || e.id_estudiante === p.id_estudiante || e.id_estudiante === p.documento
                            );
                            const idEst = estMatch
                                ? estMatch.id_estudiante
                                : (limpiarTextoCliente(p.id_estudiante) || limpiarTextoCliente(p.documento));
                            const docTu = limpiarTextoCliente(p.documento_tu, 'DOC-1098234');
                            return {
                                id_practica: limpiarTextoCliente(p.id_practica),
                                id_estudiante: idEst,
                                documento_estudiante: limpiarTextoCliente(p.documento_estudiante || p.documento),
                                documento: docTu,
                                documento_tu: docTu,
                                id_institucion: limpiarTextoCliente(p.id_institucion, 'INST-01'),
                                id_tipo: limpiarTextoCliente(p.id_tipo, 'TP-01'),
                                estado: limpiarTextoCliente(p.estado, 'En Curso'),
                                fecha_inicio: limpiarTextoCliente(p.fecha_ini || p.fecha_inicio, '2026-02-01'),
                                horas_cumplidas: parseInt(p.horas_cumplidas, 10) || 0,
                                horas_objetivo: parseInt(p.horas_objetivo, 10) || 80,
                                validado_institucion: Boolean(p.validado_institucion),
                                autorizado_director: Boolean(p.autorizado_director)
                            };
                        });
                    }
                }

                // 7. Convenios
                if (resConv.status === 'fulfilled' && resConv.value.ok) {
                    const lista = await resConv.value.json();
                    if (Array.isArray(lista)) {
                        almacenMemoria.Convenio = lista;
                    }
                }

                // 8. Coordinadores
                if (resCoord.status === 'fulfilled' && resCoord.value.ok) {
                    const lista = await resCoord.value.json();
                    if (Array.isArray(lista)) {
                        almacenMemoria.Coordinador = lista;
                    }
                }

                // 9. Bitácoras -> Actividades
                if (resBit.status === 'fulfilled' && resBit.value.ok) {
                    const lista = await resBit.value.json();
                    if (Array.isArray(lista)) {
                        almacenMemoria.Actividad = lista.map(b => ({
                            id_actividad: b.id_bitacora,
                            id_practica: b.id_practica,
                            fecha: b.fecha,
                            descripcion: b.descripcion,
                            observaciones: b.observaciones || null,
                            horas_realizadas: parseInt(b.horas, 10) || 4,
                            estado_aprovacion: b.estado || 'Pendiente'
                        }));
                    }
                }

                // 10. Evidencias
                if (resEvi.status === 'fulfilled' && resEvi.value.ok) {
                    const lista = await resEvi.value.json();
                    if (Array.isArray(lista)) {
                        almacenMemoria.Evidencia = lista.map(ev => ({
                            id_evidencia: ev.id_evidencia,
                            id_actividad: ev.id_bitacora || ev.id_actividad,
                            id_practica: ev.id_practica,
                            ruta_archivo: ev.archivo || ev.ruta_archivo
                        }));
                    }
                }

                // 11. Evaluaciones
                if (resEval.status === 'fulfilled' && resEval.value.ok) {
                    const lista = await resEval.value.json();
                    if (Array.isArray(lista)) {
                        almacenMemoria.Evaluacion = lista.map(ev => {
                            const docTu = limpiarTextoCliente(ev.documento_tu || ev.documento);
                            return {
                                id_evaluacion: ev.id_evaluacion,
                                id_practica: ev.id_practica,
                                documento: docTu,
                                documento_tu: docTu,
                                calificacion: parseFloat(ev.calificacion),
                                observaciones: ev.observaciones,
                                fecha_evaluacion: ev.fecha || ev.fecha_evaluacion
                            };
                        });
                    }
                }

                window.dispatchEvent(new CustomEvent('db:sincronizado'));
                return true;
            } catch (_) {
                return false;
            } finally {
                sincronizacionEnCurso = null;
            }
        })();

        return sincronizacionEnCurso;
    },

    /**
     * Consulta el informe consolidado en tiempo real orquestado por el servidor
     * directamente desde Supabase PostgreSQL.
     *
     * @async
     * @param {Object} [filtros={}] - Filtros opcionales `{ estado, q }`.
     * @returns {Promise<Object>} Objeto con `resumen_auditoria` y `registros`.
     */
    async getConsolidatedReport(filtros = {}) {
        const params = new URLSearchParams();
        if (filtros.estado && filtros.estado !== 'todos') params.set('estado', filtros.estado);
        if (filtros.q) params.set('q', filtros.q);

        const url = `/api/reportes/consolidado${params.toString() ? `?${params.toString()}` : ''}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) {
            throw new Error('No fue posible consultar el reporte consolidado desde el servidor.');
        }
        return await res.json();
    },

    /**
     * Retorna todos los registros pertenecientes a una entidad cargada en memoria.
     * @param {string} nombreTabla - Nombre de la entidad.
     * @returns {Array<Object>} Arreglo de registros.
     */
    getTable(nombreTabla) {
        return almacenMemoria[nombreTabla] || [];
    },

    /**
     * Retorna las solicitudes de aspirantes en espera obtenidas del servidor.
     * @returns {Array<Object>} Listado de solicitudes.
     */
    getSolicitudes() {
        return almacenMemoria.Solicitudes || [];
    },

    /**
     * Radica una nueva solicitud directamente en Supabase vía `POST /api/solicitudes`.
     * @async
     * @param {Object} solicitud - Datos de la postulación.
     * @returns {Promise<Object>} Solicitud persistida.
     */
    async createSolicitud(solicitud) {
        const res = await fetch('/api/solicitudes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(solicitud)
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Error al radicar la solicitud en el servidor.');
        }
        await this.syncWithBackend();
        return data;
    },

    /**
     * Elimina una solicitud procesada directamente en Supabase vía `DELETE /api/solicitudes/:id`.
     * @async
     * @param {string} idSolicitud - ID o correo de la solicitud.
     * @returns {Promise<boolean>} Verdadero si se eliminó correctamente.
     */
    async deleteSolicitud(idSolicitud) {
        const res = await fetch(`/api/solicitudes/${encodeURIComponent(idSolicitud)}`, {
            method: 'DELETE'
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Error al eliminar la solicitud.');
        }
        await this.syncWithBackend();
        return true;
    },

    /**
     * Inserta un registro enviándolo directamente a la API REST conectada a Supabase
     * y recarga las colecciones en memoria tras confirmación del servidor.
     *
     * @async
     * @param {string} nombreTabla - Entidad destino.
     * @param {Object} nuevoRegistro - Objeto de datos a persistir.
     * @returns {Promise<Object>} Registro confirmado por PostgreSQL.
     */
    async insert(nombreTabla, nuevoRegistro) {
        if (!almacenMemoria[nombreTabla]) almacenMemoria[nombreTabla] = [];

        let url = '';
        let payload = nuevoRegistro;

        if (nombreTabla === 'Estudiante') {
            url = '/api/academica/estudiantes';
            payload = {
                documento: nuevoRegistro.documento || nuevoRegistro.id_estudiante,
                id_estudiante: nuevoRegistro.id_estudiante || nuevoRegistro.documento,
                nombre: nuevoRegistro.nombre,
                apellido: nuevoRegistro.apellido || '',
                correo: nuevoRegistro.correo,
                semestre: normalizarSemestreCliente(nuevoRegistro.semestre),
                telefono: nuevoRegistro.telefono || '',
                clave: nuevoRegistro.clave || nuevoRegistro.password || 'estudiante123'
            };
        } else if (nombreTabla === 'Actividad' || nombreTabla === 'Bitacora') {
            url = '/api/bitacoras';
            let idPracticaReal = nuevoRegistro.id_practica;
            if (!idPracticaReal) {
                const sesionActiva = this.getSession() || {};
                const estudianteActual = sesionActiva.id_estudiante || sesionActiva.documento;
                const prac = (almacenMemoria.Practica || []).find(p =>
                    p.id_estudiante === estudianteActual || p.documento_estudiante === estudianteActual
                );
                idPracticaReal = prac ? prac.id_practica : 'PRAC-001';
            }
            payload = {
                id_bitacora: nuevoRegistro.id_actividad || nuevoRegistro.id_bitacora,
                id_practica: idPracticaReal,
                fecha: nuevoRegistro.fecha,
                descripcion: nuevoRegistro.descripcion,
                horas: nuevoRegistro.horas_realizadas || nuevoRegistro.horas || 4,
                archivo: nuevoRegistro.evidencia || nuevoRegistro.archivo || ''
            };
        } else if (nombreTabla === 'Evidencia') {
            // La evidencia se registra conjuntamente en POST /api/bitacoras; evitar duplicados
            almacenMemoria.Evidencia.push(nuevoRegistro);
            return nuevoRegistro;
        } else if (nombreTabla === 'Tutor_Academico') {
            url = '/api/academica/tutores';
            const docTu = limpiarTextoCliente(nuevoRegistro.documento_tu || nuevoRegistro.documento);
            payload = {
                documento_tu: docTu,
                documento: docTu,
                nombre: nuevoRegistro.nombre,
                correo: nuevoRegistro.correo,
                especialidad: nuevoRegistro.especialidad || 'Pedagogía y Didáctica',
                telefono: nuevoRegistro.telefono || '',
                clave: nuevoRegistro.clave || nuevoRegistro.password || 'docente123'
            };
        } else if (nombreTabla === 'Institucion') {
            url = '/api/academica/instituciones';
            const nomInst = limpiarTextoCliente(nuevoRegistro.nombre_colegio || nuevoRegistro.nombre);
            payload = {
                id_institucion: nuevoRegistro.id_institucion,
                nombre: nomInst,
                nombre_colegio: nomInst,
                direccion: nuevoRegistro.direccion,
                correo: nuevoRegistro.correo,
                contacto: nuevoRegistro.contacto || nuevoRegistro.telefono || '',
                telefono: nuevoRegistro.telefono || nuevoRegistro.contacto || '',
                clave: nuevoRegistro.clave || nuevoRegistro.password || 'colegio123'
            };
        } else if (nombreTabla === 'Convenio') {
            url = '/api/academica/convenios';
        } else if (nombreTabla === 'Coordinador') {
            url = '/api/academica/coordinadores';
        } else if (nombreTabla === 'Practica') {
            url = '/api/academica/practicas';
            const estRelacionado = (almacenMemoria.Estudiante || []).find(e =>
                e.id_estudiante === nuevoRegistro.id_estudiante || e.documento === nuevoRegistro.documento_estudiante || e.documento === nuevoRegistro.id_estudiante
            );
            payload = {
                id_practica: nuevoRegistro.id_practica,
                fecha_ini: nuevoRegistro.fecha_inicio || nuevoRegistro.fecha_ini || '2026-02-01',
                fecha_fin: nuevoRegistro.fecha_fin || '2026-06-15',
                horas_cumplidas: nuevoRegistro.horas_cumplidas || 0,
                horas_objetivo: nuevoRegistro.horas_objetivo || 80,
                estado: nuevoRegistro.estado || 'En Curso',
                nombre_prac: nuevoRegistro.nombre_prac || 'Práctica Pedagógica Integral',
                documento: estRelacionado ? estRelacionado.documento : (nuevoRegistro.documento_estudiante || nuevoRegistro.id_estudiante),
                id_estudiante: nuevoRegistro.id_estudiante,
                documento_tu: nuevoRegistro.documento_tu || nuevoRegistro.documento || 'DOC-1098234',
                id_institucion: nuevoRegistro.id_institucion || 'INST-01',
                id_tipo: nuevoRegistro.id_tipo || 'TP-01',
                validado_institucion: Boolean(nuevoRegistro.validado_institucion)
            };
        } else if (nombreTabla === 'Evaluacion') {
            url = '/api/seguimiento/evaluaciones';
            payload = {
                ...nuevoRegistro,
                documento_tu: nuevoRegistro.documento_tu || nuevoRegistro.documento
            };
        }

        if (!url) return nuevoRegistro;

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || `Error al guardar en ${nombreTabla}`);
        }
        await this.syncWithBackend();
        return data;
    },

    /**
     * Actualiza un registro directamente en Supabase vía API REST y refresca la vista.
     *
     * @async
     * @param {string} nombreTabla - Entidad objetivo.
     * @param {string} campoClave - Campo identificador.
     * @param {*} valorClave - Valor clave primaria.
     * @param {Object} camposActualizados - Campos a actualizar.
     * @returns {Promise<Object|boolean>} Registro actualizado.
     */
    async update(nombreTabla, campoClave, valorClave, camposActualizados) {
        let url = '';
        let payload = { ...camposActualizados };

        if (nombreTabla === 'Actividad' || nombreTabla === 'Bitacora') {
            url = `/api/seguimiento/bitacoras/${encodeURIComponent(valorClave)}`;
        } else if (nombreTabla === 'Estudiante') {
            const est = this.findBy('Estudiante', campoClave, valorClave);
            const docReal = (est && est.documento) || valorClave;
            url = `/api/academica/estudiantes/${encodeURIComponent(docReal)}`;
        } else if (nombreTabla === 'Tutor_Academico') {
            const tut = this.findBy('Tutor_Academico', 'documento_tu', valorClave) || this.findBy('Tutor_Academico', 'documento', valorClave);
            const docTu = (tut && (tut.documento_tu || tut.documento)) || valorClave;
            url = `/api/academica/tutores/${encodeURIComponent(docTu)}`;
        } else if (nombreTabla === 'Institucion') {
            url = `/api/academica/instituciones/${encodeURIComponent(valorClave)}`;
            if (payload.nombre_colegio && !payload.nombre) payload.nombre = payload.nombre_colegio;
        } else if (nombreTabla === 'Convenio') {
            url = `/api/academica/convenios/${encodeURIComponent(valorClave)}`;
        } else if (nombreTabla === 'Practica') {
            url = `/api/academica/practicas/${encodeURIComponent(valorClave)}`;
            if (payload.documento && !payload.documento_tu) {
                payload.documento_tu = payload.documento;
            }
            if (payload.id_estudiante) {
                const est = this.findBy('Estudiante', 'id_estudiante', payload.id_estudiante) || this.findBy('Estudiante', 'documento', payload.id_estudiante);
                if (est) payload.documento_estudiante = est.documento;
            }
        }

        if (!url) return false;

        const res = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || `Error al actualizar en ${nombreTabla}`);
        }
        await this.syncWithBackend();
        return data;
    },

    /**
     * Elimina un registro directamente en Supabase vía API REST y refresca la vista.
     *
     * @async
     * @param {string} nombreTabla - Entidad objetivo.
     * @param {string} campoClave - Nombre del campo clave primaria.
     * @param {*} valorClave - Valor identificador a eliminar.
     * @returns {Promise<boolean>} Verdadero si se eliminó.
     */
    async delete(nombreTabla, campoClave, valorClave) {
        let url = '';
        if (nombreTabla === 'Estudiante') {
            const est = this.findBy('Estudiante', campoClave, valorClave)
                || this.findBy('Estudiante', 'documento', valorClave)
                || this.findBy('Estudiante', 'id_estudiante', valorClave);
            const docReal = (est && (est.documento || est.id_estudiante)) || valorClave;
            url = `/api/academica/estudiantes/${encodeURIComponent(docReal)}`;
        } else if (nombreTabla === 'Tutor_Academico') {
            const tut = this.findBy('Tutor_Academico', 'documento_tu', valorClave)
                || this.findBy('Tutor_Academico', 'documento', valorClave);
            const docTu = (tut && (tut.documento_tu || tut.documento)) || valorClave;
            url = `/api/academica/tutores/${encodeURIComponent(docTu)}`;
        } else if (nombreTabla === 'Institucion') {
            url = `/api/academica/instituciones/${encodeURIComponent(valorClave)}`;
        } else if (nombreTabla === 'Convenio') {
            url = `/api/academica/convenios/${encodeURIComponent(valorClave)}`;
        } else if (nombreTabla === 'Practica') {
            url = `/api/academica/practicas/${encodeURIComponent(valorClave)}`;
        } else if (nombreTabla === 'Solicitudes') {
            return await this.deleteSolicitud(valorClave);
        }

        if (!url) return false;

        const res = await fetch(url, { method: 'DELETE' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(data.error || `Error al eliminar en ${nombreTabla}`);
        }
        await this.syncWithBackend();
        return data;
    },

    /**
     * Busca el primer registro que coincida con un campo y valor.
     * Soporta coincidencia unificada para `documento`/`documento_tu` y `nombre`/`nombre_colegio`.
     * @param {string} nombreTabla - Entidad donde buscar.
     * @param {string} campo - Nombre del atributo.
     * @param {*} valor - Valor buscado.
     * @returns {Object|null} Registro encontrado o null.
     */
    findBy(nombreTabla, campo, valor) {
        const lista = this.getTable(nombreTabla);
        return lista.find(item => {
            if (item[campo] === valor) return true;
            if (nombreTabla === 'Tutor_Academico' && (campo === 'documento' || campo === 'documento_tu')) {
                return item.documento_tu === valor || item.documento === valor;
            }
            if (nombreTabla === 'Institucion' && (campo === 'nombre' || campo === 'nombre_colegio')) {
                return item.nombre_colegio === valor || item.nombre === valor;
            }
            return false;
        }) || null;
    },

    /**
     * Filtra y retorna los registros que coincidan con un campo y valor.
     * @param {string} nombreTabla - Entidad a filtrar.
     * @param {string} campo - Nombre del atributo.
     * @param {*} valor - Valor a comparar.
     * @returns {Array<Object>} Arreglo filtrado.
     */
    filterBy(nombreTabla, campo, valor) {
        return this.getTable(nombreTabla).filter(item => {
            if (item[campo] === valor) return true;
            if (nombreTabla === 'Practica' && (campo === 'documento' || campo === 'documento_tu')) {
                return item.documento_tu === valor || item.documento === valor;
            }
            return false;
        });
    },

    // ========================================================================
    // AUTENTICACIÓN Y CONTROL DE SESIONES POR ROL ACADÉMICO
    // ========================================================================

    /**
     * Autentica las credenciales ingresadas contra el backend conectado a Supabase
     * y almacena la sesión activa del usuario.
     *
     * @async
     * @param {string} correo - Correo electrónico institucional.
     * @param {string} password - Contraseña del usuario.
     * @param {string} rol - Rol ('estudiante', 'docente', 'coordinador', 'director', 'institucion').
     * @returns {Promise<{success: boolean, user?: Object, redirectUrl?: string, message?: string}>}
     */
    async login(correo, password, rol) {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo, password, rol })
        });
        const resultado = await res.json();

        if (resultado.success && resultado.user) {
            localStorage.setItem('SIGP_SESION_ACTIVA', JSON.stringify(resultado.user));
            localStorage.setItem('sesion_usuario', resultado.user.correo);
            localStorage.setItem('sesion_rol', resultado.user.rol);
            localStorage.setItem('sesion_nombre', resultado.user.nombre);
        }

        return resultado;
    },

    /**
     * Obtiene el objeto de sesión del usuario autenticado actualmente.
     * @returns {Object|null} Datos de sesión o null si no hay sesión.
     */
    getSession() {
        try {
            const sesionSerializada = localStorage.getItem('SIGP_SESION_ACTIVA');
            return sesionSerializada ? JSON.parse(sesionSerializada) : null;
        } catch (_) {
            return null;
        }
    },

    /**
     * Cierra la sesión actual del navegador y redirige al login.
     * @param {string} [rutaRedireccion='../index.html'] - Ruta de retorno.
     * @returns {void}
     */
    logout(rutaRedireccion = '../index.html') {
        localStorage.removeItem('SIGP_SESION_ACTIVA');
        localStorage.removeItem('sesion_usuario');
        localStorage.removeItem('sesion_rol');
        localStorage.removeItem('sesion_nombre');
        window.location.href = rutaRedireccion;
    },

    /**
     * Guardia de control de acceso por rol para las vistas protegidas.
     * @param {string|Array<string>} rolesEsperados - Roles autorizados.
     * @param {string} [rutaRetorno='../index.html'] - Ruta de redirección si falla.
     * @returns {Object|null} Sesión autorizada o null.
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

/**
 * Ciclo de vida automático del cliente REST:
 *  - Limpia cachés locales obsoletas al cargar el script (`DB.init()`).
 *  - Sincroniza todas las colecciones contra Supabase en carga inicial, `DOMContentLoaded` y `focus`.
 */
DB.init();
if (typeof window !== 'undefined') {
    DB.syncWithBackend();
    window.addEventListener('DOMContentLoaded', () => {
        DB.syncWithBackend();
    });
    window.addEventListener('focus', () => {
        DB.syncWithBackend();
    });
}
