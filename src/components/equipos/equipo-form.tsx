"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { equipoSchema, type EquipoInput } from "@/lib/validations/equipo"
import { Button } from "@/components/ui/button"
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

interface EquipoFormProps {
  equipo?: {
    id: string
    tipo: string
    marca: string
    modelo: string | null
    serial: string
    estado: "ACTIVO" | "INACTIVO" | "EN_MANTENIMIENTO" | "DADO_DE_BAJA"
    ubicacion: string | null
    empresaId: string
  }
  empresas: Array<{ id: string; nombre: string }>
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: EquipoInput) => Promise<void>
  isLoading?: boolean
  isCliente?: boolean
  clienteEmpresaId?: string
}

export function EquipoForm({
  equipo,
  empresas,
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
  isCliente = false,
  clienteEmpresaId,
}: EquipoFormProps) {
  const form = useForm<EquipoInput>({
    resolver: zodResolver(equipoSchema),
    defaultValues: {
      tipo: "",
      marca: "",
      modelo: "",
      serial: "",
      estado: "ACTIVO",
      ubicacion: "",
      empresaId: "",
    },
  })

  useEffect(() => {
    if (equipo) {
      form.reset({
        tipo: equipo.tipo,
        marca: equipo.marca,
        modelo: equipo.modelo || "",
        serial: equipo.serial,
        estado: equipo.estado,
        ubicacion: equipo.ubicacion || "",
        empresaId: equipo.empresaId,
      })
    } else {
      form.reset({
        tipo: "",
        marca: "",
        modelo: "",
        serial: "",
        estado: "ACTIVO",
        ubicacion: "",
        empresaId: clienteEmpresaId || (empresas.length === 1 ? empresas[0].id : ""),
      })
    }
  }, [equipo, empresas, form, clienteEmpresaId])

  const handleSubmit = async (data: EquipoInput) => {
    await onSubmit(data)
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>
            {equipo ? "Editar Equipo" : "Nuevo Equipo"}
          </DialogTitle>
          <DialogDescription>
            {equipo
              ? "Actualiza la información del equipo"
              : "Completa los datos para registrar un nuevo equipo"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Equipo *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Laptop, PC Escritorio, Servidor" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="marca"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Dell, HP, Lenovo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="modelo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Latitude 5420" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serial"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serial *</FormLabel>
                    <FormControl>
                      <Input placeholder="Número de serie único" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="empresaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                      disabled={isCliente}
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              {equipo && !isCliente && (
                <FormField
                  control={form.control}
                  name="estado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un estado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ACTIVO">Activo</SelectItem>
                          <SelectItem value="INACTIVO">Inactivo</SelectItem>
                          <SelectItem value="EN_MANTENIMIENTO">En Mantenimiento</SelectItem>
                          <SelectItem value="DADO_DE_BAJA">Dado de Baja</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="ubicacion"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Ubicación</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Oficina 301, Sala de Servidores"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                {isLoading ? "Guardando..." : equipo ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
