import type { ReactNode } from 'react'

interface SectionProps {
  title: string
  count: number
  /** 見出し右側（絞り込み条件のチップ・クリアボタンなど） */
  action?: ReactNode
  children: ReactNode
}

export function Section({ title, count, action, children }: SectionProps) {
  return (
    <section aria-label={title}>
      <div className="mb-2.5 flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 sm:text-lg">
          {title}
          <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-xs font-semibold text-slate-600 tabular-nums">{count}</span>
        </h2>
        {action && <div className="ml-auto flex items-center gap-1.5">{action}</div>}
      </div>
      {children}
    </section>
  )
}
