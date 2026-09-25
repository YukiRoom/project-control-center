import { Check } from 'lucide-react'
import type { Progress } from '../lib/progress'

/** 進捗バー。「3 / 5 完了」「60%」と進んだ量を見せる */
export function ProgressBar({ progress }: { progress: Progress }) {
  if (progress.percent === null) {
    return <p className="text-xs text-slate-400">タスク未設定</p>
  }
  const complete = progress.percent === 100
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className={`text-sm font-semibold ${complete ? 'text-emerald-700' : 'text-slate-700'}`}>
          {complete ? (
            <span className="inline-flex items-center gap-1">
              <Check className="size-3.5" aria-hidden />
              目標タスク完了
            </span>
          ) : (
            <>
              {progress.done} / {progress.total} 完了
            </>
          )}
        </span>
        <span className={`text-lg font-bold tabular-nums ${complete ? 'text-emerald-700' : 'text-navy-800'}`}>
          {progress.percent}%
        </span>
      </div>
      <div
        className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
        aria-label={`進捗 ${progress.done} / ${progress.total} 完了`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${complete ? 'bg-emerald-500' : 'bg-navy-600'}`}
          style={{ width: `${progress.percent}%` }}
        />
      </div>
    </div>
  )
}
