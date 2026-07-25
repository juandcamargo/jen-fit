"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Icon } from "@/components/icons/Icon";
import { PRIMARY_NAV, FULL_NAV } from "./navItems";

interface AppShellProps {
  children: React.ReactNode;
  userName: string;
  level: number;
  levelName: string;
  fitPoints: number;
  loggingStreak: number;
}

export function AppShell({ children, userName, level, levelName, fitPoints, loggingStreak }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex-1 flex min-h-screen bg-[var(--color-bg)]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 sticky top-0 h-screen">
        <Link href="/dashboard" className="font-display text-2xl italic text-[var(--color-plum-strong)] px-2 mb-8">
          Jen Fit
        </Link>

        <nav className="flex flex-col gap-1 flex-1">
          {FULL_NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`pressable flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium transition-colors duration-150 ${
                  active
                    ? "bg-[var(--color-plum-soft)] text-[var(--color-plum-strong)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-alt)]"
                }`}
              >
                <Icon name={item.icon} className="w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="pressable flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-alt)]"
        >
          <Icon name="logout" className="w-4" />
          Cerrar sesión
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]/85 backdrop-blur-md">
          <div className="min-w-0">
            <p className="text-sm text-[var(--color-text-secondary)] truncate">Hola, {userName.split(" ")[0]}</p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Nivel {level} · {levelName}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge icon="streak" value={loggingStreak} color="var(--color-coral)" />
            <Badge icon="gem" value={fitPoints} color="var(--color-plum)" />
            <button
              onClick={() => router.push("/settings")}
              className="pressable w-9 h-9 rounded-full bg-[var(--color-bg-alt)] flex items-center justify-center text-[var(--color-text-secondary)] md:hidden"
              aria-label="Configuración"
            >
              <Icon name="settings" />
            </button>
          </div>
        </header>

        <main className="flex-1 pb-24 md:pb-8">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[var(--color-surface)]/90 backdrop-blur-md border-t border-[var(--color-border)] px-2 py-2 flex justify-around">
        {PRIMARY_NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className="pressable flex flex-col items-center gap-1 px-3 py-1.5 rounded-[var(--radius-md)] min-w-[56px]"
            >
              <Icon
                name={item.icon}
                className={active ? "text-[var(--color-plum-strong)]" : "text-[var(--color-text-muted)]"}
              />
              <span
                className={`text-[10px] font-medium ${
                  active ? "text-[var(--color-plum-strong)]" : "text-[var(--color-text-muted)]"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function Badge({ icon, value, color }: { icon: "streak" | "gem"; value: number; color: string }) {
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold"
      style={{ background: "var(--color-bg-alt)", color }}
    >
      <Icon name={icon} />
      {value}
    </div>
  );
}
