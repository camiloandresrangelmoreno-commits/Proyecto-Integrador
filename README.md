# Software para la Gestión y Seguimiento de Prácticas Académicas

Plataforma web institucional para la administración, supervisión, evaluación y auditoría de prácticas pedagógicas bajo los lineamientos del **Decreto 1075 de 2015 (MEN)** para programas de Licenciatura de la **Universidad de Investigación y Desarrollo (UDI)**.

---

## 1. Arquitectura de 2 Microservicios Independientes

El backend está construido en **Node.js + Express** con dos capas DAO desacopladas por esquema PostgreSQL en **Supabase**, comunicadas exclusivamente mediante API REST usando los identificadores lógicos de referencia **`id_practica`** y **`documento_tu`**:

```
┌───────────────────────────────────────────────────────────────────────────┐
│               FRONTEND INSTITUCIONAL (HTML5 + CSS3 + Vanilla JS)          │
│   index.html · coordinador · dashboard · estudiante · docente · colegio   │
└────────────────────────────────────┬──────────────────────────────────────┘
                                     │ Peticiones REST JSON (/api/*)
┌────────────────────────────────────▼──────────────────────────────────────┐
│                   API GATEWAY / ORQUESTADOR (server.js)                   │
│  • /api/auth/login       • /api/solicitudes       • /api/academica/*      │
│  • /api/seguimiento/*    • /api/reportes/consolidado (orquestación REST)  │
└───────────────┬──────────────────────────────────────────┬────────────────┘
                │                                          │
┌───────────────▼─────────────────────┐   ┌────────────────▼────────────────┐
│ MICROSERVICIO 1                     │   │ MICROSERVICIO 2                 │
│ Gestión Académica                   │   │ Seguimiento de Prácticas        │
│ DAO: backend/dbAcademica.js         │   │ DAO: backend/dbSeguimiento.js   │
│ Esquema DB: `gestion_academica`     │   │ Esquema DB: `seguimiento_practicas`
│                                     │   │                                 │
│ • Estudiante (semestre opcional)    │   │ • Bitacora (ref. `id_practica`) │
│ • Tutor_Academico (`documento_tu`)  │   │ • Evidencia (ref. `id_practica`)│
│ • Institucion                       │   │ • Evaluacion (`id_practica`,    │
│ • Tipo_Practica                     │   │               `documento_tu`)   │
│ • Practica (`id_practica`)          │   │                                 │
│ • Solicitudes · Convenio · Coord.   │   │                                 │
└─────────────────────────────────────┘   └─────────────────────────────────┘
```

### Características Técnicas Clave
- **Desacoplamiento real:** Los módulos `backend/dbAcademica.js` y `backend/dbSeguimiento.js` gestionan esquemas PostgreSQL independientes (`gestion_academica` y `seguimiento_practicas`) sin consultas SQL cruzadas. La consolidación de reportes se realiza en `GET /api/reportes/consolidado` y las eliminaciones en cascada se orquestan desde `server.js`.
- **Auto-migración y respaldo:** Al arrancar, el servidor verifica automáticamente tablas y columnas en Supabase PostgreSQL; si no hubiese red hacia la nube, activa respaldo persistente en disco (`backend/local_academica.json` y `backend/local_seguimiento.json`).
- **Cero configuración manual:** El repositorio incluye `.npmrc` (`legacy-peer-deps=true`), `.env` activo y cadenas de respaldo en los DAO para ejecutar inmediatamente tras clonar.

---

## 2. Estructura del Proyecto

```text
├── .env                        # Variables de entorno activas (Puerto 3000 y Supabase PostgreSQL)
├── .env.example                # Plantilla de referencia de variables de entorno
├── .npmrc                      # Configuración de npm (legacy-peer-deps=true)
├── package.json                # Dependencias mínimas (express, pg, cors, dotenv) y scripts
├── server.js                   # Servidor Express, API REST, autenticación y orquestador de reportes
├── database_setup.sql          # Script DDL completo de esquemas, tablas y datos semilla
├── index.html                  # Portal de inicio de sesión y radicación de solicitudes
├── backend/
│   ├── dbAcademica.js          # Microservicio 1: DAO del esquema gestion_academica
│   └── dbSeguimiento.js        # Microservicio 2: DAO del esquema seguimiento_practicas
├── css/
│   └── styles.css              # Hoja de estilos institucional global
├── images/                     # Logos e imágenes institucionales UDI
├── js/
│   └── db.js                   # Capa cliente REST (sincronización en vivo con Supabase y sesión)
└── views/
    ├── coordinador.html        # Panel del Coordinador (CRUD completo, solicitudes y reportes)
    ├── dashboard.html          # Panel del Director de Programa (KPIs, convenios y auditoría)
    ├── estudiante.html         # Portal del Estudiante (bitácoras, progreso y evaluaciones)
    ├── docente.html            # Portal del Tutor Académico (revisión de bitácoras y notas)
    ├── institucion.html        # Portal de Institución Receptora (validación presencial en sede)
    └── evidencia.html          # Formato imprimible oficial FO-EP-07 de evidencias
```

---

## 3. Ejecución Directa (2 Comandos)

Requisitos previos: **Node.js v18+** (`npm` incluido). No requiere instalación local de PostgreSQL ni configuración manual de archivos ocultos:

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar el servidor en http://localhost:3000
npm start
```

Una vez ejecutado `npm start`, abre en tu navegador:
- **Aplicación Web (Login):** `http://localhost:3000`
- **Diagnóstico de Base de Datos:** `http://localhost:3000/api/estado-db`
- **Estado de Microservicios:** `http://localhost:3000/api/estado-servidor`
- **Informe Consolidado (JSON):** `http://localhost:3000/api/reportes/consolidado`

> **Tip de evaluación rápida:** En la pantalla de inicio de sesión (`index.html`), presiona **`Ctrl + Shift + D`** para mostrar el panel oculto de autocompletado rápido de credenciales por rol.

---

## 4. Credenciales de Prueba por Rol

| Rol Académico | Correo Electrónico | Contraseña | Módulo de Acceso |
| :--- | :--- | :--- | :--- |
| **Coordinador de Prácticas** | `coordinador@udi.edu.co` | `coordinador123` | `views/coordinador.html` |
| **Director de Programa** | `director@udi.edu.co` | `director123` | `views/dashboard.html` |
| **Estudiante Practicante** | `estudiante@udi.edu.co` | `estudiante123` | `views/estudiante.html` |
| **Estudiante (Alterno)** | `laura.morales@udi.edu.co` | `laura123` | `views/estudiante.html` |
| **Tutor Académico (Docente)** | `docente@udi.edu.co` | `docente123` | `views/docente.html` |
| **Institución Receptora (Colegio)** | `colegio@udi.edu.co` | `colegio123` | `views/institucion.html` |

---

## 5. Verificación y Mantenimiento

```bash
# Validar sintaxis de servidor, microservicios y capa cliente
npm run lint
```

El script SQL completo de creación de esquemas y datos iniciales se encuentra documentado en `database_setup.sql` para auditoría o despliegue en una nueva instancia de PostgreSQL/Supabase.
