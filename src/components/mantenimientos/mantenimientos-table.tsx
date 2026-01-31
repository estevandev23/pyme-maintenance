"use client"

import { MoreHorizontal, Wrench, Calendar, User, Building2, FileText } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
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
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Equipo</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Técnico</TableHead>
              <TableHead>Fecha Programada</TableHead>
              <TableHead>Fecha Realizada</TableHead>
              <TableHead className="text-center">Reporte</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mantenimientos.map((mantenimiento) => (
              <TableRow key={mantenimiento.id}>
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
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{mantenimiento.equipo.empresa.nombre}</span>
                  </div>
                </TableCell>
                <TableCell>
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
                <TableCell>
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
                <TableCell className="text-center">
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
                        <span className="hidden sm:inline">Ver PDF</span>
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
            ))}
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
