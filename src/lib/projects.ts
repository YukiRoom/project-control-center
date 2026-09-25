import type { Project, ProjectRow, ProjectStatus, Task } from '../types/project'
import { STALE_THRESHOLD_DAYS, daysSince, parseDate } from './date'
import { matchesQuery } from './search'
import { INACTIVE_STATUSES, STATUS_DEFINITIONS, isActiveStatus, parseStatus } from './status'

/** http(s) のみ許可（javascript: 等を排除）。不正なら空文字 */
export function toSafeUrl(value: string): string {
  const text = value.trim()
  if (!text) return ''
  try {
    const url = new URL(text)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : ''
  } catch {
    return ''
  }
}

export function toProject(row: ProjectRow, tasks: Task[] = []): Project {
  const text = (value: unknown) => (value == null ? '' : String(value).trim())
  const statusLabel = text(row.status)
  const updatedAt = text(row.updatedAt)
  return {
    rowNumber: row.rowNumber,
    projectKey: text(row.projectKey),
    keyConflict: row.keyConflict === true,
    category: text(row.category),
    name: text(row.name),
    statusLabel,
    status: parseStatus(statusLabel),
    currentState: text(row.currentState),
    nextAction: text(row.nextAction),
    projectUrl: toSafeUrl(text(row.projectUrl)),
    chatUrl: toSafeUrl(text(row.chatUrl)),
    chatUrlRaw: text(row.chatUrl),
    keywords: text(row.keywords),
    updatedAt: parseDate(updatedAt) ? updatedAt : '',
    memo: text(row.memo),
    topCategory: text(row.topCategory),
    focus: row.focus === true,
    goal: text(row.goal),
    tasks: [...tasks].sort((a, b) => a.sortOrder - b.sortOrder),
  }
}

/** 最終更新日から 30 日以上経過し、保留・完了以外の案件 */
export function isStale(project: Project, today: Date = new Date()): boolean {
  if (INACTIVE_STATUSES.includes(project.status)) return false
  const days = daysSince(project.updatedAt, today)
  return days !== null && days >= STALE_THRESHOLD_DAYS
}

export interface ProjectSummary {
  total: number
  active: number
  stale: number
  byStatus: Record<ProjectStatus, number>
}

export function summarize(projects: Project[], today: Date = new Date()): ProjectSummary {
  const byStatus: Record<ProjectStatus, number> = {
    operating: 0,
    developing: 0,
    planning: 0,
    onHold: 0,
    done: 0,
    unknown: 0,
  }
  for (const project of projects) byStatus[project.status] += 1
  return {
    total: projects.length,
    active: byStatus.operating + byStatus.developing + byStatus.planning,
    stale: projects.filter((p) => isStale(p, today)).length,
    byStatus,
  }
}

/** シートに存在する大分類を出現順で返す */
export function getCategories(projects: Project[]): string[] {
  return [...new Set(projects.map((p) => p.category).filter(Boolean))]
}

export type StatusFilter = ProjectStatus | 'all' | 'active'

/** V3 カテゴリーの絞り込み（'none' = 未分類） */
export type TopCategoryFilter = string | 'all' | 'none'

export interface ProjectFilters {
  query: string
  topCategory: TopCategoryFilter
  category: string | 'all'
  status: StatusFilter
  staleOnly: boolean
}

/** 初期表示は「今、動いている案件」（運用中・制作・開発中・企画・準備中） */
export const DEFAULT_FILTERS: ProjectFilters = {
  query: '',
  topCategory: 'all',
  category: 'all',
  status: 'active',
  staleOnly: false,
}

/** 初期表示から条件が変わっているか */
export function hasActiveFilters(filters: ProjectFilters): boolean {
  return (
    filters.query.trim() !== '' ||
    filters.topCategory !== DEFAULT_FILTERS.topCategory ||
    filters.category !== DEFAULT_FILTERS.category ||
    filters.status !== DEFAULT_FILTERS.status ||
    filters.staleOnly !== DEFAULT_FILTERS.staleOnly
  )
}

export function matchesTopCategory(project: Project, filter: TopCategoryFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'none') return project.topCategory === ''
  return project.topCategory === filter
}

function matchesStatus(project: Project, status: StatusFilter): boolean {
  if (status === 'all') return true
  if (status === 'active') return isActiveStatus(project.status)
  return project.status === status
}

export function filterProjects(
  projects: Project[],
  filters: ProjectFilters,
  today: Date = new Date(),
): Project[] {
  return projects.filter(
    (project) =>
      matchesTopCategory(project, filters.topCategory) &&
      (filters.category === 'all' || project.category === filters.category) &&
      matchesStatus(project, filters.status) &&
      (!filters.staleOnly || isStale(project, today)) &&
      matchesQuery(project, filters.query),
  )
}

const STATUS_ORDER = STATUS_DEFINITIONS.map((def) => def.key)

/** 状態順（運用中→制作→企画→保留→完了）、同じ状態内は最終更新日の新しい順 */
export function sortProjects(projects: Project[]): Project[] {
  const order = (status: ProjectStatus) => {
    const index = STATUS_ORDER.indexOf(status)
    return index === -1 ? STATUS_ORDER.length : index
  }
  return [...projects].sort(
    (a, b) =>
      order(a.status) - order(b.status) ||
      b.updatedAt.localeCompare(a.updatedAt) ||
      a.rowNumber - b.rowNumber,
  )
}
