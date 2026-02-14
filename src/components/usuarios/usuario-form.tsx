"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createUserSchema, updateUserSchema, type CreateUserInput } from "@/lib/validations/user"
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
  FormDescription,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, RefreshCw } from "lucide-react"

interface UsuarioFormProps {
  usuario?: {
    id: string
    email: string
    nombre: string
    role: "ADMIN" | "TECNICO" | "CLIENTE"
    empresaId: string | null
    activo: boolean
  }
  empresas: Array<{ id: string; nombre: string }>
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => Promise<void>
  isLoading?: boolean
}

function generatePassword(length: number = 12): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  const symbols = '!@#$%^&*'
  const all = lowercase + uppercase + numbers + symbols

  let password = ''
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += symbols[Math.floor(Math.random() * symbols.length)]

  for (let i = 4; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)]
  }

  return password.split('').sort(() => Math.random() - 0.5).join('')
}

export function UsuarioForm({
  usuario,
  empresas,
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
}: UsuarioFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const isEditing = !!usuario

  const form = useForm<CreateUserInput>({
    resolver: zodResolver(isEditing ? updateUserSchema : createUserSchema),
    defaultValues: {
      email: "",
      nombre: "",
      password: "",
      role: "TECNICO",
      empresaId: null,
      activo: true,
    },
  })

  const selectedRole = form.watch("role")

  useEffect(() => {
    if (usuario) {
      form.reset({
        email: usuario.email,
        nombre: usuario.nombre,
        password: "", // No mostrar contraseña en edición
        role: usuario.role,
        empresaId: usuario.empresaId,
        activo: usuario.activo,
      })
    } else {
      const generatedPassword = generatePassword()
      form.reset({
        email: "",
        nombre: "",
        password: generatedPassword,
        role: "TECNICO",
        empresaId: null,
        activo: true,
      })
    }
  }, [usuario, form])

  const handleGeneratePassword = () => {
    const newPassword = generatePassword()
    form.setValue("password", newPassword)
  }

  const handleSubmit = async (data: any) => {
    await onSubmit(data)
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Usuario" : "Nuevo Usuario"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Actualiza la información del usuario"
              : "Completa los datos para registrar un nuevo usuario. Se generará una contraseña temporal."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nombre Completo *</FormLabel>
                    <FormControl>
                      <Input placeholder="Juan Pérez" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="juan@empresa.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!isEditing && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Contraseña Temporal *</FormLabel>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <FormControl>
                            <Input
                              type={showPassword ? "text" : "password"}
                              {...field}
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleGeneratePassword}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormDescription>
                        Guarda esta contraseña, el usuario deberá cambiarla en su primer inicio de sesión
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un rol" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ADMIN">Administrador</SelectItem>
                        <SelectItem value="TECNICO">Técnico</SelectItem>
                        <SelectItem value="CLIENTE">Cliente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="empresaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa {(selectedRole === "CLIENTE" || selectedRole === "TECNICO") && "*"}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value || undefined}
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione una empresa" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {selectedRole !== "TECNICO" && (
                          <SelectItem value="null">Sin empresa</SelectItem>
                        )}
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

              <FormField
                control={form.control}
                name="activo"
                render={({ field }) => (
                  <FormItem className="col-span-2 flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Usuario Activo</FormLabel>
                      <FormDescription>
                        Los usuarios inactivos no podrán iniciar sesión
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
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
                {isLoading ? "Guardando..." : isEditing ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
