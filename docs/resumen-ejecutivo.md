# Sistema de Gestión de Mantenimiento para PYMEs

## Resumen Ejecutivo

Sistema web para mejorar la gestión del mantenimiento preventivo y correctivo de equipos de cómputo en pequeñas y medianas empresas (PYMEs).

## Objetivo

Planificar, registrar, controlar y hacer seguimiento a los mantenimientos realizados en equipos informáticos, reduciendo fallos técnicos y mejorando la productividad operativa.

## Stack Tecnológico

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Base de datos**: PostgreSQL (Docker)
- **Autenticación**: NextAuth.js
- **Validación**: Zod
- **Formularios**: React Hook Form

## Módulos Principales

### 1. Gestión de Usuarios y Roles
- **Roles**: Administrador, Técnico, Cliente PYME
- Control de acceso basado en roles
- Gestión de permisos

### 2. Módulo de Equipos
- Registro de equipos (tipo, marca, serial, estado)
- Ubicación física
- Historial completo de mantenimientos por equipo
- Estados: Activo, Inactivo, En Mantenimiento, Dado de Baja

### 3. Módulo de Mantenimientos
- Crear y asignar mantenimientos
- Clasificación: Preventivo o Correctivo
- Estados: Programado, En Proceso, Completado, Cancelado
- Adjuntar reportes PDF
- Fechas programadas y realizadas
- Asignación de responsables técnicos

### 4. Sistema de Alertas
- Notificaciones automáticas por mantenimientos programados
- Alertas por mantenimientos retrasados
- Sistema de notificaciones internas y correo electrónico

### 5. Dashboard de Seguimiento
- Métricas de fallas recurrentes
- Mantenimientos completados vs pendientes
- Equipos en estado crítico
- Tiempos promedio de resolución
- Gráficos y estadísticas

### 6. Gestión de Reportes
- Exportación a PDF y Excel
- Reportes de auditoría
- Control interno
- Historial de intervenciones por equipo
- Historial de intervenciones por técnico

## Requisitos No Funcionales

- Cumplimiento norma IEEE 830
- Interfaz responsive (móvil, tablet, desktop)
- Backend seguro y escalable
- Protección de datos (Art. 15 Constitución Colombiana)
- Latencia de respuesta < 200 ms
- Cobertura de pruebas > 80%

## Modelo de Base de Datos

### Tablas Principales

1. **empresas**: Datos de las PYMEs clientes
2. **users**: Usuarios del sistema (Admin, Técnico, Cliente)
3. **equipos**: Inventario de equipos de cómputo
4. **mantenimientos**: Registro de mantenimientos programados y realizados
5. **historial**: Log completo de todas las intervenciones
6. **alertas**: Sistema de notificaciones

### Relaciones

- Empresas → Usuarios (1:N)
- Empresas → Equipos (1:N)
- Equipos → Mantenimientos (1:N)
- Técnicos → Mantenimientos (1:N)
- Mantenimientos → Historial (1:N)
- Mantenimientos → Alertas (1:N)

## Flujo de Trabajo Típico

1. **Cliente PYME** registra equipos en el sistema
2. **Sistema** genera mantenimientos preventivos automáticos según calendario
3. **Administrador** asigna mantenimientos a técnicos
4. **Sistema** envía alertas a técnicos asignados
5. **Técnico** realiza el mantenimiento y registra observaciones
6. **Técnico** adjunta reporte PDF
7. **Sistema** actualiza historial del equipo
8. **Dashboard** muestra métricas actualizadas
9. **Administrador** genera reportes para auditoría

## Estado Actual del Desarrollo

### ✅ Completado

1. **Configuración Inicial**
   - NextAuth configurado para autenticación
   - shadcn/ui instalado y configurado
   - Layout principal y navegación (Sidebar + Header)
   - PostgreSQL en Docker (contenedor `pyme-db`)
   - Prisma ORM configurado con schema completo

2. **Módulo de Autenticación**
   - Login con email y contraseña
   - Sesiones JWT con NextAuth
   - Middleware de protección de rutas
   - Control de acceso basado en roles (RBAC)

3. **CRUD de Empresas**
   - Listado con búsqueda y filtros
   - Creación de empresas (Admin solamente)
   - Edición de datos de empresa
   - Eliminación con confirmación
   - Validación con Zod

4. **CRUD de Equipos**
   - Listado con filtros por estado y empresa
   - Registro de equipos (tipo, marca, modelo, serial)
   - Edición de equipos
   - Gestión de estados (Activo, Inactivo, En Mantenimiento, Dado de Baja)
   - Validación de seriales únicos
   - Vista filtrada por rol (Cliente ve solo sus equipos)

5. **CRUD de Usuarios**
   - Listado de usuarios con roles
   - Creación de usuarios (Admin/Técnico/Cliente)
   - Asignación de empresas a clientes
   - Activar/Desactivar usuarios
   - Hash de contraseñas con bcrypt
   - Validación de emails únicos

6. **CRUD de Mantenimientos**
   - Programación de mantenimientos (Preventivos/Correctivos)
   - Asignación de técnicos
   - Estados: Programado, En Proceso, Completado, Cancelado
   - Registro automático en historial con transacciones
   - Validación de fechas
   - Vista filtrada por rol (Técnico ve solo los suyos)

7. **Dashboard con Datos Reales**
   - Total de equipos y equipos por estado
   - Total de mantenimientos y estados
   - Mantenimientos completados este mes
   - Mantenimientos pendientes
   - Equipos críticos
   - Gráfico de mantenimientos por mes (últimos 6 meses)
   - Próximos mantenimientos (timeline)
   - Métricas filtradas por rol

8. **Sistema de Alertas y Notificaciones**
   - Detección de mantenimientos atrasados
   - Alertas de mantenimientos próximos (3 días)
   - Detección de equipos críticos
   - Badge en sidebar con contador (auto-refresh 30s)
   - Priorización (Alta, Media, Baja)
   - Página de alertas con filtros
   - Alertas filtradas por rol

9. **Datos de Prueba**
   - Script de seeding con patrón upsert
   - 4 empresas de ejemplo
   - 8 usuarios (1 admin, 3 técnicos, 4 clientes)
   - 39 equipos distribuidos
   - 70 mantenimientos (pasados y futuros)
   - Historial automático generado

### 🚧 Pendiente

1. **Gestión de Archivos PDF**
   - Carga de reportes PDF de mantenimientos
   - Almacenamiento de archivos
   - Vista previa de reportes

2. **Exportación de Reportes**
   - Exportar a PDF (historial, mantenimientos)
   - Exportar a Excel (listados, estadísticas)
   - Reportes de auditoría

3. **Vista de Historial Detallado**
   - Timeline completo de intervenciones por equipo
   - Historial de trabajos por técnico
   - Filtros avanzados

4. **Sistema de Emails**
   - Notificaciones por correo de mantenimientos
   - Alertas por email
   - Configuración SMTP

5. **Pruebas y Calidad**
   - Pruebas unitarias (Jest)
   - Pruebas de integración
   - Cobertura > 80%

6. **Documentación Técnica**
   - Documentación IEEE 830
   - Documentación de API
   - Manual de usuario
