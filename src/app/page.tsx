import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Icon } from "@/components/icons/Icon";
import { Button } from "@/components/ui/Button";

export default async function Home() {
  const session = await auth();

  if (session?.user?.id) {
    const profile = await prisma.profile.findUnique({ where: { userId: session.user.id } });
    redirect(profile?.onboardingCompleted ? "/dashboard" : "/onboarding");
  }

  return (
    <div className="flex-1 flex flex-col" style={{ background: "var(--gradient-hero)" }}>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <span className="font-display text-4xl italic text-[var(--color-plum-strong)] mb-4">Jen Fit</span>
        <h1 className="font-display text-3xl sm:text-4xl max-w-xl text-[var(--color-text-primary)] mb-4">
          Tu proceso, a tu ritmo.
        </h1>
        <p className="max-w-md text-[var(--color-text-secondary)] mb-8">
          Nutrición, entrenamiento, agua e hidratación en un solo lugar —
          diseñado para acompañarte, no para juzgarte.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          <Link href="/register" className="w-full">
            <Button className="w-full">Crear cuenta</Button>
          </Link>
          <Link href="/login" className="w-full">
            <Button variant="secondary" className="w-full">
              Iniciar sesión
            </Button>
          </Link>
        </div>

        <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl w-full">
          {[
            { icon: "nutrition" as const, label: "Nutrición" },
            { icon: "streak" as const, label: "Rachas" },
            { icon: "achievements" as const, label: "Logros" },
            { icon: "progress" as const, label: "Progreso" },
          ].map((f) => (
            <div key={f.label} className="flex flex-col items-center gap-2 text-[var(--color-plum-strong)]">
              <div className="w-12 h-12 rounded-full bg-white/70 flex items-center justify-center shadow-[var(--shadow-sm)]">
                <Icon name={f.icon} />
              </div>
              <span className="text-xs font-medium text-[var(--color-text-secondary)]">{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
