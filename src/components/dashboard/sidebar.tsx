"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Wrench,
  ClipboardList,
  BarChart3,
  Users,
  Settings,
  Building2,
  Bell,
  History,
  Ticket,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSession } from "next-auth/react"

type Role = "ADMIN" | "TECNICO" | "CLIENTE"

const menuItems: { icon: any; label: string; href: string; badge?: boolean; roles?: Role[] }[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Building2, label: "Empresas", href: "/empresas", roles: ["ADMIN"] },
  { icon: Wrench, label: "Equipos", href: "/equipos", roles: ["ADMIN", "CLIENTE"] },
  { icon: Ticket, label: "Solicitudes", href: "/solicitudes", roles: ["ADMIN", "CLIENTE"] },
  { icon: ClipboardList, label: "Mantenimientos", href: "/mantenimientos" },
  { icon: History, label: "Historial", href: "/historial" },
  { icon: Bell, label: "Alertas", href: "/alertas", badge: true },
  { icon: Users, label: "Usuarios", href: "/usuarios", roles: ["ADMIN"] },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const userRole = session?.user?.role as Role | undefined
  const [alertasCount, setAlertasCount] = useState(0)

  useEffect(() => {
    fetchAlertasCount()
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchAlertasCount, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchAlertasCount = async () => {
    try {
      const response = await fetch("/api/alertas")
      if (response.ok) {
        const data = await response.json()
        setAlertasCount(data.contadores.total)
      }
    } catch (error) {
      console.error("Error al cargar alertas:", error)
    }
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border lg:static">
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
          {menuItems
            .filter((item) => !item.roles || (userRole && item.roles.includes(userRole)))
            .map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            const showBadge = item.badge && alertasCount > 0

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
                {showBadge && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-destructive-foreground">
                    {alertasCount > 99 ? "99+" : alertasCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Settings */}
        {/* Settings - Deshabilitado por ahora
        <div className="border-t border-border p-4">
          <Link
            href="/configuracion"
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              pathname === "/configuracion"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Settings className="h-5 w-5" />
            Configuración
          </Link>
        </div>
        */}
      </div>
    </aside>
  )
}
