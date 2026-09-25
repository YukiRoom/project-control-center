import { RefreshCw } from 'lucide-react'
import { formatTime } from '../lib/date'

interface AppHeaderProps {
  sourceLabel: string
  fetchedAt?: Date
  isRefreshing: boolean
  canReload: boolean
  onReload: () => void
}

export function AppHeader({ sourceLabel, fetchedAt, isRefreshing, canReload, onReload }: AppHeaderProps) {
  return (
    <header className="bg-navy-900 text-white">
      <div className="mx-auto flex max-w-7xl items-start justify-between gap-4 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-5 sm:px-6 sm:py-7 lg:px-8">
        <div className="min-w-0">
          <h1 className="text-[17px] leading-tight font-bold tracking-[0.06em] whitespace-nowrap min-[400px]:tracking-[0.1em] sm:text-2xl sm:tracking-[0.14em]">PROJECT CONTROL CENTER</h1>
          <p className="mt-1 text-[13px] text-navy-200 sm:text-sm">次にやることが、すぐ分かる。</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden text-right text-xs leading-relaxed text-navy-200 sm:block">
            <p>
              データ: <span className="font-medium text-white">{sourceLabel}</span>
            </p>
            {fetchedAt && <p>{formatTime(fetchedAt)} 取得</p>}
          </div>
          <button
            type="button"
            onClick={onReload}
            disabled={!canReload || isRefreshing}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 text-sm font-medium transition hover:bg-white/20 disabled:opacity-50"
            aria-label="データを再読み込み"
          >
            <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden />
            <span className="hidden sm:inline">再読み込み</span>
          </button>
        </div>
      </div>
    </header>
  )
}
