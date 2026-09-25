import type { TopCategoryFilter } from '../lib/projects'
import type { Category, Project } from '../types/project'

interface CategoryTabsProps {
  categories: Category[]
  projects: Project[]
  selected: TopCategoryFilter
  onSelect: (value: TopCategoryFilter) => void
}

/** V3 カテゴリーのタブ（すべて / 各カテゴリー / 未分類）。件数は全案件で数える */
export function CategoryTabs({ categories, projects, selected, onSelect }: CategoryTabsProps) {
  const tabs: Array<{ key: TopCategoryFilter; label: string; emoji?: string; count: number }> = [
    { key: 'all', label: 'すべて', count: projects.length },
    ...categories.map((c) => ({
      key: c.key,
      label: c.label,
      emoji: c.emoji,
      count: projects.filter((p) => p.topCategory === c.key).length,
    })),
    { key: 'none', label: '未分類', count: projects.filter((p) => !p.topCategory).length },
  ]

  return (
    <div className="-mx-4 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
      <div role="tablist" aria-label="カテゴリー" className="flex min-w-max gap-1 border-b border-slate-200">
        {tabs.map((tab) => {
          const active = selected === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(tab.key)}
              className={`-mb-px inline-flex h-11 items-center gap-1.5 border-b-2 px-3 text-sm whitespace-nowrap transition focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy-500 ${
                active
                  ? 'border-navy-800 font-bold text-navy-900'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
              }`}
            >
              {tab.emoji && <span aria-hidden>{tab.emoji}</span>}
              {tab.label}
              <span className={`text-xs tabular-nums ${active ? 'text-navy-600' : 'text-slate-400'}`}>{tab.count}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
