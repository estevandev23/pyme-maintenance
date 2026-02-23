"use client"

import { useState } from "react"
import { MoreHorizontal, Ticket, Eye, X, CheckCircle, XCircle, Clock } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { Solicitud } from "@/types/solicitud"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface SolicitudesTableProps {
  solicitudes: Solicitud[]
  userRole: "ADMIN" | "CLIENTE"
  onRefresh: () => void
}

const estadoConfig: Record<string, { label: string; color: string; icon: any }> = {
  PENDIENTE: { label: "Pendiente", color: "bg-yellow-500/10 text-yellow-700 border-yellow-200", icon: Clock },
  EN_REVISION: { label: "En Revisión", color: "bg-blue-500/10 text-blue-700 border-blue-200", icon: Eye },
  APROBADA: { label: "Aprobada", color: "bg-green-500/10 text-green-700 border-green-200", icon: CheckCircle },
  RECHAZADA: { label: "Rechazada", color: "bg-red-500/10 text-red-700 border-red-200", icon: XCircle },
}

const prioridadConfig: Record<string, { label: string; color: string }> = {
  BAJA: { label: "Baja", color: "bg-gray-500/10 text-gray-700 border-gray-200" },
  MEDIA: { label: "Media", color: "bg-yellow-500/10 text-yellow-700 border-yellow-200" },
  ALTA: { label: "Alta", color: "bg-orange-500/10 text-orange-700 border-orange-200" },
  URGENTE: { label: "Urgente", color: "bg-red-500/10 text-red-700 border-red-200" },
}

export function SolicitudesTable({
  solicitudes,
  userRole,
  onRefresh,
}: SolicitudesTableProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [reviewSolicitud, setReviewSolicitud] = useState<Solicitud | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [respuesta, setRespuesta] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [detailSolicitud, setDetailSolicitud] = useState<Solicitud | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const isAdmin = userRole === "ADMIN"

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    try {
      const response = await fetch(`/api/solicitudes/${deleteId}`, { method: "DELETE" })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || "Error al eliminar")
      }
      toast.success("Solicitud eliminada")
      onRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar")
    } finally {
      setDeleteId(null)
    }
  }

  const handleStatusChange = async (solicitud: Solicitud, estado: string, respuestaText?: string) => {
    try {
      setIsSubmitting(true)
      const body: any = { estado }
      if (respuestaText) body.respuesta = respuestaText

      const response = await fetch(`/api/solicitudes/${solicitud.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || "Error al actualizar")
      }

      toast.success(`Solicitud ${estado === "APROBADA" ? "aprobada" : estado === "RECHAZADA" ? "rechazada" : "actualizada"}`)
      setReviewOpen(false)
      setReviewSolicitud(null)
      setRespuesta("")
      onRefresh()

      // Si se aprueba, redirigir a crear mantenimiento
      if (estado === "APROBADA") {
        const params = new URLSearchParams()
        params.append("equipoId", solicitud.equipoId)
        params.append("descripcion", solicitud.descripcion)
        params.append("create", "true")
        router.push(`/mantenimientos?${params.toString()}`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClientCancel = async (id: string) => {
    try {
      const response = await fetch(`/api/solicitudes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "RECHAZADA" }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || "Error al cancelar")
      }

      toast.success("Solicitud cancelada")
      onRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cancelar")
    }
  }

  if (solicitudes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Ticket className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-lg font-medium text-muted-foreground">
          No hay solicitudes registradas
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {isAdmin
            ? "Las solicitudes de clientes aparecerán aquí"
            : "Reporta un problema para crear una solicitud"}
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border overflow-x-auto">
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Equipo</TableHead>
              {isAdmin && <TableHead>Cliente</TableHead>}
              {isAdmin && <TableHead>Empresa</TableHead>}
              <TableHead>Prioridad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="max-w-[250px]">Problema</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {solicitudes.map((solicitud) => (
              <TableRow key={solicitud.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {format(new Date(solicitud.createdAt), "dd/MM/yyyy", { locale: es })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(solicitud.createdAt), "HH:mm", { locale: es })}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">
                      {solicitud.equipo.tipo} - {solicitud.equipo.marca}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      S/N: {solicitud.equipo.serial}
                    </span>
                  </div>
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{solicitud.cliente.nombre}</span>
                      <span className="text-xs text-muted-foreground">{solicitud.cliente.email}</span>
                    </div>
                  </TableCell>
                )}
                {isAdmin && (
                  <TableCell>
                    <span className="text-sm">{solicitud.equipo.empresa.nombre}</span>
                  </TableCell>
                )}
                <TableCell>
                  <Badge variant="outline" className={prioridadConfig[solicitud.prioridad]?.color || ""}>
                    {prioridadConfig[solicitud.prioridad]?.label || solicitud.prioridad}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={estadoConfig[solicitud.estado]?.color || ""}>
                    {estadoConfig[solicitud.estado]?.label || solicitud.estado}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[250px]">
                  <p className="text-sm text-muted-foreground truncate">
                    {solicitud.descripcion}
                  </p>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setDetailSolicitud(solicitud); setDetailOpen(true) }}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver detalles
                      </DropdownMenuItem>
                      {isAdmin && solicitud.estado === "PENDIENTE" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleStatusChange(solicitud, "EN_REVISION")}>
                            <Clock className="mr-2 h-4 w-4" />
                            Marcar en revisión
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setReviewSolicitud(solicitud); setReviewOpen(true) }}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Aprobar / Rechazar
                          </DropdownMenuItem>
                        </>
                      )}
                      {isAdmin && solicitud.estado === "EN_REVISION" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => { setReviewSolicitud(solicitud); setReviewOpen(true) }}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Aprobar / Rechazar
                          </DropdownMenuItem>
                        </>
                      )}
                      {!isAdmin && solicitud.estado === "PENDIENTE" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleClientCancel(solicitud.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <X className="mr-2 h-4 w-4" />
                            Cancelar solicitud
                          </DropdownMenuItem>
                        </>
                      )}
                      {isAdmin && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteId(solicitud.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            Eliminar
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de detalle */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de Solicitud</DialogTitle>
          </DialogHeader>
          {detailSolicitud && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Estado</Label>
                  <div className="mt-1">
                    <Badge variant="outline" className={estadoConfig[detailSolicitud.estado]?.color || ""}>
                      {estadoConfig[detailSolicitud.estado]?.label}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Prioridad</Label>
                  <div className="mt-1">
                    <Badge variant="outline" className={prioridadConfig[detailSolicitud.prioridad]?.color || ""}>
                      {prioridadConfig[detailSolicitud.prioridad]?.label}
                    </Badge>
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Equipo</Label>
                <p className="text-sm font-medium mt-1">
                  {detailSolicitud.equipo.tipo} - {detailSolicitud.equipo.marca} {detailSolicitud.equipo.modelo || ""}
                </p>
                <p className="text-xs text-muted-foreground">S/N: {detailSolicitud.equipo.serial}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Reportado por</Label>
                <p className="text-sm font-medium mt-1">{detailSolicitud.cliente.nombre}</p>
                <p className="text-xs text-muted-foreground">{detailSolicitud.cliente.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Descripción del problema</Label>
                <p className="text-sm mt-1 whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                  {detailSolicitud.descripcion}
                </p>
              </div>
              {detailSolicitud.respuesta && (
                <div>
                  <Label className="text-muted-foreground text-xs">Respuesta del administrador</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap bg-blue-50 p-3 rounded-lg border border-blue-200">
                    {detailSolicitud.respuesta}
                  </p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground text-xs">Fecha de creación</Label>
                <p className="text-sm mt-1">
                  {format(new Date(detailSolicitud.createdAt), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Aprobar/Rechazar (Admin) */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Revisar Solicitud</DialogTitle>
            <DialogDescription>
              {reviewSolicitud && (
                <>
                  <strong>{reviewSolicitud.equipo.tipo} - {reviewSolicitud.equipo.marca}</strong>
                  {" — "}reportado por {reviewSolicitud.cliente.nombre}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {reviewSolicitud && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground text-xs">Problema reportado</Label>
                <p className="text-sm mt-1 whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                  {reviewSolicitud.descripcion}
                </p>
              </div>
              <div>
                <Label>Respuesta (opcional)</Label>
                <Textarea
                  placeholder="Escribe una respuesta para el cliente..."
                  className="resize-none mt-1"
                  rows={3}
                  value={respuesta}
                  onChange={(e) => setRespuesta(e.target.value)}
                />
              </div>
              <DialogFooter className="flex gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => { setReviewOpen(false); setRespuesta("") }}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleStatusChange(reviewSolicitud, "RECHAZADA", respuesta || undefined)}
                  disabled={isSubmitting}
                >
                  Rechazar
                </Button>
                <Button
                  onClick={() => handleStatusChange(reviewSolicitud, "APROBADA", respuesta || undefined)}
                  disabled={isSubmitting}
                >
                  Aprobar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de eliminar */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La solicitud será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
