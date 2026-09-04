/**
 * @jest-environment node
 *
 * La vía acotada del técnico, ampliada al tipo del mantenimiento.
 *
 * Lo que estas pruebas sostienen y no se ve mirando la pantalla:
 *
 * 1. Reclasificar solo se admite mientras el mantenimiento sigue abierto, y la
 *    condición se mide sobre el estado ANTERIOR. De ahí que reclasificar y
 *    completar en la misma operación tenga que funcionar: es el momento en que
 *    el técnico sabe de qué tipo era el trabajo.
 * 2. El cambio de tipo deja su propio asiento, con el valor anterior. El tipo
 *    alimenta el desglose de los informes y el recuento de fallas recurrentes.
 * 3. La vía del técnico sigue sin alcanzar el técnico asignado, las fechas, la
 *    descripción ni el equipo, aunque se envíen.
 *
 * Se dobla la base para que corran siempre. No van en `integracion/`: aquellas
 * suites hacen `return` sin ejercitar nada cuando no encuentran la base y pasan
 * en verde sin haber probado nada.
 */

import { PUT } from "@/app/api/mantenimientos/[id]/route"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }))
jest.mock("@/lib/auth", () => ({ authOptions: {} }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    mantenimiento: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}))
jest.mock("@/lib/estado-equipo.server", () => ({
  sincronizarEstadoEquipo: jest.fn().mockResolvedValue(undefined),
}))

const sesion = getServerSession as jest.Mock
const buscar = prisma.mantenimiento.findUnique as jest.Mock
const transaccion = prisma.$transaction as jest.Mock

const peticion = (cuerpo: unknown) => ({ json: async () => cuerpo }) as never
const contexto = (id: string) => ({ params: Promise.resolve({ id }) })

const TECNICO = "tec-1"

const BASE = {
  id: "mant-1",
  equipoId: "eq-1",
  tecnicoId: TECNICO,
  estado: "EN_PROCESO",
  tipo: "CORRECTIVO",
  descripcion: "Original",
  observaciones: null,
  reporteUrl: null,
  fechaProgramada: new Date("2026-09-02"),
  fechaRealizada: null,
  equipo: { id: "eq-1", empresaId: "em-1" },
}

function capturarTransaccion() {
  const escrituras: {
    update?: Record<string, unknown>
    historial: string[]
  } = { historial: [] }

  transaccion.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
    const tx = {
      mantenimiento: {
        update: async ({ data }: { data: Record<string, unknown> }) => {
          escrituras.update = data
          return { ...BASE, ...data }
        },
      },
      historial: {
        create: async ({ data }: { data: { observaciones: string } }) => {
          escrituras.historial.push(data.observaciones)
          return {}
        },
      },
      equipo: { findUnique: async () => ({ estado: "ACTIVO" }), update: async () => ({}) },
    }
    return fn(tx as never)
  })

  return escrituras
}

beforeEach(() => {
  jest.clearAllMocks()
  sesion.mockResolvedValue({ user: { id: TECNICO, role: "TECNICO" } })
})

describe("el técnico reclasifica mientras el trabajo sigue abierto", () => {
  it("aplica el tipo nuevo en un mantenimiento en proceso", async () => {
    buscar.mockResolvedValue({ ...BASE, estado: "EN_PROCESO" })
    const escrituras = capturarTransaccion()

    const respuesta = await PUT(
      peticion({ estado: "EN_PROCESO", tipo: "PREVENTIVO" }),
      contexto("mant-1")
    )

    expect(respuesta.status).toBe(200)
    expect(escrituras.update).toMatchObject({ tipo: "PREVENTIVO" })
  })

  it("aplica el tipo nuevo en un mantenimiento programado", async () => {
    buscar.mockResolvedValue({ ...BASE, estado: "PROGRAMADO" })
    const escrituras = capturarTransaccion()

    await PUT(
      peticion({ estado: "PROGRAMADO", tipo: "PREVENTIVO" }),
      contexto("mant-1")
    )

    expect(escrituras.update).toMatchObject({ tipo: "PREVENTIVO" })
  })

  it("reclasifica y cierra en la misma operación", async () => {
    // El caso que obliga a mirar el estado anterior: al terminar, el estado
    // nuevo es COMPLETADO, que no admitiría reclasificación.
    buscar.mockResolvedValue({ ...BASE, estado: "EN_PROCESO" })
    const escrituras = capturarTransaccion()

    const respuesta = await PUT(
      peticion({ estado: "COMPLETADO", tipo: "PREVENTIVO" }),
      contexto("mant-1")
    )

    expect(respuesta.status).toBe(200)
    expect(escrituras.update).toMatchObject({
      estado: "COMPLETADO",
      tipo: "PREVENTIVO",
    })
  })
})

describe("un mantenimiento cerrado conserva su tipo", () => {
  it("rechaza reclasificar uno completado", async () => {
    buscar.mockResolvedValue({ ...BASE, estado: "COMPLETADO" })
    const escrituras = capturarTransaccion()

    const respuesta = await PUT(
      peticion({ estado: "COMPLETADO", tipo: "PREVENTIVO" }),
      contexto("mant-1")
    )

    expect(respuesta.status).toBe(400)
    expect(escrituras.update).toBeUndefined()
  })

  it("rechaza reclasificar uno cancelado", async () => {
    buscar.mockResolvedValue({ ...BASE, estado: "CANCELADO" })
    const escrituras = capturarTransaccion()

    const respuesta = await PUT(
      peticion({ estado: "CANCELADO", tipo: "PREVENTIVO" }),
      contexto("mant-1")
    )

    expect(respuesta.status).toBe(400)
    expect(escrituras.update).toBeUndefined()
  })

  it("explica el motivo del rechazo", async () => {
    buscar.mockResolvedValue({ ...BASE, estado: "COMPLETADO" })
    capturarTransaccion()

    const respuesta = await PUT(
      peticion({ estado: "COMPLETADO", tipo: "PREVENTIVO" }),
      contexto("mant-1")
    )
    const cuerpo = await respuesta.json()

    expect(cuerpo.error).toContain("cerrado")
  })

  it("el rechazo no guarda ningún otro campo de esa petición", async () => {
    buscar.mockResolvedValue({ ...BASE, estado: "COMPLETADO" })
    const escrituras = capturarTransaccion()

    await PUT(
      peticion({
        estado: "COMPLETADO",
        tipo: "PREVENTIVO",
        observaciones: "esto no debe quedar guardado",
      }),
      contexto("mant-1")
    )

    expect(escrituras.update).toBeUndefined()
    expect(escrituras.historial).toHaveLength(0)
  })

  it("permite cambiar las observaciones de un cerrado si no toca el tipo", async () => {
    // La restricción es sobre el tipo, no sobre el mantenimiento entero.
    buscar.mockResolvedValue({ ...BASE, estado: "COMPLETADO" })
    const escrituras = capturarTransaccion()

    const respuesta = await PUT(
      peticion({ estado: "COMPLETADO", observaciones: "nota tardía" }),
      contexto("mant-1")
    )

    expect(respuesta.status).toBe(200)
    expect(escrituras.update).toMatchObject({ observaciones: "nota tardía" })
  })

  it("reenviar el tipo que ya tiene no es reclasificar", async () => {
    buscar.mockResolvedValue({ ...BASE, estado: "COMPLETADO", tipo: "CORRECTIVO" })
    const escrituras = capturarTransaccion()

    const respuesta = await PUT(
      peticion({ estado: "COMPLETADO", tipo: "CORRECTIVO" }),
      contexto("mant-1")
    )

    expect(respuesta.status).toBe(200)
    expect(escrituras.update).not.toHaveProperty("tipo")
  })
})

describe("el cambio de tipo deja asiento", () => {
  it("registra el valor anterior y el nuevo", async () => {
    buscar.mockResolvedValue({ ...BASE, estado: "EN_PROCESO", tipo: "CORRECTIVO" })
    const escrituras = capturarTransaccion()

    await PUT(
      peticion({ estado: "EN_PROCESO", tipo: "PREVENTIVO" }),
      contexto("mant-1")
    )

    const asiento = escrituras.historial.find((h) => h.includes("Tipo"))
    expect(asiento).toContain("CORRECTIVO")
    expect(asiento).toContain("PREVENTIVO")
  })

  it("guardar el mismo tipo no genera asiento de reclasificación", async () => {
    buscar.mockResolvedValue({ ...BASE, estado: "EN_PROCESO", tipo: "CORRECTIVO" })
    const escrituras = capturarTransaccion()

    await PUT(
      peticion({ estado: "COMPLETADO", tipo: "CORRECTIVO" }),
      contexto("mant-1")
    )

    expect(escrituras.historial.filter((h) => h.includes("Tipo"))).toHaveLength(0)
  })

  it("reclasificar sin mover el estado deja igualmente su asiento", async () => {
    // El asiento del tipo no puede colgar del cambio de estado: si lo hiciera,
    // reclasificar sin cerrar no dejaría rastro.
    buscar.mockResolvedValue({ ...BASE, estado: "EN_PROCESO", tipo: "CORRECTIVO" })
    const escrituras = capturarTransaccion()

    await PUT(
      peticion({ estado: "EN_PROCESO", tipo: "PREVENTIVO" }),
      contexto("mant-1")
    )

    expect(escrituras.historial.filter((h) => h.includes("Tipo"))).toHaveLength(1)
  })
})

describe("la vía del técnico no llega más allá de lo enumerado", () => {
  it("no reasigna el mantenimiento aunque se envíe un técnico", async () => {
    buscar.mockResolvedValue({ ...BASE, estado: "EN_PROCESO" })
    const escrituras = capturarTransaccion()

    const respuesta = await PUT(
      peticion({ estado: "EN_PROCESO", tecnicoId: "otro-tecnico" }),
      contexto("mant-1")
    )

    expect(respuesta.status).toBe(200)
    expect(escrituras.update).not.toHaveProperty("tecnicoId")
  })

  it("no cambia las fechas, la descripción ni el equipo", async () => {
    buscar.mockResolvedValue({ ...BASE, estado: "EN_PROCESO" })
    const escrituras = capturarTransaccion()

    await PUT(
      peticion({
        estado: "EN_PROCESO",
        fechaProgramada: "2027-01-01",
        descripcion: "reescrita por el técnico",
        equipoId: "otro-equipo",
      }),
      contexto("mant-1")
    )

    expect(escrituras.update).not.toHaveProperty("fechaProgramada")
    expect(escrituras.update).not.toHaveProperty("descripcion")
    expect(escrituras.update).not.toHaveProperty("equipoId")
  })

  it("un técnico no toca el mantenimiento de otro", async () => {
    buscar.mockResolvedValue({ ...BASE, tecnicoId: "otro-tecnico" })
    const escrituras = capturarTransaccion()

    const respuesta = await PUT(
      peticion({ estado: "EN_PROCESO", tipo: "PREVENTIVO" }),
      contexto("mant-1")
    )

    expect(respuesta.status).toBe(403)
    expect(escrituras.update).toBeUndefined()
  })
})
