"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Plus, Wrench, Filter, FileDown, FileSpreadsheet, Search, X, Bell } from "lucide-react"
import { Header } from "@/components/dashboard/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MantenimientosTable } from "@/components/mantenimientos/mantenimientos-table"
import { MantenimientoForm } from "@/components/mantenimientos/mantenimiento-form"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { useSession } from "next-auth/react"
import type { MantenimientoInput } from "@/lib/validations/mantenimiento"
import { exportMantenimientosToExcel } from "@/lib/excel-export"
import { exportMantenimientosToPDF } from "@/lib/pdf-export"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { Mantenimiento } from "@/types/mantenimiento"
import { DataPagination } from "@/components/ui/data-pagination"


interface Equipo {
  id: string
  tipo: string
  marca: string
  modelo: string | null
  serial: string
  empresaId: string
  estado: string
}

interface Tecnico {
  id: string
  nombre: string
  email: string
  empresaId: string | null
}

interface Empresa {
  id: string
  nombre: string
}

export default function MantenimientosPage() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([])
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingMantenimiento, setEditingMantenimiento] = useState<Mantenimiento | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filtro por ID desde URL (viene de alertas)
  const filterId = searchParams.get("id")

  // Filtros
  const [filterEstado, setFilterEstado] = useState<string>("all")
  const [filterTipo, setFilterTipo] = useState<string>("all")
  const [filterTecnico, setFilterTecnico] = useState<string>("all")
  const [filterEmpresa, setFilterEmpresa] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [filterAlerta, setFilterAlerta] = useState<boolean>(false)

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 10

  useEffect(() => {
    fetchEmpresas()
    fetchEquipos()
    // Cargar técnicos si es ADMIN o CLIENTE (pueden crear/editar mantenimientos)
    if (session?.user?.role === "ADMIN" || session?.user?.role === "CLIENTE") {
      fetchTecnicos()
    }
    fetchMantenimientos()
  }, [session])

  useEffect(() => {
    setCurrentPage(1)
  }, [filterEstado, filterTipo, filterTecnico, filterEmpresa, searchQuery, filterId])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMantenimientos()
    }, 500)
    return () => clearTimeout(timer)
  }, [filterEstado, filterTipo, filterTecnico, filterEmpresa, searchQuery, filterId, currentPage])

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

  const fetchEquipos = async () => {
    try {
      const response = await fetch("/api/equipos")
      if (!response.ok) throw new Error("Error al cargar equipos")
      const data = await response.json()
      setEquipos(data)
    } catch (error) {
      toast.error("Error al cargar equipos")
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
      toast.error("Error al cargar técnicos")
      console.error(error)
    }
  }

  const fetchMantenimientos = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterId) params.append("id", filterId)
      if (filterEstado !== "all") params.append("estado", filterEstado)
      if (filterTipo !== "all") params.append("tipo", filterTipo)
      if (filterTecnico !== "all") params.append("tecnicoId", filterTecnico)
      if (filterEmpresa !== "all") params.append("empresaId", filterEmpresa)
      if (searchQuery) params.append("search", searchQuery)
      params.append("page", currentPage.toString())
      params.append("limit", itemsPerPage.toString())

      const response = await fetch(`/api/mantenimientos?${params.toString()}`)
      if (!response.ok) throw new Error("Error al cargar mantenimientos")

      const result = await response.json()
      setMantenimientos(result.data)
      setTotalPages(result.totalPages)
      setTotalItems(result.total)
    } catch (error) {
      toast.error("Error al cargar mantenimientos")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (data: MantenimientoInput) => {
    try {
      setIsSubmitting(true)
      const response = await fetch("/api/mantenimientos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Error al crear mantenimiento")
      }

      toast.success("Mantenimiento creado exitosamente")
      setFormOpen(false)
      fetchMantenimientos()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear mantenimiento")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (mantenimiento: Mantenimiento) => {
    setEditingMantenimiento(mantenimiento)
    setFormOpen(true)
  }

  const handleUpdate = async (data: MantenimientoInput) => {
    if (!editingMantenimiento) return

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/mantenimientos/${editingMantenimiento.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Error al actualizar mantenimiento")
      }

      toast.success("Mantenimiento actualizado exitosamente")
      setFormOpen(false)
      setEditingMantenimiento(undefined)
      fetchMantenimientos()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar mantenimiento")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/mantenimientos/${id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Error al eliminar mantenimiento")
      }

      toast.success("Mantenimiento eliminado exitosamente")
      fetchMantenimientos()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar mantenimiento")
    }
  }

  const handleFormOpenChange = (open: boolean) => {
    setFormOpen(open)
    if (!open) {
      setEditingMantenimiento(undefined)
    }
  }

  const canCreate = session?.user?.role === "ADMIN"

  const clearFilterId = () => {
    router.push("/mantenimientos")
  }

  // Función para verificar si un mantenimiento está en alerta
  const isInAlert = (mant: Mantenimiento): boolean => {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const fechaProgramada = new Date(mant.fechaProgramada)
    fechaProgramada.setHours(0, 0, 0, 0)
    const diffDays = Math.ceil((fechaProgramada.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))

    if (mant.estado === "COMPLETADO" || mant.estado === "CANCELADO") return false
    if (diffDays < 0 && (mant.estado === "PROGRAMADO" || mant.estado === "EN_PROCESO")) return true
    if (diffDays >= 0 && diffDays <= 3 && mant.estado === "PROGRAMADO") return true
    return false
  }

  // Filtrar mantenimientos por alerta (client-side)
  const mantenimientosFiltrados = filterAlerta
    ? mantenimientos.filter(isInAlert)
    : mantenimientos

  // Contar alertas activas
  const alertasCount = mantenimientos.filter(isInAlert).length

  const handleExportExcel = () => {
    try {
      const dataToExport = mantenimientos.map((mant) => ({
        tipo: mant.tipo,
        estado: mant.estado,
        equipo: `${mant.equipo.tipo} - ${mant.equipo.marca} ${mant.equipo.modelo || ""} (${mant.equipo.serial})`,
        empresa: mant.equipo.empresa.nombre,
        tecnico: mant.tecnico.nombre,
        fechaProgramada: format(new Date(mant.fechaProgramada), "dd/MM/yyyy", { locale: es }),
        fechaRealizada: mant.fechaRealizada
          ? format(new Date(mant.fechaRealizada), "dd/MM/yyyy", { locale: es })
          : null,
        descripcion: mant.descripcion,
        observaciones: mant.observaciones,
      }))
      exportMantenimientosToExcel(dataToExport, "mantenimientos")
      toast.success("Mantenimientos exportados a Excel")
    } catch (error) {
      toast.error("Error al exportar a Excel")
    }
  }

  const handleExportPDF = () => {
    try {
      const dataToExport = mantenimientos.map((mant) => ({
        tipo: mant.tipo,
        estado: mant.estado,
        equipo: `${mant.equipo.tipo} - ${mant.equipo.marca}`,
        empresa: mant.equipo.empresa.nombre,
        tecnico: mant.tecnico.nombre,
        fechaProgramada: format(new Date(mant.fechaProgramada), "dd/MM/yyyy", { locale: es }),
        fechaRealizada: mant.fechaRealizada
          ? format(new Date(mant.fechaRealizada), "dd/MM/yyyy", { locale: es })
          : null,
      }))
      exportMantenimientosToPDF(dataToExport)
      toast.success("Mantenimientos exportados a PDF")
    } catch (error) {
      toast.error("Error al exportar a PDF")
    }
  }

  return (
    <>
      <Header
        title="Mantenimientos"
        description="Gestión de mantenimientos de equipos"
      />

      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex flex-col gap-4">
          {/* Fila 1: Buscador y botones de acción */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por equipo, serial o marca..."
                className="pl-9 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant={filterAlerta ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterAlerta(!filterAlerta)}
                className={filterAlerta ? "bg-red-500 hover:bg-red-600" : ""}
              >
                <Bell className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">En Alerta</span>
                {alertasCount > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${filterAlerta ? "bg-white text-red-600" : "bg-red-500 text-white"}`}>
                    {alertasCount}
                  </span>
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <FileDown className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Exportar</span>
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
              {canCreate && (
                <Button onClick={() => setFormOpen(true)}>
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Nuevo Mantenimiento</span>
                </Button>
              )}
            </div>
          </div>

          {/* Fila 2: Filtros */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="PROGRAMADO">Programado</SelectItem>
                  <SelectItem value="EN_PROCESO">En Proceso</SelectItem>
                  <SelectItem value="COMPLETADO">Completado</SelectItem>
                  <SelectItem value="CANCELADO">Cancelado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="PREVENTIVO">Preventivo</SelectItem>
                  <SelectItem value="CORRECTIVO">Correctivo</SelectItem>
                </SelectContent>
              </Select>

              {(session?.user?.role === "ADMIN" || session?.user?.role === "CLIENTE") && (
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
      </div>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-7xl space-y-4">
          {filterId && (
            <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  Mostrando mantenimiento específico desde alertas
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilterId}
                className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
              >
                <X className="mr-1 h-4 w-4" />
                Ver todos
              </Button>
            </div>
          )}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Wrench className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Listado de Mantenimientos</CardTitle>
                  <CardDescription>
                    {filterAlerta
                      ? `${mantenimientosFiltrados.length} de ${totalItems} en alerta`
                      : `${totalItems} ${totalItems === 1 ? "mantenimiento registrado" : "mantenimientos registrados"}`
                    }
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground">Cargando mantenimientos...</p>
                </div>
              ) : (
                <>
                  <MantenimientosTable
                    mantenimientos={mantenimientosFiltrados}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onRefresh={fetchMantenimientos}
                    userRole={session?.user?.role as "ADMIN" | "TECNICO" | "CLIENTE" | undefined}
                  />
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

      <MantenimientoForm
        mantenimiento={editingMantenimiento}
        equipos={equipos}
        tecnicos={tecnicos}
        empresas={empresas}
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        onSubmit={editingMantenimiento ? handleUpdate : handleCreate}
        isLoading={isSubmitting}
        clienteEmpresaId={session?.user?.role === "CLIENTE" ? session?.user?.empresaId ?? undefined : undefined}
      />
    </>
  )
}
