"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { History, Filter, FileDown, FileSpreadsheet, Calendar, User, Wrench, Check, ChevronsUpDown, Search, X } from "lucide-react"
import { Header } from "@/components/dashboard/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { exportHistorialToExcel } from "@/lib/excel-export"
import { exportHistorialToPDF } from "@/lib/pdf-export"
import { DataPagination } from "@/components/ui/data-pagination"

interface HistorialItem {
  id: string
  fecha: string
  observaciones: string
  equipo: {
    id: string
    tipo: string
    marca: string
    modelo: string | null
    serial: string
    empresa: {
      id: string
      nombre: string
    }
  }
  tecnico: {
    id: string
    nombre: string
    email: string
  } | null
  mantenimiento: {
    id: string
    tipo: "PREVENTIVO" | "CORRECTIVO"
    estado: string
    descripcion: string
  } | null
}

interface Equipo {
  id: string
  tipo: string
  marca: string
  serial: string
}

interface Tecnico {
  id: string
  nombre: string
}

interface Empresa {
  id: string
  nombre: string
}

const tipoConfig = {
  PREVENTIVO: { label: "Preventivo", color: "bg-blue-500/10 text-blue-700 border-blue-200" },
  CORRECTIVO: { label: "Correctivo", color: "bg-orange-500/10 text-orange-700 border-orange-200" },
}

const estadoConfig: Record<string, { label: string; color: string }> = {
  PROGRAMADO: { label: "Programado", color: "bg-blue-500/10 text-blue-700 border-blue-200" },
  EN_PROCESO: { label: "En Proceso", color: "bg-yellow-500/10 text-yellow-700 border-yellow-200" },
  COMPLETADO: { label: "Completado", color: "bg-green-500/10 text-green-700 border-green-200" },
  CANCELADO: { label: "Cancelado", color: "bg-gray-500/10 text-gray-700 border-gray-200" },
}

export default function HistorialPage() {
  const { data: session } = useSession()
  const [historial, setHistorial] = useState<HistorialItem[]>([])
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [filterEquipo, setFilterEquipo] = useState<string>("all")
  const [filterTecnico, setFilterTecnico] = useState<string>("all")
  const [filterEmpresa, setFilterEmpresa] = useState<string>("all")
  const [filterFechaDesde, setFilterFechaDesde] = useState<string>("")
  const [filterFechaHasta, setFilterFechaHasta] = useState<string>("")

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 10

// Search State
  const [searchTerm, setSearchTerm] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [filteredEquipos, setFilteredEquipos] = useState<Equipo[]>([])

  useEffect(() => {
    if (filterEquipo === "all") {
      setSearchTerm("")
    } else {
      const found = equipos.find(e => e.id === filterEquipo)
      if (found) {
        setSearchTerm(`${found.tipo} - ${found.marca} (${found.serial})`)
      }
    }
  }, [filterEquipo, equipos])

  useEffect(() => {
    const term = searchTerm.toLowerCase()
    const filtered = equipos.filter(equipo => {
      const matchString = `${equipo.tipo} ${equipo.marca} ${equipo.serial} ${equipo.tipo}`.toLowerCase()
      return matchString.includes(term)
    })
    setFilteredEquipos(filtered)
  }, [searchTerm, equipos])

  const isAdmin = session?.user?.role === "ADMIN"
  const isTecnico = session?.user?.role === "TECNICO"
  const isCliente = session?.user?.role === "CLIENTE"

  useEffect(() => {
    fetchEquipos()
    fetchTecnicos()
    fetchEmpresas()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [filterEquipo, filterTecnico, filterEmpresa, filterFechaDesde, filterFechaHasta])

  useEffect(() => {
    fetchHistorial()
  }, [filterEquipo, filterTecnico, filterEmpresa, filterFechaDesde, filterFechaHasta, currentPage])

  const fetchEquipos = async () => {
    try {
      const response = await fetch("/api/equipos")
      if (!response.ok) throw new Error("Error al cargar equipos")
      const data = await response.json()
      setEquipos(data)
    } catch (error) {
      console.error(error)
    }
  }

  const fetchTecnicos = async () => {
    try {
      const response = await fetch("/api/usuarios?role=TECNICO")
      if (!response.ok) throw new Error("Error al cargar técnicos")
      const data = await response.json()
      setTecnicos(data)
    } catch (error) {
      console.error(error)
    }
  }

  const fetchEmpresas = async () => {
    try {
      const response = await fetch("/api/empresas")
      if (!response.ok) throw new Error("Error al cargar empresas")
      const data = await response.json()
      setEmpresas(data)
    } catch (error) {
      console.error(error)
    }
  }

  const fetchHistorial = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      if (filterEquipo !== "all") params.append("equipoId", filterEquipo)
      if (filterTecnico !== "all") params.append("tecnicoId", filterTecnico)
      if (filterEmpresa !== "all") params.append("empresaId", filterEmpresa)
      if (filterFechaDesde) params.append("fechaDesde", filterFechaDesde)
      if (filterFechaHasta) params.append("fechaHasta", filterFechaHasta)
      params.append("page", currentPage.toString())
      params.append("limit", itemsPerPage.toString())

      const response = await fetch(`/api/historial?${params.toString()}`)
      if (!response.ok) throw new Error("Error al cargar historial")

      const result = await response.json()
      setHistorial(result.data)
      setTotalPages(result.totalPages)
      setTotalItems(result.total)
    } catch (error) {
      toast.error("Error al cargar historial")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportExcel = () => {
    try {
      const dataToExport = historial.map((item) => ({
        fecha: format(new Date(item.fecha), "dd/MM/yyyy HH:mm", { locale: es }),
        equipo: `${item.equipo.tipo} - ${item.equipo.marca} (${item.equipo.serial})`,
        tipoMantenimiento: item.mantenimiento?.tipo || "-",
        tecnico: item.tecnico?.nombre || "-",
        observaciones: item.observaciones,
      }))
      exportHistorialToExcel(dataToExport, "historial_intervenciones")
      toast.success("Historial exportado a Excel")
    } catch (error) {
      toast.error("Error al exportar a Excel")
    }
  }

  const handleExportPDF = () => {
    try {
      const dataToExport = historial.map((item) => ({
        fecha: format(new Date(item.fecha), "dd/MM/yyyy HH:mm", { locale: es }),
        equipo: `${item.equipo.tipo} - ${item.equipo.marca}`,
        tipoMantenimiento: item.mantenimiento?.tipo || "-",
        tecnico: item.tecnico?.nombre || "-",
        observaciones: item.observaciones,
      }))
      exportHistorialToPDF(dataToExport, "Historial de Intervenciones")
      toast.success("Historial exportado a PDF")
    } catch (error) {
      toast.error("Error al exportar a PDF")
    }
  }

  const clearFilters = () => {
    setFilterEquipo("all")
    setFilterTecnico("all")
    setFilterEmpresa("all")
    setFilterFechaDesde("")
    setFilterFechaHasta("")
    setCurrentPage(1)
  }

  return (
    <>
      <Header
        title="Historial de Intervenciones"
        description="Registro completo de todas las intervenciones realizadas"
      />

      <div className="sticky top-0 z-30 border-b border-border bg-card px-6 py-4 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <div className="flex gap-2 flex-wrap">
                <div className="relative w-[350px] z-20">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar equipo (Tipo, Marca, Serial)..."
                      value={searchTerm}
                      onChange={(e) => {
                         setSearchTerm(e.target.value)
                         setIsSearching(true)
                         if (e.target.value === "") setFilterEquipo("all")
                      }}
                      onFocus={() => setIsSearching(true)}
                      className="pl-9 pr-8" 
                    />
                    {searchTerm && (
                      <button
                        onClick={() => {
                          setFilterEquipo("all")
                          setSearchTerm("")
                          setIsSearching(false)
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  {isSearching && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsSearching(false)} 
                      />
                      <div className="absolute top-full mt-2 w-full z-20 rounded-lg border bg-popover text-popover-foreground shadow-lg outline-none animate-in fade-in-0 zoom-in-95 overflow-hidden">
                        <div className="max-h-[300px] overflow-y-auto p-1">
                          {filteredEquipos.length === 0 ? (
                            <div className="py-4 text-center text-sm text-muted-foreground">
                              No se encontraron equipos
                            </div>
                          ) : (
                            filteredEquipos.map((equipo) => (
                              <div
                                key={equipo.id}
                                className={cn(
                                  "relative flex cursor-pointer select-none items-center rounded-md px-3 py-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
                                  filterEquipo === equipo.id && "bg-accent/50"
                                )}
                                onClick={() => {
                                  setFilterEquipo(equipo.id)
                                  setIsSearching(false)
                                }}
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium">{equipo.tipo} - {equipo.marca}</span>
                                  <span className="text-xs text-muted-foreground">S/N: {equipo.serial}</span>
                                </div>
                                {filterEquipo === equipo.id && (
                                  <Check className="ml-auto h-4 w-4 opacity-50" />
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {isAdmin && (
                  <>
                    <Select value={filterTecnico} onValueChange={setFilterTecnico}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Técnico" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los técnicos</SelectItem>
                        {tecnicos.map((tecnico) => (
                          <SelectItem key={tecnico.id} value={tecnico.id}>
                            {tecnico.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={filterEmpresa} onValueChange={setFilterEmpresa}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Empresa" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las empresas</SelectItem>
                        {empresas.map((empresa) => (
                          <SelectItem key={empresa.id} value={empresa.id}>
                            {empresa.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <FileDown className="mr-2 h-4 w-4" />
                    Exportar
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

          {/* Filtros de fecha */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Desde:</span>
              <Input
                type="date"
                value={filterFechaDesde}
                onChange={(e) => setFilterFechaDesde(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Hasta:</span>
              <Input
                type="date"
                value={filterFechaHasta}
                onChange={(e) => setFilterFechaHasta(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-7xl">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <History className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>{isCliente ? "Historial de mis Equipos" : "Historial Completo"}</CardTitle>
                  <CardDescription>
                    {totalItems} {totalItems === 1 ? "registro encontrado" : "registros encontrados"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground">Cargando historial...</p>
                </div>
              ) : historial.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <History className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">
                    No hay registros en el historial
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Los registros aparecerán cuando se realicen mantenimientos
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Equipo</TableHead>
                          {!isCliente && <TableHead>Empresa</TableHead>}
                          <TableHead>Tipo</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Técnico</TableHead>
                          <TableHead className="max-w-[300px]">Observaciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historial.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">
                                    {format(new Date(item.fecha), "dd/MM/yyyy", { locale: es })}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(item.fecha), "HH:mm", { locale: es })}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">
                                  {item.equipo.tipo} - {item.equipo.marca}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  S/N: {item.equipo.serial}
                                </span>
                              </div>
                            </TableCell>
                            {!isCliente && (
                              <TableCell>
                                <span className="text-sm">{item.equipo.empresa.nombre}</span>
                              </TableCell>
                            )}
                            <TableCell>
                              {item.mantenimiento?.tipo ? (
                                <Badge
                                  variant="outline"
                                  className={tipoConfig[item.mantenimiento.tipo].color}
                                >
                                  {tipoConfig[item.mantenimiento.tipo].label}
                                </Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {item.mantenimiento?.estado ? (
                                <Badge
                                  variant="outline"
                                  className={estadoConfig[item.mantenimiento.estado]?.color || ""}
                                >
                                  {estadoConfig[item.mantenimiento.estado]?.label || item.mantenimiento.estado}
                                </Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {item.tecnico ? (
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{item.tecnico.nombre}</span>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[300px]">
                              <p className="text-sm text-muted-foreground truncate">
                                {item.observaciones}
                              </p>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <DataPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}
