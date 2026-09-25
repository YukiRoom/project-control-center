import { CloudOff, FolderPlus, KeyRound, RefreshCw, SearchX, Settings } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { saveAccessKey } from '../data/accessKey'
import type { DataError } from '../data'

function Panel({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center sm:py-16">
      <div className="grid size-12 place-items-center rounded-full bg-slate-100 text-slate-500">{icon}</div>
      <h2 className="mt-4 text-base font-bold text-slate-800">{title}</h2>
      {children}
    </div>
  )
}

const primaryButton =
  'mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-navy-800 px-5 text-sm font-medium text-white hover:bg-navy-700'

export function LoadingState() {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <span className="sr-only">プロジェクトデータを読み込み中…</span>
      <div className="flex gap-2 overflow-hidden sm:grid sm:grid-cols-4 lg:grid-cols-7">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="h-[76px] w-[6.75rem] shrink-0 animate-pulse rounded-xl bg-slate-200/70 sm:w-auto" />
        ))}
      </div>
      <div className="h-24 animate-pulse rounded-2xl bg-slate-200/70" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
            <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200" />
            <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
          </div>
        ))}
      </div>
      <p className="text-center text-sm text-slate-500">プロジェクトデータを読み込んでいます…</p>
    </div>
  )
}

function AccessKeyForm({ onSubmit }: { onSubmit: () => void }) {
  const [value, setValue] = useState('')
  return (
    <form
      className="mt-5 flex w-full max-w-sm flex-col gap-2 sm:flex-row"
      onSubmit={(event) => {
        event.preventDefault()
        saveAccessKey(value.trim())
        onSubmit()
      }}
    >
      <label className="flex-1">
        <span className="sr-only">閲覧キー</span>
        <input
          type="password"
          autoComplete="current-password"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="閲覧キーを入力"
          className="h-11 w-full rounded-lg border border-slate-300 px-3 text-base outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
        />
      </label>
      <button type="submit" disabled={!value.trim()} className="h-11 rounded-lg bg-navy-800 px-5 text-sm font-medium text-white hover:bg-navy-700 disabled:opacity-50">
        表示する
      </button>
    </form>
  )
}

export function ErrorState({ error, onRetry }: { error: DataError; onRetry: () => void }) {
  if (error.code === 'UNAUTHORIZED') {
    return (
      <Panel icon={<KeyRound className="size-6" aria-hidden />} title="閲覧キーを入力してください">
        <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
          Apps Script で設定した閲覧キー（ACCESS_KEY）を入力すると、この端末に保存されて次回から自動で表示されます。
        </p>
        <AccessKeyForm onSubmit={onRetry} />
      </Panel>
    )
  }

  if (error.code === 'NOT_CONFIGURED') {
    return (
      <Panel icon={<Settings className="size-6" aria-hidden />} title="Google Sheets に未接続です">
        <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">{error.message}</p>
      </Panel>
    )
  }

  return (
    <Panel icon={<CloudOff className="size-6" aria-hidden />} title="プロジェクトデータを取得できませんでした">
      <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
        {error.message}
        <br />
        通信環境を確認して、もう一度お試しください。
      </p>
      <button type="button" onClick={onRetry} className={primaryButton}>
        <RefreshCw className="size-4" aria-hidden />
        再読み込み
      </button>
    </Panel>
  )
}

export function EmptyState({ onRetry }: { onRetry: () => void }) {
  return (
    <Panel icon={<FolderPlus className="size-6" aria-hidden />} title="まだ案件が登録されていません">
      <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
        スプレッドシート「総合管理」シートの 2 行目以降に案件を追加すると、ここに表示されます。
      </p>
      <button type="button" onClick={onRetry} className={primaryButton}>
        <RefreshCw className="size-4" aria-hidden />
        再読み込み
      </button>
    </Panel>
  )
}

export function NoResults({ onClear }: { onClear: () => void }) {
  return (
    <Panel icon={<SearchX className="size-6" aria-hidden />} title="条件に一致する案件がありません">
      <p className="mt-2 text-sm text-slate-500">検索語や絞り込み条件を変えてみてください。</p>
      <button type="button" onClick={onClear} className={primaryButton}>
        条件をクリア
      </button>
    </Panel>
  )
}
