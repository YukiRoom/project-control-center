import { ArrowRight } from 'lucide-react'
import { formatDate, formatShortDate } from '../lib/date'
import { isActiveStatus } from '../lib/status'
import type { Project } from '../types/project'
import { ProjectLink, ResumeButton } from './ProjectActions'
import { StaleBadge } from './StaleBadge'
import { StatusBadge } from './StatusBadge'

interface ProjectItemProps {
  project: Project
  stale: boolean
  onOpen: (project: Project) => void
}

/**
 * 一覧の 1 件。「判断する場所」なので 案件名 → NEXT → 続きから始める に絞り、
 * 現在地・メモなどは詳細パネルに任せる。
 * - スマホ〜タブレット: コンパクトなカード（続きから始めるは全幅）
 * - PC（lg〜）: 横長の行（左: 大分類・案件名・状態 / 中央: NEXT / 右: 操作・更新日）
 */
export function ProjectItem({ project, stale, onOpen }: ProjectItemProps) {
  const muted = !isActiveStatus(project.status)
  return (
    <article
      onClick={() => onOpen(project)}
      className="group grid cursor-pointer gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3.5 transition hover:border-navy-200 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_auto] lg:items-center lg:gap-6 lg:rounded-none lg:border-0 lg:px-5 lg:py-3 lg:hover:bg-slate-50/80"
    >
      {/* 大分類・案件名・状態（スマホ: 大分類と状態が上 / PC: 案件名が上） */}
      <div className="flex min-w-0 flex-col gap-0.5 lg:gap-1">
        <div className="flex items-center justify-between gap-2 lg:order-2 lg:justify-start">
          <span className="truncate text-xs text-slate-500">{project.category || '大分類なし'}</span>
          <StatusBadge project={project} />
        </div>
        <h3 className="lg:order-1">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onOpen(project)
            }}
            className={`rounded text-left text-base leading-snug font-bold group-hover:text-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-500 lg:text-[15px] ${
              muted ? 'text-slate-600' : 'text-slate-900'
            }`}
            aria-label={`${project.name || '無題の案件'} の詳細を開く`}
          >
            {project.name || '（無題の案件）'}
          </button>
        </h3>
      </div>

      {/* NEXT（一覧の主役） */}
      <div className="min-w-0 border-l-2 border-navy-200 pl-3">
        <p className="flex items-center gap-1 text-[11px] font-bold tracking-[0.12em] text-navy-600">
          <ArrowRight className="size-3" aria-hidden />
          NEXT
        </p>
        <p
          className={`mt-0.5 line-clamp-2 text-[15px] leading-snug ${
            muted ? 'font-medium text-slate-600' : 'font-semibold text-slate-900'
          }`}
        >
          {project.nextAction || <span className="font-normal text-slate-400">未設定</span>}
        </p>
      </div>

      {/* 更新日・操作 */}
      <div className="flex items-center gap-3 lg:flex-col lg:items-end lg:gap-1">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 lg:order-2 lg:flex-none lg:justify-end">
          <span className="whitespace-nowrap" title={`最終更新 ${formatDate(project.updatedAt)}`}>
            更新 {formatShortDate(project.updatedAt)}
          </span>
          {stale && <StaleBadge updatedAt={project.updatedAt} />}
          <ProjectLink project={project} className="-ml-1.5 lg:hidden" />
        </div>
        {/* PC: Secondary（プロジェクト）を Primary（続きから始める）の左に並べる */}
        <div className="flex shrink-0 items-center gap-1 lg:order-1 lg:min-h-10">
          <span className="hidden lg:contents">
            <ProjectLink project={project} />
          </span>
          <ResumeButton project={project} />
        </div>
      </div>
    </article>
  )
}
