import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const maintenanceData = [
  {
    id: "MNT-1247",
    equipo: "Compresor A-203",
    tecnico: "Carlos Ruiz",
    estado: "Completado",
    fecha: "2025-01-03",
  },
  {
    id: "MNT-1246",
    equipo: "Bomba B-105",
    tecnico: "Ana García",
    estado: "En Proceso",
    fecha: "2025-01-02",
  },
  {
    id: "MNT-1245",
    equipo: "Motor M-458",
    tecnico: "Luis Torres",
    estado: "Pendiente",
    fecha: "2025-01-02",
  },
  {
    id: "MNT-1244",
    equipo: "Caldero C-301",
    tecnico: "María López",
    estado: "Completado",
    fecha: "2025-01-01",
  },
  {
    id: "MNT-1243",
    equipo: "Ventilador V-112",
    tecnico: "Pedro Sánchez",
    estado: "Completado",
    fecha: "2024-12-30",
  },
]

const getStatusColor = (status: string) => {
  switch (status) {
    case "Completado":
      return "bg-chart-3/20 text-chart-3 border-chart-3/30"
    case "En Proceso":
      return "bg-chart-1/20 text-chart-1 border-chart-1/30"
    case "Pendiente":
      return "bg-chart-5/20 text-chart-5 border-chart-5/30"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export function MaintenanceTable() {
  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border">
            <TableHead className="text-muted-foreground">ID</TableHead>
            <TableHead className="text-muted-foreground">Equipo</TableHead>
            <TableHead className="text-muted-foreground">Técnico</TableHead>
            <TableHead className="text-muted-foreground">Estado</TableHead>
            <TableHead className="text-muted-foreground">Fecha</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {maintenanceData.map((item) => (
            <TableRow key={item.id} className="border-border">
              <TableCell className="font-mono text-sm text-foreground">{item.id}</TableCell>
              <TableCell className="font-medium text-foreground">{item.equipo}</TableCell>
              <TableCell className="text-muted-foreground">{item.tecnico}</TableCell>
              <TableCell>
                <Badge variant="outline" className={getStatusColor(item.estado)}>
                  {item.estado}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(item.fecha).toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
