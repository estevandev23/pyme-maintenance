/**
 * Verificación del reparto sobre el camino que usa la API: consulta de
 * candidatos, cálculo de carga y elección. La base de datos se sustituye por
 * un almacén en memoria que responde como Prisma.
 */

jest.mock("@/lib/prisma", () => ({ prisma: {} }))

import {
  AsignacionError,
  asignarTecnicoAutomaticamente,
  obtenerCandidatos,
  obtenerCargaPorTecnico,
  validarTecnicoAsignable,
  type PrismaEjecutor,
} from "@/lib/asignacion-tecnicos.server"

interface UsuarioFalso {
  id: string
  nombre: string
  email: string
  role: "ADMIN" | "TECNICO" | "CLIENTE"
  activo: boolean
  empresaId: string | null
}

interface MantenimientoFalso {
  tecnicoId: string
  estado: "PROGRAMADO" | "EN_PROCESO" | "COMPLETADO" | "CANCELADO"
}

interface WhereUsuario {
  role?: UsuarioFalso["role"]
  activo?: boolean
  empresaId?: string | null
}

function crearEjecutor(usuarios: UsuarioFalso[], mantenimientos: MantenimientoFalso[]) {
  const db = {
    user: {
      findMany: async ({ where }: { where: WhereUsuario }) =>
        usuarios.filter(
          (usuario) =>
            (where.role === undefined || usuario.role === where.role) &&
            (where.activo === undefined || usuario.activo === where.activo) &&
            (where.empresaId === undefined || usuario.empresaId === where.empresaId)
        ),
      findUnique: async ({ where }: { where: { id: string } }) =>
        usuarios.find((usuario) => usuario.id === where.id) ?? null,
    },
    mantenimiento: {
      groupBy: async ({ where }: { where: { tecnicoId: { in: string[] } } }) => {
        const ids = where.tecnicoId.in
        const grupos = new Map<string, { tecnicoId: string; estado: string; _count: { _all: number } }>()

        for (const mantenimiento of mantenimientos) {
          if (!ids.includes(mantenimiento.tecnicoId)) continue
          const clave = `${mantenimiento.tecnicoId}|${mantenimiento.estado}`
          const grupo = grupos.get(clave)
          if (grupo) {
            grupo._count._all += 1
          } else {
            grupos.set(clave, {
              tecnicoId: mantenimiento.tecnicoId,
              estado: mantenimiento.estado,
              _count: { _all: 1 },
            })
          }
        }

        return [...grupos.values()]
      },
    },
  }

  return db as unknown as PrismaEjecutor
}

const tecnico = (
  id: string,
  empresaId: string | null,
  activo = true
): UsuarioFalso => ({
  id,
  nombre: `Técnico ${id}`,
  email: `${id}@empresa.test`,
  role: "TECNICO",
  activo,
  empresaId,
})

describe("obtenerCandidatos", () => {
  const usuarios = [
    tecnico("a", "empresa-1"),
    tecnico("inactivo", "empresa-1", false),
    tecnico("otra-empresa", "empresa-2"),
    { ...tecnico("admin", "empresa-1"), role: "ADMIN" as const },
  ]

  it("excluye a los inactivos, a los de otra empresa y a quien no es técnico", async () => {
    const db = crearEjecutor(usuarios, [])

    const candidatos = await obtenerCandidatos(db, "empresa-1")

    expect(candidatos.map((c) => c.id)).toEqual(["a"])
  })

  it("mantiene en el listado a los técnicos sin mantenimientos, con contadores en cero", async () => {
    const db = crearEjecutor(
      [tecnico("con-carga", "empresa-1"), tecnico("sin-carga", "empresa-1")],
      [{ tecnicoId: "con-carga", estado: "PROGRAMADO" }]
    )

    const candidatos = await obtenerCandidatos(db, "empresa-1")

    expect(candidatos).toEqual([
      expect.objectContaining({ id: "con-carga", cargaAbierta: 1, cargaHistorica: 1 }),
      expect.objectContaining({ id: "sin-carga", cargaAbierta: 0, cargaHistorica: 0 }),
    ])
  })
})

describe("obtenerCargaPorTecnico", () => {
  it("cuenta como abiertos solo PROGRAMADO y EN_PROCESO, y todo como histórico", async () => {
    const db = crearEjecutor(
      [tecnico("a", "empresa-1")],
      [
        { tecnicoId: "a", estado: "PROGRAMADO" },
        { tecnicoId: "a", estado: "EN_PROCESO" },
        { tecnicoId: "a", estado: "COMPLETADO" },
        { tecnicoId: "a", estado: "CANCELADO" },
      ]
    )

    const carga = await obtenerCargaPorTecnico(db, ["a"])

    expect(carga.get("a")).toEqual({ cargaAbierta: 2, cargaHistorica: 4 })
  })
})

describe("asignarTecnicoAutomaticamente", () => {
  it("reparte tres mantenimientos seguidos entre tres técnicos distintos", async () => {
    const usuarios = [
      tecnico("a", "empresa-1"),
      tecnico("b", "empresa-1"),
      tecnico("c", "empresa-1"),
    ]
    const mantenimientos: MantenimientoFalso[] = []
    const db = crearEjecutor(usuarios, mantenimientos)

    const asignados: string[] = []
    for (let i = 0; i < 3; i++) {
      const elegido = await asignarTecnicoAutomaticamente(db, "empresa-1")
      asignados.push(elegido.id)
      mantenimientos.push({ tecnicoId: elegido.id, estado: "PROGRAMADO" })
    }

    expect(new Set(asignados).size).toBe(3)
    expect([...asignados].sort()).toEqual(["a", "b", "c"])
  })

  it("vuelve a elegir al técnico que completó su trabajo, porque liberó carga abierta", async () => {
    const usuarios = [tecnico("a", "empresa-1"), tecnico("b", "empresa-1")]
    // A cerró dos trabajos (histórico 2, abiertos 0); B tiene uno abierto.
    const mantenimientos: MantenimientoFalso[] = [
      { tecnicoId: "a", estado: "COMPLETADO" },
      { tecnicoId: "a", estado: "COMPLETADO" },
      { tecnicoId: "b", estado: "PROGRAMADO" },
    ]
    const db = crearEjecutor(usuarios, mantenimientos)

    const elegido = await asignarTecnicoAutomaticamente(db, "empresa-1")

    expect(elegido.id).toBe("a")
    expect(elegido.cargaAbierta).toBe(0)
    expect(elegido.cargaHistorica).toBe(2)
  })

  it("rechaza la asignación cuando la empresa no tiene técnicos activos", async () => {
    const db = crearEjecutor([tecnico("a", "empresa-1", false)], [])

    await expect(asignarTecnicoAutomaticamente(db, "empresa-1")).rejects.toThrow(
      /no tiene técnicos activos/i
    )
    await expect(asignarTecnicoAutomaticamente(db, "empresa-1")).rejects.toBeInstanceOf(
      AsignacionError
    )
  })
})

describe("validarTecnicoAsignable", () => {
  const usuarios = [
    tecnico("valido", "empresa-1"),
    tecnico("inactivo", "empresa-1", false),
    tecnico("ajeno", "empresa-2"),
    { ...tecnico("cliente", "empresa-1"), role: "CLIENTE" as const },
  ]

  it("acepta a un técnico activo de la empresa del equipo", async () => {
    const db = crearEjecutor(usuarios, [])

    await expect(validarTecnicoAsignable(db, "valido", "empresa-1")).resolves.toBeUndefined()
  })

  it("rechaza a un técnico inactivo indicando el motivo", async () => {
    const db = crearEjecutor(usuarios, [])

    await expect(validarTecnicoAsignable(db, "inactivo", "empresa-1")).rejects.toThrow(
      /no está activo/i
    )
  })

  it("rechaza a un técnico de otra empresa indicando el motivo", async () => {
    const db = crearEjecutor(usuarios, [])

    await expect(validarTecnicoAsignable(db, "ajeno", "empresa-1")).rejects.toThrow(
      /no pertenece a la empresa del equipo/i
    )
  })

  it("rechaza a un usuario que no es técnico", async () => {
    const db = crearEjecutor(usuarios, [])

    await expect(validarTecnicoAsignable(db, "cliente", "empresa-1")).rejects.toThrow(
      /no válido/i
    )
  })

  it("rechaza a un usuario inexistente", async () => {
    const db = crearEjecutor(usuarios, [])

    await expect(validarTecnicoAsignable(db, "fantasma", "empresa-1")).rejects.toThrow(
      /no válido/i
    )
  })
})
