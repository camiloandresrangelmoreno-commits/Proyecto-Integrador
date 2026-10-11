# Sistema Integral de Gestión de Prácticas Académicas (SIGPA - UDI)

Proyecto Integrador de Ingeniería de Software para la gestión, seguimiento y trazabilidad de prácticas pedagógicas de licenciatura en la **Universidad de Investigación y Desarrollo (UDI)**, enmarcado en el **Decreto 1075 de 2015** y los lineamientos de acreditación del **CNA / MEN**.

---

## 🚀 Arquitectura del Proyecto

* **Frontend:** HTML5 semántico, CSS3 puro y JavaScript Vanilla (DOM nativo, sin frameworks).
* **Backend:** Node.js, Express y Nodemon (`server.js`).
* **Bases de Datos en la Nube:** **PostgreSQL en Supabase**, distribuido en dos esquemas independientes con integridad referencial:
  1. `gestion_academica`: Estudiante, Tutor_Academico, Institucion, Tipo_Practica, Practica.
  2. `seguimiento_practicas`: Bitacora, Evidencia, Evaluacion.

---

## 📁 Estructura del Repositorio

```
├── .env                          # Variables de conexión a la nube
├── .env.example                  # Plantilla de variables de entorno
├── DOCUMENTO_SEGUNDA_ENTREGA.md  # Documento académico formal (14 puntos requeridos)
├── package.json                  # Dependencias y scripts (Express, pg, dotenv, nodemon)
├── server.js                     # Servidor Node.js + Express con API REST dual
│
├── backend/                      # Controladores del Backend
│   ├── dbAcademica.js            # Conexión nativa a la BD 1 (gestion_academica)
│   └── dbSeguimiento.js          # Conexión nativa a la BD 2 (seguimiento_practicas)
│
├── database/                     # Scripts DDL para PostgreSQL / Supabase
│   ├── 01_gestion_academica.sql  # Creación del esquema 1, tablas y datos semilla
│   └── 02_seguimiento_practicas.sql # Creación del esquema 2, tablas y datos semilla
│
├── css/                          # Estilos visuales institucionales
│   └── styles.css
├── images/                       # Recursos gráficos y logos
│   ├── logo.png
│   ├── logo1.png
│   └── fondo-portada1.jpg
├── js/                           # Capa de datos del cliente
│   └── db.js                     # Sincronización con APIs del backend
│
├── index.html                    # Portal de inicio de sesión y radicación
└── views/                        # Vistas por rol académico
    ├── estudiante.html           # Panel del Estudiante (Bitácoras y Evidencias)
    ├── docente.html              # Panel del Tutor Académico (Supervisión y Evaluación)
    ├── coordinador.html          # Panel del Coordinador (Matrículas y CRUDs)
    ├── dashboard.html            # Panel del Director (KPIs, Gráficas y Convenios)
    └── institucion.html          # Panel de Institución Receptora (Asistencia)
```

---

## ⚡ Instalación y Ejecución Local

1. **Clonar el repositorio:**
   ```bash
   git clone <URL_DE_TU_REPOSITORIO_GITHUB>
   cd sistema-gestion-practicas
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar el archivo `.env`:**
   Copia el archivo `.env.example` como `.env` e incluye tu cadena de conexión de Supabase:
   ```env
   PORT=3000
   DATABASE_URL_ACADEMICA=postgresql://postgres:[TU_CLAVE]@db.ywadbrsmyswfgmvkfxjn.supabase.co:5432/postgres
   DATABASE_URL_SEGUIMIENTO=postgresql://postgres:[TU_CLAVE]@db.ywadbrsmyswfgmvkfxjn.supabase.co:5432/postgres
   ```

4. **Ejecutar el servidor con Nodemon:**
   ```bash
   npm run dev
   ```

5. Abrir en el navegador: `http://localhost:3000`

---

## 🔑 Atajo Secreto para Sustentación y Jurados
En la pantalla de login (`index.html`), presiona la combinación de teclas:
**`Ctrl + Shift + D`**
Aparecerá el menú con botones de un clic para probar cualquier rol al instante:
* 🎓 **Estudiante:** `estudiante@udi.edu.co` / `estudiante123`
* 👨‍🏫 **Tutor Académico:** `docente@udi.edu.co` / `docente123`
* 📋 **Coordinador:** `coordinador@udi.edu.co` / `coordinador123`
* 👔 **Director:** `director@udi.edu.co` / `director123`
* 🏫 **Institución:** `colegio@udi.edu.co` / `colegio123`

---

## 📊 Endpoints de la API REST

* **Diagnóstico del Servidor:** `GET /api/estado-servidor`
* **Estudiantes:** `GET`, `POST`, `PUT`, `DELETE` en `/api/academica/estudiantes`
* **Tutores:** `GET`, `POST` en `/api/academica/tutores`
* **Instituciones:** `GET`, `POST`, `PUT`, `DELETE` en `/api/academica/instituciones`
* **Prácticas:** `GET`, `POST` en `/api/academica/practicas`
* **Bitácoras (Diagrama de Secuencia):** `POST /api/bitacoras` (retorna `HTTP 201 Created`)
* **Evaluaciones:** `GET`, `POST` en `/api/seguimiento/evaluaciones`
