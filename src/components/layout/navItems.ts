import type { IconName } from "@/components/icons/Icon";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", label: "Inicio", icon: "home" },
  { href: "/food", label: "Nutrición", icon: "nutrition" },
  { href: "/exercise", label: "Ejercicio", icon: "strength" },
  { href: "/progress", label: "Progreso", icon: "progress" },
  { href: "/profile", label: "Perfil", icon: "profile" },
];

export const FULL_NAV: NavItem[] = [
  { href: "/dashboard", label: "Inicio", icon: "home" },
  { href: "/food", label: "Nutrición", icon: "nutrition" },
  { href: "/water", label: "Agua", icon: "water" },
  { href: "/supplements", label: "Suplementos", icon: "supplements" },
  { href: "/exercise", label: "Ejercicio", icon: "strength" },
  { href: "/progress", label: "Progreso", icon: "progress" },
  { href: "/achievements", label: "Logros", icon: "achievements" },
  { href: "/challenges", label: "Retos", icon: "target" },
  { href: "/calendar", label: "Calendario", icon: "calendar" },
  { href: "/history", label: "Historial", icon: "history" },
  { href: "/profile", label: "Perfil", icon: "profile" },
  { href: "/settings", label: "Configuración", icon: "settings" },
];
