"use client"

import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  Calendar,
  User,
  Building2,
  Wrench,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Ticket,
} from "lucide-react"
import Link from "next/link"
import type { Mantenimiento } from "@/types/mantenimiento"
import { SIN_TECNICO, SIN_TECNICO_DETALLE } from "@/lib/tecnico-asignado"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"

interface MantenimientoDetailProps {
  mantenimiento: Mantenimiento | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const estadoConfig = {
  PROGRAMADO: {
    label: "Programado",
    color: "bg-blue-500/10 text-blue-700 border-blue-200",
    icon: Clock,
  },
  EN_PROCESO: {
    label: "En Proceso",
    color: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
    icon: AlertCircle,
  },
  COMPLETADO: {
    label: "Completado",
    color: "bg-green-500/10 text-green-700 border-green-200",
    icon: CheckCircle2,
  },
  CANCELADO: {
    label: "Cancelado",
    color: "bg-gray-500/10 text-gray-700 border-gray-200",
    icon: XCircle,
  },
}

const tipoConfig = {
  PREVENTIVO: { label: "Preventivo", color: "bg-blue-500/10 text-blue-700 border-blue-200" },
  CORRECTIVO: { label: "Correctivo", color: "bg-orange-500/10 text-orange-700 border-orange-200" },
}

export function MantenimientoDetail({
  mantenimiento,
  open,
  onOpenChange,
}: MantenimientoDetailProps) {
  if (!mantenimiento) return null

  const EstadoIcon = estadoConfig[mantenimiento.estado].icon

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Wrench className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">Detalles del Mantenimiento</DialogTitle>
              <DialogDescription>
                Información completa del registro de mantenimiento
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Estado y Tipo */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium text-muted-foreground">Estado</label>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="outline" className={`${estadoConfig[mantenimiento.estado].color} flex items-center gap-2`}>
                  <EstadoIcon className="h-4 w-4" />
                  {estadoConfig[mantenimiento.estado].label}
                </Badge>
              </div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium text-muted-foreground">Tipo</label>
              <div className="mt-2">
                <Badge variant="outline" className={tipoConfig[mantenimiento.tipo].color}>
                  {tipoConfig[mantenimiento.tipo].label}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Información del Equipo */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Información del Equipo</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Tipo de Equipo</label>
                <p className="mt-1 font-medium">{mantenimiento.equipo.tipo}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Marca</label>
                <p className="mt-1 font-medium">{mantenimiento.equipo.marca}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Modelo</label>
                <p className="mt-1 font-medium">{mantenimiento.equipo.modelo || "N/A"}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Número de Serie</label>
                <p className="mt-1 font-mono text-sm">{mantenimiento.equipo.serial}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Empresa */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Empresa</h3>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="font-medium">{mantenimiento.equipo.empresa.nombre}</p>
            </div>
          </div>

          <Separator />

          {/* Solicitud de origen.
              Solo aparece cuando el mantenimiento nació de una: los que crea el
              administrador desde el formulario no tienen origen que mostrar. */}
          {mantenimiento.solicitud && (
            <>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Ticket className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Solicitud de origen</h3>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm">
                      Reportada el{" "}
                      {format(
                        new Date(mantenimiento.solicitud.createdAt),
                        "dd/MM/yyyy",
                        { locale: es }
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Prioridad indicada por el cliente:{" "}
                      {mantenimiento.solicitud.prioridad.toLowerCase()}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/solicitudes">Ver solicitudes</Link>
                  </Button>
                </div>
              </div>

              <Separator />
            </>
          )}

          {/* Técnico Asignado */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Técnico Asignado</h3>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              {mantenimiento.tecnico ? (
                <>
                  <p className="font-medium">{mantenimiento.tecnico.nombre}</p>
                  <p className="text-sm text-muted-foreground mt-1">{mantenimiento.tecnico.email}</p>
                </>
              ) : (
                <>
                  <p className="font-medium text-muted-foreground italic">{SIN_TECNICO}</p>
                  <p className="text-sm text-muted-foreground mt-1">{SIN_TECNICO_DETALLE}</p>
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Fechas */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Fechas</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Fecha Programada</label>
                <p className="mt-1 font-medium">
                  {format(new Date(mantenimiento.fechaProgramada), "dd/MM/yyyy", { locale: es })}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Fecha Realizada</label>
                <p className="mt-1 font-medium">
                  {mantenimiento.fechaRealizada
                    ? format(new Date(mantenimiento.fechaRealizada), "dd/MM/yyyy", { locale: es })
                    : "Pendiente"}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Descripción */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Descripción</h3>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm whitespace-pre-wrap">{mantenimiento.descripcion}</p>
            </div>
          </div>

          {/* Observaciones */}
          {mantenimiento.observaciones && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Observaciones</h3>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm whitespace-pre-wrap">{mantenimiento.observaciones}</p>
                </div>
              </div>
            </>
          )}

          {/* Reporte */}
          {mantenimiento.reporteUrl && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Reporte</h3>
                </div>
                <Button
                  variant="outline"
                  asChild
                  className="w-full sm:w-auto"
                >
                  <a
                    href={mantenimiento.reporteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Ver Reporte PDF
                  </a>
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
