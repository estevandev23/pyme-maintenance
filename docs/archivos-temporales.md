# Archivos y Carpetas Temporales

Este documento lista todos los archivos/carpetas que son **temporales** y pueden ser eliminados antes del deploy a producción.

## 🗑️ Eliminar antes de Producción

### 1. Scripts de Desarrollo
**Ubicación:** `scripts/seed-data.js`

**Qué es:**
- Script para poblar base de datos con datos de prueba
- Útil durante desarrollo y testing
- NO necesario en producción

**Cuándo eliminar:**
- Antes del deploy a producción
- Ya está en `.gitignore` para no subirlo a Git
- El sistema en producción se poblará con datos reales

**Comando:**
```bash
rm scripts/seed-data.js
```

**NOTA:** Mantener durante desarrollo, es muy útil para resetear datos de prueba

---

### 2. ✅ Datos Fake en Dashboard - YA SOLUCIONADO

**Estado:** COMPLETADO ✅

El dashboard ahora está completamente conectado a datos reales de la base de datos:
- Total de equipos → Query real a Prisma
- Mantenimientos completados → Query real con filtros
- Equipos críticos → Calculado en tiempo real
- Gráficos → Datos reales de los últimos 6 meses
- Próximos mantenimientos → Query ordenada por fecha

**Archivos actualizados:**
- [src/app/(dashboard)/page.tsx](../src/app/(dashboard)/page.tsx)
- [src/app/api/dashboard/stats/route.ts](../src/app/api/dashboard/stats/route.ts)

---

## ✅ Mantener Siempre

### Documentación
- `docs/` - Toda la documentación
- `README.md` (cuando lo crees)
- `scripts/README.md`

### Código del Sistema
- Todo en `src/` (excepto lo mencionado arriba)
- Todas las API routes
- Todos los componentes de UI (shadcn/ui)
- Layouts y providers

### Configuración
- `prisma/schema.prisma`
- `package.json`
- `tsconfig.json`
- `tailwind.config.ts`
- etc.

---

## 📋 Checklist Pre-Producción

Antes de hacer deploy, verifica:

- [ ] Eliminar `scripts/seed-data.js`
- [x] ~~Reemplazar datos fake con queries reales~~ ✅ Ya hecho
- [ ] Eliminar console.logs innecesarios
- [ ] Verificar que `.env` no esté en Git
- [ ] Actualizar `NEXTAUTH_SECRET` a uno seguro de producción
- [ ] Configurar variables de entorno de producción
- [ ] Revisar que no haya contraseñas hardcodeadas
- [x] ~~Probar CRUDs básicos~~ ✅ Ya hecho
- [ ] Implementar sistema de archivos PDF
- [ ] Implementar exportación de reportes
- [ ] Pruebas de rendimiento (latencia < 200ms)
- [ ] Pruebas de seguridad (validación, inyección SQL)
- [ ] Documentación IEEE 830

---

## 🔍 Cómo Identificar Archivos Temporales

**Señales de que un archivo es temporal:**

1. ✋ Tiene comentarios como "TODO: reemplazar con datos reales"
2. ✋ Tiene datos hardcodeados (arrays con objetos fake)
3. ✋ Está en carpeta `/dev/` o `/temp/`
4. ✋ Es un script `.js` suelto en `/scripts/`
5. ✋ Tiene nombre como `test-*.tsx` o `example-*.tsx`

**Señales de que es código permanente:**

1. ✅ Usa `prisma` para queries a BD
2. ✅ Usa `fetch()` a API routes
3. ✅ Tiene validación con Zod
4. ✅ Está en la estructura de Next.js (`app/`, `components/`)
5. ✅ Tiene TypeScript types definidos
