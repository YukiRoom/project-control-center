import { AlertTriangle } from 'lucide-react'
import { STALE_THRESHOLD_DAYS } from '../lib/date'

interface StaleBannerProps {
  count: number
  active: boolean
  onToggle: () => void
}

/** 30日以上更新がない進行中案件の件数を知らせる */
export function StaleBanner({ count, active, onToggle }: StaleBannerProps) {
  if (count === 0) return null
  return (
    <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50/70 py-2.5 pr-2.5 pl-4 sm:py-3">
      <p className="flex flex-1 items-start gap-2 text-sm text-orange-900">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-orange-600" aria-hidden />
        <span>
          <span className="font-bold">要確認 {count}件</span>
          <span className="text-orange-800">
            <span className="hidden sm:inline"> — </span>
            <br className="sm:hidden" />
            {STALE_THRESHOLD_DAYS}日以上更新のない進行中案件
          </span>
        </span>
      </p>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={active}
        className={`h-10 shrink-0 rounded-lg px-3 text-sm font-medium transition ${
          active
            ? 'bg-orange-600 text-white hover:bg-orange-700'
            : 'border border-orange-300 bg-white text-orange-800 hover:bg-orange-100'
        }`}
      >
        {active ? '解除' : '絞り込む'}
      </button>
    </div>
  )
}
