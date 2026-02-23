"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Plus, Ticket, Filter } from "lucide-react"
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
import { SolicitudesTable } from "@/components/solicitudes/solicitudes-table"
import { SolicitudForm } from "@/components/solicitudes/solicitud-form"
import { toast } from "sonner"
import type { Solicitud } from "@/types/solicitud"
import type { SolicitudInput } from "@/lib/validations/solicitud"
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

export default function SolicitudesPage() {
  const { data: session } = useSession()
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filtros
  const [filterEstado, setFilterEstado] = useState<string>("all")
  const [filterPrioridad, setFilterPrioridad] = useState<string>("all")

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 10

  const isAdmin = session?.user?.role === "ADMIN"
  const isCliente = session?.user?.role === "CLIENTE"

  useEffect(() => {
    if (isCliente) {
      fetchEquipos()
    }
    fetchSolicitudes()
  }, [session])

  useEffect(() => {
    setCurrentPage(1)
  }, [filterEstado, filterPrioridad])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSolicitudes()
    }, 300)
    return () => clearTimeout(timer)
  }, [filterEstado, filterPrioridad, currentPage])

  const fetchEquipos = async () => {
    try {
      const response = await fetch("/api/equipos")
      if (!response.ok) throw new Error("Error al cargar equipos")
      const data = await response.json()
      // Si tiene paginación, tomar data; si no, usar directamente
      setEquipos(Array.isArray(data) ? data : data.data || [])
    } catch (error) {
      console.error(error)
    }
  }

  const fetchSolicitudes = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterEstado !== "all") params.append("estado", filterEstado)
      if (filterPrioridad !== "all") params.append("prioridad", filterPrioridad)
      params.append("page", currentPage.toString())
      params.append("limit", itemsPerPage.toString())

      const response = await fetch(`/api/solicitudes?${params.toString()}`)
      if (!response.ok) throw new Error("Error al cargar solicitudes")

      const result = await response.json()
      setSolicitudes(result.data)
      setTotalPages(result.totalPages)
      setTotalItems(result.total)
    } catch (error) {
      toast.error("Error al cargar solicitudes")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (data: SolicitudInput) => {
    try {
      setIsSubmitting(true)
      const response = await fetch("/api/solicitudes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Error al crear solicitud")
      }

      toast.success("Solicitud enviada exitosamente. Te notificaremos cuando sea revisada.")
      setFormOpen(false)
      fetchSolicitudes()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear solicitud")
    } finally {
      setIsSubmitting(false)
    }
  }

  // pendientes count
  const pendientes = solicitudes.filter(s => s.estado === "PENDIENTE").length

  return (
    <>
      <Header
        title="Solicitudes de Servicio"
        description={isCliente
          ? "Reporta problemas con tus equipos"
          : "Gestión de solicitudes de clientes"
        }
      />

      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="EN_REVISION">En Revisión</SelectItem>
                <SelectItem value="APROBADA">Aprobada</SelectItem>
                <SelectItem value="RECHAZADA">Rechazada</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPrioridad} onValueChange={setFilterPrioridad}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las prioridades</SelectItem>
                <SelectItem value="BAJA">Baja</SelectItem>
                <SelectItem value="MEDIA">Media</SelectItem>
                <SelectItem value="ALTA">Alta</SelectItem>
                <SelectItem value="URGENTE">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isCliente && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Reportar Problema</span>
            </Button>
          )}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-7xl space-y-4">
          {isAdmin && pendientes > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
              <Ticket className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                Tienes {pendientes} {pendientes === 1 ? "solicitud pendiente" : "solicitudes pendientes"} por revisar
              </span>
            </div>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Ticket className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>
                    {isCliente ? "Mis Solicitudes" : "Solicitudes de Clientes"}
                  </CardTitle>
                  <CardDescription>
                    {totalItems} {totalItems === 1 ? "solicitud registrada" : "solicitudes registradas"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground">Cargando solicitudes...</p>
                </div>
              ) : (
                <>
                  <SolicitudesTable
                    solicitudes={solicitudes}
                    userRole={isAdmin ? "ADMIN" : "CLIENTE"}
                    onRefresh={fetchSolicitudes}
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

      {isCliente && (
        <SolicitudForm
          equipos={equipos}
          open={formOpen}
          onOpenChange={setFormOpen}
          onSubmit={handleCreate}
          isLoading={isSubmitting}
        />
      )}
    </>
  )
}
