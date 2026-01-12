"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/dashboard/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MetricCard } from "@/components/metric-card"
import { MaintenanceChart } from "@/components/maintenance-chart"
import { MaintenanceTable } from "@/components/maintenance-table"
import { Wrench, ClipboardList, BarChart3, Bell } from "lucide-react"
import { toast } from "sonner"

interface DashboardStats {
  totalEquipos: number
  equiposPorEstado: Record<string, number>
  totalMantenimientos: number
  mantenimientosPorEstado: Record<string, number>
  mantenimientosPorTipo: Record<string, number>
  completadosEsteMes: number
  cambioCompletados: number
  equiposCriticos: number
  mantenimientosPendientes: number
  cambioPendientes: number
  proximosMantenimientos: any[]
  mantenimientosPorMes: Array<{
    mes: string
    tipo: string
    count: number
  }>
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/dashboard/stats")
      if (!response.ok) throw new Error("Error al cargar estadísticas")

      const data = await response.json()
      setStats(data)
    } catch (error) {
      toast.error("Error al cargar estadísticas del dashboard")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Procesar datos para el gráfico
  const chartData = stats?.mantenimientosPorMes
    ? (() => {
        const mesesMap = new Map<string, { mes: string; preventivo: number; correctivo: number }>()

        stats.mantenimientosPorMes.forEach(item => {
          if (!mesesMap.has(item.mes)) {
            mesesMap.set(item.mes, { mes: item.mes, preventivo: 0, correctivo: 0 })
          }
          const mesData = mesesMap.get(item.mes)!
          if (item.tipo === "PREVENTIVO") {
            mesData.preventivo = item.count
          } else if (item.tipo === "CORRECTIVO") {
            mesData.correctivo = item.count
          }
        })

        return Array.from(mesesMap.values()).sort((a, b) => a.mes.localeCompare(b.mes))
      })()
    : []

  if (loading) {
    return (
      <>
        <Header
          title="Dashboard"
          description="Resumen general del sistema"
        />
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
        <Header
          title="Dashboard"
          description="Resumen general del sistema"
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">No se pudieron cargar las estadísticas</p>
            </div>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Header
        title="Dashboard"
        description="Resumen general del sistema"
      />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Metric Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Equipos"
              value={stats.totalEquipos.toString()}
              change={`${stats.equiposPorEstado.ACTIVO || 0} activos`}
              trend="up"
              icon={Wrench}
            />
            <MetricCard
              title="Mantenimientos Pendientes"
              value={stats.mantenimientosPendientes.toString()}
              change={`${stats.cambioPendientes > 0 ? "+" : ""}${stats.cambioPendientes}%`}
              trend={stats.cambioPendientes > 0 ? "up" : "down"}
              icon={ClipboardList}
            />
            <MetricCard
              title="Completados Este Mes"
              value={stats.completadosEsteMes.toString()}
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
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Mantenimientos por Mes</CardTitle>
              <p className="text-sm text-muted-foreground">Histórico de mantenimientos preventivos y correctivos (últimos 6 meses)</p>
            </CardHeader>
            <CardContent>
              <MaintenanceChart data={chartData} />
            </CardContent>
          </Card>

          {/* Recent Maintenance Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Próximos Mantenimientos</CardTitle>
              <p className="text-sm text-muted-foreground">Mantenimientos programados y en proceso</p>
            </CardHeader>
            <CardContent>
              <MaintenanceTable data={stats.proximosMantenimientos} />
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}
