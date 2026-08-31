/**
 * El motivo de cancelación es obligatorio, y la forma de exigirlo importa.
 *
 * `.partial()` sobre un objeto zod que lleva refinamientos lanza una excepción,
 * y los esquemas derivados son constantes de nivel superior: el error saltaría
 * al EVALUAR EL MÓDULO, no al validar. Caerían sus tres importadores con valor
 * —las dos rutas de mantenimientos, en todos sus verbos, y el formulario— con
 * un error en cada petición.
 *
 * La primera prueba es la que protege de eso: si alguien mueve el refinamiento
 * al esquema base, el `import` de arriba revienta y la suite entera de este
 * archivo falla.
 */

import {
  mantenimientoSchema,
  updateMantenimientoSchema,
  cambiarEstadoSchema,
  MOTIVO_CANCELACION_REQUERIDO,
} from "@/lib/validations/mantenimiento"

describe("el módulo de validación se puede importar", () => {
  it("los tres esquemas existen y son usables", () => {
    // Si el refinamiento estuviera sobre el esquema base, no se llegaría aquí.
    expect(mantenimientoSchema).toBeDefined()
    expect(updateMantenimientoSchema).toBeDefined()
    expect(cambiarEstadoSchema).toBeDefined()
  })

  it("el esquema base sigue admitiendo derivar con partial()", () => {
    // Es la operación que fallaba. Se comprueba explícitamente para que quede
    // claro que el esquema base no puede llevar refinamientos.
    expect(() => mantenimientoSchema.partial()).not.toThrow()
  })
})

describe("updateMantenimientoSchema exige el motivo al cancelar", () => {
  it("rechaza cancelar sin motivo", () => {
    const resultado = updateMantenimientoSchema.safeParse({ estado: "CANCELADO" })

    expect(resultado.success).toBe(false)
    if (!resultado.success) {
      expect(resultado.error.issues[0].message).toBe(MOTIVO_CANCELACION_REQUERIDO)
      expect(resultado.error.issues[0].path).toEqual(["motivoCancelacion"])
    }
  })

  it("rechaza un motivo en blanco", () => {
    const resultado = updateMantenimientoSchema.safeParse({
      estado: "CANCELADO",
      motivoCancelacion: "   ",
    })

    expect(resultado.success).toBe(false)
  })

  it("acepta cancelar con motivo", () => {
    const resultado = updateMantenimientoSchema.safeParse({
      estado: "CANCELADO",
      motivoCancelacion: "El equipo se reemplazó",
    })

    expect(resultado.success).toBe(true)
  })

  it("no exige motivo para los demás estados", () => {
    for (const estado of ["PROGRAMADO", "EN_PROCESO", "COMPLETADO"]) {
      expect(updateMantenimientoSchema.safeParse({ estado }).success).toBe(true)
    }
  })

  it("sigue siendo parcial: una actualización sin estado es válida", () => {
    const resultado = updateMantenimientoSchema.safeParse({
      descripcion: "Otra descripción",
    })

    expect(resultado.success).toBe(true)
  })
})

describe("cambiarEstadoSchema exige lo mismo al técnico", () => {
  it("rechaza cancelar sin motivo", () => {
    const resultado = cambiarEstadoSchema.safeParse({ estado: "CANCELADO" })

    expect(resultado.success).toBe(false)
    if (!resultado.success) {
      expect(resultado.error.issues[0].message).toBe(MOTIVO_CANCELACION_REQUERIDO)
    }
  })

  it("acepta cancelar con motivo", () => {
    const resultado = cambiarEstadoSchema.safeParse({
      estado: "CANCELADO",
      motivoCancelacion: "El cliente resolvió el problema por su cuenta",
    })

    expect(resultado.success).toBe(true)
  })

  it("las observaciones vacías siguen siendo válidas para los demás estados", () => {
    const resultado = cambiarEstadoSchema.safeParse({
      estado: "EN_PROCESO",
      observaciones: null,
    })

    expect(resultado.success).toBe(true)
  })
})
