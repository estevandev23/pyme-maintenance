/**
 * @jest-environment node
 *
 * Dos comportamientos de la ruta de avisos:
 *
 * 1. El retraso se mide por día natural. Antes se comparaba contra el instante
 *    actual, así que un mantenimiento programado para hoy salía como «atrasado
 *    por 0 día(s)» en rojo y con prioridad alta en cuanto pasaba un segundo,
 *    mientras el listado —que sí compara por días— lo pintaba como «programado
 *    para hoy». Con la creación automática eso pasaba de ser un caso raro a ser
 *    el normal.
 *
 * 2. Los mantenimientos sin técnico se avisan aparte, y solo al administrador:
 *    es el único que puede resolverlo.
 */

import { GET } from "@/app/api/alertas/route"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { comienzoDelDia } from "@/lib/dias-naturales"

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }))
jest.mock("@/lib/auth", () => ({ authOptions: {} }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    mantenimiento: { findMany: jest.fn() },
    equipo: { findMany: jest.fn() },
  },
}))

const sesion = getServerSession as jest.Mock
const buscarMantenimientos = prisma.mantenimiento.findMany as jest.Mock
const buscarEquipos = prisma.equipo.findMany as jest.Mock

const peticion = () => ({ url: "http://localhost:3200/api/alertas" }) as never

const equipoDe = (tipo: string) => ({
  tipo,
  marca: "Lenovo",
  modelo: "M-1",
  serial: "SN-1",
  empresa: { nombre: "TechSolutions" },
})

/**
 * Registra los `where` con que se consulta cada categoría, en el orden en que
 * la ruta las pide: próximos, atrasados y —solo para el ADMIN— sin técnico.
 */
function montarConsultas(resultados: {
  proximos?: unknown[]
  atrasados?: unknown[]
  sinTecnico?: unknown[]
}) {
  const wheres: Array<Record<string, unknown>> = []
  const respuestas = [
    resultados.proximos ?? [],
    resultados.atrasados ?? [],
    resultados.sinTecnico ?? [],
  ]
  let llamada = 0

  buscarMantenimientos.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
    wheres.push(where)
    return respuestas[llamada++] ?? []
  })
  buscarEquipos.mockResolvedValue([])

  return wheres
}

beforeEach(() => {
  jest.clearAllMocks()
  sesion.mockResolvedValue({ user: { id: "adm-1", role: "ADMIN", empresaId: null } })
})

describe("el retraso se mide por día natural", () => {
  it("la frontera de atrasado es el comienzo de hoy, no el instante actual", async () => {
    const wheres = montarConsultas({})

    await GET(peticion())

    const whereAtrasados = wheres[1]
    const frontera = (whereAtrasados.fechaProgramada as { lt: Date }).lt

    expect(frontera).toEqual(comienzoDelDia(new Date()))
    expect(frontera.getHours()).toBe(0)
    expect(frontera.getMinutes()).toBe(0)
  })

  it("la ventana de próximos empieza en el comienzo de hoy", async () => {
    const wheres = montarConsultas({})

    await GET(peticion())

    const rango = wheres[0].fechaProgramada as { gte: Date; lte: Date }

    expect(rango.gte).toEqual(comienzoDelDia(new Date()))
    // Y termina al final del último día, no a la hora actual de ese día.
    expect(rango.lte.getHours()).toBe(23)
  })

  it("un mantenimiento de hoy sale como próximo de cero días, no como atrasado", async () => {
    const hoy = comienzoDelDia(new Date())
    montarConsultas({
      proximos: [
        { id: "m-1", tipo: "CORRECTIVO", fechaProgramada: hoy, equipo: equipoDe("Servidor") },
      ],
    })

    const respuesta = await GET(peticion())
    const cuerpo = await respuesta.json()

    const alerta = cuerpo.alertas.find((a: { id: string }) => a.id === "proximo-m-1")
    expect(alerta.tipo).toBe("PROXIMO")
    expect(alerta.mensaje).toContain("para hoy")
    expect(cuerpo.contadores.atrasados).toBe(0)
  })

  it("un mantenimiento de ayer sale atrasado por un día", async () => {
    const ayer = comienzoDelDia(new Date())
    ayer.setDate(ayer.getDate() - 1)
    montarConsultas({
      atrasados: [
        { id: "m-2", tipo: "CORRECTIVO", fechaProgramada: ayer, equipo: equipoDe("Router") },
      ],
    })

    const respuesta = await GET(peticion())
    const cuerpo = await respuesta.json()

    const alerta = cuerpo.alertas.find((a: { id: string }) => a.id === "atrasado-m-2")
    expect(alerta.mensaje).toContain("1 día(s)")
    // El mensaje "atrasado por 0 día(s)" era el síntoma del criterio viejo.
    expect(alerta.mensaje).not.toContain("0 día(s)")
  })
})

describe("la categoría de mantenimientos sin técnico", () => {
  const huerfano = {
    id: "m-huerfano",
    tipo: "CORRECTIVO",
    fechaProgramada: new Date("2026-09-02"),
    equipo: equipoDe("Impresora"),
  }

  it("el administrador la recibe, con su recuento", async () => {
    montarConsultas({ sinTecnico: [huerfano] })

    const respuesta = await GET(peticion())
    const cuerpo = await respuesta.json()

    const alerta = cuerpo.alertas.find((a: { id: string }) => a.id === "sin-tecnico-m-huerfano")
    expect(alerta).toBeDefined()
    expect(alerta.tipo).toBe("SIN_TECNICO")
    expect(cuerpo.contadores.sinTecnico).toBe(1)
  })

  it("se consulta solo el trabajo abierto sin técnico", async () => {
    const wheres = montarConsultas({ sinTecnico: [huerfano] })

    await GET(peticion())

    expect(wheres[2]).toMatchObject({
      tecnicoId: null,
      estado: { in: ["PROGRAMADO", "EN_PROCESO"] },
    })
  })

  it("suma al total de avisos", async () => {
    montarConsultas({ sinTecnico: [huerfano] })

    const respuesta = await GET(peticion())
    const cuerpo = await respuesta.json()

    expect(cuerpo.contadores.total).toBe(cuerpo.alertas.length)
    expect(cuerpo.contadores.total).toBeGreaterThan(0)
  })

  it("al CLIENTE no se le presenta como incidencia suya", async () => {
    sesion.mockResolvedValue({
      user: { id: "cli-1", role: "CLIENTE", empresaId: "em-1" },
    })
    montarConsultas({})

    const respuesta = await GET(peticion())
    const cuerpo = await respuesta.json()

    expect(cuerpo.contadores.sinTecnico).toBe(0)
    expect(
      cuerpo.alertas.some((a: { tipo: string }) => a.tipo === "SIN_TECNICO")
    ).toBe(false)
  })

  it("al TECNICO tampoco: no es trabajo suyo", async () => {
    sesion.mockResolvedValue({
      user: { id: "tec-1", role: "TECNICO", empresaId: "em-1" },
    })
    montarConsultas({})

    const respuesta = await GET(peticion())
    const cuerpo = await respuesta.json()

    expect(cuerpo.contadores.sinTecnico).toBe(0)
  })

  it("desaparece sola: sin huérfanos no hay aviso que cerrar", async () => {
    montarConsultas({ sinTecnico: [] })

    const respuesta = await GET(peticion())
    const cuerpo = await respuesta.json()

    expect(cuerpo.contadores.sinTecnico).toBe(0)
    expect(
      cuerpo.alertas.some((a: { tipo: string }) => a.tipo === "SIN_TECNICO")
    ).toBe(false)
  })
})
