"use client"

import { useState, useEffect, useCallback } from "react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
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
  etiquetaDesviacion,
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
  const [desde, setDesde] = useState<Date | undefined>()
  const [hasta, setHasta] = useState<Date | undefined>()
  const [desdeOpen, setDesdeOpen] = useState(false)
  const [hastaOpen, setHastaOpen] = useState(false)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      if (desde) params.set("desde", aParametro(desde))
      if (hasta) params.set("hasta", aParametro(hasta))
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
  }, [desde, hasta])

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
    ? `${format(parseISO(rangoAplicado.desde), "d 'de' MMMM yyyy", {
        locale: es,
      })} — ${format(parseISO(rangoAplicado.hasta), "d 'de' MMMM yyyy", {
        locale: es,
      })}`
    : ""

  const desdeSeleccionado =
    desde ?? (rangoAplicado ? parseISO(rangoAplicado.desde) : undefined)
  const hastaSeleccionado =
    hasta ?? (rangoAplicado ? parseISO(rangoAplicado.hasta) : undefined)

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

  return (
    <>
      <Header title="Dashboard" description="Resumen general del sistema" />

      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Desde</span>
              <Popover open={desdeOpen} onOpenChange={setDesdeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[190px] justify-start text-left font-normal",
                      !desdeSeleccionado && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {desdeSeleccionado
                      ? format(desdeSeleccionado, "dd/MM/yyyy", { locale: es })
                      : "Seleccionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={desdeSeleccionado}
                    onSelect={(fecha) => {
                      setDesde(fecha)
                      setDesdeOpen(false)
                    }}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Hasta</span>
              <Popover open={hastaOpen} onOpenChange={setHastaOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[190px] justify-start text-left font-normal",
                      !hastaSeleccionado && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {hastaSeleccionado
                      ? format(hastaSeleccionado, "dd/MM/yyyy", { locale: es })
                      : "Seleccionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={hastaSeleccionado}
                    onSelect={(fecha) => {
                      setHasta(fecha)
                      setHastaOpen(false)
                    }}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {(desde || hasta) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setDesde(undefined)
                  setHasta(undefined)
                }}
              >
                Restablecer
              </Button>
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

        {/* El periodo representado siempre a la vista: sin él las cifras no
            dicen a qué corresponden. */}
        <p className="mt-3 text-sm text-muted-foreground">
          Periodo del informe:{" "}
          <span className="font-medium">{etiquetaPeriodo}</span>
          {loading && " · actualizando..."}
        </p>
      </div>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Metric Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <MetricCard
              title="Total Equipos"
              value={stats.totalEquipos.toString()}
              change={`${stats.equiposPorEstado.ACTIVO || 0} activos`}
              trend="up"
              icon={Wrench}
            />
            <MetricCard
              title="Pendientes"
              value={stats.mantenimientosPendientes.toString()}
              change={`${stats.cambioPendientes > 0 ? "+" : ""}${stats.cambioPendientes}%`}
              trend={stats.cambioPendientes > 0 ? "up" : "down"}
              icon={ClipboardList}
            />
            <MetricCard
              title="Completados (Periodo)"
              value={stats.completadosPeriodo.toString()}
              change={`${stats.cambioCompletados > 0 ? "+" : ""}${stats.cambioCompletados}%`}
              trend={stats.cambioCompletados > 0 ? "up" : "down"}
              icon={BarChart3}
            />
            <MetricCard
              title="Equipos Críticos"
              value={stats.equiposCriticos.toString()}
              change={stats.equiposCriticos > 0 ? "Requieren atención" : "Todo bien"}
              trend={stats.equiposCriticos > 0 ? "critical" : "down"}
              icon={Bell}
            />
            {/* Mide la diferencia con la fecha programada, no el tiempo de
                resolución de una solicitud. El rótulo lo dice para que nadie lo
                lea como otra cosa. */}
            <MetricCard
              title="Desviación vs. Programado"
              value={etiquetaDesviacion(stats.desviacionPromedioProgramacion)}
              change="Respecto a la fecha programada"
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
              title="Fallas Recurrentes"
              value={stats.fallasRecurrentes.length.toString()}
              change={stats.fallasRecurrentes.length > 0 ? "Equipos con +2 fallas" : "Sin fallas recurrentes"}
              trend={stats.fallasRecurrentes.length > 0 ? "critical" : "up"}
              icon={AlertTriangle}
            />
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Mantenimientos por Mes</CardTitle>
              <p className="text-sm text-muted-foreground">
                Mantenimientos preventivos y correctivos · {etiquetaPeriodo} ·
                total del periodo: {stats.totalMantenimientos}
              </p>
            </CardHeader>
            <CardContent>
              <MaintenanceChart data={chartData} />
            </CardContent>
          </Card>

          {/* Two column layout for tables */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent Maintenance Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Próximos Mantenimientos</CardTitle>
                <p className="text-sm text-muted-foreground">Mantenimientos programados y en proceso</p>
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
                  Fallas Recurrentes por Equipo
                </CardTitle>
                <p className="text-sm text-muted-foreground">Equipos con 2 o más mantenimientos correctivos en el periodo</p>
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
                        className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                      >
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">
                            {falla.equipo?.tipo} {falla.equipo?.marca} {falla.equipo?.modelo || ""}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Serial: {falla.equipo?.serial} | {falla.equipo?.empresa}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-destructive/10 px-3 py-1 text-sm font-semibold text-destructive">
                            {falla.cantidadFallas} fallas
                          </span>
                        </div>
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
