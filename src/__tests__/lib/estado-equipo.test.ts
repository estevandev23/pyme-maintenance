/**
 * @jest-environment node
 *
 * El estado del equipo era una máquina de transiciones: decidía según el estado
 * al que pasaba el mantenimiento. Eso dejaba tres huecos que este cambio abre de
 * par en par:
 *
 * 1. Asignar técnico a un mantenimiento huérfano no cambia su estado, así que
 *    el equipo se quedaba activo aunque ya hubiera alguien trabajando.
 * 2. El recuento de trabajo abierto no distinguía si había técnico, así que un
 *    huérfano dejaba atascado en mantenimiento al equipo que sí se atendió.
 * 3. La vuelta atrás escribía «activo» a ciegas, resucitando equipos inactivos
 *    o dados de baja.
 *
 * Ahora es un invariante: en mantenimiento si y solo si hay trabajo abierto con
 * técnico. Estas pruebas lo fijan con la base doblada, así que corren siempre.
 */

import { sincronizarEstadoEquipo } from "@/lib/estado-equipo.server"

type EstadoEquipo = "ACTIVO" | "INACTIVO" | "EN_MANTENIMIENTO" | "DADO_DE_BAJA"

/**
 * Doble de la transacción. `abiertosConTecnico` es lo que devolvería el
 * recuento; se guarda el `where` recibido para poder afirmar sobre él.
 */
function crearTx(estadoEquipo: EstadoEquipo | null, abiertosConTecnico: number) {
  const actualizaciones: Array<{ id: string; estado: string }> = []
  let whereDelRecuento: Record<string, unknown> = {}

  const tx = {
    mantenimiento: {
      count: async ({ where }: { where: Record<string, unknown> }) => {
        whereDelRecuento = where
        return abiertosConTecnico
      },
    },
    equipo: {
      findUnique: async () => (estadoEquipo ? { estado: estadoEquipo } : null),
      update: async ({
        where,
        data,
      }: {
        where: { id: string }
        data: { estado: string }
      }) => {
        actualizaciones.push({ id: where.id, estado: data.estado })
        return {}
      },
    },
  }

  return {
    tx: tx as never,
    actualizaciones,
    whereDelRecuento: () => whereDelRecuento,
  }
}

describe("sincronizarEstadoEquipo", () => {
  it("solo cuenta el trabajo abierto que tiene técnico", async () => {
    const { tx, whereDelRecuento } = crearTx("ACTIVO", 0)

    await sincronizarEstadoEquipo(tx, "eq-1")

    expect(whereDelRecuento()).toMatchObject({
      equipoId: "eq-1",
      estado: { in: ["PROGRAMADO", "EN_PROCESO"] },
      tecnicoId: { not: null },
    })
  })

  it("pone el equipo en mantenimiento cuando aparece trabajo con técnico", async () => {
    const { tx, actualizaciones } = crearTx("ACTIVO", 1)

    await sincronizarEstadoEquipo(tx, "eq-1")

    expect(actualizaciones).toEqual([{ id: "eq-1", estado: "EN_MANTENIMIENTO" }])
  })

  it("no repite la escritura si el equipo ya estaba en mantenimiento", async () => {
    const { tx, actualizaciones } = crearTx("EN_MANTENIMIENTO", 2)

    await sincronizarEstadoEquipo(tx, "eq-1")

    expect(actualizaciones).toEqual([])
  })

  it("devuelve el equipo a activo cuando se queda sin trabajo con técnico", async () => {
    const { tx, actualizaciones } = crearTx("EN_MANTENIMIENTO", 0)

    await sincronizarEstadoEquipo(tx, "eq-1")

    expect(actualizaciones).toEqual([{ id: "eq-1", estado: "ACTIVO" }])
  })

  it("un trabajo sin técnico no retiene al equipo", async () => {
    // El recuento ya excluye los huérfanos, así que llega a cero aunque queden
    // mantenimientos abiertos sin asignar.
    const { tx, actualizaciones } = crearTx("EN_MANTENIMIENTO", 0)

    await sincronizarEstadoEquipo(tx, "eq-1")

    expect(actualizaciones).toEqual([{ id: "eq-1", estado: "ACTIVO" }])
  })

  it("no resucita un equipo dado de baja al cerrarse su mantenimiento", async () => {
    const { tx, actualizaciones } = crearTx("DADO_DE_BAJA", 0)

    await sincronizarEstadoEquipo(tx, "eq-1")

    expect(actualizaciones).toEqual([])
  })

  it("no resucita un equipo inactivo al cerrarse su mantenimiento", async () => {
    const { tx, actualizaciones } = crearTx("INACTIVO", 0)

    await sincronizarEstadoEquipo(tx, "eq-1")

    expect(actualizaciones).toEqual([])
  })

  it("no mete en mantenimiento a un equipo dado de baja", async () => {
    const { tx, actualizaciones } = crearTx("DADO_DE_BAJA", 3)

    await sincronizarEstadoEquipo(tx, "eq-1")

    expect(actualizaciones).toEqual([])
  })

  it("no escribe nada si el equipo ya no existe", async () => {
    const { tx, actualizaciones } = crearTx(null, 0)

    await sincronizarEstadoEquipo(tx, "eq-borrado")

    expect(actualizaciones).toEqual([])
  })

  it("es idempotente: llamarla dos veces no cambia el resultado", async () => {
    const { tx, actualizaciones } = crearTx("EN_MANTENIMIENTO", 1)

    await sincronizarEstadoEquipo(tx, "eq-1")
    await sincronizarEstadoEquipo(tx, "eq-1")

    expect(actualizaciones).toEqual([])
  })
})
