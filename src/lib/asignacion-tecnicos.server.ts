import { prisma } from "@/lib/prisma"
import {
  seleccionarTecnico,
  type CandidatoTecnico,
} from "@/lib/asignacion-tecnicos"
import {
  laCancelacionDescuentaCarga,
  type AutorCancelacionConocido,
} from "@/lib/cancelacion-solicitud"
import { ESTADOS_ABIERTOS } from "@/lib/estados-mantenimiento"

/**
 * Cliente Prisma o transacción. Las funciones de este módulo se usan tanto
 * dentro de `$transaction` como fuera de ella.
 */
export type PrismaEjecutor = Pick<typeof prisma, "user" | "mantenimiento">

/** Estados que cuentan como carga abierta de un técnico: los mismos que cuentan como trabajo abierto. */
export { ESTADOS_ABIERTOS }

/**
 * Decide si un mantenimiento cuenta en la carga histórica de su técnico.
 *
 * Cuentan todos menos los que canceló otra persona: si el cliente o el
 * administrador cancelan, el técnico no llegó a hacer el trabajo y vuelve a
 * competir por el siguiente reparto en las mismas condiciones en que estaba.
 *
 * Su propia cancelación sí le cuenta, y no es un detalle: el desempate del
 * reparto elige a quienes igualan al mejor en ambos contadores y sortea entre
 * ellos, así que quien vuelve a cero es el mínimo estricto y no hay sorteo.
 * Descontar siempre convertiría cancelar el trabajo propio en la forma de
 * garantizarse el siguiente.
 */
export function cuentaComoHistorica(
  estado: string,
  canceladoPorRol: AutorCancelacionConocido | null | undefined
): boolean {
  if (estado !== "CANCELADO") return true
  return !laCancelacionDescuentaCarga(canceladoPorRol)
}

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
 *
 * La histórica excluye los mantenimientos que canceló otra persona: ver
 * `cuentaComoHistorica`.
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

  // Se agrupa también por el autor de la cancelación porque es lo que decide si
  // el mantenimiento cuenta en la histórica. El filtro se aplica al acumular y
  // no en el `where`: así la regla queda escrita junto a la de carga abierta,
  // y la consulta sigue teniendo la misma forma que la comparte `/api/usuarios`.
  const grupos = await db.mantenimiento.groupBy({
    by: ["tecnicoId", "estado", "canceladoPorRol"],
    where: { tecnicoId: { in: tecnicoIds } },
    _count: { _all: true },
  })

  for (const grupo of grupos) {
    // `tecnicoId` es opcional en el esquema, pero el `where` de arriba acota a
    // una lista de identificadores, así que aquí nunca es nulo. La guarda está
    // para que el compilador lo sepa.
    if (grupo.tecnicoId === null) continue

    const contadores = carga.get(grupo.tecnicoId)
    if (!contadores) continue

    const total = grupo._count._all

    if (cuentaComoHistorica(grupo.estado, grupo.canceladoPorRol)) {
      contadores.cargaHistorica += total
    }

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
 * Resuelve el técnico que recibe un mantenimiento nuevo, o `null` si la empresa
 * del equipo no tiene ningún candidato.
 *
 * Es la variante que usa el flujo normal: la ausencia de técnicos ya no impide
 * crear el mantenimiento, lo deja a la espera de asignación. Quien necesite que
 * la falta de candidatos sea un error tiene `asignarTecnicoAutomaticamente`.
 */
export async function intentarAsignarTecnico(
  db: PrismaEjecutor,
  empresaId: string
): Promise<TecnicoConCarga | null> {
  const candidatos = await obtenerCandidatos(db, empresaId)
  return seleccionarTecnico(candidatos)
}

/**
 * Igual que `intentarAsignarTecnico`, pero lanza `AsignacionError` si la
 * empresa no tiene técnicos activos.
 *
 * Se conserva para los caminos donde no tiene sentido seguir sin técnico.
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
