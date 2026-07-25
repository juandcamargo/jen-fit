"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "No pudimos crear tu cuenta.");
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError("Tu cuenta se creó, pero no pudimos iniciar sesión automáticamente. Intenta iniciar sesión.");
      router.push("/login");
      return;
    }
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Crea tu cuenta</h1>
      <p className="text-sm text-[var(--color-text-secondary)] mb-6">
        Empecemos a construir tu mejor versión, un día a la vez.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Nombre"
          type="text"
          icon="user"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
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
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          hint="Al menos 8 caracteres"
        />

        {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}

        <Button type="submit" loading={loading} className="mt-2">
          Crear cuenta
        </Button>
      </form>

      <p className="text-sm text-center text-[var(--color-text-secondary)] mt-6">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-[var(--color-plum-strong)] font-medium hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
