"use client"

import { MoreHorizontal, Wrench, Calendar, User, Building2, FileText, AlertTriangle, Clock } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"
import type { Mantenimiento } from "@/types/mantenimiento"
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
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useState } from "react"


interface MantenimientosTableProps {
  mantenimientos: Mantenimiento[]
  onEdit: (mantenimiento: Mantenimiento) => void
  onDelete: (id: string) => void
  userRole?: "ADMIN" | "TECNICO" | "CLIENTE"
}

const estadoConfig = {
  PROGRAMADO: { label: "Programado", color: "bg-blue-500/10 text-blue-700 border-blue-200" },
  EN_PROCESO: { label: "En Proceso", color: "bg-yellow-500/10 text-yellow-700 border-yellow-200" },
  COMPLETADO: { label: "Completado", color: "bg-green-500/10 text-green-700 border-green-200" },
  CANCELADO: { label: "Cancelado", color: "bg-gray-500/10 text-gray-700 border-gray-200" },
}

const tipoConfig = {
  PREVENTIVO: { label: "Preventivo", color: "bg-blue-500/10 text-blue-700 border-blue-200" },
  CORRECTIVO: { label: "Correctivo", color: "bg-orange-500/10 text-orange-700 border-orange-200" },
}

// Función para calcular el estado de alerta
function getAlertStatus(mantenimiento: Mantenimiento): { tipo: "ATRASADO" | "PROXIMO" | null; dias: number } {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const fechaProgramada = new Date(mantenimiento.fechaProgramada)
  fechaProgramada.setHours(0, 0, 0, 0)

  const diffTime = fechaProgramada.getTime() - hoy.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  // Si ya está completado o cancelado, no hay alerta
  if (mantenimiento.estado === "COMPLETADO" || mantenimiento.estado === "CANCELADO") {
    return { tipo: null, dias: diffDays }
  }

  // Atrasado: fecha pasada y aún no completado
  if (diffDays < 0 && (mantenimiento.estado === "PROGRAMADO" || mantenimiento.estado === "EN_PROCESO")) {
    return { tipo: "ATRASADO", dias: Math.abs(diffDays) }
  }

  // Próximo: en los próximos 3 días y programado
  if (diffDays >= 0 && diffDays <= 3 && mantenimiento.estado === "PROGRAMADO") {
    return { tipo: "PROXIMO", dias: diffDays }
  }

  return { tipo: null, dias: diffDays }
}

export function MantenimientosTable({
  mantenimientos,
  onEdit,
  onDelete,
  userRole = "CLIENTE"
}: MantenimientosTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const canEdit = userRole === "ADMIN" || userRole === "TECNICO"
  const canDelete = userRole === "ADMIN"

  const handleDeleteClick = (id: string) => {
    setDeleteId(id)
  }

  const handleDeleteConfirm = () => {
    if (deleteId) {
      onDelete(deleteId)
      setDeleteId(null)
    }
  }

  if (mantenimientos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Wrench className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-lg font-medium text-muted-foreground">
          No hay mantenimientos registrados
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Comienza creando un nuevo mantenimiento
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
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Equipo</TableHead>
              <TableHead className="hidden lg:table-cell">Empresa</TableHead>
              <TableHead className="hidden md:table-cell">Técnico</TableHead>
              <TableHead>Fecha Prog.</TableHead>
              <TableHead className="hidden sm:table-cell">Fecha Real.</TableHead>
              <TableHead className="text-center hidden sm:table-cell">Reporte</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mantenimientos.map((mantenimiento) => {
              const alertStatus = getAlertStatus(mantenimiento)
              const rowClass = alertStatus.tipo === "ATRASADO"
                ? "bg-red-50 hover:bg-red-100"
                : alertStatus.tipo === "PROXIMO"
                  ? "bg-yellow-50 hover:bg-yellow-100"
                  : ""

              return (
              <TableRow key={mantenimiento.id} className={rowClass}>
                <TableCell className="w-[40px] px-2">
                  {alertStatus.tipo && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link href="/alertas" className="block">
                          {alertStatus.tipo === "ATRASADO" ? (
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white">
                              <AlertTriangle className="h-4 w-4" />
                            </div>
                          ) : (
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-white">
                              <Clock className="h-4 w-4" />
                            </div>
                          )}
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>
                        {alertStatus.tipo === "ATRASADO"
                          ? `Atrasado ${alertStatus.dias} día${alertStatus.dias > 1 ? "s" : ""}`
                          : alertStatus.dias === 0
                            ? "Programado para hoy"
                            : `En ${alertStatus.dias} día${alertStatus.dias > 1 ? "s" : ""}`
                        }
                      </TooltipContent>
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={tipoConfig[mantenimiento.tipo].color}>
                    {tipoConfig[mantenimiento.tipo].label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={estadoConfig[mantenimiento.estado].color}>
                    {estadoConfig[mantenimiento.estado].label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">
                      {mantenimiento.equipo.tipo}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {mantenimiento.equipo.marca} {mantenimiento.equipo.modelo || ""}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      S/N: {mantenimiento.equipo.serial}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{mantenimiento.equipo.empresa.nombre}</span>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{mantenimiento.tecnico.nombre}</span>
                      <span className="text-xs text-muted-foreground">{mantenimiento.tecnico.email}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {format(new Date(mantenimiento.fechaProgramada), "dd/MM/yyyy", { locale: es })}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {mantenimiento.fechaRealizada ? (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-green-600" />
                      <span className="text-sm">
                        {format(new Date(mantenimiento.fechaRealizada), "dd/MM/yyyy", { locale: es })}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center hidden sm:table-cell">
                  {mantenimiento.reporteUrl ? (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a
                        href={mantenimiento.reporteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        Ver PDF
                      </a>
                    </Button>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canEdit && (
                        <DropdownMenuItem onClick={() => onEdit(mantenimiento)}>
                          Editar
                        </DropdownMenuItem>
                      )}
                      {canDelete && (
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(mantenimiento.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          Eliminar
                        </DropdownMenuItem>
                      )}
                      {!canEdit && !canDelete && (
                        <DropdownMenuItem disabled>
                          Sin acciones disponibles
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El mantenimiento será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
