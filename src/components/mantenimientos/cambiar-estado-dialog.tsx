"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
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
import { Label } from "@/components/ui/label"

interface CambiarEstadoDialogProps {
  mantenimientoId: string | null
  estadoActual: string
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

export function CambiarEstadoDialog({
  mantenimientoId,
  estadoActual,
  open,
  onOpenChange,
  onSuccess,
}: CambiarEstadoDialogProps) {
  const [estado, setEstado] = useState(estadoActual)
  const [observaciones, setObservaciones] = useState("")
  const [motivoCancelacion, setMotivoCancelacion] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Cancelar exige un motivo, y sin este campo el técnico no tendría dónde
  // escribirlo: el servidor rechazaría cada intento y se quedaría sin poder
  // cancelar nada.
  const estaCancelando = estado === "CANCELADO"

  const handleSubmit = async () => {
    if (!mantenimientoId) return

    if (estado === estadoActual) {
      toast.error("Selecciona un estado diferente al actual")
      return
    }

    if (estaCancelando && !motivoCancelacion.trim()) {
      toast.error("Indique el motivo de la cancelación")
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch(`/api/mantenimientos/${mantenimientoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estado,
          observaciones: observaciones || null,
          motivoCancelacion: estaCancelando ? motivoCancelacion.trim() : undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Error al cambiar estado")
      }

      toast.success(`Estado cambiado a: ${estadoOptions.find(o => o.value === estado)?.label}`)
      onOpenChange(false)
      setObservaciones("")
      setMotivoCancelacion("")
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cambiar estado")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value) {
        setObservaciones("")
        setEstado(estadoActual)
      }
      onOpenChange(value)
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cambiar Estado</DialogTitle>
          <DialogDescription>
            Actualiza el estado de este mantenimiento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nuevo Estado</Label>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger>
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

          <div className="space-y-2">
            <Label>Observaciones (opcional)</Label>
            <Textarea
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
              <Label>
                Motivo de la cancelación <span className="text-destructive">*</span>
              </Label>
              <Textarea
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
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
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
