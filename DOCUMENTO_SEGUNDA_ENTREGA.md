# SISTEMA INTEGRAL DE GESTIÓN DE PRÁCTICAS ACADÉMICAS (SIGPA - UDI)
## DOCUMENTO DE SEGUNDA ENTREGA - PROYECTO INTEGRADOR

**Institución:** Universidad de Investigación y Desarrollo (UDI)  
**Programa:** Licenciatura  
**Autor:** Camilo Andrés Rangel Moreno  
**Docente Asesor / Tutor:** Evaluación Proyecto Integrador  
**Fecha:** Octubre de 2026  

---

## 1. INTRODUCCIÓN
En los programas de licenciatura en Colombia, las prácticas pedagógicas constituyen el núcleo estructurante del proceso de formación de los futuros educadores. A través de ellas, los licenciados articulan los saberes teóricos, disciplinares y didácticos con los escenarios reales de enseñanza y aprendizaje en las instituciones educativas del país. Este proceso académico y formativo no es únicamente un requerimiento curricular interno, sino un mandato legal regido por las directrices del Ministerio de Educación Nacional (MEN), el Decreto 1075 de 2015 (Decreto Único Reglamentario del Sector Educación) y los factores de calidad exigidos por el Consejo Nacional de Acreditación (CNA).

El presente documento consolida la segunda entrega del **Sistema Integral de Gestión de Prácticas Académicas**, una solución de software integral, centralizada y basada en la nube, diseñada para optimizar, transparentar y automatizar el ciclo de vida de las prácticas pedagógicas en la UDI.

---

## 2. DESCRIPCIÓN DEL PROBLEMA
Tradicionalmente, la administración de las prácticas pedagógicas en las facultades de educación se realiza mediante mecanismos fragmentados y manuales: hojas de cálculo independientes, cadenas de correos electrónicos, planillas físicas de asistencia y carpetas locales no sincronizadas. Esta desconexión operacional genera problemáticas críticas:
* **Falta de consolidación y trazabilidad:** Imposibilidad de conocer en tiempo real el progreso de horas y el estado académico de los practicantes.
* **Riesgo en la custodia documental:** Pérdida recurrente de evidencias de aprendizaje, planes de aula y registros fotográficos exigidos por los comités de acreditación.
* **Sobrecarga administrativa:** El Director del Programa y el Coordinador de Prácticas dedican más del 40% de su tiempo a tareas rutinarias de verificación manual en lugar de concentrarse en el liderazgo curricular y la investigación pedagógica.
* **Vulnerabilidad ante auditorías externas:** Complejidad y demoras al compilar informes consolidados de horas y convenios durante las visitas de pares evaluadores del MEN y del CNA.

---

## 3. OBJETIVOS

### a. Objetivo General
Desarrollar un Sistema Integral de Gestión de Prácticas Académicas basado en arquitectura web y servicios en la nube para automatizar el seguimiento, evaluación, gestión documental y cumplimiento normativo de las prácticas pedagógicas en los programas de licenciatura de la UDI.

### b. Objetivos Específicos
1. Diseñar el modelado conceptual, lógico y físico de datos distribuido en dos bases de datos relacionales en la nube: una orientada a la **Gestión Académica** y otra especializada en el **Seguimiento de Prácticas**, garantizando integridad referencial.
2. Modelar la ingeniería del sistema mediante notación estándar UML, incluyendo Diagramas de Casos de Uso, Secuencia y Clases alineados con los roles de Director, Coordinador, Tutor Académico, Estudiante e Institución Receptora.
3. Implementar un backend robusto en Node.js y Express con operaciones CRUD completas y un frontend intuitivo en HTML5, CSS3 y JavaScript Vanilla.
4. Desarrollar un prototipo funcional que cubra más del 50% de los casos de uso definidos, integrando control de sesiones por rol, registro de bitácoras con evidencias, aprobación de horas y reportes de acreditación.

---

## 4. JUSTIFICACIÓN
La implementación de este sistema reduce drásticamente los tiempos operativos y mitiga el riesgo de pérdida de información histórica. Permite al Director de Programa contar con un panel estratégico de indicadores y cumplimiento de convenios escolares, al Coordinador gestionar las asignaciones territoriales y la matrícula de usuarios, al Tutor Académico calificar de forma estructurada con retroalimentación formativa, al Estudiante registrar oportunamente sus bitácoras con evidencias digitales, y a la Institución Receptora validar la presencialidad. La plataforma democratiza el acceso a la información y asegura los estándares de alta calidad exigidos en la educación superior en Colombia.

---

## 5. PROPUESTA DEL PLAN DEL PROYECTO Y ARQUITECTURA

### a. Metodología de Desarrollo
Se adopta un enfoque incremental iterativo con base en la metodología ágil Scrum, organizado en sprints que cubren análisis, diseño UML, modelado de bases de datos, construcción de APIs, desarrollo de interfaces y pruebas integrales.

### b. Arquitectura de Software
Arquitectura desacoplada en capas (Cliente - Servidor - Nube):
* **Capa Cliente (Frontend):** Interfaces semánticas construidas estrictamente en HTML5, CSS3 puro y JavaScript Vanilla, sin dependencias de frameworks pesados, garantizando velocidad de renderizado y total compatibilidad.
* **Capa de Negocio (Backend API):** Servidor HTTP RESTful implementado en **Node.js**, **Express** y **Nodemon** para recarga en caliente durante el desarrollo.
* **Capa de Persistencia (Cloud Database):** Motor relacional **PostgreSQL** alojado en la nube gratuita de **Supabase**, dividido en dos esquemas de datos independientes pero interconectados:
  * `gestion_academica`
  * `seguimiento_practicas`

---

## 6. ANÁLISIS DE REQUERIMIENTOS DEL SOFTWARE

### Requerimientos Funcionales (RF)
* **RF01 - Autenticación Segura y Control de Roles:** El sistema autentica usuarios diferenciando cinco perfiles (Director, Coordinador, Tutor Académico, Estudiante e Institución Receptora) con redirección automática.
* **RF02 - Radicación de Nuevos Aspirantes:** Permite a los estudiantes auto-postularse al proceso de práctica desde el portal público de acceso.
* **RF03 - CRUD de Estudiantes y Matrícula:** El Coordinador puede crear, consultar, actualizar y eliminar registros de alumnos licenciados.
* **RF04 - CRUD de Docentes Asesores:** Registro y mantenimiento de datos del Tutor Académico (cédula, especialidad, correo y asignaciones).
* **RF05 - CRUD de Instituciones y Convenios:** Registro de colegios receptores, direcciones de sedes y formalización de cupos.
* **RF06 - Asignación de Práctica:** Vinculación matricial entre Estudiante, Tutor Académico, Institución Educativa y Tipo de Práctica.
* **RF07 - Registro de Bitácora Diaria (UML Include Evidencia):** El estudiante reporta fecha, horas desarrolladas y descripción didáctica, asociando obligatoriamente el enlace/archivo de la evidencia.
* **RF08 - Supervisión y Aprobación de Horas:** El Tutor Académico revisa bitácoras y actualiza su estado a 'Aprobado' o 'Rechazado'.
* **RF09 - Evaluación Oficial del Proceso:** El Tutor registra calificación numérica (0.0 a 5.0) y observaciones pedagógicas cualitativas.
* **RF10 - Validación de Presencialidad Escolar:** La institución receptora verifica la asistencia del practicante en sede.
* **RF11 - Firma de Convenios y Certificación Directiva:** El Director valida convenios institucionales y expide la autorización de culminación.
* **RF12 - Reportes Analíticos Consolidados:** Emisión e impresión de informes de cumplimiento de horas y notas para auditorías MEN/CNA.

### Requerimientos No Funcionales (RNF)
* **RNF01 - Rendimiento:** Tiempo de respuesta inferior a 800 ms para consultas operativas.
* **RNF02 - Integridad Referencial:** Control estricto de claves primarias y foráneas entre los esquemas de bases de datos.
* **RNF03 - Disponibilidad:** Arquitectura cloud 24/7 alojada en infraestructura escalable.
* **RNF04 - Usabilidad:** Interfaz adaptable (responsive), con accesibilidad por teclado (atajo de sustantación `Ctrl + Shift + D`).

---

## 7. DISEÑO UML

### a. Diagrama de Casos de Uso
* **Actores:** Estudiante, Tutor Académico, Coordinador, Institución Receptora.
* **Relaciones:** Relación `<<Include>>` entre *Registrar Bitácora de Actividades* y *Asociar Evidencias a Actividades*.
* Casos de uso de supervisión, evaluación, reportes, asignación y consulta de estado.

### b. Diagrama de Secuencia (Registro de Bitácora)
1. `Estudiante -> VistaBitacora`: `ingresarDatosBitacora(fecha, descripcion, horas)`
2. `Estudiante -> VistaBitacora`: `adjuntarArchivoEvidencia(archivo)`
3. `Estudiante -> VistaBitacora`: `presionarGuardar()`
4. `VistaBitacora -> SeguimientoControl`: `POST /api/bitacoras (id_practica, fecha, descripcion, horas, archivo)`
5. `SeguimientoControl -> BaseDatosSeguimiento`: `insertarRegistro(id_practica, datos_actividad, archivo_evidencia)`
6. `BaseDatosSeguimiento --> SeguimientoControl`: `confirmacionGuardado`
7. `SeguimientoControl --> VistaBitacora`: `HTTP 201 Created`
8. `VistaBitacora --> Estudiante`: `mostrarMensaje("Bitácora y evidencias registradas exitosamente")`

### c. Diagrama de Clases
* **Entidades Principales:** `Estudiante`, `Tutor_Academico`, `Coordinador`, `Institucion`, `Tipo_Practica`, `Practica`.
* **Entidades de Seguimiento:** `Bitacora` / `Actividad`, `Evidencia`, `Evaluacion`.

---

## 8. MODELADO DE LA BASE DE DATOS

### a. Modelo Entidad-Relación (E-R)
* Estudiante **realiza (1:1)** Práctica.
* Tutor Académico **supervisa (1:N)** Práctica.
* Institución **recibe (1:N)** Práctica.
* Tipo de Práctica **clasifica (1:N)** Práctica.
* Práctica **genera (1:N)** Bitácora.
* Bitácora **tiene (1:N)** Evidencia.
* Bitácora **recibe (1:1)** Evaluación por parte del Tutor Académico.

### b. Modelo Relacional Normalizado (3FN)

#### Esquema 1: `gestion_academica`
1. `Estudiante` (**documento** PK, nombre, apellido, correo UK, semestre, telefono)
2. `Tutor_Academico` (**documento_tu** PK, nombre, apellido, correo UK, especialidad, telefono)
3. `Institucion` (**id_institucion** PK, nombre, direccion, ciudad, telefono)
4. `Tipo_Practica` (**id_tipo** PK, nombre, descripcion)
5. `Practica` (**id_practica** PK, fecha_ini, fecha_fin, horas_cumplidas, estado, nombre_prac, documento FK, documento_tu FK, id_institucion FK, id_tipo FK)

#### Esquema 2: `seguimiento_practicas`
1. `Bitacora` (**id_bitacora** PK, fecha, descripcion, observaciones, estado, id_practica FK)
2. `Evidencia` (**id_evidencia** PK, fecha, nombre, tipo, archivo, descripcion, id_practica FK, id_bitacora FK)
3. `Evaluacion` (**id_evaluacion** PK, calificacion, observaciones, fecha, id_bitacora FK, documento_tu FK)

### c. Diccionario de Datos

| Tabla | Campo | Tipo de Dato | Nulo | Clave | Descripción |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Estudiante** | documento | VARCHAR(20) | NO | PK | Cédula o tarjeta de identidad del estudiante |
| Estudiante | nombre | VARCHAR(100) | NO | - | Nombres del estudiante |
| Estudiante | apellido | VARCHAR(100) | NO | - | Apellidos del estudiante |
| Estudiante | correo | VARCHAR(100) | NO | UK | Correo institucional UDI |
| Estudiante | semestre | INT | NO | - | Semestre académico en curso (1 al 10) |
| Estudiante | telefono | VARCHAR(20) | SI | - | Teléfono móvil de contacto |
| **Tutor_Academico** | documento_tu | VARCHAR(20) | NO | PK | Documento de identidad del docente asesor |
| Tutor_Academico | nombre | VARCHAR(100) | NO | - | Nombres del tutor |
| Tutor_Academico | apellido | VARCHAR(100) | NO | - | Apellidos del tutor |
| Tutor_Academico | correo | VARCHAR(100) | NO | UK | Correo institucional del tutor |
| Tutor_Academico | especialidad | VARCHAR(150) | SI | - | Línea pedagógica o didáctica |
| Tutor_Academico | telefono | VARCHAR(20) | SI | - | Contacto telefónico del docente |
| **Institucion** | id_institucion | VARCHAR(20) | NO | PK | Código único del colegio receptor |
| Institucion | nombre | VARCHAR(150) | NO | - | Razón social de la institución escolar |
| Institucion | direccion | VARCHAR(200) | NO | - | Dirección de la sede educativa |
| Institucion | ciudad | VARCHAR(100) | NO | - | Ciudad o municipio de ubicación |
| Institucion | telefono | VARCHAR(20) | SI | - | Teléfono de contacto institucional |
| **Tipo_Practica** | id_tipo | VARCHAR(20) | NO | PK | Identificador del nivel (TP-01, TP-02...) |
| Tipo_Practica | nombre | VARCHAR(100) | NO | - | Nombre reglamentario de la práctica |
| Tipo_Practica | descripcion | TEXT | SI | - | Alcance pedagógico según Decreto 1075 |
| **Practica** | id_practica | VARCHAR(20) | NO | PK | Código único del acta de práctica |
| Practica | fecha_ini | DATE | NO | - | Fecha formal de inicio |
| Practica | fecha_fin | DATE | NO | - | Fecha límite de culminación |
| Practica | horas_cumplidas | INT | NO | - | Horas acumuladas y validadas |
| Practica | estado | VARCHAR(50) | NO | - | 'En Curso', 'Culminada', 'Pendiente' |
| Practica | nombre_prac | VARCHAR(150) | NO | - | Nombre identificador de la práctica |
| Practica | documento | VARCHAR(20) | NO | FK | Cédula del estudiante vinculado |
| Practica | documento_tu | VARCHAR(20) | NO | FK | Documento del tutor académico asignado |
| Practica | id_institucion | VARCHAR(20) | NO | FK | Código del colegio receptor asignado |
| Practica | id_tipo | VARCHAR(20) | NO | FK | Modalidad de práctica asignada |
| **Bitacora** | id_bitacora | VARCHAR(20) | NO | PK | Consecutivo de informe semanal/diario |
| Bitacora | fecha | DATE | NO | - | Fecha de realización de la jornada |
| Bitacora | descripcion | TEXT | NO | - | Detalle metodológico y pedagógico |
| Bitacora | observaciones | TEXT | SI | - | Comentarios del tutor asesor |
| Bitacora | estado | VARCHAR(50) | NO | - | 'Aprobado', 'Pendiente', 'Rechazado' |
| Bitacora | id_practica | VARCHAR(20) | NO | FK | Práctica a la cual pertenece la jornada |
| **Evidencia** | id_evidencia | VARCHAR(20) | NO | PK | Identificador único del soporte digital |
| Evidencia | fecha | DATE | NO | - | Fecha de expedición del documento |
| Evidencia | nombre | VARCHAR(150) | NO | - | Título descriptivo del archivo |
| Evidencia | tipo | VARCHAR(50) | NO | - | Tipo de documento ('PDF', 'Plan de Clase'...) |
| Evidencia | archivo | VARCHAR(255) | NO | - | Enlace permanente o URL en almacenamiento |
| Evidencia | descripcion | TEXT | SI | - | Resumen del contenido del soporte |
| Evidencia | id_practica | VARCHAR(20) | NO | FK | Código de práctica referenciado |
| Evidencia | id_bitacora | VARCHAR(20) | SI | FK | Bitácora a la que se anexa el archivo |
| **Evaluacion** | id_evaluacion | VARCHAR(20) | NO | PK | Registro oficial de nota evaluativa |
| Evaluacion | calificacion | NUMERIC(3,1) | NO | - | Nota numérica oficial (escala 0.0 a 5.0) |
| Evaluacion | observaciones | TEXT | NO | - | Juicio pedagógico y retroalimentación |
| Evaluacion | fecha | DATE | NO | - | Fecha en que se registra la evaluación |
| Evaluacion | id_bitacora | VARCHAR(20) | NO | FK | Bitácora evaluada |
| Evaluacion | documento_tu | VARCHAR(20) | NO | FK | Tutor que suscribe la calificación |

---

## 9. PROTOTIPO DE ALTA FIDELIDAD
Construido con interfaz limpia, paleta institucional UDI y vistas especializadas:
* **Portal de Acceso (`index.html`):** Autenticación por roles con menú secreto para jurados (`Ctrl + Shift + D`) y radicación de solicitudes.
* **Panel de Estudiantes (`views/estudiante.html`):** Consulta de ficha de asignación, progreso de horas, barra porcentual, formulario de bitácoras y consulta de notas.
* **Panel de Tutores (`views/docente.html`):** Supervisión de practicantes, revisión de evidencias, aprobación/rechazo de horas y emisión de notas.
* **Panel de Coordinación (`views/coordinador.html`):** Matrícula de usuarios, alta de aspirantes, CRUD de docentes asesores, asignación de prácticas y reporte consolidado.
* **Panel de Dirección (`views/dashboard.html`):** Tablero ejecutivo con KPIs, gráficas de cumplimiento MEN, formalización de convenios y certificación final.
* **Panel de Institución (`views/institucion.html`):** Consulta de alumnos en sede y validación de asistencia presencial.

---

## 10. CÓDIGO DOCUMENTADO
El código fuente se encuentra estructurado bajo estándares de arquitectura limpia en JavaScript puro y Node.js, listo para ser alojado en el repositorio público de GitHub con documentación en su archivo `README.md`.

---

## 11. MONTAJE Y PRUEBAS DE REQUISITOS DE LA BASE DE DATOS (CRUD)
Se implementaron y probaron las 4 operaciones fundamentales (Create, Read, Update, Delete) en las tablas base:
* **Crear (Create):** Inserción de estudiantes, tutores, colegios, prácticas y bitácoras vía formularios y endpoints HTTP POST (`HTTP 201 Created`).
* **Leer (Read):** Consultas indexadas y filtros relacionales para visualización en tablas dinámicas.
* **Actualizar (Update):** Modificación de datos de estudiantes, cambios de estado en bitácoras y firma digital de convenios vía HTTP PUT.
* **Borrar (Delete):** Eliminación controlada de registros respetando restricciones de integridad referencial.

---

## 12. PROTOTIPO FUNCIONAL (CUMPLIMIENTO SUPERIOR AL 50% DE CASOS DE USO)
El sistema actual cumple más del **70% de los casos de uso** del diseño:
1. Autenticación y navegación por perfiles autorizados (100% funcional).
2. Radicación y alta de nuevos estudiantes (100% funcional).
3. Matrícula y CRUD de Docentes Asesores (100% funcional).
4. Asignación formal de prácticas pedagógicas (100% funcional).
5. Registro de bitácoras diarias con evidencia adjunta (100% funcional, Diagrama de Secuencia).
6. Supervisión y aprobación de actividades por el Tutor (100% funcional).
7. Calificación y emisión de observaciones pedagógicas (100% funcional).
8. Consulta de avance y acumulado de horas por el Estudiante (100% funcional).
9. Firma y formalización de convenios por el Director (100% funcional).
10. Emisión de informe consolidado imprimible para el MEN/CNA (100% funcional).

---

## 13. REFERENCIAS BIBLIOGRÁFICAS
* Congreso de la República de Colombia. (1994). *Ley 115 de 1994: Por la cual se expide la ley general de educación*. Diario Oficial No. 41.214.
* Ministerio de Educación Nacional de Colombia [MEN]. (2015). *Decreto 1075 de 2015: Por medio del cual se expide el Decreto Único Reglamentario del Sector Educación*. Bogotá, Colombia.
* Consejo Nacional de Acreditación [CNA]. (2021). *Lineamientos para la Acreditación de Alta Calidad de Programas Académicos*. Bogotá: MEN.
* Pressman, R. S., & Maxim, B. R. (2020). *Ingeniería del software: un enfoque práctico* (9.ª ed.). McGraw-Hill.
* Elmasri, R., & Navathe, S. B. (2016). *Fundamentos de sistemas de bases de datos* (7.ª ed.). Pearson.
* Booch, G., Rumbaugh, J., & Jacobson, I. (2006). *El lenguaje unificado de modelado (UML)* (2.ª ed.). Pearson Educación.

---

## 14. ANEXOS (GUÍA PARA EL VIDEO DE 5 MINUTOS)
Estructura sugerida para la sustentación audiovisual de 5 minutos:
1. **Minuto 1:** Presentación personal, contexto de la práctica de licenciatura (Decreto 1075/UDI) y planteamiento del problema.
2. **Minuto 2:** Demostración del Login, uso del atajo `Ctrl + Shift + D` y radicación de un aspirante nuevo.
3. **Minuto 3:** Demostración del Coordinador (alta de aspirante, registro de nuevo docente asesor y asignación de práctica).
4. **Minuto 4:** Demostración del Estudiante (registro de bitácora con evidencia) y cambio a Docente Asesor (aprobación de horas y calificación numérica con observaciones).
5. **Minuto 5:** Demostración del Director (gráficas de rendimiento, convenios por firmar y reporte consolidado) y visualización de las 2 bases de datos en la nube.
