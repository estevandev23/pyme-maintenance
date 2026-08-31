/**
 * @jest-environment node
 *
 * El guard de pertenencia del alta de solicitudes era
 * `if (session.user.empresaId && equipo.empresaId !== session.user.empresaId)`.
 * Un cliente sin empresa asignada lo esquivaba entero, porque la primera mitad
 * de la condición era falsa.
 *
 * Mientras una solicitud era solo una fila de texto, el daño se limitaba a que
 * el administrador la descartase. Con la creación automática, ese mismo alta
 * crea un mantenimiento real sobre el equipo de otra empresa y dispara el
 * reparto entre los técnicos de esa empresa.
 *
 * Dobla la base a propósito: es una comprobación de permisos y tiene que
 * ejecutarse siempre.
 */

import { POST } from "@/app/api/solicitudes/route"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }))
jest.mock("@/lib/auth", () => ({ authOptions: {} }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    equipo: { findUnique: jest.fn() },
    solicitudServicio: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}))

const sesion = getServerSession as jest.Mock
const buscarEquipo = prisma.equipo.findUnique as jest.Mock
const crearSolicitud = prisma.solicitudServicio.create as jest.Mock
const transaccion = prisma.$transaction as jest.Mock

const peticion = (cuerpo: unknown) => ({ json: async () => cuerpo }) as never

const CUERPO_VALIDO = {
  equipoId: "eq-ajeno",
  descripcion: "El equipo no enciende y hace un ruido raro",
  prioridad: "ALTA",
}

beforeEach(() => {
  jest.clearAllMocks()
  buscarEquipo.mockResolvedValue({ id: "eq-ajeno", empresaId: "em-AJENA" })
})

/** Nada se ha creado por ninguna de las dos vías posibles. */
function noSeCreoNada() {
  expect(crearSolicitud).not.toHaveBeenCalled()
  expect(transaccion).not.toHaveBeenCalled()
}

describe("una solicitud solo alcanza a los equipos de la empresa del cliente", () => {
  it("un cliente SIN empresa asignada no puede solicitar sobre ningún equipo", async () => {
    sesion.mockResolvedValue({
      user: { id: "cli-sin-empresa", role: "CLIENTE", empresaId: null },
    })

    const respuesta = await POST(peticion(CUERPO_VALIDO))

    expect(respuesta.status).toBe(403)
    noSeCreoNada()
  })

  it("el mensaje explica que le falta empresa, en lugar de un permiso genérico", async () => {
    sesion.mockResolvedValue({
      user: { id: "cli-sin-empresa", role: "CLIENTE", empresaId: undefined },
    })

    const respuesta = await POST(peticion(CUERPO_VALIDO))
    const cuerpo = await respuesta.json()

    expect(respuesta.status).toBe(403)
    expect(cuerpo.error).toMatch(/empresa/i)
  })

  it("un cliente con empresa no puede solicitar sobre un equipo de otra", async () => {
    sesion.mockResolvedValue({
      user: { id: "cli-1", role: "CLIENTE", empresaId: "em-PROPIA" },
    })

    const respuesta = await POST(peticion(CUERPO_VALIDO))

    expect(respuesta.status).toBe(403)
    noSeCreoNada()
  })

  it("quien no es cliente no crea solicitudes", async () => {
    sesion.mockResolvedValue({
      user: { id: "adm-1", role: "ADMIN", empresaId: null },
    })

    const respuesta = await POST(peticion(CUERPO_VALIDO))

    expect(respuesta.status).toBe(403)
    noSeCreoNada()
  })

  it("sin sesión no se pasa de la puerta", async () => {
    sesion.mockResolvedValue(null)

    const respuesta = await POST(peticion(CUERPO_VALIDO))

    expect(respuesta.status).toBe(401)
    noSeCreoNada()
  })
})
