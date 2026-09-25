import { ChevronDown } from 'lucide-react'
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
} from '../lib/projects'
import { isActiveStatus } from '../lib/status'
import type { Project } from '../types/project'
import { FilterBar } from './FilterBar'
import { ProjectCard } from './ProjectCard'
import { ProjectDetail } from './ProjectDetail'
import { ProjectListItem } from './ProjectListItem'
import { Section } from './Section'
import { StaleBanner } from './StaleBanner'
import { NoResults } from './StatusViews'
import { SummaryCards } from './SummaryCards'

export function Dashboard({ projects }: { projects: Project[] }) {
  const [filters, setFilters] = useState<ProjectFilters>(DEFAULT_FILTERS)
  const [selectedRow, setSelectedRow] = useState<number | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const today = useMemo(() => new Date(), [])

  const summary = useMemo(() => summarize(projects, today), [projects, today])
  const categories = useMemo(() => getCategories(projects), [projects])
  const filtered = useMemo(() => sortProjects(filterProjects(projects, filters, today)), [projects, filters, today])
  const activeProjects = filtered.filter((p) => isActiveStatus(p.status))
  const otherProjects = filtered.filter((p) => !isActiveStatus(p.status))

  const isFiltered = hasActiveFilters(filters)
  const inactiveOpen = showInactive || isFiltered
  const selected = projects.find((p) => p.rowNumber === selectedRow) ?? null

  const updateFilters = useCallback((patch: Partial<ProjectFilters>) => setFilters((prev) => ({ ...prev, ...patch })), [])
  const clearFilters = useCallback(() => setFilters(DEFAULT_FILTERS), [])
  const openProject = useCallback((project: Project) => setSelectedRow(project.rowNumber), [])
  const closeProject = useCallback(() => setSelectedRow(null), [])

  return (
    <div className="space-y-5 sm:space-y-6">
      <SummaryCards summary={summary} selected={filters.status} onSelect={(status) => updateFilters({ status })} />

      <StaleBanner
        count={summary.stale}
        active={filters.staleOnly}
        onToggle={() => updateFilters({ staleOnly: !filters.staleOnly })}
      />

      <FilterBar
        filters={filters}
        categories={categories}
        resultCount={filtered.length}
        totalCount={projects.length}
        isFiltered={isFiltered}
        onChange={updateFilters}
        onClear={clearFilters}
      />

      {filtered.length === 0 ? (
        <NoResults onClear={clearFilters} />
      ) : (
        <>
          {activeProjects.length > 0 && (
            <Section title="今、動いている案件" count={activeProjects.length} description="運用中・制作・開発中・企画・準備中">
              <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
                {activeProjects.map((project) => (
                  <ProjectCard
                    key={project.rowNumber}
                    project={project}
                    stale={isStale(project, today)}
                    onOpen={openProject}
                  />
                ))}
              </div>
            </Section>
          )}

          {otherProjects.length > 0 && (
            <Section
              title="保留・完了"
              count={otherProjects.length}
              action={
                !isFiltered && (
                  <button
                    type="button"
                    onClick={() => setShowInactive((open) => !open)}
                    aria-expanded={inactiveOpen}
                    className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200/60"
                  >
                    {inactiveOpen ? '閉じる' : '表示する'}
                    <ChevronDown className={`size-4 transition ${inactiveOpen ? 'rotate-180' : ''}`} aria-hidden />
                  </button>
                )
              }
            >
              {inactiveOpen && (
                <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white py-1">
                  {otherProjects.map((project) => (
                    <ProjectListItem key={project.rowNumber} project={project} onOpen={openProject} />
                  ))}
                </ul>
              )}
            </Section>
          )}
        </>
      )}

      {selected && <ProjectDetail project={selected} stale={isStale(selected, today)} onClose={closeProject} />}
    </div>
  )
}
