import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Mantenimiento {
  id: string
  tipo: string
  estado: string
  fechaProgramada: Date
  equipo: {
    tipo: string
    marca: string
    modelo: string | null
    serial: string
    empresa: {
      nombre: string
    }
  }
  tecnico: {
    nombre: string
  }
}

interface MaintenanceTableProps {
  data: Mantenimiento[]
}

const estadoConfig: Record<string, { label: string; color: string }> = {
  PROGRAMADO: { label: "Programado", color: "bg-blue-500/10 text-blue-700 border-blue-200" },
  EN_PROCESO: { label: "En Proceso", color: "bg-yellow-500/10 text-yellow-700 border-yellow-200" },
  COMPLETADO: { label: "Completado", color: "bg-green-500/10 text-green-700 border-green-200" },
  CANCELADO: { label: "Cancelado", color: "bg-gray-500/10 text-gray-700 border-gray-200" },
}

const tipoConfig: Record<string, { label: string; color: string }> = {
  PREVENTIVO: { label: "Preventivo", color: "bg-blue-500/10 text-blue-700 border-blue-200" },
  CORRECTIVO: { label: "Correctivo", color: "bg-orange-500/10 text-orange-700 border-orange-200" },
}

export function MaintenanceTable({ data }: MaintenanceTableProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">No hay mantenimientos próximos</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border">
            <TableHead className="text-muted-foreground">Tipo</TableHead>
            <TableHead className="text-muted-foreground">Equipo</TableHead>
            <TableHead className="text-muted-foreground">Empresa</TableHead>
            <TableHead className="text-muted-foreground">Técnico</TableHead>
            <TableHead className="text-muted-foreground">Estado</TableHead>
            <TableHead className="text-muted-foreground">Fecha Programada</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.id} className="border-border">
              <TableCell>
                <Badge variant="outline" className={tipoConfig[item.tipo]?.color || "bg-muted"}>
                  {tipoConfig[item.tipo]?.label || item.tipo}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">
                    {item.equipo.tipo}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {item.equipo.marca} {item.equipo.modelo || ""}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {item.equipo.empresa.nombre}
              </TableCell>
              <TableCell className="text-muted-foreground">{item.tecnico.nombre}</TableCell>
              <TableCell>
                <Badge variant="outline" className={estadoConfig[item.estado]?.color || "bg-muted"}>
                  {estadoConfig[item.estado]?.label || item.estado}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(item.fechaProgramada), "dd MMM yyyy", { locale: es })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
