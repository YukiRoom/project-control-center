import { AlertTriangle } from 'lucide-react'
import { daysSince } from '../lib/date'

/** 要確認（30日以上更新なし）を示す小さなチップ */
export function StaleBadge({ updatedAt }: { updatedAt: string }) {
  const days = daysSince(updatedAt)
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-orange-50 px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap text-orange-800"
      title="30日以上更新がありません（要確認）"
    >
      <AlertTriangle className="size-3" aria-hidden />
      {days !== null ? `${days}日更新なし` : '要確認'}
    </span>
  )
}
