import { ChevronRight, MessageSquare } from 'lucide-react'
import { formatDate } from '../lib/date'
import type { Project } from '../types/project'
import { StatusBadge } from './StatusBadge'

interface ProjectListItemProps {
  project: Project
  onOpen: (project: Project) => void
}

/** 保留・完了など、優先度の低い案件用のコンパクトな行 */
export function ProjectListItem({ project, onOpen }: ProjectListItemProps) {
  return (
    <li className="flex items-center gap-2 px-2 sm:px-3">
      <button
        type="button"
        onClick={() => onOpen(project)}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-3 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-navy-500"
      >
        <StatusBadge project={project} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-800">{project.name}</span>
          <span className="block truncate text-xs text-slate-500">
            {project.category}
            {project.nextAction && ` ・ ${project.nextAction}`}
          </span>
        </span>
        <span className="hidden shrink-0 text-xs text-slate-400 sm:block">{formatDate(project.updatedAt)}</span>
        <ChevronRight className="size-4 shrink-0 text-slate-300" aria-hidden />
      </button>
      {project.chatUrl && (
        <a
          href={project.chatUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="grid size-10 shrink-0 place-items-center rounded-lg text-navy-700 hover:bg-navy-50"
          aria-label={`${project.name} の ChatGPT を新しいタブで開く`}
          title="ChatGPTを開く"
        >
          <MessageSquare className="size-4" aria-hidden />
        </a>
      )}
    </li>
  )
}
