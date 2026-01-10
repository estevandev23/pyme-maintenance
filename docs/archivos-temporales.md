# Archivos y Carpetas Temporales

Este documento lista todos los archivos/carpetas que son **temporales** y pueden ser eliminados antes del deploy a producción.

## 🗑️ Eliminar antes de Producción

### 1. Scripts de Desarrollo
**Ubicación:** `scripts/dev/` y `scripts/*.js`

**Qué son:**
- Scripts para crear usuarios manualmente
- Herramientas de desarrollo local
- No necesarios en producción

**Cuándo eliminar:**
- Cuando el sistema tenga panel de usuarios completo
- Antes del deploy final
- Ya están en `.gitignore` para no subirlos a Git

**Comando:**
```bash
rm -rf scripts/dev/
rm scripts/*.js
```

---

### 2. Componentes de Dashboard de v0 (Opcional)
**Ubicación:** `src/components/maintenance-*.tsx`

**Qué son:**
- Componentes del dashboard descargados de v0.dev
- Usan datos de ejemplo (no reales)
- Útiles como referencia visual

**Cuándo eliminar:**
- Cuando conectes el dashboard a datos reales de la BD
- Cuando implementes tus propios componentes personalizados

**Archivos:**
- `maintenance-dashboard.tsx` (ya no se usa, reemplazado por layout)
- `maintenance-chart.tsx` (se usa pero con datos fake)
- `maintenance-table.tsx` (se usa pero con datos fake)
- `metric-card.tsx` (se usa pero con datos fake)

**Decisión:**
- ✅ Mantener por ahora (son útiles de referencia)
- 🔄 Reemplazar gradualmente con componentes reales

---

### 3. Datos de Ejemplo en Componentes

**Ubicación:** Dentro de los componentes

**Qué son:**
- Arrays con datos hardcodeados
- Números falsos en métricas
- Gráficos con datos de prueba

**Ejemplo en `src/app/(dashboard)/page.tsx`:**
```typescript
<MetricCard title="Total Equipos" value="247" ... />
// ☝️ Este "247" es fake, debe venir de la BD
```

**Cuándo eliminar:**
- Al conectar componentes a la API
- Al implementar queries reales a Prisma

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

- [ ] Eliminar `scripts/dev/` y `scripts/*.js`
- [ ] Reemplazar datos fake con queries reales
- [ ] Eliminar console.logs innecesarios
- [ ] Verificar que `.env` no esté en Git
- [ ] Actualizar `NEXTAUTH_SECRET` a uno seguro
- [ ] Configurar variables de entorno de producción
- [ ] Revisar que no haya contraseñas hardcodeadas
- [ ] Probar todas las funcionalidades

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
