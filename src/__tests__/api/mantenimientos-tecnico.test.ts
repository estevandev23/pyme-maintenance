/**
 * @jest-environment node
 *
 * Con el técnico ya opcional, el PUT tenía dos defectos que el barrido del
 * código localizó antes de que llegaran a producción:
 *
 * 1. Consultaba siempre el técnico anterior con un `findUnique` de clave única.
 *    Al asignar técnico a un mantenimiento huérfano ese identificador es nulo:
 *    no compilaba, y forzado abortaba la transacción entera devolviendo un 500.
 * 2. No sabía retirar el técnico. Enviar el campo vacío se leía como «sin
 *    cambios» y la ruta respondía 200 sin haber tocado nada.
 *
 * Se dobla la base para que estas pruebas corran siempre.
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
jest.mock("@/lib/asignacion-tecnicos.server", () => ({
  ...jest.requireActual("@/lib/asignacion-tecnicos.server"),
  validarTecnicoAsignable: jest.fn().mockResolvedValue(undefined),
}))
jest.mock("@/lib/estado-equipo.server", () => ({
  sincronizarEstadoEquipo: jest.fn().mockResolvedValue(undefined),
}))

const { sincronizarEstadoEquipo } = jest.requireMock("@/lib/estado-equipo.server")

const sesion = getServerSession as jest.Mock
const buscar = prisma.mantenimiento.findUnique as jest.Mock
const transaccion = prisma.$transaction as jest.Mock

const peticion = (cuerpo: unknown) => ({ json: async () => cuerpo }) as never
const contexto = (id: string) => ({ params: Promise.resolve({ id }) })

const BASE = {
  id: "mant-1",
  equipoId: "eq-1",
  estado: "PROGRAMADO",
  tipo: "CORRECTIVO",
  descripcion: "Original",
  observaciones: null,
  reporteUrl: null,
  fechaProgramada: new Date("2026-09-02"),
  fechaRealizada: null,
  equipo: { id: "eq-1", empresaId: "em-1" },
}

/** Registra lo que la transacción intenta escribir, para poder afirmar sobre ello. */
function capturarTransaccion() {
  const escrituras: {
    update?: Record<string, unknown>
    historial: string[]
    usuariosConsultados: unknown[]
  } = { historial: [], usuariosConsultados: [] }

  transaccion.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
    const tx = {
      user: {
        findUnique: async ({ where }: { where: { id: unknown } }) => {
          escrituras.usuariosConsultados.push(where.id)
          return { nombre: `nombre-de-${where.id}` }
        },
      },
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
  sesion.mockResolvedValue({ user: { id: "adm-1", role: "ADMIN" } })
})

describe("asignar técnico a un mantenimiento que no lo tenía", () => {
  it("no consulta el técnico anterior cuando no hay ninguno", async () => {
    buscar.mockResolvedValue({ ...BASE, tecnicoId: null })
    const escrituras = capturarTransaccion()

    const respuesta = await PUT(peticion({ tecnicoId: "tec-nuevo" }), contexto("mant-1"))

    expect(respuesta.status).toBe(200)
    // Solo se pregunta por el técnico nuevo. Preguntar por el anterior con un
    // identificador nulo era el fallo.
    expect(escrituras.usuariosConsultados).toEqual(["tec-nuevo"])
  })

  it("guarda el técnico nuevo", async () => {
    buscar.mockResolvedValue({ ...BASE, tecnicoId: null })
    const escrituras = capturarTransaccion()

    await PUT(peticion({ tecnicoId: "tec-nuevo" }), contexto("mant-1"))

    expect(escrituras.update).toMatchObject({ tecnicoId: "tec-nuevo" })
  })

  it("deja constancia de que antes no había técnico", async () => {
    buscar.mockResolvedValue({ ...BASE, tecnicoId: null })
    const escrituras = capturarTransaccion()

    await PUT(peticion({ tecnicoId: "tec-nuevo" }), contexto("mant-1"))

    expect(escrituras.historial).toHaveLength(1)
    expect(escrituras.historial[0]).toContain("sin asignar")
    expect(escrituras.historial[0]).toContain("nombre-de-tec-nuevo")
  })

  it("recalcula el estado del equipo aunque el estado del mantenimiento no cambie", async () => {
    buscar.mockResolvedValue({ ...BASE, tecnicoId: null })
    capturarTransaccion()

    await PUT(peticion({ tecnicoId: "tec-nuevo" }), contexto("mant-1"))

    expect(sincronizarEstadoEquipo).toHaveBeenCalledWith(expect.anything(), "eq-1")
  })
})

describe("retirar el técnico de un mantenimiento", () => {
  it("guarda la retirada en lugar de responder éxito sin tocar nada", async () => {
    buscar.mockResolvedValue({ ...BASE, tecnicoId: "tec-1" })
    const escrituras = capturarTransaccion()

    const respuesta = await PUT(peticion({ tecnicoId: null }), contexto("mant-1"))

    expect(respuesta.status).toBe(200)
    expect(escrituras.update).toMatchObject({ tecnicoId: null })
  })

  it("acepta también la cadena vacía como retirada", async () => {
    buscar.mockResolvedValue({ ...BASE, tecnicoId: "tec-1" })
    const escrituras = capturarTransaccion()

    await PUT(peticion({ tecnicoId: "" }), contexto("mant-1"))

    expect(escrituras.update).toMatchObject({ tecnicoId: null })
  })

  it("deja constancia de que queda sin asignar", async () => {
    buscar.mockResolvedValue({ ...BASE, tecnicoId: "tec-1" })
    const escrituras = capturarTransaccion()

    await PUT(peticion({ tecnicoId: null }), contexto("mant-1"))

    expect(escrituras.historial[0]).toContain("nombre-de-tec-1")
    expect(escrituras.historial[0]).toContain("sin asignar")
  })

  it("recalcula el estado del equipo al retirar", async () => {
    buscar.mockResolvedValue({ ...BASE, tecnicoId: "tec-1" })
    capturarTransaccion()

    await PUT(peticion({ tecnicoId: null }), contexto("mant-1"))

    expect(sincronizarEstadoEquipo).toHaveBeenCalledWith(expect.anything(), "eq-1")
  })
})

describe("el campo ausente no habla del técnico", () => {
  it("una actualización sin el campo no lo toca ni deja historial de técnico", async () => {
    buscar.mockResolvedValue({ ...BASE, tecnicoId: "tec-1" })
    const escrituras = capturarTransaccion()

    await PUT(peticion({ descripcion: "Otra cosa" }), contexto("mant-1"))

    expect(escrituras.update).not.toHaveProperty("tecnicoId")
    expect(escrituras.historial).toEqual([])
  })

  it("reenviar el mismo técnico no es un cambio", async () => {
    buscar.mockResolvedValue({ ...BASE, tecnicoId: "tec-1" })
    const escrituras = capturarTransaccion()

    await PUT(peticion({ tecnicoId: "tec-1" }), contexto("mant-1"))

    expect(escrituras.update).not.toHaveProperty("tecnicoId")
    expect(escrituras.historial).toEqual([])
  })

  it("retirar el técnico de uno que ya no lo tiene no es un cambio", async () => {
    buscar.mockResolvedValue({ ...BASE, tecnicoId: null })
    const escrituras = capturarTransaccion()

    await PUT(peticion({ tecnicoId: null }), contexto("mant-1"))

    expect(escrituras.update).not.toHaveProperty("tecnicoId")
    expect(escrituras.historial).toEqual([])
  })
})
