import { isStale } from '../lib/projects'
import type { Project } from '../types/project'
import { ProjectItem } from './ProjectItem'

interface ProjectListProps {
  projects: Project[]
  today: Date
  onOpen: (project: Project) => void
}

/**
 * 案件リスト。スマホはカードの縦並び、PC は区切り線付きの 1 列リスト。
 * 「今日やる」セクションなど、別の切り口の一覧でもそのまま再利用できる。
 */
export function ProjectList({ projects, today, onOpen }: ProjectListProps) {
  return (
    <ul className="space-y-2.5 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 lg:block lg:divide-y lg:divide-slate-100 lg:overflow-hidden lg:rounded-2xl lg:border lg:border-slate-200 lg:bg-white">
      {projects.map((project) => (
        <li key={project.rowNumber}>
          <ProjectItem project={project} stale={isStale(project, today)} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  )
}
