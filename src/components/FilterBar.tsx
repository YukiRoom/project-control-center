import { ChevronDown, Search, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { DEFAULT_FILTERS, type ProjectFilters, type StatusFilter } from '../lib/projects'
import { STATUS_DEFINITIONS } from '../lib/status'

interface FilterBarProps {
  filters: ProjectFilters
  categories: string[]
  onChange: (patch: Partial<ProjectFilters>) => void
}

function SelectField({
  label,
  value,
  isDefault,
  onChange,
  children,
}: {
  label: string
  value: string
  isDefault: boolean
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <label className="relative min-w-0 flex-1 lg:w-44 lg:flex-none">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`h-11 w-full appearance-none truncate rounded-lg border bg-white pr-9 pl-3 text-base outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100 lg:h-10 lg:text-sm ${
          isDefault ? 'border-slate-300 text-slate-700' : 'border-navy-500 font-semibold text-navy-800'
        }`}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
    </label>
  )
}

/** 検索＋大分類＋状態。PC は 1 行 */
export function FilterBar({ filters, categories, onChange }: FilterBarProps) {
  return (
    <div className="flex flex-col gap-2 lg:flex-row">
      <label className="relative flex-1">
        <span className="sr-only">キーワード検索</span>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          type="search"
          enterKeyHint="search"
          value={filters.query}
          onChange={(event) => onChange({ query: event.target.value })}
          placeholder="案件・NEXT・メモを検索"
          className="h-11 w-full rounded-lg border border-slate-300 bg-white pr-10 pl-9 text-base outline-none placeholder:text-slate-400 focus:border-navy-500 focus:ring-2 focus:ring-navy-100 lg:h-10 lg:text-sm [&::-webkit-search-cancel-button]:hidden"
        />
        {filters.query && (
          <button
            type="button"
            onClick={() => onChange({ query: '' })}
            className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-navy-500"
            aria-label="検索語をクリア"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </label>
      <div className="flex gap-2">
        <SelectField
          label="大分類で絞り込み"
          value={filters.category}
          isDefault={filters.category === DEFAULT_FILTERS.category}
          onChange={(category) => onChange({ category })}
        >
          <option value="all">すべての大分類</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="状態で絞り込み"
          value={filters.status}
          isDefault={filters.status === DEFAULT_FILTERS.status}
          onChange={(status) => onChange({ status: status as StatusFilter })}
        >
          <option value="active">進行中の案件</option>
          <option value="all">すべての状態</option>
          {STATUS_DEFINITIONS.map((def) => (
            <option key={def.key} value={def.key}>
              {def.label}
            </option>
          ))}
        </SelectField>
      </div>
    </div>
  )
}
