"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Plus, Wrench, Filter, FileDown, FileSpreadsheet, Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
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
import { EquiposTable } from "@/components/equipos/equipos-table"
import { EquipoForm } from "@/components/equipos/equipo-form"
import { toast } from "sonner"
import type { EquipoInput } from "@/lib/validations/equipo"
import { exportEquiposToExcel } from "@/lib/excel-export"
import { exportEquiposToPDF } from "@/lib/pdf-export"

interface Equipo {
  id: string
  tipo: string
  marca: string
  modelo: string | null
  serial: string
  estado: "ACTIVO" | "INACTIVO" | "EN_MANTENIMIENTO" | "DADO_DE_BAJA"
  ubicacion: string | null
  empresaId: string
  empresa: {
    id: string
    nombre: string
    nit: string
  }
  _count?: {
    mantenimientos: number
  }
}

interface Empresa {
  id: string
  nombre: string
  nit: string
}

export default function EquiposPage() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingEquipo, setEditingEquipo] = useState<Equipo | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filterEmpresa, setFilterEmpresa] = useState<string>("all")
  const [filterEstado, setFilterEstado] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")

  // Filtro por ID desde URL (viene de alertas)
  const filterId = searchParams.get("id")

  useEffect(() => {
    fetchEmpresas()
    fetchEquipos()
  }, [])

  const fetchEmpresas = async () => {
    try {
      const response = await fetch("/api/empresas")
      if (!response.ok) throw new Error("Error al cargar empresas")
      const data = await response.json()
      setEmpresas(data)
    } catch (error) {
      toast.error("Error al cargar empresas")
      console.error(error)
    }
  }

  const fetchEquipos = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterId) params.append("id", filterId)
      if (filterEmpresa !== "all") params.append("empresaId", filterEmpresa)
      if (filterEstado !== "all") params.append("estado", filterEstado)
      if (searchQuery) params.append("search", searchQuery)

      const response = await fetch(`/api/equipos?${params.toString()}`)
      if (!response.ok) throw new Error("Error al cargar equipos")

      const data = await response.json()
      setEquipos(data)
    } catch (error) {
      toast.error("Error al cargar equipos")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEquipos()
    }, 500)
    return () => clearTimeout(timer)
  }, [filterEmpresa, filterEstado, searchQuery, filterId])

  const handleCreate = async (data: EquipoInput) => {
    try {
      setIsSubmitting(true)
      const response = await fetch("/api/equipos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Error al crear equipo")
      }

      toast.success("Equipo creado exitosamente")
      setFormOpen(false)
      fetchEquipos()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear equipo")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (equipo: Equipo) => {
    setEditingEquipo(equipo)
    setFormOpen(true)
  }

  const handleUpdate = async (data: EquipoInput) => {
    if (!editingEquipo) return

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/equipos/${editingEquipo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Error al actualizar equipo")
      }

      toast.success("Equipo actualizado exitosamente")
      setFormOpen(false)
      setEditingEquipo(undefined)
      fetchEquipos()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar equipo")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/equipos/${id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Error al eliminar equipo")
      }

      toast.success("Equipo eliminado exitosamente")
      fetchEquipos()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar equipo")
    }
  }

  const handleFormOpenChange = (open: boolean) => {
    setFormOpen(open)
    if (!open) {
      setEditingEquipo(undefined)
    }
  }

  const canCreate = session?.user?.role === "ADMIN" || session?.user?.role === "CLIENTE"
  const canEdit = session?.user?.role === "ADMIN" || session?.user?.role === "CLIENTE"
  const canDelete = session?.user?.role === "ADMIN"
  const isCliente = session?.user?.role === "CLIENTE"

  const clearFilterId = () => {
    router.push("/equipos")
  }

  const handleExportExcel = () => {
    try {
      const dataToExport = equipos.map((equipo) => ({
        tipo: equipo.tipo,
        marca: equipo.marca,
        modelo: equipo.modelo,
        serial: equipo.serial,
        estado: equipo.estado,
        ubicacion: equipo.ubicacion,
        empresa: equipo.empresa.nombre,
      }))
      exportEquiposToExcel(dataToExport, "equipos")
      toast.success("Equipos exportados a Excel")
    } catch (error) {
      toast.error("Error al exportar a Excel")
    }
  }

  const handleExportPDF = () => {
    try {
      const dataToExport = equipos.map((equipo) => ({
        tipo: equipo.tipo,
        marca: equipo.marca,
        modelo: equipo.modelo,
        serial: equipo.serial,
        estado: equipo.estado,
        ubicacion: equipo.ubicacion,
        empresa: equipo.empresa.nombre,
      }))
      exportEquiposToPDF(dataToExport)
      toast.success("Equipos exportados a PDF")
    } catch (error) {
      toast.error("Error al exportar a PDF")
    }
  }

  return (
    <>
      <Header
        title="Equipos"
        description="Gestión de inventario de equipos de cómputo"
      />

      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex flex-col gap-4">
          {/* Fila 1: Buscador y botones de acción */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por tipo, marca o serial..."
                className="pl-9 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
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
                  <span className="hidden sm:inline">Nuevo Equipo</span>
                </Button>
              )}
            </div>
          </div>

          {/* Fila 2: Filtros */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
            {!isCliente && (
              <Select value={filterEmpresa} onValueChange={setFilterEmpresa}>
                <SelectTrigger className="w-[160px] sm:w-[200px]">
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
            )}
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="w-[140px] sm:w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="ACTIVO">Activo</SelectItem>
                <SelectItem value="INACTIVO">Inactivo</SelectItem>
                <SelectItem value="EN_MANTENIMIENTO">En Mantenimiento</SelectItem>
                <SelectItem value="DADO_DE_BAJA">Dado de Baja</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-7xl space-y-4">
          {filterId && (
            <div className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">
                  Mostrando equipo específico desde alertas
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilterId}
                className="text-orange-700 hover:text-orange-900 hover:bg-orange-100"
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
                  <CardTitle>Inventario de Equipos</CardTitle>
                  <CardDescription>
                    {equipos.length} {equipos.length === 1 ? "equipo registrado" : "equipos registrados"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground">Cargando equipos...</p>
                </div>
              ) : (
                <EquiposTable
                  equipos={equipos}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  canEdit={canEdit}
                  canDelete={canDelete}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <EquipoForm
        equipo={editingEquipo}
        empresas={empresas}
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        onSubmit={editingEquipo ? handleUpdate : handleCreate}
        isLoading={isSubmitting}
        isCliente={isCliente}
      />
    </>
  )
}
