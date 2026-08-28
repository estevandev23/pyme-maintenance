import { prisma } from "@/lib/prisma"
import {
  seleccionarTecnico,
  type CandidatoTecnico,
} from "@/lib/asignacion-tecnicos"

/**
 * Cliente Prisma o transacción. Las funciones de este módulo se usan tanto
 * dentro de `$transaction` como fuera de ella.
 */
export type PrismaEjecutor = Pick<typeof prisma, "user" | "mantenimiento">

/** Estados que cuentan como carga abierta de un técnico. */
export const ESTADOS_ABIERTOS = ["PROGRAMADO", "EN_PROCESO"] as const

/**
 * Error de asignación con un mensaje pensado para llegar tal cual al
 * administrador. Se lanza desde dentro de la transacción para abortarla.
 */
export class AsignacionError extends Error {
  readonly status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = "AsignacionError"
    this.status = status
  }
}

export interface TecnicoConCarga extends CandidatoTecnico {
  id: string
  nombre: string
  email: string
  empresaId: string | null
}

/**
 * Devuelve la carga abierta e histórica de cada técnico indicado. Una sola
 * consulta agrupada; los técnicos sin ningún mantenimiento salen en cero.
 */
export async function obtenerCargaPorTecnico(
  db: PrismaEjecutor,
  tecnicoIds: string[]
): Promise<Map<string, { cargaAbierta: number; cargaHistorica: number }>> {
  const carga = new Map<string, { cargaAbierta: number; cargaHistorica: number }>()

  for (const id of tecnicoIds) {
    carga.set(id, { cargaAbierta: 0, cargaHistorica: 0 })
  }

  if (tecnicoIds.length === 0) return carga

  const grupos = await db.mantenimiento.groupBy({
    by: ["tecnicoId", "estado"],
    where: { tecnicoId: { in: tecnicoIds } },
    _count: { _all: true },
  })

  for (const grupo of grupos) {
    const contadores = carga.get(grupo.tecnicoId)
    if (!contadores) continue

    const total = grupo._count._all
    contadores.cargaHistorica += total

    if ((ESTADOS_ABIERTOS as readonly string[]).includes(grupo.estado)) {
      contadores.cargaAbierta += total
    }
  }

  return carga
}

/**
 * Candidatos a recibir un mantenimiento: técnicos activos de la empresa dueña
 * del equipo, con sus contadores de carga ya resueltos.
 */
export async function obtenerCandidatos(
  db: PrismaEjecutor,
  empresaId: string
): Promise<TecnicoConCarga[]> {
  const tecnicos = await db.user.findMany({
    where: { role: "TECNICO", activo: true, empresaId },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, email: true, empresaId: true },
  })

  const carga = await obtenerCargaPorTecnico(
    db,
    tecnicos.map((tecnico) => tecnico.id)
  )

  return tecnicos.map((tecnico) => ({
    ...tecnico,
    ...carga.get(tecnico.id)!,
  }))
}

/**
 * Resuelve el técnico que recibe un mantenimiento nuevo cuando el
 * administrador no indicó ninguno.
 *
 * Lanza `AsignacionError` si la empresa no tiene técnicos activos.
 */
export async function asignarTecnicoAutomaticamente(
  db: PrismaEjecutor,
  empresaId: string
): Promise<TecnicoConCarga> {
  const candidatos = await obtenerCandidatos(db, empresaId)
  const elegido = seleccionarTecnico(candidatos)

  if (!elegido) {
    throw new AsignacionError(
      "La empresa del equipo no tiene técnicos activos para asignar el mantenimiento"
    )
  }

  return elegido
}

/**
 * Comprueba que un técnico indicado explícitamente cumple las condiciones de
 * candidato para la empresa del equipo.
 *
 * Lanza `AsignacionError` con el motivo concreto del rechazo.
 */
export async function validarTecnicoAsignable(
  db: PrismaEjecutor,
  tecnicoId: string,
  empresaId: string
): Promise<void> {
  const tecnico = await db.user.findUnique({
    where: { id: tecnicoId },
    select: { id: true, role: true, activo: true, empresaId: true },
  })

  if (!tecnico || tecnico.role !== "TECNICO") {
    throw new AsignacionError("Técnico no válido")
  }

  if (!tecnico.activo) {
    throw new AsignacionError("El técnico no está activo")
  }

  if (tecnico.empresaId !== empresaId) {
    throw new AsignacionError("El técnico no pertenece a la empresa del equipo")
  }
}
