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
import { CommandsContext } from '../context/commands'
import { useCommandsValue } from '../hooks/useCommandsValue'
import type { Mutation, Project, ProjectDataset } from '../types/project'
import { CategoryTabs } from './CategoryTabs'
import { FilterBar } from './FilterBar'
import { FocusSection } from './FocusSection'
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

interface DashboardProps {
  dataset: ProjectDataset
  mutate: (mutation: Mutation) => Promise<boolean>
  notify: (kind: 'error' | 'info', message: string) => void
}

/**
 * ダッシュボード。上から「FOCUS → 集計 → カテゴリー → 検索 → 一覧」の順に並べる。
 * 一覧 = 判断する場所、詳細パネル = 情報を見る・編集する場所。
 */
export function Dashboard({ dataset, mutate, notify }: DashboardProps) {
  const { projects } = dataset
  const commands = useCommandsValue(dataset, mutate, notify)
  const [filters, setFilters] = useState<ProjectFilters>(DEFAULT_FILTERS)
  const [selectedRow, setSelectedRow] = useState<number | null>(null)
  const today = useMemo(() => new Date(), [])

  const summary = useMemo(() => summarize(projects, today), [projects, today])
  const categories = useMemo(() => getCategories(projects), [projects])
  const visible = useMemo(() => sortProjects(filterProjects(projects, filters, today)), [projects, filters, today])
  const isFiltered = hasActiveFilters(filters)
  const selected = projects.find((p) => p.rowNumber === selectedRow) ?? null
  const focusProjects = useMemo(() => sortProjects(projects.filter((p) => p.focus)), [projects])

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
    <CommandsContext.Provider value={commands}>
      <div className="space-y-4 sm:space-y-5">
        <FocusSection projects={focusProjects} onOpen={openProject} />

        <OverviewBar summary={summary} filters={filters} onSelectStatus={selectStatus} onToggleStale={toggleStale} />

        {dataset.orphanCount > 0 && (
          <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
            「総合管理」と紐付かない管理データが {dataset.orphanCount} 件あります（案件名を変更した場合など）。README の「projectKey」を参照してください。
          </p>
        )}

        <div className="space-y-3">
          {dataset.v3Ready && (
            <CategoryTabs
              categories={dataset.categories}
              projects={projects}
              selected={filters.topCategory}
              onSelect={(topCategory) => updateFilters({ topCategory })}
            />
          )}
          <FilterBar filters={filters} categories={categories} onChange={updateFilters} />
        </div>

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
    </CommandsContext.Provider>
  )
}
