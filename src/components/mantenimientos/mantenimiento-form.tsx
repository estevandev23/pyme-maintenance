"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { CalendarIcon, Loader2, FileText, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { mantenimientoSchema, type MantenimientoInput } from "@/lib/validations/mantenimiento"
import { toast } from "sonner"
import type { Mantenimiento } from "@/types/mantenimiento"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"


/**
 * Valor centinela del selector de técnico: delega la elección en el reparto
 * automático del servidor. Se traduce a "sin técnico" al enviar.
 *
 * Solo se ofrece al CREAR: al editar, el campo ausente significaría "no toques
 * el técnico", no "vuelve a repartir".
 */
const ASIGNACION_AUTOMATICA = "__automatica__"

/**
 * Valor centinela para dejar el mantenimiento sin técnico.
 *
 * Solo se ofrece al EDITAR, y es una acción distinta de la asignación
 * automática aunque ambas acaben en "no hay técnico": pedir reparto es
 * delegar la elección, retirarlo es dejar el trabajo a la espera. Se traducen
 * a cosas distintas en el cuerpo de la petición —campo ausente frente a campo
 * vacío— porque el servidor no podría distinguirlas de otro modo.
 */
const RETIRAR_TECNICO = "__retirar__"

interface MantenimientoFormProps {
  mantenimiento?: Mantenimiento
  equipos: Array<{ id: string; tipo: string; marca: string; modelo: string | null; serial: string; empresaId: string; estado: string }>
  tecnicos: Array<{ id: string; nombre: string; email: string; empresaId: string | null; cargaAbierta?: number }>
  empresas: Array<{ id: string; nombre: string }>
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: MantenimientoInput) => Promise<void>
  isLoading: boolean
  clienteEmpresaId?: string
  /**
   * Avisa de que el reporte cambió: se adjuntó o se quitó. El archivo se
   * escribe en el servidor en el acto, sin esperar a guardar el formulario, así
   * que el listado tiene que enterarse aunque el diálogo se cierre sin guardar.
   */
  onReporteCambiado?: () => void
}

/** La API devuelve las fechas como cadena ISO; el formulario solo quiere el día. */
function soloFecha(valor: string | Date): string {
  return (typeof valor === "string" ? valor : valor.toISOString()).split("T")[0]
}

export function MantenimientoForm({
  mantenimiento,
  equipos,
  tecnicos,
  empresas,
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  clienteEmpresaId,
  onReporteCambiado,
}: MantenimientoFormProps) {
  const [fechaProgramadaOpen, setFechaProgramadaOpen] = useState(false)
  const [fechaRealizadaOpen, setFechaRealizadaOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  /** Dirección de descarga del reporte adjunto, o null si no lo hay. */
  const [reporteUrl, setReporteUrl] = useState<string | null>(null)
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>("")

  const form = useForm<MantenimientoInput>({
    resolver: zodResolver(mantenimientoSchema),
    defaultValues: {
      equipoId: "",
      tecnicoId: ASIGNACION_AUTOMATICA,
      tipo: "PREVENTIVO",
      estado: "PROGRAMADO",
      fechaProgramada: "",
      fechaRealizada: null,
      descripcion: "",
      observaciones: null,
    },
  })

  useEffect(() => {
    if (mantenimiento) {
      form.reset({
        equipoId: mantenimiento.equipoId,
        // Un mantenimiento sin técnico abre el selector en la opción de
        // retirada, que es la que describe su estado actual. Meter el nulo
        // dejaría el selector en un estado inválido y sin etiqueta.
        tecnicoId: mantenimiento.tecnicoId ?? RETIRAR_TECNICO,
        tipo: mantenimiento.tipo,
        estado: mantenimiento.estado,
        fechaProgramada: soloFecha(mantenimiento.fechaProgramada),
        fechaRealizada: mantenimiento.fechaRealizada
          ? soloFecha(mantenimiento.fechaRealizada)
          : null,
        descripcion: mantenimiento.descripcion,
        observaciones: mantenimiento.observaciones,
      })
      setSelectedEmpresaId(mantenimiento.equipo.empresa.id)
      setReporteUrl(mantenimiento.reporteUrl)
      setSelectedFile(null)
    } else if (open) {
      form.reset({
        equipoId: "",
        tecnicoId: ASIGNACION_AUTOMATICA,
        tipo: "PREVENTIVO",
        estado: "PROGRAMADO",
        fechaProgramada: "",
        fechaRealizada: null,
        descripcion: "",
        observaciones: null,
      })
      setSelectedEmpresaId(clienteEmpresaId || "")
      setReporteUrl(null)
      setSelectedFile(null)
    }
  }, [mantenimiento, form, open, clienteEmpresaId])

  /**
   * El reporte cuelga del mantenimiento, así que solo existe su ruta al editar.
   * Al crear no hay a qué adjuntarlo todavía: se guarda primero y se adjunta
   * después.
   */
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

    // Se adjunta sobre el mantenimiento ya existente, en el acto: el archivo
    // tiene dueño desde que se acepta.
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
      toast.success("Reporte adjuntado")
      onReporteCambiado?.()
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
      toast.success("Reporte quitado")
      onReporteCambiado?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al quitar el reporte")
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (data: MantenimientoInput) => {
    // El centinela no viaja al servidor: la ausencia de técnico es lo que
    // dispara el reparto automático.
    await onSubmit({
      ...data,
      tecnicoId:
        data.tecnicoId === ASIGNACION_AUTOMATICA
          ? undefined
          : data.tecnicoId === RETIRAR_TECNICO
            ? null
            : data.tecnicoId,
    })
    form.reset()
    setSelectedFile(null)
    setReporteUrl(null)
    setSelectedEmpresaId("")
  }

  const filteredEquipos = equipos.filter((equipo) => {
    const belongsToEmpresa = !selectedEmpresaId || equipo.empresaId === selectedEmpresaId
    const isAvailable = equipo.estado !== "EN_MANTENIMIENTO" || (mantenimiento && equipo.id === mantenimiento.equipoId)
    return belongsToEmpresa && isAvailable
  })

  const filteredTecnicos = tecnicos.filter((tecnico) => {
    // Si hay una empresa seleccionada, mostrar solo técnicos de esa empresa o sin empresa (opcional para staff global)
    // Según requerimiento estricto: "solo deberían salir los tecnicos asociados a esa empresa"
    if (selectedEmpresaId) {
       return tecnico.empresaId === selectedEmpresaId
    }
    // Si no hay empresa seleccionada (al inicio), ¿mostrar todos? o ¿ninguno?
    // Mejor mostrar todos si no se ha filtrado empresa aun, o vacio.
    // Dado que el flujo obliga a seleccionar empresa primero para equipos, tiene sentido para técnicos también.
    return true
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>
            {mantenimiento ? "Editar Mantenimiento" : "Nuevo Mantenimiento"}
          </DialogTitle>
          <DialogDescription>
            {mantenimiento
              ? "Actualiza la información del mantenimiento"
              : "Completa el formulario para crear un nuevo mantenimiento"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormItem>
                <FormLabel>Empresa</FormLabel>
                <Select
                  value={selectedEmpresaId}
                  onValueChange={(value) => {
                    setSelectedEmpresaId(value)
                    form.setValue("equipoId", "")
                    // Resetear técnico al cambiar empresa
                    form.setValue(
                      "tecnicoId",
                      mantenimiento ? "" : ASIGNACION_AUTOMATICA
                    )
                  }}
                  disabled={!!mantenimiento}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una empresa" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {empresas.map((empresa) => (
                      <SelectItem key={empresa.id} value={empresa.id}>
                        {empresa.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>

              <FormField
                control={form.control}
                name="equipoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipo</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!!mantenimiento || !selectedEmpresaId}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full overflow-hidden">
                          <div className="truncate text-left">
                            {field.value ? (() => {
                              const equipo = equipos.find(e => e.id === field.value)
                              if (!equipo) return selectedEmpresaId ? "Selecciona un equipo" : "Primero selecciona empresa"
                              return `${equipo.tipo} - ${equipo.marca} ${equipo.modelo || ""} (S/N: ${equipo.serial})`
                            })() : (selectedEmpresaId ? "Selecciona un equipo" : "Primero selecciona empresa")}
                          </div>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-w-[min(calc(100vw-2rem),500px)]">
                        {filteredEquipos.map((equipo) => (
                          <SelectItem key={equipo.id} value={equipo.id}>
                            <span className="whitespace-normal wrap-break-word">
                              {equipo.tipo} - {equipo.marca} {equipo.modelo || ""} (S/N: {equipo.serial})
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="tecnicoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Técnico Asignado</FormLabel>
                   <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value ?? undefined}
                    value={field.value ?? undefined}
                    disabled={!selectedEmpresaId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={selectedEmpresaId ? "Selecciona un técnico" : "Primero selecciona empresa"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {!mantenimiento && (
                        <SelectItem value={ASIGNACION_AUTOMATICA}>
                          Asignación automática (técnico con menos carga)
                        </SelectItem>
                      )}
                      {mantenimiento && (
                        <SelectItem value={RETIRAR_TECNICO}>
                          Dejar sin técnico asignado
                        </SelectItem>
                      )}
                      {filteredTecnicos.length > 0 ? (
                        filteredTecnicos.map((tecnico) => (
                          <SelectItem key={tecnico.id} value={tecnico.id}>
                            {tecnico.nombre} ({tecnico.email})
                            {typeof tecnico.cargaAbierta === "number"
                              ? ` — ${tecnico.cargaAbierta} abierto${tecnico.cargaAbierta === 1 ? "" : "s"}`
                              : ""}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no_tecnicos" disabled>
                          Sin técnicos registrados
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Mantenimiento</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PREVENTIVO">Preventivo</SelectItem>
                        <SelectItem value="CORRECTIVO">Correctivo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PROGRAMADO">Programado</SelectItem>
                        <SelectItem value="EN_PROCESO">En Proceso</SelectItem>
                        <SelectItem value="COMPLETADO">Completado</SelectItem>
                        <SelectItem value="CANCELADO">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fechaProgramada"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha Programada</FormLabel>
                    <Popover open={fechaProgramadaOpen} onOpenChange={setFechaProgramadaOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(new Date(field.value.includes('T') ? field.value : field.value + "T00:00:00"), "dd/MM/yyyy")
                            ) : (
                              <span>Selecciona una fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          className="rounded-md border p-4 w-[320px]"
                          selected={field.value ? new Date(field.value.includes('T') ? field.value : field.value + "T00:00:00") : undefined}
                          onSelect={(date) => {
                            field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                            setFechaProgramadaOpen(false)
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fechaRealizada"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha Realizada (Opcional)</FormLabel>
                    <Popover open={fechaRealizadaOpen} onOpenChange={setFechaRealizadaOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(new Date(field.value.includes('T') ? field.value : field.value + "T00:00:00"), "dd/MM/yyyy")
                            ) : (
                              <span>Selecciona una fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          className="rounded-md border p-4 w-[320px]"
                          selected={field.value ? new Date(field.value.includes('T') ? field.value : field.value + "T00:00:00") : undefined}
                          onSelect={(date) => {
                            field.onChange(date ? format(date, "yyyy-MM-dd") : null)
                            setFechaRealizadaOpen(false)
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe el mantenimiento a realizar..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observaciones"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas adicionales sobre el mantenimiento..."
                      className="resize-none"
                      rows={3}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* El reporte solo se adjunta sobre un mantenimiento que ya existe:
                al crear no se ofrece, y se ofrece al editar. No es un campo del
                formulario: el archivo se escribe en el servidor en el acto. */}
            {mantenimiento && (
              <FormItem>
                <FormLabel>Reporte PDF (Opcional)</FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    {!reporteUrl ? (
                      <div className="flex items-center gap-2">
                        <Input
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
                </FormControl>
              </FormItem>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mantenimiento ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
