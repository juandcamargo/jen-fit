import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { prisma } from "@/lib/prisma"
import { forgotPasswordSchema } from "@/lib/validation/auth"

/**
 * No email provider is configured in this environment, so the reset link is
 * logged server-side and (in development only) echoed back in the response
 * so the flow is testable end-to-end. Wire a real provider (Resend, SES,
 * Postmark, ...) before shipping this to production — see README.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = forgotPasswordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 })
  }

  const { email } = parsed.data
  const user = await prisma.user.findUnique({ where: { email } })

  // Always respond the same way whether or not the account exists, to avoid
  // leaking which emails are registered.
  const genericResponse = {
    ok: true,
    message: "Si el correo existe, enviamos instrucciones para restablecer la contraseña.",
  }

  if (!user || user.deletedAt) {
    return NextResponse.json(genericResponse)
  }

  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  })

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/reset-password?token=${token}`
  console.log(`[Jen Fit] Password reset link for ${email}: ${resetUrl}`)

  return NextResponse.json(
    process.env.NODE_ENV === "production" ? genericResponse : { ...genericResponse, devResetUrl: resetUrl }
  )
}
