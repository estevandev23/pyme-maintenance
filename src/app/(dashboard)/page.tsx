"use client"

import { useState, useEffect, useCallback } from "react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import type { DateRange } from "react-day-picker"
import { Header } from "@/components/dashboard/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { MetricCard } from "@/components/metric-card"
import { MaintenanceChart } from "@/components/maintenance-chart"
import { MaintenanceTable } from "@/components/maintenance-table"
import {
  Wrench,
  ClipboardList,
  BarChart3,
  Bell,
  FileDown,
  FileSpreadsheet,
  Clock,
  AlertTriangle,
  CalendarIcon,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { exportEstadisticasToExcel } from "@/lib/excel-export"
import { exportEstadisticasToPDF } from "@/lib/pdf-export"
import {
  partesDesviacion,
  type EstadisticasInforme,
} from "@/lib/estadisticas"

/** Fecha en el formato `YYYY-MM-DD` que espera el endpoint. */
function aParametro(fecha: Date): string {
  return format(fecha, "yyyy-MM-dd")
}

export default function DashboardPage() {
  const [stats, setStats] = useState<EstadisticasInforme | null>(null)
  const [loading, setLoading] = useState(true)
  // Selección del usuario. Mientras esté vacía manda el rango por defecto del
  // servidor, que es el que viaja de vuelta en `stats.rango`.
  const [rango, setRango] = useState<DateRange | undefined>()
  const [rangoAbierto, setRangoAbierto] = useState(false)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      if (rango?.from) params.set("desde", aParametro(rango.from))
      if (rango?.to) params.set("hasta", aParametro(rango.to))
      const query = params.toString()

      const response = await fetch(
        `/api/dashboard/stats${query ? `?${query}` : ""}`
      )

      if (!response.ok) {
        const detalle = await response.json().catch(() => null)
        // Un rango inválido no debe dejar la pantalla en blanco: se avisa y se
        // conservan los indicadores del último rango que sí era válido.
        throw new Error(detalle?.error || "Error al cargar estadísticas")
      }

      const data = await response.json()
      setStats(data)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al cargar estadísticas del dashboard"
      )
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [rango])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const handleExportExcel = () => {
    if (!stats) {
      toast.error("No hay datos para exportar")
      return
    }

    try {
      // Se manda el informe completo: cualquier indicador que el panel muestre
      // llega al archivo sin que haya que acordarse de mapearlo aquí.
      exportEstadisticasToExcel(stats, "estadisticas_dashboard")
      toast.success("Estadísticas exportadas a Excel")
    } catch (error) {
      console.error(error)
      toast.error("Error al exportar a Excel")
    }
  }

  const handleExportPDF = () => {
    if (!stats) {
      toast.error("No hay datos para exportar")
      return
    }

    try {
      exportEstadisticasToPDF(stats)
      toast.success("Estadísticas exportadas a PDF")
    } catch (error) {
      console.error(error)
      toast.error("Error al exportar a PDF")
    }
  }

  const chartData = stats?.mantenimientosPorMes ?? []

  const rangoAplicado = stats?.rango
  const etiquetaPeriodo = rangoAplicado
    ? `${format(parseISO(rangoAplicado.desde), "d MMM yyyy", {
        locale: es,
      })} — ${format(parseISO(rangoAplicado.hasta), "d MMM yyyy", {
        locale: es,
      })}`
    : ""

  const rangoMostrado: DateRange | undefined =
    rango ??
    (rangoAplicado
      ? {
          from: parseISO(rangoAplicado.desde),
          to: parseISO(rangoAplicado.hasta),
        }
      : undefined)

  if (loading && !stats) {
    return (
      <>
        <Header title="Dashboard" description="Resumen general del sistema" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Cargando estadísticas...</p>
            </div>
          </div>
        </main>
      </>
    )
  }

  if (!stats) {
    return (
      <>
        <Header title="Dashboard" description="Resumen general del sistema" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">
                No se pudieron cargar las estadísticas
              </p>
            </div>
          </div>
        </main>
      </>
    )
  }

  const desviacion = partesDesviacion(stats.desviacionPromedioProgramacion)

  return (
    <>
      <Header title="Dashboard" description="Resumen general del sistema" />

      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Un solo control: las dos fechas son un periodo, no dos datos
                sueltos. */}
            <Popover open={rangoAbierto} onOpenChange={setRangoAbierto}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !rangoMostrado && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                  {etiquetaPeriodo || "Seleccionar periodo"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  numberOfMonths={2}
                  defaultMonth={rangoMostrado?.from}
                  selected={rangoMostrado}
                  onSelect={setRango}
                  locale={es}
                />
              </PopoverContent>
            </Popover>

            {rango && (
              <Button variant="ghost" onClick={() => setRango(undefined)}>
                Restablecer
              </Button>
            )}

            {loading && (
              <span className="text-sm text-muted-foreground">
                actualizando...
              </span>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <FileDown className="mr-2 h-4 w-4" />
                Exportar Estadísticas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportExcel}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Exportar a Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF}>
                <FileDown className="mr-2 h-4 w-4" />
                Exportar a PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-6">
        {/* @container: la rejilla decide sus columnas por el ancho del que
            dispone, no por el de la ventana. Sin esto, ensanchar la pantalla
            reducía el espacio por tarjeta al aparecer la barra lateral y al
            saltar a seis columnas. */}
        <div className="@container mx-auto max-w-7xl space-y-6">
          {/* Destacados: responden cómo vamos */}
          <div className="grid gap-4 @md:grid-cols-2 @2xl:grid-cols-3">
            <MetricCard
              title="Completados en el periodo"
              value={stats.completadosPeriodo}
              hint={`${stats.cambioCompletados > 0 ? "+" : ""}${stats.cambioCompletados}% vs. periodo anterior`}
              trend={stats.cambioCompletados >= 0 ? "up" : "down"}
              icon={BarChart3}
            />
            <MetricCard
              title="Desviación respecto a lo programado"
              value={desviacion.magnitud}
              unit={desviacion.unidad}
              hint={desviacion.sentido}
              decimals={1}
              trend={
                stats.desviacionPromedioProgramacion <= 0
                  ? "up"
                  : stats.desviacionPromedioProgramacion <= 3
                    ? "down"
                    : "critical"
              }
              icon={Clock}
            />
            <MetricCard
              title="Equipos con fallas recurrentes"
              value={stats.fallasRecurrentes.length}
              hint={
                stats.fallasRecurrentes.length > 0
                  ? "con 2 o más correctivos"
                  : "sin fallas recurrentes"
              }
              trend={stats.fallasRecurrentes.length > 0 ? "critical" : "up"}
              icon={AlertTriangle}
            />
          </div>

          {/* Contexto: sitúan, no accionan */}
          <div className="grid gap-4 @md:grid-cols-2 @2xl:grid-cols-3">
            <MetricCard
              title="Total de equipos"
              value={stats.totalEquipos}
              hint={`${stats.equiposPorEstado.ACTIVO || 0} activos`}
              trend="up"
              icon={Wrench}
              variant="contexto"
            />
            <MetricCard
              title="Mantenimientos pendientes"
              value={stats.mantenimientosPendientes}
              hint={`${stats.cambioPendientes > 0 ? "+" : ""}${stats.cambioPendientes}% vs. periodo anterior`}
              trend={stats.cambioPendientes > 0 ? "up" : "down"}
              icon={ClipboardList}
              variant="contexto"
            />
            <MetricCard
              title="Equipos críticos"
              value={stats.equiposCriticos}
              hint={
                stats.equiposCriticos > 0 ? "requieren atención" : "todo bien"
              }
              trend={stats.equiposCriticos > 0 ? "critical" : "down"}
              icon={Bell}
              variant="contexto"
            />
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">
                Mantenimientos por mes
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Preventivos y correctivos · {etiquetaPeriodo} · total del
                periodo: {stats.totalMantenimientos.toLocaleString("es")}
              </p>
            </CardHeader>
            <CardContent>
              <MaintenanceChart data={chartData} />
            </CardContent>
          </Card>

          {/* Two column layout for tables */}
          <div className="grid gap-6 @4xl:grid-cols-2">
            {/* Recent Maintenance Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">
                  Próximos mantenimientos
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Programados y en proceso
                </p>
              </CardHeader>
              <CardContent>
                <MaintenanceTable
                  data={stats.proximosMantenimientos.map((mantenimiento) => ({
                    ...mantenimiento,
                    // El informe viaja en JSON: la fecha llega como texto.
                    fechaProgramada: new Date(mantenimiento.fechaProgramada),
                  }))}
                />
              </CardContent>
            </Card>

            {/* Fallas Recurrentes Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Fallas recurrentes por equipo
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Equipos con 2 o más mantenimientos correctivos en el periodo
                </p>
              </CardHeader>
              <CardContent>
                {stats.fallasRecurrentes.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    No hay equipos con fallas recurrentes
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats.fallasRecurrentes.map((falla) => (
                      <div
                        key={falla.equipoId}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
                      >
                        <div className="min-w-0 space-y-1">
                          <p className="font-medium text-foreground">
                            {falla.equipo?.tipo} {falla.equipo?.marca}{" "}
                            {falla.equipo?.modelo || ""}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Serial: {falla.equipo?.serial} |{" "}
                            {falla.equipo?.empresa}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-destructive/10 px-3 py-1 text-sm font-semibold tabular-nums text-destructive">
                          {falla.cantidadFallas} fallas
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  )
}
