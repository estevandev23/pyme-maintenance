# Referencia Rápida - MantenPro

Guía de comandos y tareas comunes para desarrollo del proyecto.

## 🚀 Inicio Rápido

### Levantar el proyecto completo
```bash
# 1. Iniciar base de datos
docker start pyme-db

# 2. Generar cliente Prisma (si es necesario)
npx prisma generate

# 3. Iniciar servidor de desarrollo
npm run dev

# Abrir: http://localhost:3000
```

### Poblar con datos de prueba
```bash
node scripts/seed-data.js
```

**Credenciales de prueba:**
- Admin: `admin@mantenpro.com` / `password123`
- Técnico: `tecnico1@mantenpro.com` / `password123`
- Cliente: `cliente1@techsolutions.com` / `password123`

---

## 📦 Base de Datos

### Ver datos en Prisma Studio (GUI)
```bash
npx prisma studio
# Abre en http://localhost:5555
```

### Ejecutar query SQL directamente
```bash
docker exec -it pyme-db psql -U postgres -d pyme_maintenance

# Dentro de psql:
\dt                    # Listar tablas
\d mantenimientos      # Ver estructura de tabla
SELECT * FROM equipos LIMIT 5;
\q                     # Salir
```

### Reset completo de la base de datos
```bash
# ⚠️ CUIDADO: Borra TODOS los datos
npx prisma migrate reset

# Volver a poblar
node scripts/seed-data.js
```

### Crear nueva migración
```bash
# 1. Editar prisma/schema.prisma
# 2. Crear migración
npx prisma migrate dev --name nombre_descriptivo

# Ejemplo:
npx prisma migrate dev --name agregar_campo_telefono_equipo
```

---

## 🔧 Desarrollo

### Agregar nuevo componente shadcn/ui
```bash
npx shadcn@latest add [component-name]

# Ejemplos:
npx shadcn@latest add calendar
npx shadcn@latest add datepicker
npx shadcn@latest add tooltip
```

### Ver qué componentes hay disponibles
```bash
npx shadcn@latest add
# Muestra lista interactiva
```

### Estructura típica de una nueva página

**1. Crear API route:**
```typescript
// src/app/api/[modulo]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Aplicar filtros según rol
  const userRole = session.user.role
  // ... lógica

  const data = await prisma.modelo.findMany({ /* ... */ })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  // Similar...
}
```

**2. Crear página:**
```typescript
// src/app/(dashboard)/[modulo]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/dashboard/header'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function ModuloPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const response = await fetch('/api/modulo')
      const result = await response.json()
      setData(result)
    } catch (error) {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header title="Título" description="Descripción" />
      <main className="flex-1 overflow-y-auto p-6">
        {/* Contenido */}
      </main>
    </>
  )
}
```

---

## 🎨 Estilos y Componentes

### Clases Tailwind comunes del proyecto
```css
/* Contenedor principal */
className="mx-auto max-w-7xl space-y-6"

/* Card estándar */
className="rounded-lg border bg-card text-card-foreground shadow-sm"

/* Botón primario */
className="bg-primary text-primary-foreground hover:bg-primary/90"

/* Badge de estado */
className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"

/* Grid responsive */
className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
```

### Colores del sistema
```typescript
// Estados de equipos
ACTIVO: "bg-green-500/10 text-green-700"
EN_MANTENIMIENTO: "bg-yellow-500/10 text-yellow-700"
INACTIVO: "bg-gray-500/10 text-gray-700"
DADO_DE_BAJA: "bg-red-500/10 text-red-700"

// Prioridades de alertas
ALTA: "bg-red-500/10 text-red-700 border-red-200"
MEDIA: "bg-yellow-500/10 text-yellow-700 border-yellow-200"
BAJA: "bg-green-500/10 text-green-700 border-green-200"
```

---

## 🔐 Autenticación y Roles

### Verificar sesión en API route
```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const session = await getServerSession(authOptions)

if (!session) {
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
}

const userRole = session.user.role
const userId = session.user.id
const empresaId = session.user.empresaId
```

### Filtrar datos por rol
```typescript
// ADMIN: ve todo (sin filtro)
let where = {}

// CLIENTE: solo su empresa
if (userRole === 'CLIENTE' && empresaId) {
  where = { empresaId }
}

// TECNICO: solo sus asignaciones
if (userRole === 'TECNICO') {
  where = { tecnicoId: userId }
}

const data = await prisma.modelo.findMany({ where })
```

### Proteger página en cliente
```typescript
'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'

export default function Page() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/login')
    }
  })

  if (status === 'loading') return <div>Cargando...</div>

  // Verificar rol específico
  if (session.user.role !== 'ADMIN') {
    return <div>No autorizado</div>
  }

  return <div>Contenido protegido</div>
}
```

---

## 🗃️ Queries Comunes de Prisma

### Incluir relaciones
```typescript
const equipos = await prisma.equipo.findMany({
  include: {
    empresa: true,
    mantenimientos: {
      include: {
        tecnico: {
          select: { nombre: true }
        }
      }
    }
  }
})
```

### Filtros avanzados
```typescript
const mantenimientos = await prisma.mantenimiento.findMany({
  where: {
    AND: [
      { estado: { in: ['PROGRAMADO', 'EN_PROCESO'] } },
      { fechaProgramada: { gte: new Date() } },
      { equipo: { empresaId: empresaId } }
    ]
  },
  orderBy: { fechaProgramada: 'asc' }
})
```

### Agregaciones
```typescript
const stats = await prisma.equipo.groupBy({
  by: ['estado'],
  _count: true,
  where: { empresaId }
})
```

### Transacciones (para operaciones atómicas)
```typescript
const result = await prisma.$transaction(async (tx) => {
  // Crear mantenimiento
  const mant = await tx.mantenimiento.create({ data: { ... } })

  // Registrar en historial
  await tx.historial.create({
    data: {
      equipoId: mant.equipoId,
      mantenimientoId: mant.id,
      observaciones: 'Mantenimiento programado'
    }
  })

  return mant
})
```

---

## 📝 Validación con Zod

### Schema típico
```typescript
import { z } from 'zod'

const schema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido'),
  email: z.string().email('Email inválido'),
  fecha: z.string().datetime('Fecha inválida'),
  estado: z.enum(['ACTIVO', 'INACTIVO'], {
    errorMap: () => ({ message: 'Estado inválido' })
  }),
  empresaId: z.string().cuid('ID inválido').optional()
})

type FormData = z.infer<typeof schema>
```

### Validar en API
```typescript
try {
  const body = await request.json()
  const validated = schema.parse(body)
  // validated tiene tipos correctos
} catch (error) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: error.errors },
      { status: 400 }
    )
  }
}
```

---

## 🎯 Comandos Git

### Workflow típico
```bash
# Ver estado
git status

# Agregar cambios
git add .

# Commit con mensaje descriptivo
git commit -m "feat: agregar filtro por estado en equipos"

# Push a remoto
git push origin main
```

### Mensajes de commit recomendados
```bash
feat: nueva funcionalidad
fix: corrección de bug
docs: actualización de documentación
style: cambios de estilo (formato, espacios)
refactor: refactorización de código
test: agregar o modificar tests
chore: tareas de mantenimiento
```

---

## 🐛 Troubleshooting

### Error: "Cannot find module '@prisma/client'"
```bash
npm install @prisma/client
npx prisma generate
```

### Error: "Database connection timeout"
```bash
# Verificar que Docker esté corriendo
docker ps

# Iniciar contenedor
docker start pyme-db

# Verificar puerto 5432
netstat -ano | findstr :5432
```

### Error: "NextAuth session is null"
```bash
# Verificar .env
# NEXTAUTH_SECRET debe estar definido

# Regenerar secret
openssl rand -base64 32

# Agregar a .env
NEXTAUTH_SECRET="el_valor_generado"

# Reiniciar servidor
npm run dev
```

### Puerto 3000 en uso
```bash
# Ver qué proceso usa el puerto
netstat -ano | findstr :3000

# Matar proceso (reemplazar PID)
taskkill /PID <PID> /F

# O usar otro puerto
npm run dev -- -p 3001
```

### Prisma Studio no abre
```bash
# Verificar que DB esté corriendo
docker ps

# Regenerar cliente
npx prisma generate

# Intentar de nuevo
npx prisma studio
```

---

## 📚 Recursos Útiles

### Documentación oficial
- [Next.js](https://nextjs.org/docs)
- [Prisma](https://www.prisma.io/docs)
- [NextAuth.js](https://next-auth.js.org/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Zod](https://zod.dev/)

### Herramientas
- Prisma Studio: `npx prisma studio`
- PostgreSQL: Docker container `pyme-db`
- VSCode extensions recomendadas:
  - Prisma
  - Tailwind CSS IntelliSense
  - ES7+ React/Redux/React-Native snippets

---

## 🎓 Snippets Útiles

### Crear toast de notificación
```typescript
import { toast } from 'sonner'

toast.success('Operación exitosa')
toast.error('Error al realizar la operación')
toast.info('Información importante')
toast.warning('Advertencia')
```

### Formatear fecha
```typescript
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

format(new Date(), 'dd/MM/yyyy', { locale: es })
format(new Date(), 'dd MMM yyyy', { locale: es })
format(new Date(), 'dd MMM yyyy, HH:mm', { locale: es })
```

### Dialog modal típico
```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const [open, setOpen] = useState(false)

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Título del modal</DialogTitle>
    </DialogHeader>
    {/* Contenido */}
  </DialogContent>
</Dialog>
```

---

**Última actualización:** 2026-01-12
