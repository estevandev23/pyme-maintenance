"use client"

import { useState, useEffect } from "react"
import { Plus, Wrench, Filter } from "lucide-react"
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
import { MantenimientosTable } from "@/components/mantenimientos/mantenimientos-table"
import { MantenimientoForm } from "@/components/mantenimientos/mantenimiento-form"
import { toast } from "sonner"
import { useSession } from "next-auth/react"
import type { MantenimientoInput } from "@/lib/validations/mantenimiento"

interface Mantenimiento {
  id: string
  equipoId: string
  tecnicoId: string
  tipo: "PREVENTIVO" | "CORRECTIVO"
  estado: "PROGRAMADO" | "EN_PROCESO" | "COMPLETADO" | "CANCELADO"
  fechaProgramada: Date
  fechaRealizada: Date | null
  descripcion: string
  observaciones: string | null
  reporteUrl: string | null
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
  }
}

interface Equipo {
  id: string
  tipo: string
  marca: string
  modelo: string | null
  serial: string
}

interface Tecnico {
  id: string
  nombre: string
  email: string
}

interface Empresa {
  id: string
  nombre: string
}

export default function MantenimientosPage() {
  const { data: session } = useSession()
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([])
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingMantenimiento, setEditingMantenimiento] = useState<Mantenimiento | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filtros
  const [filterEstado, setFilterEstado] = useState<string>("all")
  const [filterTipo, setFilterTipo] = useState<string>("all")
  const [filterTecnico, setFilterTecnico] = useState<string>("all")
  const [filterEmpresa, setFilterEmpresa] = useState<string>("all")

  useEffect(() => {
    fetchEmpresas()
    fetchEquipos()
    fetchTecnicos()
    fetchMantenimientos()
  }, [])

  useEffect(() => {
    fetchMantenimientos()
  }, [filterEstado, filterTipo, filterTecnico, filterEmpresa])

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
      if (filterEstado !== "all") params.append("estado", filterEstado)
      if (filterTipo !== "all") params.append("tipo", filterTipo)
      if (filterTecnico !== "all") params.append("tecnicoId", filterTecnico)
      if (filterEmpresa !== "all") params.append("empresaId", filterEmpresa)

      const response = await fetch(`/api/mantenimientos?${params.toString()}`)
      if (!response.ok) throw new Error("Error al cargar mantenimientos")

      const data = await response.json()
      setMantenimientos(data)
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

  const canCreate = session?.user?.role === "ADMIN" || session?.user?.role === "CLIENTE"

  return (
    <>
      <Header
        title="Mantenimientos"
        description="Gestión de mantenimientos de equipos"
      />

      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-2 flex-wrap">
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

              {session?.user?.role === "ADMIN" && (
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
          {canCreate && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Mantenimiento
            </Button>
          )}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-7xl">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Wrench className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Listado de Mantenimientos</CardTitle>
                  <CardDescription>
                    {mantenimientos.length} {mantenimientos.length === 1 ? "mantenimiento registrado" : "mantenimientos registrados"}
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
                <MantenimientosTable
                  mantenimientos={mantenimientos}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  userRole={session?.user?.role}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <MantenimientoForm
        mantenimiento={editingMantenimiento}
        equipos={equipos}
        tecnicos={tecnicos}
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        onSubmit={editingMantenimiento ? handleUpdate : handleCreate}
        isLoading={isSubmitting}
      />
    </>
  )
}
