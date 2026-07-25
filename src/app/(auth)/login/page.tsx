"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError("Correo o contraseña incorrectos.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Bienvenida de nuevo</h1>
      <p className="text-sm text-[var(--color-text-secondary)] mb-6">
        Continúa cuidando tu progreso.
      </p>

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
        <Input
          label="Contraseña"
          type="password"
          icon="lock"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}

        <div className="flex justify-end -mt-2">
          <Link href="/forgot-password" className="text-sm text-[var(--color-plum-strong)] hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <Button type="submit" loading={loading} className="mt-2">
          Iniciar sesión
        </Button>
      </form>

      <p className="text-sm text-center text-[var(--color-text-secondary)] mt-6">
        ¿Primera vez aquí?{" "}
        <Link href="/register" className="text-[var(--color-plum-strong)] font-medium hover:underline">
          Crea tu cuenta
        </Link>
      </p>
    </div>
  );
}
