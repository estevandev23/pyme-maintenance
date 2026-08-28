import {
  cambioPorcentual,
  etiquetaDesviacion,
  etiquetaRango,
  fechaReferencia,
  mesesDelRango,
  parsearRango,
  periodoAnterior,
  rangoPorDefecto,
  serieMensual,
} from "@/lib/estadisticas"

const HOY = new Date(2026, 7, 27) // 27 de agosto de 2026

describe("estadisticas", () => {
  describe("rangoPorDefecto", () => {
    it("abarca seis meses completos terminando en el mes en curso", () => {
      const rango = rangoPorDefecto(HOY)

      expect(rango.desde.getFullYear()).toBe(2026)
      expect(rango.desde.getMonth()).toBe(2) // marzo
      expect(rango.desde.getDate()).toBe(1)
      expect(rango.hasta.getMonth()).toBe(7) // agosto
      expect(rango.hasta.getDate()).toBe(31)
      expect(mesesDelRango(rango)).toHaveLength(6)
    })
  })

  describe("parsearRango", () => {
    it("aplica el rango por defecto cuando no llegan parámetros", () => {
      const resultado = parsearRango(null, null, HOY)

      expect(resultado.ok).toBe(true)
      if (resultado.ok) {
        expect(mesesDelRango(resultado.rango)).toEqual([
          "2026-03",
          "2026-04",
          "2026-05",
          "2026-06",
          "2026-07",
          "2026-08",
        ])
      }
    })

    it("rechaza un rango invertido explicando el motivo", () => {
      const resultado = parsearRango("2026-08-01", "2026-07-01", HOY)

      expect(resultado.ok).toBe(false)
      if (!resultado.ok) {
        expect(resultado.error).toContain("posterior")
      }
    })

    it("rechaza una fecha que no es una fecha", () => {
      const resultado = parsearRango("no-es-fecha", "2026-08-01", HOY)

      expect(resultado.ok).toBe(false)
    })

    // Regresión: con `new Date("2026-03-01")` el rango empezaba el 28 de
    // febrero en husos negativos y la serie ganaba un mes de más.
    it("interpreta las fechas en hora local, no en UTC", () => {
      const resultado = parsearRango("2026-03-01", "2026-05-31", HOY)

      expect(resultado.ok).toBe(true)
      if (resultado.ok) {
        expect(resultado.rango.desde.getMonth()).toBe(2) // marzo
        expect(resultado.rango.desde.getDate()).toBe(1)
        expect(mesesDelRango(resultado.rango)).toEqual([
          "2026-03",
          "2026-04",
          "2026-05",
        ])
      }
    })

    it("acepta un rango válido y lo normaliza a día completo", () => {
      const resultado = parsearRango("2026-05-10", "2026-06-20", HOY)

      expect(resultado.ok).toBe(true)
      if (resultado.ok) {
        expect(resultado.rango.desde.getHours()).toBe(0)
        expect(resultado.rango.hasta.getHours()).toBe(23)
      }
    })
  })

  describe("fechaReferencia", () => {
    it("usa la fecha realizada cuando existe", () => {
      const referencia = fechaReferencia({
        fechaProgramada: new Date(2026, 2, 10),
        fechaRealizada: new Date(2026, 3, 5),
      })

      expect(referencia.getMonth()).toBe(3) // abril
    })

    it("usa la programada cuando el trabajo sigue pendiente", () => {
      const referencia = fechaReferencia({
        fechaProgramada: new Date(2026, 4, 10),
        fechaRealizada: null,
      })

      expect(referencia.getMonth()).toBe(4) // mayo
    })
  })

  describe("serieMensual", () => {
    const rango = {
      desde: new Date(2026, 2, 1, 0, 0, 0, 0),
      hasta: new Date(2026, 4, 31, 23, 59, 59, 999),
    }

    it("cuenta el trabajo realizado en el mes en que se realizó, no en el programado", () => {
      const serie = serieMensual(rango, [
        {
          tipo: "PREVENTIVO",
          fechaProgramada: new Date(2026, 2, 20),
          fechaRealizada: new Date(2026, 3, 4),
        },
      ])

      expect(serie.find((p) => p.mes === "2026-03")?.total).toBe(0)
      expect(serie.find((p) => p.mes === "2026-04")?.total).toBe(1)
    })

    it("cuenta el trabajo pendiente en el mes en que está programado", () => {
      const serie = serieMensual(rango, [
        {
          tipo: "CORRECTIVO",
          fechaProgramada: new Date(2026, 4, 12),
          fechaRealizada: null,
        },
      ])

      expect(serie.find((p) => p.mes === "2026-05")?.total).toBe(1)
    })

    it("incluye los meses sin actividad con valor cero", () => {
      const serie = serieMensual(rango, [
        {
          tipo: "PREVENTIVO",
          fechaProgramada: new Date(2026, 2, 5),
          fechaRealizada: null,
        },
      ])

      expect(serie.map((p) => p.mes)).toEqual(["2026-03", "2026-04", "2026-05"])
      expect(serie.find((p) => p.mes === "2026-04")?.total).toBe(0)
      expect(serie.find((p) => p.mes === "2026-05")?.total).toBe(0)
    })

    it("separa preventivos de correctivos y el total es su suma", () => {
      const serie = serieMensual(rango, [
        { tipo: "PREVENTIVO", fechaProgramada: new Date(2026, 3, 2), fechaRealizada: null },
        { tipo: "PREVENTIVO", fechaProgramada: new Date(2026, 3, 9), fechaRealizada: null },
        { tipo: "CORRECTIVO", fechaProgramada: new Date(2026, 3, 15), fechaRealizada: null },
      ])

      const abril = serie.find((p) => p.mes === "2026-04")
      expect(abril?.preventivo).toBe(2)
      expect(abril?.correctivo).toBe(1)
      expect(abril?.total).toBe(3)
    })

    it("el total del periodo coincide con la suma de los meses", () => {
      const mantenimientos = [
        { tipo: "PREVENTIVO", fechaProgramada: new Date(2026, 2, 2), fechaRealizada: null },
        { tipo: "CORRECTIVO", fechaProgramada: new Date(2026, 3, 2), fechaRealizada: null },
        { tipo: "CORRECTIVO", fechaProgramada: new Date(2026, 4, 2), fechaRealizada: null },
      ]

      const serie = serieMensual(rango, mantenimientos)
      const suma = serie.reduce((acc, punto) => acc + punto.total, 0)

      expect(suma).toBe(mantenimientos.length)
    })
  })

  describe("periodoAnterior", () => {
    it("es de la misma duración y termina justo antes del rango", () => {
      const rango = {
        desde: new Date(2026, 6, 1, 0, 0, 0, 0),
        hasta: new Date(2026, 6, 31, 23, 59, 59, 999),
      }

      const anterior = periodoAnterior(rango)

      expect(anterior.hasta.getTime()).toBe(rango.desde.getTime() - 1)
      expect(anterior.hasta.getTime() - anterior.desde.getTime()).toBe(
        rango.hasta.getTime() - rango.desde.getTime()
      )
    })
  })

  describe("cambioPorcentual", () => {
    it("calcula la variación cuando hay periodo anterior", () => {
      expect(cambioPorcentual(15, 10)).toBe(50)
      expect(cambioPorcentual(5, 10)).toBe(-50)
    })

    it("evita dividir por cero", () => {
      expect(cambioPorcentual(4, 0)).toBe(100)
      expect(cambioPorcentual(0, 0)).toBe(0)
    })
  })

  describe("etiquetaDesviacion", () => {
    it("presenta el valor negativo como adelanto, no como tiempo negativo", () => {
      expect(etiquetaDesviacion(-2.5)).toBe("2.5 días de adelanto")
    })

    it("presenta el valor positivo como retraso", () => {
      expect(etiquetaDesviacion(3)).toBe("3 días de retraso")
    })

    it("no habla de resolución de tickets", () => {
      expect(etiquetaDesviacion(0)).toBe("En la fecha programada")
      expect(etiquetaDesviacion(4)).not.toMatch(/resoluci/i)
    })
  })

  describe("etiquetaRango", () => {
    it("deja el periodo legible fuera de la aplicación", () => {
      expect(etiquetaRango({ desde: "2026-03-01", hasta: "2026-08-31" })).toBe(
        "2026-03-01 a 2026-08-31"
      )
    })
  })
})
