export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="h-4 w-full overflow-hidden rounded-full bg-[#e8f0ff]">
      <div
        className="h-full rounded-full bg-[var(--success)] transition-[width] duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
