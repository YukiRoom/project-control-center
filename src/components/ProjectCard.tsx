import { ArrowRight, CalendarDays, ChevronRight } from 'lucide-react'
import { formatDate, formatRelative } from '../lib/date'
import type { Project } from '../types/project'
import { ProjectLinks } from './ProjectLinks'
import { StaleBadge } from './StaleBadge'
import { StatusBadge } from './StatusBadge'

interface ProjectCardProps {
  project: Project
  stale: boolean
  onOpen: (project: Project) => void
}

/** 「今、動いている案件」のカード。次にやることを最も目立たせる */
export function ProjectCard({ project, stale, onOpen }: ProjectCardProps) {
  return (
    <article
      onClick={() => onOpen(project)}
      className={`group flex flex-col rounded-2xl border bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-navy-200 hover:shadow-md sm:p-5 ${
        stale ? 'border-orange-200' : 'border-slate-200'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="truncate text-xs font-medium tracking-wide text-slate-500">
          {project.category || '大分類なし'}
        </span>
        <span className="ml-auto flex flex-wrap justify-end gap-1.5">
          {stale && <StaleBadge updatedAt={project.updatedAt} />}
          <StatusBadge project={project} />
        </span>
      </div>

      <h3 className="mt-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onOpen(project)
          }}
          className="flex w-full items-start gap-1 text-left text-[17px] leading-snug font-bold text-slate-900 group-hover:text-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-500"
        >
          <span className="min-w-0 flex-1">{project.name || '（無題の案件）'}</span>
          <ChevronRight className="mt-0.5 size-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-navy-500" aria-hidden />
        </button>
      </h3>

      <div className="mt-3 rounded-xl border-l-4 border-navy-700 bg-navy-50 px-3.5 py-3">
        <p className="flex items-center gap-1 text-[11px] font-bold tracking-wider text-navy-700">
          <ArrowRight className="size-3.5" aria-hidden />
          次にやること
        </p>
        <p className="mt-1 line-clamp-4 text-[15px] leading-relaxed font-semibold text-navy-950">
          {project.nextAction || <span className="font-normal text-slate-400">未設定</span>}
        </p>
      </div>

      {project.currentState && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold tracking-wider text-slate-400">現在地</p>
          <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-slate-600">{project.currentState}</p>
        </div>
      )}

      <div className="mt-auto pt-4">
        <p className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
          <CalendarDays className="size-3.5" aria-hidden />
          最終更新 {formatDate(project.updatedAt)}
          {project.updatedAt && <span className="text-slate-400">（{formatRelative(project.updatedAt)}）</span>}
        </p>
        <ProjectLinks project={project} />
      </div>
    </article>
  )
}
