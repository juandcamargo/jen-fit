import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons/Icon";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "mint";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconPosition?: "left" | "right";
  loading?: boolean;
  children?: ReactNode;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "text-white bg-[linear-gradient(135deg,var(--color-plum-strong),var(--color-plum))] shadow-[var(--shadow-glow-plum)] hover:brightness-105",
  secondary:
    "bg-[var(--color-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-[var(--color-bg-alt)]",
  ghost: "bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-plum-soft)]",
  danger: "bg-[var(--color-error)] text-white hover:brightness-105",
  mint: "bg-[var(--color-mint)] text-white hover:brightness-105",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5 rounded-[var(--radius-sm)]",
  md: "h-11 px-5 text-sm gap-2 rounded-[var(--radius-md)]",
  lg: "h-13 px-6 text-base gap-2.5 rounded-[var(--radius-md)]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    icon,
    iconPosition = "left",
    loading = false,
    className = "",
    children,
    disabled,
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`pressable inline-flex items-center justify-center font-medium
        transition-[transform,filter,opacity] duration-150 ease-[var(--ease-out)]
        disabled:opacity-50 disabled:pointer-events-none
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-rose-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]
        ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <Icon name="spinner" className="animate-spin" />
      ) : (
        <>
          {icon && iconPosition === "left" && <Icon name={icon} />}
          {children}
          {icon && iconPosition === "right" && <Icon name={icon} />}
        </>
      )}
    </button>
  );
});
