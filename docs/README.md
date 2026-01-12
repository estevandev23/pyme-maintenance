# Documentación - MantenPro

Bienvenido a la documentación del Sistema de Gestión de Mantenimiento para PYMEs.

## 📚 Índice de Documentación

### 🎯 Documentos Principales

1. **[Resumen Ejecutivo](./resumen-ejecutivo.md)**
   - Visión general del proyecto
   - Stack tecnológico
   - Módulos principales
   - Estado actual de desarrollo

2. **[Estado Actual](./estado-actual.md)** ⭐ NUEVO
   - Progreso detallado del proyecto (70% completado)
   - Módulos completados con ejemplos de código
   - Módulos pendientes con tareas específicas
   - Próximos pasos recomendados
   - Credenciales de prueba

3. **[Guía de Desarrollo](./guia-desarrollo.md)**
   - Comandos útiles (Docker, Prisma, Git)
   - Estructura de carpetas del proyecto
   - Convenciones de código
   - Patrones importantes implementados
   - Troubleshooting común

4. **[Referencia Rápida](./referencia-rapida.md)** ⭐ NUEVO
   - Comandos más usados
   - Snippets de código comunes
   - Queries típicas de Prisma
   - Validación con Zod
   - Recursos útiles

5. **[Diagrama de Base de Datos](./diagrama-db.md)**
   - Esquema visual completo
   - Relaciones entre tablas
   - Enumeraciones (ENUMs)
   - Índices y constraints

6. **[Archivos Temporales](./archivos-temporales.md)**
   - Qué archivos son temporales
   - Cuándo eliminarlos
   - Checklist pre-producción

---

## 🚀 Inicio Rápido

### Para empezar a desarrollar:

1. **Leer primero:**
   - [Resumen Ejecutivo](./resumen-ejecutivo.md) - Para entender el proyecto
   - [Estado Actual](./estado-actual.md) - Para ver qué está hecho

2. **Configurar entorno:**
   ```bash
   docker start pyme-db
   npm run dev
   ```

3. **Poblar con datos de prueba:**
   ```bash
   node scripts/seed-data.js
   ```

4. **Credenciales de prueba:**
   - Admin: `admin@mantenpro.com` / `password123`
   - Técnico: `tecnico1@mantenpro.com` / `password123`
   - Cliente: `cliente1@techsolutions.com` / `password123`

5. **Consultar:**
   - [Referencia Rápida](./referencia-rapida.md) - Para comandos comunes
   - [Guía de Desarrollo](./guia-desarrollo.md) - Para patrones y convenciones

---

## 📊 Estado del Proyecto

**Progreso general:** 70% completado

### ✅ Completado (70%)
- Autenticación y roles (RBAC)
- CRUD de Empresas
- CRUD de Equipos
- CRUD de Usuarios
- CRUD de Mantenimientos
- Dashboard con datos reales
- Sistema de Alertas
- Historial automático

### 🚧 Pendiente (30%)
- Gestión de archivos PDF
- Exportación de reportes (Excel/PDF)
- Sistema de emails
- Testing (> 80% cobertura)
- Documentación IEEE 830

**Ver detalles en:** [Estado Actual](./estado-actual.md)

---

## 🎯 Próximos Pasos

1. **Fase 1 - MVP Completo:**
   - Gestión de PDF
   - Exportación básica
   - Vista de historial

2. **Fase 2 - Producción:**
   - Testing completo
   - Documentación IEEE 830
   - Deploy

3. **Fase 3 - Mejoras:**
   - Sistema de emails
   - Dashboard avanzado
   - Mobile app

---

## 🛠️ Stack Tecnológico

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, Prisma ORM
- **Base de datos:** PostgreSQL (Docker)
- **Autenticación:** NextAuth.js
- **UI:** shadcn/ui
- **Validación:** Zod
- **Formularios:** React Hook Form

---

## 📂 Estructura de Documentación

```
docs/
├── README.md                    # Este archivo (índice)
├── resumen-ejecutivo.md         # Visión general del proyecto
├── estado-actual.md             # ⭐ Estado detallado (70% completado)
├── guia-desarrollo.md           # Guía completa de desarrollo
├── referencia-rapida.md         # ⭐ Comandos y snippets comunes
├── diagrama-db.md               # Esquema de base de datos
└── archivos-temporales.md       # Archivos a eliminar en producción
```

---

## 🔗 Enlaces Útiles

### Documentación Externa
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [NextAuth.js](https://next-auth.js.org/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Herramientas
- Prisma Studio: `npx prisma studio` (http://localhost:5555)
- Dev Server: `npm run dev` (http://localhost:3000)
- PostgreSQL: Docker container `pyme-db`

---

## 💡 Consejos

- **¿Primera vez en el proyecto?** → Leer [Resumen Ejecutivo](./resumen-ejecutivo.md)
- **¿Necesitas un comando rápido?** → Ver [Referencia Rápida](./referencia-rapida.md)
- **¿Vas a implementar algo nuevo?** → Revisar [Estado Actual](./estado-actual.md)
- **¿Error o duda técnica?** → Buscar en [Guía de Desarrollo](./guia-desarrollo.md)
- **¿Diseñar una tabla nueva?** → Consultar [Diagrama DB](./diagrama-db.md)

---

## 📞 Contacto

**Proyecto:** MantenPro - Sistema de Gestión de Mantenimiento para PYMEs
**Versión:** 0.7.0 (70% completado)
**Última actualización:** 2026-01-12

---

**¡Feliz desarrollo! 🚀**
