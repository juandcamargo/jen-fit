import { z } from "zod"

export const registerSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(80),
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(100),
})

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Correo inválido"),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(100),
})

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Confirma tu contraseña para eliminar la cuenta"),
})
