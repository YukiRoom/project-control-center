import { AlertCircle, Info, X } from 'lucide-react'
import type { Notice } from '../hooks/useProjects'

/** 画面下部の通知（保存エラー・FOCUS 上限など） */
export function Notices({ notices, onDismiss }: { notices: Notice[]; onDismiss: (id: number) => void }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      aria-live="assertive"
    >
      {notices.map((notice) => (
        <div
          key={notice.id}
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={`pointer-events-auto flex w-full max-w-md animate-sheet-up items-start gap-2 rounded-xl px-4 py-3 text-sm text-white shadow-lg ${
            notice.kind === 'error' ? 'bg-red-700' : 'bg-navy-900'
          }`}
        >
          {notice.kind === 'error' ? (
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          ) : (
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          )}
          <p className="flex-1 leading-relaxed">{notice.message}</p>
          <button
            type="button"
            onClick={() => onDismiss(notice.id)}
            className="-m-1 grid size-7 shrink-0 place-items-center rounded-md hover:bg-white/15"
            aria-label="通知を閉じる"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  )
}
