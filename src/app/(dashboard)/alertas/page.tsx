"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/dashboard/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bell, AlertTriangle, Clock, Wrench, RefreshCw, Building2, MapPin, Hash, Monitor, User, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"

interface EquipoInfo {
  id: string
  tipo: string
  marca: string
  modelo?: string | null
  serial: string
  estado?: string
  ubicacion?: string | null
  empresa?: {
    id?: string
    nombre: string
  }
}

interface MantenimientoInfo {
  id: string
  tipo: string
  estado: string
  fechaProgramada: Date
  equipo: EquipoInfo
  tecnico?: {
    nombre: string
  }
}

interface Alerta {
  id: string
  tipo: "ATRASADO" | "PROXIMO" | "CRITICO"
  prioridad: "ALTA" | "MEDIA" | "BAJA"
  titulo: string
  mensaje: string
  fecha: Date
  mantenimiento?: MantenimientoInfo
  equipo?: EquipoInfo
}

interface AlertasData {
  alertas: Alerta[]
  contadores: {
    atrasados: number
    proximos: number
    criticos: number
    total: number
  }
}

const tipoConfig = {
  ATRASADO: {
    label: "Atrasado",
    color: "bg-red-500/10 text-red-700 border-red-200",
    icon: AlertTriangle,
  },
  PROXIMO: {
    label: "Próximo",
    color: "bg-blue-500/10 text-blue-700 border-blue-200",
    icon: Clock,
  },
  CRITICO: {
    label: "Crítico",
    color: "bg-orange-500/10 text-orange-700 border-orange-200",
    icon: Wrench,
  },
}

const prioridadConfig = {
  ALTA: { label: "Alta", color: "bg-red-500/10 text-red-700 border-red-200" },
  MEDIA: { label: "Media", color: "bg-yellow-500/10 text-yellow-700 border-yellow-200" },
  BAJA: { label: "Baja", color: "bg-green-500/10 text-green-700 border-green-200" },
}

export default function AlertasPage() {
  const [data, setData] = useState<AlertasData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")

  useEffect(() => {
    fetchAlertas()
  }, [])

  const fetchAlertas = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/alertas")
      if (!response.ok) throw new Error("Error al cargar alertas")

      const result = await response.json()
      setData(result)
    } catch (error) {
      toast.error("Error al cargar alertas")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Función para buscar en los datos del equipo
  const matchesSearch = (alerta: Alerta, query: string): boolean => {
    if (!query.trim()) return true

    const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0)
    const equipo = alerta.mantenimiento?.equipo || alerta.equipo

    if (!equipo) return false

    const searchableText = [
      equipo.tipo,
      equipo.marca,
      equipo.modelo,
      equipo.serial,
      equipo.empresa?.nombre,
      alerta.mantenimiento?.tecnico?.nombre,
      alerta.titulo,
      alerta.mensaje,
    ].filter(Boolean).join(" ").toLowerCase()

    return searchTerms.every(term => searchableText.includes(term))
  }

  const alertasFiltradas = data?.alertas.filter((alerta) => {
    // Filtro por tipo
    if (filtroTipo !== "all" && alerta.tipo !== filtroTipo) return false
    // Filtro por búsqueda
    if (!matchesSearch(alerta, searchQuery)) return false
    return true
  })

  return (
    <>
      <Header
        title="Alertas y Notificaciones"
        description="Monitoreo de mantenimientos y equipos críticos"
      />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Contadores */}
          {data && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Total de Alertas</CardDescription>
                  <CardTitle className="text-3xl">{data.contadores.total}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Atrasados</CardDescription>
                  <CardTitle className="text-3xl text-red-600">{data.contadores.atrasados}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Próximos</CardDescription>
                  <CardTitle className="text-3xl text-blue-600">{data.contadores.proximos}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Equipos Críticos</CardDescription>
                  <CardTitle className="text-3xl text-orange-600">{data.contadores.criticos}</CardTitle>
                </CardHeader>
              </Card>
            </div>
          )}

          {/* Filtros */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Listado de Alertas</CardTitle>
                  <CardDescription>
                    {alertasFiltradas && data?.alertas
                      ? alertasFiltradas.length === data.alertas.length
                        ? `${data.alertas.length} alertas activas`
                        : `${alertasFiltradas.length} de ${data.alertas.length} alertas`
                      : "Alertas activas del sistema"
                    }
                  </CardDescription>
                </div>
                <Button onClick={fetchAlertas} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Actualizar</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Buscador y Filtros */}
              <div className="mb-4 space-y-3">
                {/* Buscador */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por equipo, marca, serial, empresa o técnico..."
                    className="pl-9 w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Filtros de tipo */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={filtroTipo === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFiltroTipo("all")}
                  >
                    Todas
                  </Button>
                  <Button
                    variant={filtroTipo === "ATRASADO" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFiltroTipo("ATRASADO")}
                  >
                    <AlertTriangle className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Atrasados</span>
                  </Button>
                  <Button
                    variant={filtroTipo === "PROXIMO" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFiltroTipo("PROXIMO")}
                  >
                    <Clock className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Próximos</span>
                  </Button>
                  <Button
                    variant={filtroTipo === "CRITICO" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFiltroTipo("CRITICO")}
                  >
                    <Wrench className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Críticos</span>
                  </Button>
                </div>
              </div>

              {/* Lista de alertas */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground">Cargando alertas...</p>
                </div>
              ) : alertasFiltradas && alertasFiltradas.length > 0 ? (
                <div className="space-y-3">
                  {alertasFiltradas.map((alerta) => {
                    const TipoIcon = tipoConfig[alerta.tipo].icon
                    return (
                      <Card key={alerta.id} className="border-l-4" style={{
                        borderLeftColor: alerta.prioridad === "ALTA" ? "#ef4444" : alerta.prioridad === "MEDIA" ? "#f59e0b" : "#22c55e"
                      }}>
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${alerta.prioridad === "ALTA" ? "bg-red-100" : alerta.prioridad === "MEDIA" ? "bg-yellow-100" : "bg-blue-100"}`}>
                              <TipoIcon className={`h-5 w-5 ${alerta.prioridad === "ALTA" ? "text-red-600" : alerta.prioridad === "MEDIA" ? "text-yellow-600" : "text-blue-600"}`} />
                            </div>
                            <div className="flex-1 space-y-3">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <h3 className="font-semibold text-foreground">{alerta.titulo}</h3>
                                  <p className="text-sm text-muted-foreground mt-1">{alerta.mensaje}</p>
                                </div>
                                <div className="flex gap-2 flex-shrink-0">
                                  <Badge variant="outline" className={tipoConfig[alerta.tipo].color}>
                                    {tipoConfig[alerta.tipo].label}
                                  </Badge>
                                  <Badge variant="outline" className={prioridadConfig[alerta.prioridad].color}>
                                    {prioridadConfig[alerta.prioridad].label}
                                  </Badge>
                                </div>
                              </div>

                              {/* Información detallada del equipo */}
                              {(alerta.mantenimiento?.equipo || alerta.equipo) && (
                                <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                                  <div className="flex items-center gap-2 text-sm font-medium">
                                    <Monitor className="h-4 w-4 text-muted-foreground" />
                                    <span>Detalles del Equipo</span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">Tipo:</span>
                                      <span className="font-medium">
                                        {alerta.mantenimiento?.equipo?.tipo || alerta.equipo?.tipo}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">Marca:</span>
                                      <span className="font-medium">
                                        {alerta.mantenimiento?.equipo?.marca || alerta.equipo?.marca}
                                        {(alerta.mantenimiento?.equipo?.modelo || alerta.equipo?.modelo) &&
                                          ` ${alerta.mantenimiento?.equipo?.modelo || alerta.equipo?.modelo}`
                                        }
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Hash className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-muted-foreground">Serial:</span>
                                      <span className="font-medium font-mono text-xs">
                                        {alerta.mantenimiento?.equipo?.serial || alerta.equipo?.serial}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Building2 className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-muted-foreground">Empresa:</span>
                                      <span className="font-medium">
                                        {alerta.mantenimiento?.equipo?.empresa?.nombre || alerta.equipo?.empresa?.nombre}
                                      </span>
                                    </div>
                                    {alerta.equipo?.ubicacion && (
                                      <div className="flex items-center gap-2 sm:col-span-2">
                                        <MapPin className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-muted-foreground">Ubicación:</span>
                                        <span className="font-medium">{alerta.equipo.ubicacion}</span>
                                      </div>
                                    )}
                                    {alerta.mantenimiento?.tecnico && (
                                      <div className="flex items-center gap-2">
                                        <User className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-muted-foreground">Técnico:</span>
                                        <span className="font-medium">{alerta.mantenimiento.tecnico.nombre}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              <div className="flex items-center justify-between pt-1">
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(alerta.fecha), "dd MMM yyyy, HH:mm", { locale: es })}
                                </p>
                                <div className="flex gap-2">
                                  {alerta.mantenimiento && (
                                    <Link href={`/mantenimientos?id=${alerta.mantenimiento.id}`}>
                                      <Button variant="outline" size="sm">
                                        Ver Mantenimiento
                                      </Button>
                                    </Link>
                                  )}
                                  {alerta.equipo && (
                                    <Link href={`/equipos?id=${alerta.equipo.id}`}>
                                      <Button variant="outline" size="sm">
                                        Ver Equipo
                                      </Button>
                                    </Link>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">
                    {searchQuery ? "Sin resultados" : "No hay alertas"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {searchQuery
                      ? `No se encontraron alertas para "${searchQuery}"`
                      : filtroTipo === "all"
                        ? "Todo está bajo control"
                        : "No hay alertas de este tipo"
                    }
                  </p>
                  {searchQuery && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => setSearchQuery("")}
                    >
                      Limpiar búsqueda
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}
