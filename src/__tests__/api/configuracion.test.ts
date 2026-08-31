/**
 * @jest-environment node
 *
 * La configuración operativa: quién puede tocarla y qué valores admite.
 *
 * El rango no es una preferencia: por debajo del mínimo el mantenimiento nace
 * vencido, y por encima del máximo no aparece en ningún aviso hasta pasados
 * varios días, porque la ventana de proximidad es de tres. Fuera de ese rango
 * el valor no es una elección del administrador, es un defecto.
 *
 * Y la lectura tiene que resolver el valor por defecto: nadie crea la fila
 * —el repositorio no tiene semilla de Prisma— así que en una instalación recién
 * puesta en marcha la tabla está vacía y la primera solicitud fallaría.
 */

import { GET, PUT } from "@/app/api/configuracion/route"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import {
  DIAS_PROGRAMACION_MAXIMO,
  DIAS_PROGRAMACION_MINIMO,
  DIAS_PROGRAMACION_POR_DEFECTO,
  obtenerConfiguracion,
} from "@/lib/configuracion.server"

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }))
jest.mock("@/lib/auth", () => ({ authOptions: {} }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    configuracion: { findUnique: jest.fn(), upsert: jest.fn() },
  },
}))

const sesion = getServerSession as jest.Mock
const buscar = prisma.configuracion.findUnique as jest.Mock
const guardar = prisma.configuracion.upsert as jest.Mock

const peticion = (cuerpo: unknown) => ({ json: async () => cuerpo }) as never

beforeEach(() => {
  jest.clearAllMocks()
  sesion.mockResolvedValue({ user: { id: "adm-1", role: "ADMIN" } })
  buscar.mockResolvedValue(null)
  jest.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => jest.restoreAllMocks())

describe("hay un valor aplicable aunque nadie haya configurado nada", () => {
  it("la lectura devuelve el valor por defecto con la tabla vacía", async () => {
    buscar.mockResolvedValue(null)

    const configuracion = await obtenerConfiguracion(prisma)

    expect(configuracion.diasProgramacion).toBe(DIAS_PROGRAMACION_POR_DEFECTO)
  })

  it("la lectura devuelve el valor guardado cuando existe", async () => {
    buscar.mockResolvedValue({ diasProgramacion: 2 })

    const configuracion = await obtenerConfiguracion(prisma)

    expect(configuracion.diasProgramacion).toBe(2)
  })

  it("el GET responde con el valor y con el rango admitido", async () => {
    const respuesta = await GET()
    const cuerpo = await respuesta.json()

    expect(respuesta.status).toBe(200)
    expect(cuerpo.diasProgramacion).toBe(DIAS_PROGRAMACION_POR_DEFECTO)
    expect(cuerpo.limites).toEqual({
      diasProgramacionMinimo: DIAS_PROGRAMACION_MINIMO,
      diasProgramacionMaximo: DIAS_PROGRAMACION_MAXIMO,
    })
  })
})

describe("solo el administrador accede", () => {
  it("un CLIENTE no puede consultarla", async () => {
    sesion.mockResolvedValue({ user: { id: "cli-1", role: "CLIENTE" } })

    expect((await GET()).status).toBe(403)
  })

  it("un CLIENTE no puede cambiarla", async () => {
    sesion.mockResolvedValue({ user: { id: "cli-1", role: "CLIENTE" } })

    const respuesta = await PUT(peticion({ diasProgramacion: 1 }))

    expect(respuesta.status).toBe(403)
    expect(guardar).not.toHaveBeenCalled()
  })

  it("un TECNICO tampoco", async () => {
    sesion.mockResolvedValue({ user: { id: "tec-1", role: "TECNICO" } })

    expect((await GET()).status).toBe(403)
    expect((await PUT(peticion({ diasProgramacion: 1 }))).status).toBe(403)
    expect(guardar).not.toHaveBeenCalled()
  })

  it("sin sesión no se pasa de la puerta", async () => {
    sesion.mockResolvedValue(null)

    expect((await GET()).status).toBe(401)
    expect((await PUT(peticion({ diasProgramacion: 1 }))).status).toBe(401)
  })
})

describe("el rango admitido", () => {
  it("acepta un valor dentro del rango", async () => {
    guardar.mockResolvedValue({ diasProgramacion: DIAS_PROGRAMACION_MINIMO })

    const respuesta = await PUT(
      peticion({ diasProgramacion: DIAS_PROGRAMACION_MINIMO })
    )

    expect(respuesta.status).toBe(200)
    expect(guardar).toHaveBeenCalled()
  })

  it("rechaza cero: el mantenimiento nacería vencido", async () => {
    const respuesta = await PUT(peticion({ diasProgramacion: 0 }))
    const cuerpo = await respuesta.json()

    expect(respuesta.status).toBe(400)
    expect(cuerpo.error).toMatch(/entre/i)
    expect(guardar).not.toHaveBeenCalled()
  })

  it("rechaza un valor por encima del máximo", async () => {
    const respuesta = await PUT(
      peticion({ diasProgramacion: DIAS_PROGRAMACION_MAXIMO + 1 })
    )

    expect(respuesta.status).toBe(400)
    expect(guardar).not.toHaveBeenCalled()
  })

  it("rechaza treinta, que dejaría el mantenimiento sin avisos casi un mes", async () => {
    const respuesta = await PUT(peticion({ diasProgramacion: 30 }))

    expect(respuesta.status).toBe(400)
    expect(guardar).not.toHaveBeenCalled()
  })

  it("rechaza un valor que no es entero", async () => {
    const respuesta = await PUT(peticion({ diasProgramacion: 1.5 }))

    expect(respuesta.status).toBe(400)
    expect(guardar).not.toHaveBeenCalled()
  })

  it("el mensaje explica el rango, no dice solo «datos inválidos»", async () => {
    const respuesta = await PUT(peticion({ diasProgramacion: 99 }))
    const cuerpo = await respuesta.json()

    expect(cuerpo.error).not.toBe("Datos inválidos")
    expect(cuerpo.campos).toContain("diasProgramacion")
  })
})

describe("guardar la primera vez", () => {
  it("crea la fila si no existía", async () => {
    guardar.mockResolvedValue({ diasProgramacion: 2 })

    await PUT(peticion({ diasProgramacion: 2 }))

    const argumentos = guardar.mock.calls[0][0]
    expect(argumentos.create).toMatchObject({ diasProgramacion: 2 })
    expect(argumentos.update).toMatchObject({ diasProgramacion: 2 })
  })
})
