/**
 * @jest-environment node
 *
 * Comprueba contra la base de datos real que el equipo de un mantenimiento no
 * puede cambiarse, y que la edición normal sigue funcionando.
 *
 * Crea su propio mantenimiento y lo retira al terminar: no toca los datos
 * sembrados. Se salta sola si no hay base alcanzable.
 */
import { PUT } from "@/app/api/mantenimientos/[id]/route"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { MOTIVO_EQUIPO_INMUTABLE } from "@/lib/edicion-mantenimiento"

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }))
jest.mock("@/lib/auth", () => ({ authOptions: {} }))

const sesion = getServerSession as jest.Mock

let hayBase = false
let mantenimientoId = ""
let equipoPropio = ""
let equipoAjeno = ""
let tecnicoPropio = ""
let tecnicoAlterno = ""
let adminId = ""

const peticion = (cuerpo: unknown) =>
  ({ json: async () => cuerpo }) as never

const contexto = (id: string) => ({ params: Promise.resolve({ id }) })

/** Deja el mantenimiento de prueba en su estado inicial. */
async function restaurar() {
  await prisma.mantenimiento.update({
    where: { id: mantenimientoId },
    data: {
      equipoId: equipoPropio,
      tecnicoId: tecnicoPropio,
      descripcion: "Descripción original",
    },
  })
}

beforeAll(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`

    // Hace falta una empresa con dos equipos y dos técnicos propios. Prisma no
    // sabe filtrar por "al menos dos relacionados", así que se elige en código.
    const candidatas = await prisma.empresa.findMany({
      select: {
        id: true,
        equipos: { select: { id: true }, take: 2 },
        usuarios: {
          where: { role: "TECNICO", activo: true },
          select: { id: true },
          take: 2,
        },
      },
    })

    const empresa = candidatas.find(
      (e) => e.equipos.length >= 2 && e.usuarios.length >= 2
    )

    const otroEquipo = await prisma.equipo.findFirst({
      where: { empresaId: { not: empresa?.id } },
      select: { id: true },
    })

    if (empresa && otroEquipo) {
      equipoPropio = empresa.equipos[0].id
      equipoAjeno = empresa.equipos[1]?.id ?? otroEquipo.id
      tecnicoPropio = empresa.usuarios[0].id
      tecnicoAlterno = empresa.usuarios[1].id

      const creado = await prisma.mantenimiento.create({
        data: {
          equipoId: equipoPropio,
          tecnicoId: tecnicoPropio,
          tipo: "PREVENTIVO",
          estado: "PROGRAMADO",
          fechaProgramada: new Date(),
          descripcion: "Descripción original",
        },
        select: { id: true },
      })
      mantenimientoId = creado.id

      // El historial de una reasignación guarda quién la hizo como clave
      // foránea, así que la sesión de prueba necesita un administrador real.
      const admin = await prisma.user.findFirst({
        where: { role: "ADMIN" },
        select: { id: true },
      })
      adminId = admin?.id ?? ""
      hayBase = Boolean(adminId)
    }
  } catch {
    hayBase = false
  }
})

afterAll(async () => {
  if (hayBase && mantenimientoId) {
    await prisma.historial.deleteMany({ where: { mantenimientoId } })
    await prisma.mantenimiento.delete({ where: { id: mantenimientoId } })
  }
  await prisma.$disconnect().catch(() => {})
})

beforeEach(async () => {
  jest.clearAllMocks()
  sesion.mockResolvedValue({
    user: { id: adminId, role: "ADMIN", empresaId: null },
  })
  if (hayBase) await restaurar()
})

describe("el equipo de un mantenimiento queda fijado al crearlo", () => {
  it("hay base de datos alcanzable", () => {
    if (!hayBase) console.warn("Sin base: el resto de la suite se omite.")
    expect(true).toBe(true)
  })

  it("rechaza mover el mantenimiento a otro equipo, explicando el motivo", async () => {
    if (!hayBase) return

    const respuesta = await PUT(
      peticion({ equipoId: equipoAjeno }),
      contexto(mantenimientoId)
    )
    const cuerpo = await respuesta.json()

    expect(respuesta.status).toBe(400)
    expect(cuerpo.error).toBe(MOTIVO_EQUIPO_INMUTABLE)
    expect(cuerpo.error).toMatch(/cancela este y crea uno nuevo/)

    const guardado = await prisma.mantenimiento.findUnique({
      where: { id: mantenimientoId },
      select: { equipoId: true },
    })
    expect(guardado?.equipoId).toBe(equipoPropio)
  })

  it("no guarda ningún otro campo cuando rechaza", async () => {
    if (!hayBase) return

    await PUT(
      peticion({ equipoId: equipoAjeno, descripcion: "Descripción intrusa" }),
      contexto(mantenimientoId)
    )

    const guardado = await prisma.mantenimiento.findUnique({
      where: { id: mantenimientoId },
      select: { equipoId: true, descripcion: true },
    })
    expect(guardado?.equipoId).toBe(equipoPropio)
    expect(guardado?.descripcion).toBe("Descripción original")
  })
})

describe("la edición normal sigue funcionando", () => {
  it("acepta reenviar el equipo actual y guarda los demás campos", async () => {
    if (!hayBase) return

    const respuesta = await PUT(
      peticion({ equipoId: equipoPropio, descripcion: "Descripción nueva" }),
      contexto(mantenimientoId)
    )

    expect(respuesta.status).toBe(200)
    const guardado = await prisma.mantenimiento.findUnique({
      where: { id: mantenimientoId },
      select: { descripcion: true, equipoId: true },
    })
    expect(guardado?.descripcion).toBe("Descripción nueva")
    expect(guardado?.equipoId).toBe(equipoPropio)
  })

  it("acepta una actualización que omite el equipo", async () => {
    if (!hayBase) return

    const respuesta = await PUT(
      peticion({ descripcion: "Sin mencionar el equipo" }),
      contexto(mantenimientoId)
    )

    expect(respuesta.status).toBe(200)
    const guardado = await prisma.mantenimiento.findUnique({
      where: { id: mantenimientoId },
      select: { descripcion: true, equipoId: true },
    })
    expect(guardado?.descripcion).toBe("Sin mencionar el equipo")
    expect(guardado?.equipoId).toBe(equipoPropio)
  })

  // La reasignación llegó con asignacion-automatica-tecnicos: debe seguir viva.
  it("la reasignación de técnico sigue funcionando y deja rastro", async () => {
    if (!hayBase) return

    const respuesta = await PUT(
      peticion({ equipoId: equipoPropio, tecnicoId: tecnicoAlterno }),
      contexto(mantenimientoId)
    )

    expect(respuesta.status).toBe(200)
    const guardado = await prisma.mantenimiento.findUnique({
      where: { id: mantenimientoId },
      select: { tecnicoId: true },
    })
    expect(guardado?.tecnicoId).toBe(tecnicoAlterno)

    const rastro = await prisma.historial.count({ where: { mantenimientoId } })
    expect(rastro).toBeGreaterThan(0)
  })
})

describe("la rama de TECNICO no se ve afectada", () => {
  it("un técnico sigue pudiendo cambiar estado y observaciones", async () => {
    if (!hayBase) return

    sesion.mockResolvedValue({
      user: { id: tecnicoPropio, role: "TECNICO", empresaId: null },
    })

    const respuesta = await PUT(
      peticion({ estado: "EN_PROCESO", observaciones: "En curso" }),
      contexto(mantenimientoId)
    )

    expect(respuesta.status).toBe(200)
    const guardado = await prisma.mantenimiento.findUnique({
      where: { id: mantenimientoId },
      select: { estado: true, observaciones: true, equipoId: true },
    })
    expect(guardado?.estado).toBe("EN_PROCESO")
    expect(guardado?.observaciones).toBe("En curso")
    expect(guardado?.equipoId).toBe(equipoPropio)
  })
})
