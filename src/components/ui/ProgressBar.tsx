export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100))
  return (
    <div
      className="h-4 w-full overflow-hidden rounded-full bg-[var(--primary)]/15"
      role="progressbar"
      aria-valuenow={Math.min(value, max)}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
