import { ChevronDown, Search, X } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ProjectFilters, StatusFilter } from '../lib/projects'
import { STATUS_DEFINITIONS } from '../lib/status'

interface FilterBarProps {
  filters: ProjectFilters
  categories: string[]
  resultCount: number
  totalCount: number
  isFiltered: boolean
  onChange: (patch: Partial<ProjectFilters>) => void
  onClear: () => void
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  const active = value !== 'all'
  return (
    <label className="relative min-w-0 flex-1 sm:w-48 sm:flex-none">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`h-11 w-full appearance-none truncate rounded-lg border bg-white pr-9 pl-3 text-base outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100 sm:text-sm ${
          active ? 'border-navy-500 font-medium text-navy-800' : 'border-slate-300 text-slate-700'
        }`}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
    </label>
  )
}

export function FilterBar({
  filters,
  categories,
  resultCount,
  totalCount,
  isFiltered,
  onChange,
  onClear,
}: FilterBarProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-4">
      <div className="flex flex-col gap-2 lg:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">キーワード検索</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="search"
            enterKeyHint="search"
            value={filters.query}
            onChange={(event) => onChange({ query: event.target.value })}
            placeholder="案件・次にやること・メモを検索"
            className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50/60 pr-10 pl-9 text-base outline-none placeholder:text-slate-400 focus:border-navy-500 focus:bg-white focus:ring-2 focus:ring-navy-100 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
          />
          {filters.query && (
            <button
              type="button"
              onClick={() => onChange({ query: '' })}
              className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="検索語をクリア"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </label>
        <div className="flex gap-2">
          <SelectField label="大分類で絞り込み" value={filters.category} onChange={(category) => onChange({ category })}>
            <option value="all">大分類：すべて</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="状態で絞り込み"
            value={filters.status}
            onChange={(status) => onChange({ status: status as StatusFilter })}
          >
            <option value="all">状態：すべて</option>
            <option value="active">進行中（運用・制作・企画）</option>
            {STATUS_DEFINITIONS.map((def) => (
              <option key={def.key} value={def.key}>
                {def.label}
              </option>
            ))}
          </SelectField>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <label className="inline-flex cursor-pointer items-center gap-2 text-slate-600 select-none">
          <input
            type="checkbox"
            checked={filters.staleOnly}
            onChange={(event) => onChange({ staleOnly: event.target.checked })}
            className="size-4 accent-orange-600"
          />
          要確認のみ
        </label>
        <span className="ml-auto text-slate-500" aria-live="polite">
          {isFiltered ? (
            <>
              <span className="font-semibold text-slate-800">{resultCount}</span> / {totalCount} 件
            </>
          ) : (
            <>全 {totalCount} 件</>
          )}
        </span>
        {isFiltered && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex h-8 items-center gap-1 rounded-md px-2 font-medium text-navy-700 hover:bg-navy-50"
          >
            <X className="size-3.5" aria-hidden />
            条件をクリア
          </button>
        )}
      </div>
    </div>
  )
}
