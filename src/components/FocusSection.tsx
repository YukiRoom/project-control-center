import { ArrowRight, Circle, Flame, Target } from 'lucide-react'
import { isPendingTask, useCommands } from '../context/commands'
import { getNextTask, getProgress } from '../lib/progress'
import type { Project } from '../types/project'
import { CategoryBadge } from './CategoryBadge'
import { ResumeButton } from './ProjectActions'
import { ProgressBar } from './ProgressBar'

interface FocusSectionProps {
  projects: Project[]
  onOpen: (project: Project) => void
}

function FocusCard({ project, onOpen }: { project: Project; onOpen: (project: Project) => void }) {
  const { categories, toggleFocus, toggleTask } = useCommands()
  const progress = getProgress(project.tasks)
  const nextTask = getNextTask(project)

  return (
    <article
      onClick={() => onOpen(project)}
      className="flex cursor-pointer flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition hover:border-navy-200"
    >
      <div className="flex items-center justify-between gap-2">
        <CategoryBadge categoryKey={project.topCategory} categories={categories} />
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            toggleFocus(project)
          }}
          className="-mr-1.5 inline-flex h-8 items-center rounded-md px-1.5 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-navy-500"
        >
          FOCUSから外す
        </button>
      </div>

      <h3 className="mt-1.5">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onOpen(project)
          }}
          className="rounded text-left text-base leading-snug font-bold text-slate-900 hover:text-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-500"
          aria-label={`${project.name} の詳細を開く`}
        >
          {project.name}
        </button>
      </h3>

      <p className={`mt-1 flex items-start gap-1.5 text-sm leading-snug ${project.goal ? 'text-slate-600' : 'text-slate-400'}`}>
        <Target className="mt-0.5 size-3.5 shrink-0 text-navy-500" aria-hidden />
        <span className="line-clamp-2">{project.goal || '目標を設定しましょう（詳細から）'}</span>
      </p>

      <div className="mt-3">
        <ProgressBar progress={progress} />
      </div>

      <div className="mt-3 rounded-xl bg-navy-50/70 px-3 py-2.5">
        <p className="flex items-center gap-1 text-[11px] font-bold tracking-[0.12em] text-navy-600">
          <ArrowRight className="size-3" aria-hidden />
          {nextTask ? '次のタスク' : 'NEXT'}
        </p>
        {nextTask ? (
          <div className="mt-1 flex items-start gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                toggleTask(nextTask)
              }}
              disabled={isPendingTask(nextTask)}
              className="-m-1.5 grid size-8 shrink-0 place-items-center rounded-full text-navy-400 hover:text-emerald-600 focus-visible:outline-2 focus-visible:outline-navy-500 disabled:opacity-40"
              aria-label={`「${nextTask.title}」を完了にする`}
              title="完了にする"
            >
              <Circle className="size-[18px]" aria-hidden />
            </button>
            <p className="line-clamp-2 text-[15px] leading-snug font-semibold text-navy-950">{nextTask.title}</p>
          </div>
        ) : (
          <p className="mt-0.5 line-clamp-2 text-[15px] leading-snug font-semibold text-navy-950">
            {project.nextAction || <span className="font-normal text-slate-400">未設定</span>}
          </p>
        )}
      </div>

      <div className="mt-auto pt-3">
        <ResumeButton project={project} className="w-full" />
      </div>
    </article>
  )
}

/** 🔥 FOCUS — 今やる 3 つ（一覧より上に表示） */
export function FocusSection({ projects, onOpen }: FocusSectionProps) {
  const { v3Ready, maxFocus } = useCommands()

  if (!v3Ready) {
    return (
      <section
        aria-label="FOCUS"
        className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-3 text-sm text-slate-500"
      >
        <Flame className="size-5 shrink-0 text-slate-400" aria-hidden />
        FOCUS・目標・タスクを使うには、Google Sheets 側の初期設定（V3 用シートの作成）が必要です。
      </section>
    )
  }

  return (
    <section aria-labelledby="focus-heading">
      <div className="mb-2 flex items-baseline gap-2">
        <h2 id="focus-heading" className="flex items-center gap-1.5 text-base font-bold text-slate-900 sm:text-lg">
          <Flame className="size-5 fill-orange-500 text-orange-500" aria-hidden />
          FOCUS
          <span className="text-sm font-semibold text-slate-500">今やる3つ</span>
        </h2>
        <span className="text-xs text-slate-400 tabular-nums">
          {projects.length} / {maxFocus}
        </span>
      </div>
      {projects.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-3 text-sm text-slate-500">
          今集中するプロジェクトを最大{maxFocus}つ選びましょう。一覧の
          <Flame className="mx-0.5 inline size-4 align-[-3px] text-orange-500" aria-label="FOCUS" />
          から追加できます。
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <FocusCard key={project.projectId || project.rowNumber} project={project} onOpen={onOpen} />
          ))}
        </div>
      )}
    </section>
  )
}
