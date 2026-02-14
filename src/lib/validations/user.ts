import { z } from "zod"

export const createUserSchema = z.object({
  email: z.string().email("Email inválido").max(100, "Máximo 100 caracteres"),
  nombre: z.string().min(1, "El nombre es requerido").max(100, "Máximo 100 caracteres"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").max(100, "Máximo 100 caracteres"),
  role: z.enum(["ADMIN", "TECNICO", "CLIENTE"]),
  empresaId: z.string().optional().nullable(),
  activo: z.boolean().default(true),
}).refine((data) => {
  if ((data.role === "TECNICO" || data.role === "CLIENTE") && (!data.empresaId || data.empresaId === "null")) {
    return false
  }
  return true
}, {
  message: "La empresa es requerida para este rol",
  path: ["empresaId"],
})

export const updateUserSchema = z.object({
  email: z.string().email("Email inválido").max(100, "Máximo 100 caracteres").optional(),
  nombre: z.string().min(1, "El nombre es requerido").max(100, "Máximo 100 caracteres").optional(),
  role: z.enum(["ADMIN", "TECNICO", "CLIENTE"]).optional(),
  empresaId: z.string().optional().nullable(),
  activo: z.boolean().optional(),
}).refine((data) => {
  if ((data.role === "TECNICO" || data.role === "CLIENTE") && (!data.empresaId || data.empresaId === "null")) {
    return false
  }
  return true
}, {
  message: "La empresa es requerida para este rol",
  path: ["empresaId"],
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "La contraseña actual es requerida"),
  newPassword: z.string().min(6, "La nueva contraseña debe tener al menos 6 caracteres").max(100, "Máximo 100 caracteres"),
  confirmPassword: z.string().min(1, "Confirma la nueva contraseña"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
