"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    setLoading(false);
    setMessage(data.message ?? "Si el correo existe, enviamos instrucciones.");
    setDevResetUrl(data.devResetUrl ?? null);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Recupera tu contraseña</h1>
      <p className="text-sm text-[var(--color-text-secondary)] mb-6">
        Te enviaremos instrucciones a tu correo.
      </p>

      {!message ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Correo electrónico"
            type="email"
            icon="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <Button type="submit" loading={loading} className="mt-2">
            Enviar instrucciones
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[var(--color-text-primary)] bg-[var(--color-mint-soft)] rounded-[var(--radius-md)] p-4">
            {message}
          </p>
          {devResetUrl && (
            <div className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-alt)] rounded-[var(--radius-md)] p-3 break-all">
              <p className="mb-1 font-medium text-[var(--color-text-secondary)]">
                Modo desarrollo (sin proveedor de correo configurado):
              </p>
              <Link href={devResetUrl} className="text-[var(--color-plum-strong)] underline">
                {devResetUrl}
              </Link>
            </div>
          )}
        </div>
      )}

      <p className="text-sm text-center text-[var(--color-text-secondary)] mt-6">
        <Link href="/login" className="text-[var(--color-plum-strong)] font-medium hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </div>
  );
}
