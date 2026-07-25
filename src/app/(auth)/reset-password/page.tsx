"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(data.error ?? "No pudimos restablecer tu contraseña.");
      return;
    }
    setSuccess(true);
    setTimeout(() => router.push("/login"), 1800);
  }

  if (!token) {
    return <p className="text-sm text-[var(--color-error)]">Este enlace no es válido. Solicita uno nuevo.</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Nueva contraseña</h1>
      <p className="text-sm text-[var(--color-text-secondary)] mb-6">Elige una contraseña nueva y segura.</p>

      {success ? (
        <p className="text-sm text-[var(--color-text-primary)] bg-[var(--color-mint-soft)] rounded-[var(--radius-md)] p-4">
          Contraseña actualizada. Redirigiendo a tu inicio de sesión...
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Nueva contraseña"
            type="password"
            icon="lock"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
          <Button type="submit" loading={loading} className="mt-2">
            Restablecer contraseña
          </Button>
        </form>
      )}

      <p className="text-sm text-center text-[var(--color-text-secondary)] mt-6">
        <Link href="/login" className="text-[var(--color-plum-strong)] font-medium hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
