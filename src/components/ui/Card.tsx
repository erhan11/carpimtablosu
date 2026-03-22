import type { HTMLAttributes, ReactNode } from 'react'

export function Card({
  children,
  className = '',
  ...rest
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      className={`rounded-[var(--radius-xl)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
