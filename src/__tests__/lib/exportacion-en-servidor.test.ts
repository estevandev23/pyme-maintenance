/**
 * @jest-environment node
 *
 * El armado de los documentos tiene que correr en el servidor.
 *
 * Este entorno no define `window` ni `document`, así que si alguna de las ocho
 * funciones de armado tocara el navegador, aquí lanzaría. Es lo que sostiene que
 * la exportación pueda generarse donde están todos los datos y no solo con la
 * página que la pantalla tenía cargada.
 *
 * Las funciones de entrega —`export*`— sí dependen del navegador y no se
 * ejercitan aquí a propósito.
 */

import {
  construirEquiposExcel,
  construirMantenimientosExcel,
  construirHistorialExcel,
  construirEstadisticasExcel,
} from "@/lib/excel-export"
import {
  construirEquiposPDF,
  construirMantenimientosPDF,
  construirHistorialPDF,
  construirEstadisticasPDF,
} from "@/lib/pdf-export"
import type { EstadisticasInforme } from "@/lib/estadisticas"

const EQUIPOS = [
  {
    tipo: "Laptop",
    marca: "HP",
    modelo: "Modelo-9373",
    serial: "SN-900123",
    estado: "ACTIVO",
    ubicacion: "Piso 2",
    empresa: "TechSolutions S.A.S",
  },
]

const MANTENIMIENTOS = [
  {
    tipo: "PREVENTIVO",
    estado: "COMPLETADO",
    equipo: "Laptop - HP",
    empresa: "TechSolutions S.A.S",
    tecnico: "Pedro Ramírez",
    fechaProgramada: "01/09/2026",
    fechaRealizada: "02/09/2026",
    descripcion: "Limpieza",
    observaciones: null,
  },
]

const HISTORIAL = [
  {
    fecha: "01/09/2026 10:00",
    equipo: "Laptop - HP",
    tipoMantenimiento: "PREVENTIVO",
    tecnico: "Pedro Ramírez",
    observaciones: "Se limpió el ventilador",
  },
]

const ESTADISTICAS: EstadisticasInforme = {
  rango: { desde: "2026-04-01", hasta: "2026-09-30" },
  totalEquipos: 43,
  equiposPorEstado: { ACTIVO: 20, EN_MANTENIMIENTO: 23 },
  equiposCriticos: 23,
  totalMantenimientos: 52,
  mantenimientosPorEstado: { COMPLETADO: 36, PROGRAMADO: 12, EN_PROCESO: 4 },
  mantenimientosPorTipo: { PREVENTIVO: 29, CORRECTIVO: 23 },
  completadosPeriodo: 36,
  cambioCompletados: 620,
  mantenimientosPendientes: 16,
  cambioPendientes: 100,
  desviacionPromedioProgramacion: 0.4,
  fallasRecurrentes: [
    {
      equipoId: "eq-1",
      cantidadFallas: 4,
      equipo: {
        tipo: "Impresora",
        marca: "Cisco",
        modelo: "Modelo-4423",
        serial: "SN-900234",
        empresa: "InnovaTech Ltda",
      },
    },
  ],
  mantenimientosPorMes: [
    { mes: "2026-04", preventivo: 4, correctivo: 2, total: 6 },
    { mes: "2026-05", preventivo: 6, correctivo: 4, total: 10 },
  ],
  proximosMantenimientos: [],
}

it("el entorno de esta suite no tiene navegador", () => {
  // Si esto dejara de ser cierto, el resto de la suite no probaría nada.
  expect(typeof window).toBe("undefined")
  expect(typeof document).toBe("undefined")
})

describe("los libros de Excel se arman en el servidor", () => {
  it("equipos", () => {
    const wb = construirEquiposExcel(EQUIPOS)
    expect(wb.SheetNames).toContain("Equipos")
  })

  it("mantenimientos", () => {
    const wb = construirMantenimientosExcel(MANTENIMIENTOS)
    expect(wb.SheetNames.length).toBeGreaterThan(0)
  })

  it("historial", () => {
    const wb = construirHistorialExcel(HISTORIAL)
    expect(wb.SheetNames.length).toBeGreaterThan(0)
  })

  it("estadísticas", () => {
    const wb = construirEstadisticasExcel(ESTADISTICAS)
    expect(wb.SheetNames.length).toBeGreaterThan(0)
  })
})

describe("los PDF se arman en el servidor", () => {
  // `output` de jsPDF está sobrecargado: se acota al retorno que interesa.
  const bytes = (doc: { output: (t: "arraybuffer") => ArrayBuffer }) =>
    doc.output("arraybuffer").byteLength

  it("equipos", () => {
    expect(bytes(construirEquiposPDF(EQUIPOS))).toBeGreaterThan(0)
  })

  it("mantenimientos", () => {
    expect(bytes(construirMantenimientosPDF(MANTENIMIENTOS))).toBeGreaterThan(0)
  })

  it("historial", () => {
    expect(bytes(construirHistorialPDF(HISTORIAL))).toBeGreaterThan(0)
  })

  it("estadísticas", () => {
    expect(bytes(construirEstadisticasPDF(ESTADISTICAS))).toBeGreaterThan(0)
  })
})

describe("el armado no entrega nada por sí solo", () => {
  it("devuelve el documento en lugar de descargarlo", () => {
    // La separación es lo que permite que el servidor lo escriba en la
    // respuesta: si el armado descargara, no habría nada que devolver.
    const wb = construirEquiposExcel(EQUIPOS)
    expect(wb).toBeDefined()
    expect(wb.SheetNames).toBeDefined()
  })
})
