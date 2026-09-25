import type { ReactNode } from 'react'

interface SectionProps {
  title: string
  count: number
  description?: string
  action?: ReactNode
  children: ReactNode
}

export function Section({ title, count, description, action, children }: SectionProps) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            {title}
            <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-xs font-semibold text-slate-600 tabular-nums">{count}</span>
          </h2>
          {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
