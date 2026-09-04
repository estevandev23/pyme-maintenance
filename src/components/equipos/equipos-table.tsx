"use client"

import { useState } from "react"
import { MoreHorizontal, Pencil, Trash2, Wrench, Building2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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

interface EquiposTableProps {
  equipos: Equipo[]
  onEdit: (equipo: Equipo) => void
  onDelete: (id: string) => void
  canEdit?: boolean
  canDelete?: boolean
}

const estadoConfig = {
  ACTIVO: { label: "Activo", variant: "default" as const, className: "bg-green-500 hover:bg-green-600" },
  INACTIVO: { label: "Inactivo", variant: "secondary" as const, className: "" },
  EN_MANTENIMIENTO: { label: "En Mantenimiento", variant: "default" as const, className: "bg-yellow-500 hover:bg-yellow-600" },
  DADO_DE_BAJA: { label: "Dado de Baja", variant: "destructive" as const, className: "" },
}

export function EquiposTable({ equipos, onEdit, onDelete, canEdit = true, canDelete = false }: EquiposTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const handleDelete = () => {
    if (deleteId) {
      onDelete(deleteId)
      setDeleteId(null)
    }
  }

  if (equipos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No hay equipos registrados</h3>
        <p className="text-sm text-muted-foreground">
          Comienza agregando tu primer equipo al sistema
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
              <TableHead>Equipo</TableHead>
              <TableHead>Serial</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-center">Manttos</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {equipos.map((equipo) => {
              const estadoInfo = estadoConfig[equipo.estado]

              return (
                <TableRow key={equipo.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <Wrench className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{equipo.tipo}</p>
                        <p className="text-xs text-muted-foreground">
                          {equipo.marca} {equipo.modelo ? `- ${equipo.modelo}` : ""}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{equipo.serial}</code>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{equipo.empresa.nombre}</p>
                        <p className="text-xs text-muted-foreground">{equipo.empresa.nit}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{equipo.ubicacion || "-"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={estadoInfo.variant}
                      className={estadoInfo.className}
                    >
                      {estadoInfo.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">
                      {equipo._count?.mantenimientos || 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {/* Sin ninguna acción disponible, el menú se abriría vacío:
                        un control que no lleva a ninguna parte se lee peor que
                        la ausencia del control. */}
                    {(canEdit || canDelete) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {canEdit && (
                          <DropdownMenuItem onClick={() => onEdit(equipo)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem
                            onClick={() => setDeleteId(equipo.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    )}
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
              Esta acción no se puede deshacer. Se eliminará permanentemente el equipo del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
