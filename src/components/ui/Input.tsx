import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { Icon, type IconName } from "@/components/icons/Icon";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: IconName;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, icon, className = "", id, ...props },
  ref
) {
  const inputId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-text-secondary)]">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
            <Icon name={icon} />
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full h-11 rounded-[var(--radius-md)] border bg-[var(--color-surface)] text-[var(--color-text-primary)]
            text-base placeholder:text-[var(--color-text-muted)] outline-none transition-colors duration-150
            ${icon ? "pl-10 pr-3.5" : "px-3.5"}
            ${error ? "border-[var(--color-error)]" : "border-[var(--color-border)] focus:border-[var(--color-rose-strong)]"}
            ${className}`}
          {...props}
        />
      </div>
      {error && (
        <p className="text-xs text-[var(--color-error)] flex items-center gap-1">
          <Icon name="warning" className="text-[10px]" />
          {error}
        </p>
      )}
      {hint && !error && <p className="text-xs text-[var(--color-text-muted)]">{hint}</p>}
    </div>
  );
});
