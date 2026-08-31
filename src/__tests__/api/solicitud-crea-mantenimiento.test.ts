/**
 * @jest-environment node
 *
 * El núcleo del cambio: registrar una solicitud crea su mantenimiento en el
 * acto, sin que nadie tenga que aprobarla.
 *
 * Se dobla la base para que estas pruebas corran siempre y no dependan de que
 * haya una base alcanzable: las dos suites de integración del proyecto usan
 * `if (!hayBase) return`, así que pasan en verde sin ejercitar nada, y este es
 * justo el comportamiento que no puede quedarse sin comprobar.
 */

import { POST } from "@/app/api/solicitudes/route"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }))
jest.mock("@/lib/auth", () => ({ authOptions: {} }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    equipo: { findUnique: jest.fn() },
    solicitudServicio: { findUniqueOrThrow: jest.fn() },
    $transaction: jest.fn(),
  },
}))

const sesion = getServerSession as jest.Mock
const buscarEquipo = prisma.equipo.findUnique as jest.Mock
const transaccion = prisma.$transaction as jest.Mock
const releerSolicitud = prisma.solicitudServicio.findUniqueOrThrow as jest.Mock

const peticion = (cuerpo: unknown) => ({ json: async () => cuerpo }) as never

const CUERPO = {
  equipoId: "eq-1",
  descripcion: "El equipo no enciende y hace un ruido raro",
  prioridad: "ALTA",
}

interface Escrituras {
  solicitud?: Record<string, unknown>
  mantenimiento?: Record<string, unknown>
  historial?: Record<string, unknown>
  equipoSincronizado: string[]
  estadoEquipo: string | null
}

/**
 * Doble de la transacción con los técnicos que se le indiquen. Devuelve lo que
 * se intentó escribir para poder afirmar sobre ello.
 */
function montarTransaccion(opciones: {
  tecnicos?: Array<{ id: string; nombre: string; email: string }>
  diasProgramacion?: number | null
  estadoEquipoInicial?: string
}): Escrituras {
  const tecnicos = opciones.tecnicos ?? []
  const escrituras: Escrituras = {
    equipoSincronizado: [],
    estadoEquipo: opciones.estadoEquipoInicial ?? "ACTIVO",
  }

  transaccion.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
    const tx = {
      configuracion: {
        findUnique: async () =>
          opciones.diasProgramacion == null
            ? null
            : { diasProgramacion: opciones.diasProgramacion },
      },
      user: {
        findMany: async () => tecnicos.map((t) => ({ ...t, empresaId: "em-1" })),
      },
      mantenimiento: {
        groupBy: async () => [],
        count: async () => (escrituras.mantenimiento?.tecnicoId ? 1 : 0),
        create: async ({ data }: { data: Record<string, unknown> }) => {
          escrituras.mantenimiento = data
          return {
            id: "mant-nuevo",
            tecnicoId: data.tecnicoId,
            fechaProgramada: data.fechaProgramada,
          }
        },
      },
      solicitudServicio: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          escrituras.solicitud = data
          return { id: "sol-nueva" }
        },
      },
      historial: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          escrituras.historial = data
          return {}
        },
      },
      equipo: {
        findUnique: async () => ({ estado: escrituras.estadoEquipo }),
        update: async ({ data }: { data: { estado: string } }) => {
          escrituras.equipoSincronizado.push(data.estado)
          escrituras.estadoEquipo = data.estado
          return {}
        },
      },
    }
    return fn(tx as never)
  })

  return escrituras
}

beforeEach(() => {
  jest.clearAllMocks()
  sesion.mockResolvedValue({
    user: { id: "cli-1", role: "CLIENTE", empresaId: "em-1" },
  })
  buscarEquipo.mockResolvedValue({ id: "eq-1", empresaId: "em-1" })
  releerSolicitud.mockResolvedValue({
    id: "sol-nueva",
    estado: "APROBADA",
    descripcion: CUERPO.descripcion,
    equipo: {
      id: "eq-1",
      tipo: "Servidor",
      marca: "Lenovo",
      modelo: "M-1",
      serial: "SN-1",
      empresa: { id: "em-1", nombre: "TechSolutions" },
    },
    cliente: {
      id: "cli-1",
      nombre: "Carlos Mendoza",
      email: "cliente1@techsolutions.example",
    },
  })
})

describe("registrar una solicitud crea su mantenimiento", () => {
  it("crea solicitud y mantenimiento enlazados", async () => {
    const escrituras = montarTransaccion({
      tecnicos: [{ id: "tec-1", nombre: "Ana García", email: "ana@mantenpro.example" }],
    })

    const respuesta = await POST(peticion(CUERPO))

    expect(respuesta.status).toBe(201)
    expect(escrituras.mantenimiento).toMatchObject({
      solicitudId: "sol-nueva",
      equipoId: "eq-1",
      tipo: "CORRECTIVO",
      estado: "PROGRAMADO",
      descripcion: CUERPO.descripcion,
    })
  })

  it("la solicitud nace aprobada: nadie tiene que aprobarla", async () => {
    const escrituras = montarTransaccion({
      tecnicos: [{ id: "tec-1", nombre: "Ana", email: "ana@mantenpro.example" }],
    })

    await POST(peticion(CUERPO))

    expect(escrituras.solicitud).toMatchObject({ estado: "APROBADA" })
  })

  it("reparte el técnico automáticamente", async () => {
    const escrituras = montarTransaccion({
      tecnicos: [{ id: "tec-1", nombre: "Ana", email: "ana@mantenpro.example" }],
    })

    await POST(peticion(CUERPO))

    expect(escrituras.mantenimiento).toMatchObject({ tecnicoId: "tec-1" })
  })

  it("el equipo pasa a mantenimiento cuando hay técnico", async () => {
    const escrituras = montarTransaccion({
      tecnicos: [{ id: "tec-1", nombre: "Ana", email: "ana@mantenpro.example" }],
    })

    await POST(peticion(CUERPO))

    expect(escrituras.equipoSincronizado).toEqual(["EN_MANTENIMIENTO"])
  })

  it("firma el historial con quien provoca la creación, no con el técnico", async () => {
    const escrituras = montarTransaccion({
      tecnicos: [{ id: "tec-1", nombre: "Ana", email: "ana@mantenpro.example" }],
    })

    await POST(peticion(CUERPO))

    expect(escrituras.historial).toMatchObject({ tecnicoId: "cli-1" })
  })
})

describe("cuando la empresa no tiene técnicos", () => {
  it("la solicitud y el mantenimiento se crean igualmente", async () => {
    const escrituras = montarTransaccion({ tecnicos: [] })

    const respuesta = await POST(peticion(CUERPO))

    expect(respuesta.status).toBe(201)
    expect(escrituras.solicitud).toBeDefined()
    expect(escrituras.mantenimiento).toMatchObject({ tecnicoId: null })
  })

  it("el equipo NO cambia de estado", async () => {
    const escrituras = montarTransaccion({ tecnicos: [] })

    await POST(peticion(CUERPO))

    expect(escrituras.equipoSincronizado).toEqual([])
  })

  it("el historial deja constancia de que espera técnico", async () => {
    const escrituras = montarTransaccion({ tecnicos: [] })

    await POST(peticion(CUERPO))

    expect(escrituras.historial?.observaciones).toContain("a la espera de técnico")
  })

  it("el cliente recibe el aviso de que aún no hay técnico", async () => {
    montarTransaccion({ tecnicos: [] })

    const respuesta = await POST(peticion(CUERPO))
    const cuerpo = await respuesta.json()

    expect(cuerpo.avisoSinTecnico).toMatch(/técnico/i)
  })

  it("con técnico no se emite ningún aviso", async () => {
    montarTransaccion({
      tecnicos: [{ id: "tec-1", nombre: "Ana", email: "ana@mantenpro.example" }],
    })

    const respuesta = await POST(peticion(CUERPO))
    const cuerpo = await respuesta.json()

    expect(cuerpo.avisoSinTecnico).toBeNull()
  })
})

describe("la fecha programada", () => {
  /** Comienzo del día que cae a `dias` vista. */
  function diaObjetivo(dias: number): Date {
    const d = new Date()
    d.setDate(d.getDate() + dias)
    d.setHours(0, 0, 0, 0)
    return d
  }

  it("usa los días de adelanto configurados", async () => {
    const escrituras = montarTransaccion({ tecnicos: [], diasProgramacion: 2 })

    await POST(peticion(CUERPO))

    expect(escrituras.mantenimiento?.fechaProgramada).toEqual(diaObjetivo(2))
  })

  it("cae en el valor por defecto cuando no hay configuración guardada", async () => {
    const escrituras = montarTransaccion({ tecnicos: [], diasProgramacion: null })

    await POST(peticion(CUERPO))

    expect(escrituras.mantenimiento?.fechaProgramada).toEqual(diaObjetivo(3))
  })

  it("nunca nace vencida: la fecha es posterior al día en curso", async () => {
    const escrituras = montarTransaccion({ tecnicos: [], diasProgramacion: 1 })

    await POST(peticion(CUERPO))

    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    expect(
      (escrituras.mantenimiento?.fechaProgramada as Date).getTime()
    ).toBeGreaterThan(hoy.getTime())
  })
})
