import { getStatusDefinition } from '../lib/status'
import type { Project } from '../types/project'

interface StatusBadgeProps {
  project: Pick<Project, 'status' | 'statusLabel'>
  size?: 'sm' | 'md'
}

export function StatusBadge({ project, size = 'sm' }: StatusBadgeProps) {
  const def = getStatusDefinition(project.status)
  // 未知の表記はシートの値をそのまま出す
  const label = project.status === 'unknown' ? project.statusLabel || def.shortLabel : def.shortLabel
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full font-medium whitespace-nowrap ring-1 ring-inset ${def.badgeClass} ${
        size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'
      }`}
    >
      <span className={`size-1.5 rounded-full ${def.dotClass}`} aria-hidden />
      {label}
    </span>
  )
}
