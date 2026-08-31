/**
 * @jest-environment node
 *
 * La rama de edición completa del mantenimiento atendía a ADMIN y CLIENTE por
 * igual, sin comprobar ni la propiedad ni la empresa: un cliente podía cambiar
 * el estado, las fechas, la descripción y el técnico de cualquier
 * mantenimiento del sistema con solo conocer su identificador. La interfaz no
 * se lo ofrecía; la API sí.
 *
 * Importa ahora porque el cambio le da al cliente una vía legítima para
 * cancelar. Si esta rama sigue abierta, la regla de cuándo puede cancelar es
 * evitable llamando a la otra ruta.
 *
 * Dobla la base de datos a propósito: es una comprobación de permisos y tiene
 * que ejecutarse siempre, no saltarse cuando no hay base alcanzable.
 */

import { PUT } from "@/app/api/mantenimientos/[id]/route"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }))
jest.mock("@/lib/auth", () => ({ authOptions: {} }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    mantenimiento: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

const sesion = getServerSession as jest.Mock
const buscar = prisma.mantenimiento.findUnique as jest.Mock
const transaccion = prisma.$transaction as jest.Mock

const peticion = (cuerpo: unknown) => ({ json: async () => cuerpo }) as never
const contexto = (id: string) => ({ params: Promise.resolve({ id }) })

const MANTENIMIENTO = {
  id: "mant-1",
  equipoId: "eq-1",
  tecnicoId: "tec-1",
  estado: "PROGRAMADO",
  tipo: "CORRECTIVO",
  descripcion: "Original",
  observaciones: null,
  reporteUrl: null,
  fechaProgramada: new Date("2026-09-02"),
  fechaRealizada: null,
  equipo: { id: "eq-1", empresaId: "em-1" },
}

beforeEach(() => {
  jest.clearAllMocks()
  buscar.mockResolvedValue(MANTENIMIENTO)
})

describe("solo el administrador edita un mantenimiento", () => {
  it("un CLIENTE no puede cambiar el estado de un mantenimiento", async () => {
    sesion.mockResolvedValue({
      user: { id: "cli-1", role: "CLIENTE", empresaId: "em-1" },
    })

    const respuesta = await PUT(
      peticion({ estado: "CANCELADO" }),
      contexto("mant-1")
    )

    expect(respuesta.status).toBe(403)
    expect(transaccion).not.toHaveBeenCalled()
  })

  it("un CLIENTE no puede reasignar el técnico ni mover las fechas", async () => {
    sesion.mockResolvedValue({
      user: { id: "cli-1", role: "CLIENTE", empresaId: "em-1" },
    })

    const respuesta = await PUT(
      peticion({
        tecnicoId: "tec-9",
        fechaProgramada: "2027-01-01",
        descripcion: "Reescrita por el cliente",
      }),
      contexto("mant-1")
    )

    expect(respuesta.status).toBe(403)
    expect(transaccion).not.toHaveBeenCalled()
  })

  it("un CLIENTE de otra empresa tampoco puede", async () => {
    sesion.mockResolvedValue({
      user: { id: "cli-9", role: "CLIENTE", empresaId: "em-OTRA" },
    })

    const respuesta = await PUT(
      peticion({ estado: "COMPLETADO" }),
      contexto("mant-1")
    )

    expect(respuesta.status).toBe(403)
    expect(transaccion).not.toHaveBeenCalled()
  })

  it("un TECNICO ajeno al mantenimiento sigue recibiendo una negativa", async () => {
    sesion.mockResolvedValue({
      user: { id: "tec-OTRO", role: "TECNICO", empresaId: "em-1" },
    })

    const respuesta = await PUT(
      peticion({ estado: "EN_PROCESO" }),
      contexto("mant-1")
    )

    expect(respuesta.status).toBe(403)
    expect(transaccion).not.toHaveBeenCalled()
  })

  it("el ADMIN sí llega a la edición completa", async () => {
    sesion.mockResolvedValue({ user: { id: "adm-1", role: "ADMIN" } })
    transaccion.mockResolvedValue({ ...MANTENIMIENTO, descripcion: "Editada" })

    const respuesta = await PUT(
      peticion({ descripcion: "Editada" }),
      contexto("mant-1")
    )

    expect(respuesta.status).toBe(200)
    expect(transaccion).toHaveBeenCalledTimes(1)
  })

  it("sin sesión no se pasa de la puerta", async () => {
    sesion.mockResolvedValue(null)

    const respuesta = await PUT(
      peticion({ estado: "CANCELADO" }),
      contexto("mant-1")
    )

    expect(respuesta.status).toBe(401)
  })
})
