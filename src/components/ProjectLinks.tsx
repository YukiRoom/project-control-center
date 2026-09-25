import { FolderOpen, MessageSquare } from 'lucide-react'
import type { MouseEvent } from 'react'
import type { Project } from '../types/project'

interface ProjectLinksProps {
  project: Pick<Project, 'chatUrl' | 'projectUrl' | 'name'>
  size?: 'sm' | 'lg'
  className?: string
}

const stop = (event: MouseEvent) => event.stopPropagation()

/** 「ChatGPTを開く」「プロジェクトを開く」。URL がない場合は無効表示 */
export function ProjectLinks({ project, size = 'sm', className = '' }: ProjectLinksProps) {
  const base = `inline-flex items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition ${
    size === 'lg' ? 'h-12 px-3 text-[15px]' : 'h-10 px-2.5 text-sm'
  }`
  const disabled = `${base} cursor-not-allowed border border-dashed border-slate-200 text-slate-400`
  return (
    <div className={`grid grid-cols-2 gap-2 ${className}`}>
      {project.chatUrl ? (
        <a
          href={project.chatUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={stop}
          className={`${base} bg-navy-800 text-white shadow-sm hover:bg-navy-700 active:bg-navy-900`}
          aria-label={`${project.name} の ChatGPT を新しいタブで開く`}
        >
          <MessageSquare className="size-4 shrink-0" aria-hidden />
          ChatGPTを開く
        </a>
      ) : (
        <span className={disabled} aria-disabled="true" title="メインチャットURLが未登録です">
          <MessageSquare className="size-4 shrink-0" aria-hidden />
          チャット未登録
        </span>
      )}
      {project.projectUrl ? (
        <a
          href={project.projectUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={stop}
          className={`${base} border border-slate-300 bg-white text-navy-800 hover:border-navy-300 hover:bg-navy-50`}
          aria-label={`${project.name} のプロジェクトを新しいタブで開く`}
        >
          <FolderOpen className="size-4 shrink-0" aria-hidden />
          プロジェクトを開く
        </a>
      ) : (
        <span className={disabled} aria-disabled="true" title="プロジェクトURLが未登録です">
          <FolderOpen className="size-4 shrink-0" aria-hidden />
          プロジェクト未登録
        </span>
      )}
    </div>
  )
}
