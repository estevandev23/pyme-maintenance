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


interface MantenimientoFormProps {
  mantenimiento?: Mantenimiento
  equipos: Array<{ id: string; tipo: string; marca: string; modelo: string | null; serial: string }>
  tecnicos: Array<{ id: string; nombre: string; email: string }>
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: MantenimientoInput) => Promise<void>
  isLoading: boolean
}

export function MantenimientoForm({
  mantenimiento,
  equipos,
  tecnicos,
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: MantenimientoFormProps) {
  const [fechaProgramadaOpen, setFechaProgramadaOpen] = useState(false)
  const [fechaRealizadaOpen, setFechaRealizadaOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const form = useForm<MantenimientoInput>({
    resolver: zodResolver(mantenimientoSchema),
    defaultValues: {
      equipoId: "",
      tecnicoId: "",
      tipo: "PREVENTIVO",
      estado: "PROGRAMADO",
      fechaProgramada: "",
      fechaRealizada: null,
      descripcion: "",
      observaciones: null,
      reporteUrl: null,
    },
  })

  useEffect(() => {
    if (mantenimiento) {
      form.reset({
        equipoId: mantenimiento.equipoId,
        tecnicoId: mantenimiento.tecnicoId,
        tipo: mantenimiento.tipo,
        estado: mantenimiento.estado,
        fechaProgramada: format(new Date(mantenimiento.fechaProgramada), "yyyy-MM-dd"),
        fechaRealizada: mantenimiento.fechaRealizada
          ? format(new Date(mantenimiento.fechaRealizada), "yyyy-MM-dd")
          : null,
        descripcion: mantenimiento.descripcion,
        observaciones: mantenimiento.observaciones,
        reporteUrl: mantenimiento.reporteUrl,
      })
    } else {
      form.reset({
        equipoId: "",
        tecnicoId: "",
        tipo: "PREVENTIVO",
        estado: "PROGRAMADO",
        fechaProgramada: "",
        fechaRealizada: null,
        descripcion: "",
        observaciones: null,
        reporteUrl: null,
      })
    }
  }, [mantenimiento, form])

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tipo
    if (file.type !== "application/pdf") {
      toast.error("Solo se permiten archivos PDF")
      return
    }

    // Validar tamaño (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("El archivo excede el tamaño máximo de 5MB")
      return
    }

    setSelectedFile(file)

    // Subir archivo
    try {
      setUploading(true)
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al subir archivo")
      }

      const result = await response.json()
      form.setValue("reporteUrl", result.url)
      toast.success("Archivo subido exitosamente")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al subir archivo")
      setSelectedFile(null)
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    form.setValue("reporteUrl", null)
  }

  const handleSubmit = async (data: MantenimientoInput) => {
    await onSubmit(data)
    form.reset()
    setSelectedFile(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
              <FormField
                control={form.control}
                name="equipoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipo</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!!mantenimiento}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un equipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {equipos.map((equipo) => (
                          <SelectItem key={equipo.id} value={equipo.id}>
                            {equipo.tipo} - {equipo.marca} {equipo.modelo || ""} (S/N: {equipo.serial})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tecnicoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Técnico Asignado</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un técnico" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tecnicos.map((tecnico) => (
                          <SelectItem key={tecnico.id} value={tecnico.id}>
                            {tecnico.nombre} ({tecnico.email})
                          </SelectItem>
                        ))}
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
                              format(new Date(field.value), "dd/MM/yyyy")
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
                          selected={field.value ? new Date(field.value) : undefined}
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
                              format(new Date(field.value), "dd/MM/yyyy")
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
                          selected={field.value ? new Date(field.value) : undefined}
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

            <FormField
              control={form.control}
              name="reporteUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reporte PDF (Opcional)</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      {!field.value ? (
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
                  <FormMessage />
                </FormItem>
              )}
            />

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
