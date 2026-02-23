"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { solicitudSchema, type SolicitudInput } from "@/lib/validations/solicitud"
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
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

interface SolicitudFormProps {
  equipos: Array<{
    id: string
    tipo: string
    marca: string
    modelo: string | null
    serial: string
    estado: string
  }>
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: SolicitudInput) => Promise<void>
  isLoading: boolean
}

export function SolicitudForm({
  equipos,
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: SolicitudFormProps) {
  const form = useForm<SolicitudInput>({
    resolver: zodResolver(solicitudSchema),
    defaultValues: {
      equipoId: "",
      descripcion: "",
      prioridad: "MEDIA",
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        equipoId: "",
        descripcion: "",
        prioridad: "MEDIA",
      })
    }
  }, [open, form])

  const handleSubmit = async (data: SolicitudInput) => {
    await onSubmit(data)
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Reportar Problema</DialogTitle>
          <DialogDescription>
            Describe el problema que presenta tu equipo. Nuestro equipo lo revisará y programará el mantenimiento.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="equipoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Equipo con problema *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el equipo afectado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {equipos.length > 0 ? (
                        equipos.map((equipo) => (
                          <SelectItem key={equipo.id} value={equipo.id}>
                            {equipo.tipo} - {equipo.marca} {equipo.modelo || ""} (S/N: {equipo.serial})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no_equipos" disabled>
                          Sin equipos registrados
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="prioridad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prioridad *</FormLabel>
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
                      <SelectItem value="BAJA">🟢 Baja — No es urgente</SelectItem>
                      <SelectItem value="MEDIA">🟡 Media — Afecta el trabajo</SelectItem>
                      <SelectItem value="ALTA">🟠 Alta — Urgente</SelectItem>
                      <SelectItem value="URGENTE">🔴 Urgente — Equipo inoperativo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>¿Qué problema presenta el equipo? *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe el problema: qué ocurre, cuándo empezó, mensajes de error, etc."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
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
                Enviar Solicitud
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
