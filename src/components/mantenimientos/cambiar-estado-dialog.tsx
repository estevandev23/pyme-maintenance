"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, FileText, X, Building2, Wrench, User } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { esMantenimientoAbierto } from "@/lib/estados-mantenimiento"
import { SIN_TECNICO, SIN_TECNICO_DETALLE } from "@/lib/tecnico-asignado"
import type { Mantenimiento } from "@/types/mantenimiento"

/**
 * Donde el técnico registra el avance de un mantenimiento suyo.
 *
 * Una sola vista: los datos que necesita para decidir —el equipo, la empresa y
 * lo que el cliente pidió— junto a los campos con los que decide. Antes estaban
 * en dos pantallas distintas, así que al elegir el estado no tenía delante nada
 * sobre lo que estaba decidiendo.
 *
 * Lo que se muestra en lectura es dato, no control. En particular el técnico
 * asignado: verlo sí, cambiarlo no, porque repartir el trabajo es del
 * administrador y del reparto automático.
 */
interface CambiarEstadoDialogProps {
  mantenimiento: Mantenimiento | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const estadoOptions = [
  { value: "PROGRAMADO", label: "Programado" },
  { value: "EN_PROCESO", label: "En Proceso" },
  { value: "COMPLETADO", label: "Completado" },
  { value: "CANCELADO", label: "Cancelado" },
]

const tipoLabel: Record<string, string> = {
  PREVENTIVO: "Preventivo",
  CORRECTIVO: "Correctivo",
}

/** Un dato de contexto: se lee, no se toca. */
function Dato({
  etiqueta,
  children,
}: {
  etiqueta: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
      <div className="mt-0.5 text-sm font-medium">{children}</div>
    </div>
  )
}

export function CambiarEstadoDialog({
  mantenimiento,
  open,
  onOpenChange,
  onSuccess,
}: CambiarEstadoDialogProps) {
  const [estado, setEstado] = useState("")
  const [tipo, setTipo] = useState("")
  const [observaciones, setObservaciones] = useState("")
  const [motivoCancelacion, setMotivoCancelacion] = useState("")
  const [reporteUrl, setReporteUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  // El reporte se aplica en el acto, pero la lista no puede recargarse mientras
  // el diálogo sigue abierto: la recarga deja la página en estado de carga, que
  // desmonta la tabla y con ella este diálogo. El técnico perdía lo que hubiera
  // escrito solo por adjuntar. Se avisa al cerrar.
  const [reporteCambiado, setReporteCambiado] = useState(false)

  // El diálogo se monta una sola vez en la tabla y se reutiliza para cada fila,
  // así que los valores iniciales tienen que rehacerse cada vez que cambia el
  // mantenimiento. Tomarlos solo en el primer render dejaba el selector de
  // estado vacío, porque entonces todavía no había ninguno elegido.
  useEffect(() => {
    if (!open || !mantenimiento) return
    setEstado(mantenimiento.estado)
    setTipo(mantenimiento.tipo)
    setObservaciones(mantenimiento.observaciones ?? "")
    setMotivoCancelacion("")
    setReporteUrl(mantenimiento.reporteUrl)
    setSelectedFile(null)
    setReporteCambiado(false)
  }, [mantenimiento, open])

  /** Cierra, y solo entonces avisa de que el reporte cambió. */
  const cerrar = (abierto: boolean) => {
    if (!abierto && reporteCambiado) onSuccess()
    onOpenChange(abierto)
  }

  // Cancelar exige un motivo, y sin este campo el técnico no tendría dónde
  // escribirlo: el servidor rechazaría cada intento y se quedaría sin poder
  // cancelar nada.
  const estaCancelando = estado === "CANCELADO"

  // Reclasificar solo mientras el trabajo sigue abierto, medido sobre el estado
  // que el mantenimiento tiene guardado y no sobre el que se esté eligiendo en
  // el desplegable: quien está cerrando ahora mismo todavía puede corregir el
  // tipo, que es cuando por fin sabe cuál era. La regla la aplica el servidor;
  // aquí solo se evita ofrecer lo que va a rechazar.
  const puedeReclasificar = mantenimiento
    ? esMantenimientoAbierto(mantenimiento.estado)
    : false

  const rutaDelReporte = mantenimiento
    ? `/api/mantenimientos/${mantenimiento.id}/reporte`
    : null

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Vaciar el selector: si falla, volver a elegir el mismo archivo tiene que
    // volver a disparar el cambio.
    event.target.value = ""
    if (!file || !rutaDelReporte) return

    // Aviso temprano. La comprobación que decide es la del servidor, que mira
    // el contenido del archivo y no el tipo que declara el navegador.
    if (file.type !== "application/pdf") {
      toast.error("Solo se permiten archivos PDF")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("El archivo excede el tamaño máximo de 5MB")
      return
    }

    setSelectedFile(file)

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(rutaDelReporte, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al adjuntar el reporte")
      }

      const result = await response.json()
      setReporteUrl(result.url)
      setReporteCambiado(true)
      toast.success("Reporte adjuntado")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al adjuntar el reporte")
      setSelectedFile(null)
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveFile = async () => {
    if (!rutaDelReporte) return

    try {
      setUploading(true)
      const response = await fetch(rutaDelReporte, { method: "DELETE" })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al quitar el reporte")
      }

      setSelectedFile(null)
      setReporteUrl(null)
      setReporteCambiado(true)
      toast.success("Reporte quitado")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al quitar el reporte")
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async () => {
    if (!mantenimiento) return

    const cambiaEstado = estado !== mantenimiento.estado
    const cambiaTipo = puedeReclasificar && tipo !== mantenimiento.tipo
    const cambiaObservaciones =
      observaciones.trim() !== (mantenimiento.observaciones ?? "").trim()

    if (!cambiaEstado && !cambiaTipo && !cambiaObservaciones) {
      toast.error("No hay ningún cambio que guardar")
      return
    }

    if (estaCancelando && !motivoCancelacion.trim()) {
      toast.error("Indique el motivo de la cancelación")
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch(`/api/mantenimientos/${mantenimiento.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estado,
          observaciones: observaciones || null,
          // Solo viaja si de verdad cambia: reenviarlo en un mantenimiento ya
          // cerrado sería idéntico al valor guardado y el servidor no lo trata
          // como reclasificación, pero no tiene sentido mandarlo.
          ...(cambiaTipo ? { tipo } : {}),
          motivoCancelacion: estaCancelando ? motivoCancelacion.trim() : undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Error al guardar")
      }

      toast.success("Mantenimiento actualizado")
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar")
    } finally {
      setIsLoading(false)
    }
  }

  const equipo = mantenimiento?.equipo

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar avance</DialogTitle>
          <DialogDescription>
            Actualiza el estado de este mantenimiento
          </DialogDescription>
        </DialogHeader>

        {mantenimiento && (
          <div className="space-y-4 py-2">
            {/* Contexto en lectura. Sin esto el técnico elegía el estado sin
                tener delante sobre qué equipo estaba decidiendo. */}
            <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Wrench className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {equipo?.tipo} {equipo?.marca}
                    {equipo?.modelo ? ` ${equipo.modelo}` : ""}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground break-all">
                    S/N: {equipo?.serial}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Dato etiqueta="Empresa">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{equipo?.empresa.nombre}</span>
                  </span>
                </Dato>

                {/* Dato, no control: el técnico lo ve y no lo cambia. Un
                    selector deshabilitado se leería peor y no recibiría foco. */}
                <Dato etiqueta="Técnico asignado">
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {mantenimiento.tecnico ? (
                      <span className="truncate">{mantenimiento.tecnico.nombre}</span>
                    ) : (
                      <span
                        className="italic text-muted-foreground"
                        title={SIN_TECNICO_DETALLE}
                      >
                        {SIN_TECNICO}
                      </span>
                    )}
                  </span>
                </Dato>
              </div>

              <Dato etiqueta="Descripción del cliente">
                <p className="whitespace-pre-wrap font-normal">
                  {mantenimiento.descripcion}
                </p>
              </Dato>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nuevo-estado">Nuevo Estado</Label>
                <Select value={estado} onValueChange={setEstado}>
                  <SelectTrigger id="nuevo-estado">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {estadoOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* El tipo solo se ofrece mientras el trabajo sigue abierto. En un
                  mantenimiento cerrado se muestra el valor y nada más: el
                  servidor rechazaría el cambio, y ofrecer un control que va a
                  fallar se lee como una aplicación rota. */}
              <div className="space-y-2">
                <Label htmlFor={puedeReclasificar ? "tipo-mantenimiento" : undefined}>
                  Tipo de Mantenimiento
                </Label>
                {puedeReclasificar ? (
                  <Select value={tipo} onValueChange={setTipo}>
                    <SelectTrigger id="tipo-mantenimiento">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PREVENTIVO">Preventivo</SelectItem>
                      <SelectItem value="CORRECTIVO">Correctivo</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex h-9 items-center text-sm font-medium">
                    {tipoLabel[mantenimiento.tipo] ?? mantenimiento.tipo}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones (opcional)</Label>
              <Textarea
                id="observaciones"
                placeholder="Notas sobre el cambio de estado..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Cancelar exige motivo. Campo propio y no las observaciones,
                porque aquellas se borran cada vez que alguien cambia el estado
                con la caja vacía: el motivo se perdería. */}
            {estaCancelando && (
              <div className="space-y-2">
                <Label htmlFor="motivo-cancelacion">
                  Motivo de la cancelación <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="motivo-cancelacion"
                  placeholder="¿Por qué no se va a hacer este mantenimiento?"
                  value={motivoCancelacion}
                  onChange={(e) => setMotivoCancelacion(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Quedará registrado y lo verá el cliente que lo solicitó.
                </p>
              </div>
            )}

            {/* El reporte va por su propia ruta y se aplica en el acto, no al
                guardar: el archivo tiene dueño desde que se acepta. */}
            <div className="space-y-2">
              <Label htmlFor="reporte">Reporte PDF (Opcional)</Label>
              {!reporteUrl ? (
                <div className="flex items-center gap-2">
                  <Input
                    id="reporte"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    disabled={uploading}
                    className="flex-1"
                  />
                  {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 text-sm truncate">
                    {selectedFile?.name || "Reporte adjunto"}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveFile}
                    disabled={uploading}
                    aria-label="Quitar reporte"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Formatos aceptados: PDF. Tamaño máximo: 5MB
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => cerrar(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || (estaCancelando && !motivoCancelacion.trim())}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
