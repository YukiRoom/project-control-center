import { AlertTriangle } from 'lucide-react'
import type { ProjectFilters, ProjectSummary, StatusFilter } from '../lib/projects'
import { STATUS_DEFINITIONS } from '../lib/status'

interface OverviewBarProps {
  summary: ProjectSummary
  filters: ProjectFilters
  onSelectStatus: (status: StatusFilter) => void
  onToggleStale: () => void
}

interface PrimaryTileProps {
  label: string
  value: number
  pressed: boolean
  onClick: () => void
  tone?: 'default' | 'warning'
  hint: string
}

function PrimaryTile({ label, value, pressed, onClick, tone = 'default', hint }: PrimaryTileProps) {
  const warning = tone === 'warning' && value > 0
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      title={hint}
      className={`flex min-w-0 flex-col items-start rounded-xl px-3 py-2 text-left transition focus-visible:outline-2 focus-visible:outline-navy-500 sm:px-4 ${
        pressed ? 'bg-navy-800 text-white' : 'hover:bg-slate-100'
      }`}
    >
      <span
        className={`flex items-center gap-1 text-xs font-semibold whitespace-nowrap ${
          pressed ? 'text-navy-100' : warning ? 'text-orange-700' : 'text-slate-500'
        }`}
      >
        {tone === 'warning' && <AlertTriangle className="size-3.5" aria-hidden />}
        {label}
      </span>
      <span
        className={`text-2xl leading-tight font-bold tabular-nums ${
          pressed ? 'text-white' : warning ? 'text-orange-700' : 'text-slate-900'
        }`}
      >
        {value}
      </span>
    </button>
  )
}

/**
 * 集計バー。主表示は 進行中・要確認・全案件、状態別の件数は小さく補助表示。
 * どれもクリックで一覧を絞り込める。
 */
export function OverviewBar({ summary, filters, onSelectStatus, onToggleStale }: OverviewBarProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-1.5 sm:flex sm:items-center sm:gap-2">
      <div className="grid grid-cols-3 gap-1 sm:flex sm:shrink-0">
        <PrimaryTile
          label="進行中"
          value={summary.active}
          pressed={filters.status === 'active' && !filters.staleOnly}
          onClick={() => onSelectStatus('active')}
          hint="運用中・制作・開発中・企画・準備中を表示"
        />
        <PrimaryTile
          label="要確認"
          value={summary.stale}
          pressed={filters.staleOnly}
          onClick={onToggleStale}
          tone="warning"
          hint="30日以上更新のない進行中案件だけを表示"
        />
        <PrimaryTile
          label="全案件"
          value={summary.total}
          pressed={filters.status === 'all' && !filters.staleOnly}
          onClick={() => onSelectStatus('all')}
          hint="保留・完了を含むすべての案件を表示"
        />
      </div>

      <div className="mx-2 hidden h-10 w-px bg-slate-200 sm:block" aria-hidden />

      <ul
        className="-mx-1.5 mt-1 flex gap-1 overflow-x-auto border-t border-slate-100 px-1.5 pt-1.5 scrollbar-none sm:mx-0 sm:mt-0 sm:flex-wrap sm:border-0 sm:p-0"
        aria-label="状態別の件数"
      >
        {STATUS_DEFINITIONS.map((def) => {
          const pressed = filters.status === def.key
          return (
            <li key={def.key} className="shrink-0">
              <button
                type="button"
                onClick={() => onSelectStatus(pressed ? 'active' : def.key)}
                aria-pressed={pressed}
                title={`${def.shortLabel}で絞り込む`}
                className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] whitespace-nowrap transition focus-visible:outline-2 focus-visible:outline-navy-500 ${
                  pressed ? 'bg-navy-800 font-semibold text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className={`size-2 rounded-full ${def.dotClass}`} aria-hidden />
                {def.compactLabel}
                <span className={`font-bold tabular-nums ${pressed ? 'text-white' : 'text-slate-900'}`}>
                  {summary.byStatus[def.key]}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
