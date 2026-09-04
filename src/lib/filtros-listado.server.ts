/**
 * Los filtros con los que se consulta cada listado.
 *
 * Existe para que la pantalla y la descarga pregunten exactamente lo mismo. Si
 * la ruta de descarga armara su propia consulta, el alcance por rol acabaría
 * divergiendo del de la lectura y la diferencia no se vería en pantalla: un
 * cliente exportaría de más y nadie lo notaría hasta abrir el archivo. El
 * proyecto ya tiene el precedente de una rama de API que atendía a dos roles sin
 * comprobar la propiedad y que la interfaz tapaba.
 *
 * El alcance por rol se decide aquí y no en quien llama: quien pide el archivo
 * lo determina, nunca lo que la petición diga querer.
 */

import { Prisma, type EstadoEquipo, type EstadoMantenimiento, type TipoMantenimiento } from "@prisma/client"
import { SIN_ASIGNAR } from "@/lib/tecnico-asignado"
import type { UsuarioDeSesion } from "@/lib/alcance-mantenimiento"
import type { RangoFechas } from "@/lib/estadisticas"

/** Parte una búsqueda en términos, ignorando los espacios de más. */
function terminos(search: string): string[] {
  return search.split(/\s+/).filter((t) => t.length > 0)
}

export function filtrosDeMantenimientos(
  searchParams: URLSearchParams,
  usuario: UsuarioDeSesion
): Prisma.MantenimientoWhereInput {
  const id = searchParams.get("id")
  const estado = searchParams.get("estado")
  const tipo = searchParams.get("tipo")
  const tecnicoId = searchParams.get("tecnicoId")
  const equipoId = searchParams.get("equipoId")
  const empresaId = searchParams.get("empresaId")
  const search = searchParams.get("search")

  const andFilters: Prisma.MantenimientoWhereInput[] = []

  if (id) andFilters.push({ id })
  if (estado) andFilters.push({ estado: estado as EstadoMantenimiento })
  if (tipo) andFilters.push({ tipo: tipo as TipoMantenimiento })
  // `sin-asignar` es un valor propio, no un identificador: es la única forma de
  // pedir los mantenimientos que esperan técnico, porque el parámetro siempre
  // llega como cadena y `?tecnicoId=null` filtraría por el texto literal «null»
  // y devolvería cero filas sin error.
  if (tecnicoId === SIN_ASIGNAR) {
    andFilters.push({ tecnicoId: null })
  } else if (tecnicoId) {
    andFilters.push({ tecnicoId })
  }
  if (equipoId) andFilters.push({ equipoId })

  if (search) {
    for (const term of terminos(search)) {
      andFilters.push({
        OR: [
          {
            equipo: {
              OR: [
                { tipo: { contains: term, mode: "insensitive" } },
                { marca: { contains: term, mode: "insensitive" } },
                { serial: { contains: term, mode: "insensitive" } },
                { modelo: { contains: term, mode: "insensitive" } },
              ],
            },
          },
          { descripcion: { contains: term, mode: "insensitive" } },
        ],
      })
    }
  }

  // Alcance por rol. Va después de los filtros de la petición y en su propio
  // término del AND, así que un parámetro no puede ensancharlo.
  if (usuario.role === "TECNICO") {
    andFilters.push({ tecnicoId: usuario.id })
  }

  if (usuario.role === "CLIENTE" && usuario.empresaId) {
    andFilters.push({ equipo: { empresaId: usuario.empresaId } })
  } else if (empresaId && empresaId !== "all" && usuario.role === "ADMIN") {
    andFilters.push({ equipo: { empresaId } })
  }

  return andFilters.length > 0 ? { AND: andFilters } : {}
}

export function filtrosDeEquipos(
  searchParams: URLSearchParams,
  usuario: UsuarioDeSesion
): Prisma.EquipoWhereInput {
  const id = searchParams.get("id")
  const empresaId = searchParams.get("empresaId")
  const estado = searchParams.get("estado")
  const search = searchParams.get("search")

  const andFilters: Prisma.EquipoWhereInput[] = []

  if (id) andFilters.push({ id })
  if (empresaId) andFilters.push({ empresaId })
  if (estado) andFilters.push({ estado: estado as EstadoEquipo })

  if (search) {
    for (const term of terminos(search)) {
      andFilters.push({
        OR: [
          { tipo: { contains: term, mode: "insensitive" } },
          { marca: { contains: term, mode: "insensitive" } },
          { serial: { contains: term, mode: "insensitive" } },
          { modelo: { contains: term, mode: "insensitive" } },
        ],
      })
    }
  }

  if (usuario.role === "CLIENTE" && usuario.empresaId) {
    andFilters.push({ empresaId: usuario.empresaId })
  }

  return andFilters.length > 0 ? { AND: andFilters } : {}
}

export function filtrosDeHistorial(
  searchParams: URLSearchParams,
  usuario: UsuarioDeSesion
): Prisma.HistorialWhereInput {
  const equipoId = searchParams.get("equipoId")
  const tecnicoId = searchParams.get("tecnicoId")
  const empresaId = searchParams.get("empresaId")
  const fechaDesde = searchParams.get("fechaDesde")
  const fechaHasta = searchParams.get("fechaHasta")

  const whereClause: Prisma.HistorialWhereInput = {}

  if (usuario.role === "CLIENTE" && usuario.empresaId) {
    whereClause.equipo = { empresaId: usuario.empresaId }
  } else if (usuario.role === "TECNICO") {
    whereClause.tecnicoId = usuario.id
  }

  if (equipoId) whereClause.equipoId = equipoId
  if (tecnicoId && usuario.role === "ADMIN") whereClause.tecnicoId = tecnicoId
  if (empresaId && usuario.role === "ADMIN") whereClause.equipo = { empresaId }

  // Se arma aparte porque `fecha` admite varias formas y no se le pueden ir
  // añadiendo claves una a una.
  if (fechaDesde || fechaHasta) {
    const fecha: Prisma.DateTimeFilter = {}
    if (fechaDesde) fecha.gte = new Date(fechaDesde)
    if (fechaHasta) fecha.lte = new Date(fechaHasta)
    whereClause.fecha = fecha
  }

  return whereClause
}

/**
 * Los mantenimientos cuya **fecha de referencia** cae en el rango.
 *
 * La fecha de referencia es la realizada cuando existe y la programada cuando el
 * trabajo aún no se ha hecho, que es el criterio único del informe. En SQL son
 * estas dos ramas, y las dos hacen falta: sin la segunda, un informe del periodo
 * se quedaría sin un solo pendiente, ni en curso, ni cancelado.
 *
 * Vive aquí, y no dentro de una ruta, porque lo usan por igual el listado y la
 * descarga: el periodo es un filtro de pantalla, así que lo que se ve y lo que
 * se exporta tienen que salir del mismo criterio.
 */
export function filtroPorFechaReferencia(
  rango: RangoFechas
): Prisma.MantenimientoWhereInput {
  return {
    OR: [
      { fechaRealizada: { gte: rango.desde, lte: rango.hasta } },
      {
        fechaRealizada: null,
        fechaProgramada: { gte: rango.desde, lte: rango.hasta },
      },
    ],
  }
}
