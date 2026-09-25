import type { ProjectSummary, StatusFilter } from '../lib/projects'
import { STATUS_DEFINITIONS } from '../lib/status'

interface SummaryCardsProps {
  summary: ProjectSummary
  selected: StatusFilter
  onSelect: (status: StatusFilter) => void
}

interface SummaryItem {
  key: StatusFilter
  label: string
  value: number
  dotClass?: string
  emphasis?: boolean
}

/** 集計カード。タップで状態フィルターを切り替える */
export function SummaryCards({ summary, selected, onSelect }: SummaryCardsProps) {
  const items: SummaryItem[] = [
    { key: 'all', label: '全案件', value: summary.total },
    { key: 'active', label: '進行中', value: summary.active, emphasis: true },
    ...STATUS_DEFINITIONS.map((def) => ({
      key: def.key,
      label: def.shortLabel,
      value: summary.byStatus[def.key],
      dotClass: def.dotClass,
    })),
  ]

  return (
    <div className="-mx-4 overflow-x-auto px-4 py-1 scrollbar-none sm:mx-0 sm:overflow-visible sm:px-0">
      <ul className="flex gap-2 sm:grid sm:grid-cols-4 lg:grid-cols-7" aria-label="案件の集計">
        {items.map((item) => {
          const isSelected = selected === item.key
          const showRing = isSelected && item.key !== 'all'
          return (
            <li key={item.key} className="shrink-0">
              <button
                type="button"
                onClick={() => onSelect(isSelected && item.key !== 'all' ? 'all' : item.key)}
                aria-pressed={isSelected}
                className={`flex h-full w-[6.5rem] flex-col items-start rounded-xl border px-3.5 py-2.5 sm:py-3 text-left transition sm:w-full ${
                  item.emphasis
                    ? 'border-navy-800 bg-navy-800 text-white hover:bg-navy-700'
                    : 'border-slate-200 bg-white hover:border-navy-300'
                } ${showRing ? 'ring-2 ring-navy-500 ring-offset-2 ring-offset-slate-50' : ''}`}
              >
                <span
                  className={`flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${
                    item.emphasis ? 'text-navy-100' : 'text-slate-500'
                  }`}
                >
                  {item.dotClass && <span className={`size-2 rounded-full ${item.dotClass}`} aria-hidden />}
                  {item.label}
                </span>
                <span className="mt-1 text-2xl font-bold tabular-nums sm:text-[28px]">
                  {item.value}
                  <span className={`ml-0.5 text-xs font-medium ${item.emphasis ? 'text-navy-200' : 'text-slate-400'}`}>件</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
