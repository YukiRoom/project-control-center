import { ArrowUpRight, Play } from 'lucide-react'
import type { MouseEvent } from 'react'
import type { Project } from '../types/project'

/** 行・カードのクリック（詳細を開く）にリンクのクリックを伝えない */
const stop = (event: MouseEvent) => event.stopPropagation()

interface ResumeButtonProps {
  project: Pick<Project, 'chatUrl' | 'name'>
  size?: 'md' | 'lg'
  className?: string
}

/**
 * Primary Action: メインチャットURLを新しいタブで開く。
 * URL がない場合は小さなテキストだけを表示する（無効ボタンは並べない）。
 */
export function ResumeButton({ project, size = 'md', className = '' }: ResumeButtonProps) {
  if (!project.chatUrl) {
    return <span className={`text-xs text-slate-400 ${className}`}>チャット未登録</span>
  }
  return (
    <a
      href={project.chatUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={stop}
      aria-label={`${project.name} の続きから始める（ChatGPT を新しいタブで開く）`}
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-navy-800 font-semibold whitespace-nowrap text-white shadow-sm transition hover:bg-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-500 active:bg-navy-900 ${
        size === 'lg' ? 'h-12 px-5 text-[15px]' : 'h-11 px-4 text-sm lg:h-10'
      } ${className}`}
    >
      <Play className="size-3.5 shrink-0 fill-current" aria-hidden />
      続きから始める
    </a>
  )
}

interface ProjectLinkProps {
  project: Pick<Project, 'projectUrl' | 'name'>
  label?: string
  className?: string
}

/** Secondary Action: プロジェクトURL。URL がない場合は何も表示しない */
export function ProjectLink({ project, label = 'プロジェクト', className = '' }: ProjectLinkProps) {
  if (!project.projectUrl) return null
  return (
    <a
      href={project.projectUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={stop}
      aria-label={`${project.name} のプロジェクトを新しいタブで開く`}
      className={`inline-flex min-h-8 items-center gap-0.5 rounded-md px-1.5 text-xs font-semibold whitespace-nowrap text-navy-700 hover:bg-navy-50 hover:text-navy-900 focus-visible:outline-2 focus-visible:outline-navy-500 ${className}`}
    >
      <ArrowUpRight className="size-3.5 shrink-0" aria-hidden />
      {label}
    </a>
  )
}
