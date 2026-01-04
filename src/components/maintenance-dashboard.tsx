"use client"

import { useState } from "react"
import {
  LayoutDashboard,
  Wrench,
  ClipboardList,
  BarChart3,
  Users,
  Bell,
  ChevronDown,
  Settings,
  Menu,
  X,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MetricCard } from "@/components/metric-card"
import { MaintenanceChart } from "@/components/maintenance-chart"
import { MaintenanceTable } from "@/components/maintenance-table"

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Wrench, label: "Equipos", active: false },
  { icon: ClipboardList, label: "Mantenimientos", active: false },
  { icon: BarChart3, label: "Reportes", active: false },
  { icon: Users, label: "Usuarios", active: false },
]

export function MaintenanceDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transition-transform duration-300 lg:translate-x-0 lg:static`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 border-b border-border px-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight text-foreground">MantenPro</h1>
              <p className="text-xs text-muted-foreground">Sistema PYME</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.label}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    item.active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </button>
              )
            })}
          </nav>

          {/* Settings */}
          <div className="border-t border-border p-4">
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
              <Settings className="h-5 w-5" />
              Configuración
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Dashboard</h2>
              <p className="text-sm text-muted-foreground">Resumen general del sistema</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="space-y-2 p-2">
                  <div className="rounded-lg bg-accent/50 p-3">
                    <p className="text-sm font-medium">Mantenimiento pendiente</p>
                    <p className="text-xs text-muted-foreground">Compresor A-203 requiere revisión</p>
                  </div>
                  <div className="rounded-lg bg-accent/50 p-3">
                    <p className="text-sm font-medium">Equipo crítico detectado</p>
                    <p className="text-xs text-muted-foreground">Bomba B-105 fuera de servicio</p>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 pl-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/placeholder.svg?height=32&width=32" />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">JM</AvatarFallback>
                  </Avatar>
                  <div className="hidden text-left md:block">
                    <p className="text-sm font-medium">Juan Martínez</p>
                    <p className="text-xs text-muted-foreground">Administrador</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Perfil</DropdownMenuItem>
                <DropdownMenuItem>Configuración</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">Cerrar Sesión</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            {/* Metric Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard title="Total Equipos" value="247" change="+12" trend="up" icon={Wrench} />
              <MetricCard title="Mantenimientos Pendientes" value="18" change="-3" trend="down" icon={ClipboardList} />
              <MetricCard title="Completados Este Mes" value="64" change="+8" trend="up" icon={BarChart3} />
              <MetricCard title="Equipos Críticos" value="5" change="+2" trend="critical" icon={Bell} />
            </div>

            {/* Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Mantenimientos por Mes</CardTitle>
                <p className="text-sm text-muted-foreground">Histórico de mantenimientos preventivos y correctivos</p>
              </CardHeader>
              <CardContent>
                <MaintenanceChart />
              </CardContent>
            </Card>

            {/* Recent Maintenance Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Mantenimientos Recientes</CardTitle>
                <p className="text-sm text-muted-foreground">Últimas actividades registradas en el sistema</p>
              </CardHeader>
              <CardContent>
                <MaintenanceTable />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
