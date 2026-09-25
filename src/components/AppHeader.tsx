import { KeyRound, RefreshCw } from 'lucide-react'
import { formatTime } from '../lib/date'

interface AppHeaderProps {
  sourceLabel: string
  fetchedAt?: Date
  isRefreshing: boolean
  canReload: boolean
  onReload: () => void
  /** 閲覧キーを保存している場合のみ渡す */
  onForgetKey?: () => void
}

const iconButton =
  'grid size-10 place-items-center rounded-lg text-navy-100 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white disabled:opacity-40'

export function AppHeader({ sourceLabel, fetchedAt, isRefreshing, canReload, onReload, onForgetKey }: AppHeaderProps) {
  const isSheets = sourceLabel === 'Google Sheets'
  return (
    <header className="bg-navy-900 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 pt-[max(0.875rem,env(safe-area-inset-top))] pb-3.5 sm:px-6 sm:py-4 lg:px-8">
        <div className="min-w-0">
          <h1 className="text-[17px] leading-tight font-bold tracking-[0.06em] whitespace-nowrap min-[400px]:tracking-[0.1em] sm:text-xl sm:tracking-[0.14em]">
            PROJECT CONTROL CENTER
          </h1>
          <p className="mt-0.5 text-xs text-navy-200 sm:text-[13px]">次にやることが、すぐ分かる。</p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {!isSheets && (
            <span className="mr-1 rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-navy-100">{sourceLabel}</span>
          )}
          {fetchedAt && (
            <span className="mr-1 hidden text-xs text-navy-200 tabular-nums sm:inline" title={`${sourceLabel} から取得`}>
              {formatTime(fetchedAt)} 更新
            </span>
          )}
          <button
            type="button"
            onClick={onReload}
            disabled={!canReload || isRefreshing}
            className={iconButton}
            aria-label="最新のデータを再読み込み"
            title="再読み込み"
          >
            <RefreshCw className={`size-[18px] ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden />
          </button>
          {onForgetKey && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('この端末から閲覧キーを削除しますか？（次回は再入力が必要です）')) onForgetKey()
              }}
              className={iconButton}
              aria-label="この端末から閲覧キーを削除"
              title="閲覧キーの管理（この端末から削除）"
            >
              <KeyRound className="size-[18px]" aria-hidden />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
