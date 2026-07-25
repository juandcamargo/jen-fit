export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex-1 flex items-center justify-center px-4 py-10"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="font-display text-3xl italic text-[var(--color-plum-strong)]">Jen Fit</span>
        </div>
        <div className="rounded-[var(--radius-xl)] bg-[var(--color-surface)]/95 backdrop-blur-sm shadow-[var(--shadow-lg)] p-7 sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
