import { Flame } from 'lucide-react'
import type { MouseEvent } from 'react'
import { useCommands } from '../context/commands'
import type { Project } from '../types/project'

interface FocusToggleProps {
  project: Project
  variant?: 'icon' | 'button'
}

/** FOCUS に追加／外す。一覧ではアイコン、詳細ではラベル付きボタン */
export function FocusToggle({ project, variant = 'icon' }: FocusToggleProps) {
  const { toggleFocus, v3Ready } = useCommands()
  if (!v3Ready) return null
  const onClick = (event: MouseEvent) => {
    event.stopPropagation()
    toggleFocus(project)
  }
  const label = project.focus ? 'FOCUSから外す' : 'FOCUSに追加'

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={project.focus}
        className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-500 ${
          project.focus
            ? 'border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100'
            : 'border-slate-300 bg-white text-slate-700 hover:border-navy-300 hover:bg-navy-50'
        }`}
      >
        <Flame className={`size-4 ${project.focus ? 'fill-orange-500 text-orange-500' : ''}`} aria-hidden />
        {label}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={project.focus}
      aria-label={`${project.name} を${label}`}
      title={label}
      className={`grid size-11 shrink-0 place-items-center rounded-lg transition focus-visible:outline-2 focus-visible:outline-navy-500 lg:size-10 ${
        project.focus ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'text-slate-400 hover:bg-slate-100 hover:text-orange-600'
      }`}
    >
      <Flame className={`size-[18px] ${project.focus ? 'fill-orange-500' : ''}`} aria-hidden />
    </button>
  )
}
