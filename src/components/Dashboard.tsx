import { AlertTriangle, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import {
  DEFAULT_FILTERS,
  filterProjects,
  getCategories,
  hasActiveFilters,
  isStale,
  sortProjects,
  summarize,
  type ProjectFilters,
  type StatusFilter,
} from '../lib/projects'
import { INACTIVE_STATUSES, getStatusDefinition } from '../lib/status'
import type { Project } from '../types/project'
import { FilterBar } from './FilterBar'
import { OverviewBar } from './OverviewBar'
import { ProjectDetail } from './ProjectDetail'
import { ProjectList } from './ProjectList'
import { Section } from './Section'
import { NoResults } from './StatusViews'

function listTitle(status: StatusFilter): string {
  if (status === 'active') return '今、動いている案件'
  if (status === 'all') return 'すべての案件'
  return `${getStatusDefinition(status).shortLabel}の案件`
}

/**
 * ダッシュボード。上から「集計 → （今日やる）→ 検索 → 一覧」の順に並べる。
 * 一覧 = 判断する場所、詳細パネル = 情報を見る場所。
 */
export function Dashboard({ projects }: { projects: Project[] }) {
  const [filters, setFilters] = useState<ProjectFilters>(DEFAULT_FILTERS)
  const [selectedRow, setSelectedRow] = useState<number | null>(null)
  const today = useMemo(() => new Date(), [])

  const summary = useMemo(() => summarize(projects, today), [projects, today])
  const categories = useMemo(() => getCategories(projects), [projects])
  const visible = useMemo(() => sortProjects(filterProjects(projects, filters, today)), [projects, filters, today])
  const isFiltered = hasActiveFilters(filters)
  const selected = projects.find((p) => p.rowNumber === selectedRow) ?? null

  const updateFilters = useCallback((patch: Partial<ProjectFilters>) => setFilters((prev) => ({ ...prev, ...patch })), [])
  const clearFilters = useCallback(() => setFilters(DEFAULT_FILTERS), [])
  const openProject = useCallback((project: Project) => setSelectedRow(project.rowNumber), [])
  const closeProject = useCallback(() => setSelectedRow(null), [])

  const selectStatus = useCallback(
    (status: StatusFilter) => setFilters((prev) => ({ ...prev, status, staleOnly: false })),
    [],
  )
  // 要確認は保留・完了を含まないため、それらで絞り込み中なら進行中に戻す
  const toggleStale = useCallback(
    () =>
      setFilters((prev) => ({
        ...prev,
        staleOnly: !prev.staleOnly,
        status: !prev.staleOnly && INACTIVE_STATUSES.some((s) => s === prev.status) ? 'active' : prev.status,
      })),
    [],
  )

  return (
    <div className="space-y-4 sm:space-y-5">
      <OverviewBar summary={summary} filters={filters} onSelectStatus={selectStatus} onToggleStale={toggleStale} />

      {/*
        「今日やる」セクションの差し込み位置（Phase 2 以降）。
        今日やる案件の配列を用意し、<Section title="今日やる"><ProjectList … /></Section> をここに置く。
      */}

      <FilterBar filters={filters} categories={categories} onChange={updateFilters} />

      {visible.length === 0 ? (
        <NoResults onClear={clearFilters} />
      ) : (
        <Section
          title={listTitle(filters.status)}
          count={visible.length}
          action={
            <>
              {filters.staleOnly && (
                <button
                  type="button"
                  onClick={toggleStale}
                  className="inline-flex h-8 items-center gap-1 rounded-full bg-orange-50 px-2.5 text-xs font-semibold text-orange-800 hover:bg-orange-100 focus-visible:outline-2 focus-visible:outline-orange-600"
                  aria-label="要確認のみの絞り込みを解除"
                >
                  <AlertTriangle className="size-3.5" aria-hidden />
                  要確認のみ
                  <X className="size-3.5" aria-hidden />
                </button>
              )}
              {isFiltered && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm font-medium text-navy-700 hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-navy-500"
                >
                  <X className="size-3.5" aria-hidden />
                  条件をクリア
                </button>
              )}
            </>
          }
        >
          <ProjectList projects={visible} today={today} onOpen={openProject} />
        </Section>
      )}

      {selected && <ProjectDetail project={selected} stale={isStale(selected, today)} onClose={closeProject} />}
    </div>
  )
}
