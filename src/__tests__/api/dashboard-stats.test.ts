/**
 * @jest-environment node
 */
import { GET } from "@/app/api/dashboard/stats/route"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }))
jest.mock("@/lib/auth", () => ({ authOptions: {} }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    equipo: { count: jest.fn(), groupBy: jest.fn() },
    mantenimiento: { findMany: jest.fn() },
  },
}))

const sesion = getServerSession as jest.Mock
const equipoCount = prisma.equipo.count as unknown as jest.Mock
const equipoGroupBy = prisma.equipo.groupBy as unknown as jest.Mock
const mantenimientoFindMany = prisma.mantenimiento.findMany as unknown as jest.Mock

/** Petición mínima: la ruta solo lee `request.url`. */
const peticion = (query = "") =>
  ({ url: `http://localhost:3200/api/dashboard/stats${query}` }) as never

const mantenimiento = (
  tipo: string,
  estado: string,
  programada: string,
  realizada: string | null = null
) => ({
  id: `m-${programada}-${tipo}`,
  tipo,
  estado,
  fechaProgramada: new Date(programada),
  fechaRealizada: realizada ? new Date(realizada) : null,
  equipoId: "eq-1",
  equipo: {
    tipo: "Servidor",
    marca: "HP",
    modelo: "DL380",
    serial: "SRV-1",
    empresa: { nombre: "InnovaTech" },
  },
})

/** Deja los tres `findMany` del endpoint devolviendo lo que se le pase. */
function prepararDatos(enRango: unknown[] = [], anteriores: unknown[] = []) {
  mantenimientoFindMany.mockReset()
  equipoCount.mockResolvedValue(0)
  equipoGroupBy.mockResolvedValue([])
  mantenimientoFindMany
    .mockResolvedValueOnce(enRango)
    .mockResolvedValueOnce(anteriores)
    .mockResolvedValueOnce([])
}

/** El `where` con el que se pidieron los mantenimientos del periodo. */
const whereDelPeriodo = () => mantenimientoFindMany.mock.calls[0][0].where

describe("GET /api/dashboard/stats", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    sesion.mockResolvedValue({
      user: { id: "u-admin", role: "ADMIN", empresaId: null },
    })
  })

  it("rechaza al usuario sin sesión", async () => {
    sesion.mockResolvedValue(null)

    const respuesta = await GET(peticion())

    expect(respuesta.status).toBe(401)
  })

  describe("rango de fechas", () => {
    it("aplica un rango por defecto de seis meses y lo declara en la respuesta", async () => {
      prepararDatos()

      const cuerpo = await (await GET(peticion())).json()

      expect(cuerpo.rango.desde).toMatch(/^\d{4}-\d{2}-01$/)
      expect(cuerpo.mantenimientosPorMes).toHaveLength(6)
    })

    it("rechaza el rango invertido explicando el motivo", async () => {
      prepararDatos()

      const respuesta = await GET(peticion("?desde=2026-08-01&hasta=2026-07-01"))
      const cuerpo = await respuesta.json()

      expect(respuesta.status).toBe(400)
      expect(cuerpo.error).toContain("posterior")
      expect(mantenimientoFindMany).not.toHaveBeenCalled()
    })

    it("acota por fecha de referencia: realizada si existe, programada si no", async () => {
      prepararDatos()

      await GET(peticion("?desde=2026-03-01&hasta=2026-05-31"))

      expect(whereDelPeriodo().OR).toEqual([
        { fechaRealizada: { gte: expect.any(Date), lte: expect.any(Date) } },
        {
          fechaRealizada: null,
          fechaProgramada: { gte: expect.any(Date), lte: expect.any(Date) },
        },
      ])
    })
  })

  describe("desglose y totales", () => {
    it("devuelve la serie completa del rango y el total cuadra con ella", async () => {
      prepararDatos([
        // programado en marzo, realizado en abril -> cuenta en abril
        mantenimiento("PREVENTIVO", "COMPLETADO", "2026-03-20", "2026-04-04"),
        mantenimiento("CORRECTIVO", "PROGRAMADO", "2026-05-12"),
      ])

      const cuerpo = await (
        await GET(peticion("?desde=2026-03-01&hasta=2026-05-31"))
      ).json()

      expect(cuerpo.mantenimientosPorMes).toEqual([
        { mes: "2026-03", preventivo: 0, correctivo: 0, total: 0 },
        { mes: "2026-04", preventivo: 1, correctivo: 0, total: 1 },
        { mes: "2026-05", preventivo: 0, correctivo: 1, total: 1 },
      ])

      const suma = cuerpo.mantenimientosPorMes.reduce(
        (acc: number, punto: { total: number }) => acc + punto.total,
        0
      )
      expect(cuerpo.totalMantenimientos).toBe(suma)
    })

    it("presenta la desviación, que puede ser negativa si se adelantó el trabajo", async () => {
      prepararDatos([
        mantenimiento("PREVENTIVO", "COMPLETADO", "2026-04-10", "2026-04-08"),
      ])

      const cuerpo = await (
        await GET(peticion("?desde=2026-03-01&hasta=2026-05-31"))
      ).json()

      expect(cuerpo.desviacionPromedioProgramacion).toBe(-2)
    })
  })

  describe("alcance por rol", () => {
    it("un ADMIN no lleva filtro de empresa ni de técnico", async () => {
      prepararDatos()

      await GET(peticion("?desde=2026-03-01&hasta=2026-05-31"))

      expect(whereDelPeriodo().equipo).toBeUndefined()
      expect(whereDelPeriodo().tecnicoId).toBeUndefined()
    })

    it("un CLIENTE solo alcanza los equipos de su empresa", async () => {
      sesion.mockResolvedValue({
        user: { id: "u-cli", role: "CLIENTE", empresaId: "emp-1" },
      })
      prepararDatos()

      await GET(peticion("?desde=2026-03-01&hasta=2026-05-31"))

      expect(whereDelPeriodo().equipo).toEqual({ empresaId: "emp-1" })
      expect(equipoCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { empresaId: "emp-1" } })
      )
    })

    it("un TECNICO solo alcanza sus propios mantenimientos", async () => {
      sesion.mockResolvedValue({
        user: { id: "u-tec", role: "TECNICO", empresaId: "emp-1" },
      })
      prepararDatos()

      await GET(peticion("?desde=2026-03-01&hasta=2026-05-31"))

      expect(whereDelPeriodo().tecnicoId).toBe("u-tec")
    })

    // Requisito: ampliar el rango no puede ampliar el alcance de datos.
    it("ampliar el rango al histórico completo no amplía el alcance de un CLIENTE", async () => {
      sesion.mockResolvedValue({
        user: { id: "u-cli", role: "CLIENTE", empresaId: "emp-1" },
      })
      prepararDatos()

      await GET(peticion("?desde=2000-01-01&hasta=2026-12-31"))

      expect(whereDelPeriodo().equipo).toEqual({ empresaId: "emp-1" })
    })
  })
})
