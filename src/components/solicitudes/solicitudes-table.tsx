"use client"

import { useState } from "react"
import { MoreHorizontal, Ticket, Eye, X, CheckCircle, XCircle, Clock, Ban, Wrench } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { LucideIcon } from "lucide-react"
import Link from "next/link"
import type { Solicitud } from "@/types/solicitud"
import { decidirCancelacionCliente } from "@/lib/cancelacion-solicitud"
import { SIN_TECNICO } from "@/lib/tecnico-asignado"

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

/**
 * Estados de solicitud a los que el administrador puede crearles el
 * mantenimiento.
 *
 * No basta con mirar si falta el enlace: bajo el flujo anterior, aprobar dejaba
 * la solicitud en APROBADA y el mantenimiento se creaba sin referencia a ella,
 * así que todas las aprobadas históricas parecen huérfanas aunque su trabajo
 * exista. Ofrecerles la acción crearía un segundo mantenimiento.
 */
const PUEDE_CREAR_MANTENIMIENTO: string[] = ["PENDIENTE", "EN_REVISION"]

/**
 * Cómo se nombra a quien canceló.
 *
 * Se prefiere el nombre cuando consta. Puede no constar: la relación con el
 * autor se pone a nulo si se elimina al usuario, y el rol sobrevive para eso.
 */
function etiquetaDeAutor(solicitud: Solicitud): string {
  if (solicitud.canceladaPor?.nombre) return solicitud.canceladaPor.nombre

  switch (solicitud.canceladoPorRol) {
    case "CLIENTE":
      return "el cliente"
    case "TECNICO":
      return "el técnico"
    case "ADMIN":
      return "el administrador"
    default:
      return "un usuario ya eliminado"
  }
}

interface SolicitudesTableProps {
  solicitudes: Solicitud[]
  userRole: "ADMIN" | "CLIENTE"
  onRefresh: () => void
}

const estadoConfig: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  PENDIENTE: { label: "Pendiente", color: "bg-yellow-500/10 text-yellow-700 border-yellow-200", icon: Clock },
  EN_REVISION: { label: "En Revisión", color: "bg-blue-500/10 text-blue-700 border-blue-200", icon: Eye },
  APROBADA: { label: "Aprobada", color: "bg-green-500/10 text-green-700 border-green-200", icon: CheckCircle },
  RECHAZADA: { label: "Rechazada", color: "bg-red-500/10 text-red-700 border-red-200", icon: XCircle },
  // Distinto de RECHAZADA a propósito: aquella la denegó el administrador,
  // esta la canceló alguien sobre un trabajo que ya existía. Con un solo
  // rótulo, el cliente veía "Rechazada" sobre algo que canceló él.
  CANCELADA: { label: "Cancelada", color: "bg-slate-500/10 text-slate-700 border-slate-200", icon: Ban },
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
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [cancelSolicitud, setCancelSolicitud] = useState<Solicitud | null>(null)
  const [motivoCancelacion, setMotivoCancelacion] = useState("")
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

  /**
   * Crea el mantenimiento de una solicitud que se quedó sin él.
   *
   * Una sola llamada, sin formulario intermedio: el servidor aplica las mismas
   * reglas que la creación automática. El flujo anterior redirigía a un
   * formulario precargado que no sabía si ya existía un mantenimiento, y de ahí
   * salían los duplicados.
   */
  const handleCrearMantenimiento = async (solicitud: Solicitud) => {
    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/solicitudes/${solicitud.id}/mantenimiento`, {
        method: "POST",
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Error al crear el mantenimiento")
      }

      if (result.avisoSinTecnico) {
        toast.warning(result.avisoSinTecnico)
      } else {
        toast.success(
          `Mantenimiento creado y asignado a ${result.mantenimiento.tecnicoNombre}`
        )
      }
      onRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear el mantenimiento")
    } finally {
      setIsSubmitting(false)
    }
  }

  /** Cancela la solicitud del cliente con el motivo que haya escrito. */
  const handleClientCancel = async () => {
    if (!cancelSolicitud) return

    const motivo = motivoCancelacion.trim()
    if (!motivo) {
      toast.error("Indique el motivo de la cancelación")
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/solicitudes/${cancelSolicitud.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivoCancelacion: motivo }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || "Error al cancelar")
      }

      toast.success("Solicitud cancelada")
      setCancelSolicitud(null)
      setMotivoCancelacion("")
      onRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cancelar")
    } finally {
      setIsSubmitting(false)
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
                      {/* Ver el mantenimiento que atiende la solicitud. */}
                      {solicitud.mantenimiento && (
                        <DropdownMenuItem asChild>
                          <Link href={`/mantenimientos?id=${solicitud.mantenimiento.id}`}>
                            <Wrench className="mr-2 h-4 w-4" />
                            Ver mantenimiento
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {/* Crear el mantenimiento de una solicitud que se quedó
                          sin él. Solo sobre pendientes y en revisión: una
                          aprobada anterior al cambio ya tiene su trabajo hecho
                          aunque no conserve el enlace, y ofrecérselo duplicaría
                          el mantenimiento. */}
                      {isAdmin && PUEDE_CREAR_MANTENIMIENTO.includes(solicitud.estado) && !solicitud.mantenimiento && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleCrearMantenimiento(solicitud)}>
                            <Wrench className="mr-2 h-4 w-4" />
                            Crear mantenimiento
                          </DropdownMenuItem>
                        </>
                      )}
                      {/* La puerta del cliente es el estado del MANTENIMIENTO,
                          no el de la solicitud: con la creación automática
                          ninguna llega a estar pendiente. */}
                      {!isAdmin && decidirCancelacionCliente(solicitud.mantenimiento?.estado).permitida && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setCancelSolicitud(solicitud)}
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
              {/* El mantenimiento que atiende la solicitud. */}
              {detailSolicitud.mantenimiento && (
                <div>
                  <Label className="text-muted-foreground text-xs">Mantenimiento</Label>
                  <p className="text-sm mt-1">
                    Programado para{" "}
                    {format(
                      new Date(detailSolicitud.mantenimiento.fechaProgramada),
                      "dd/MM/yyyy",
                      { locale: es }
                    )}
                    {" — "}
                    {detailSolicitud.mantenimiento.tecnico
                      ? detailSolicitud.mantenimiento.tecnico.nombre
                      : SIN_TECNICO}
                  </p>
                </div>
              )}
              {/* El motivo de la cancelación, con su autor.
                  Antes esto vivía en el campo de respuesta y se mostraba bajo
                  el rótulo "Respuesta del administrador", así que el cliente
                  veía su propia cancelación presentada como decisión ajena. */}
              {detailSolicitud.motivoCancelacion && (
                <div>
                  <Label className="text-muted-foreground text-xs">
                    Cancelada por {etiquetaDeAutor(detailSolicitud)}
                    {detailSolicitud.canceladoEn
                      ? ` el ${format(new Date(detailSolicitud.canceladoEn), "dd/MM/yyyy", { locale: es })}`
                      : ""}
                  </Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-200">
                    {detailSolicitud.motivoCancelacion}
                  </p>
                </div>
              )}
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

      {/* Cancelar la solicitud (Cliente).
          Pide confirmación y motivo: ya no cancela un papel pendiente, cancela
          un mantenimiento vivo que puede tener técnico asignado. */}
      <Dialog
        open={!!cancelSolicitud}
        onOpenChange={(abierto) => {
          if (!abierto) {
            setCancelSolicitud(null)
            setMotivoCancelacion("")
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cancelar solicitud</DialogTitle>
            <DialogDescription>
              {cancelSolicitud && (
                <>
                  Se cancelará el mantenimiento de{" "}
                  <strong>
                    {cancelSolicitud.equipo.tipo} - {cancelSolicitud.equipo.marca}
                  </strong>
                  {cancelSolicitud.mantenimiento?.tecnico
                    ? `, asignado a ${cancelSolicitud.mantenimiento.tecnico.nombre}.`
                    : "."}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>
                Motivo de la cancelación <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="¿Por qué ya no hace falta este mantenimiento?"
                className="resize-none mt-1"
                rows={3}
                value={motivoCancelacion}
                onChange={(e) => setMotivoCancelacion(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Quedará registrado y lo verá quien atienda la solicitud.
              </p>
            </div>
            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => {
                  setCancelSolicitud(null)
                  setMotivoCancelacion("")
                }}
                disabled={isSubmitting}
              >
                Volver
              </Button>
              <Button
                variant="destructive"
                onClick={handleClientCancel}
                disabled={isSubmitting || !motivoCancelacion.trim()}
              >
                Cancelar solicitud
              </Button>
            </DialogFooter>
          </div>
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
