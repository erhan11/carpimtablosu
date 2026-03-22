import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'ghost' | 'accent'

const styles: Record<Variant, string> = {
  primary:
    'bg-[var(--primary)] text-white shadow-[0_10px_0_var(--primary-shadow)] active:translate-y-[2px] active:shadow-[0_8px_0_var(--primary-shadow)]',
  ghost: 'bg-white/80 text-[var(--ink)] border-2 border-[#e6edf7]',
  accent:
    'bg-[var(--accent)] text-[#3a2f00] shadow-[0_10px_0_#d18b00] active:translate-y-[2px] active:shadow-[0_8px_0_#d18b00]',
}

export function BigButton({
  children,
  variant = 'primary',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: Variant
}) {
  return (
    <button
      type="button"
      className={`min-h-[52px] w-full rounded-2xl px-4 py-3 text-lg font-extrabold transition ${styles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
