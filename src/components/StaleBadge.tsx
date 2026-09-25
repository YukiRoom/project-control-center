import { AlertTriangle } from 'lucide-react'
import { daysSince } from '../lib/date'

export function StaleBadge({ updatedAt }: { updatedAt: string }) {
  const days = daysSince(updatedAt)
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-orange-800 ring-1 ring-orange-200 ring-inset">
      <AlertTriangle className="size-3" aria-hidden />
      要確認{days !== null && `・${days}日更新なし`}
    </span>
  )
}
