import { ArrowRight, ArrowUpRight, Check, Copy, ExternalLink, Info, Lock, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { formatDate, formatRelative } from '../lib/date'
import { useCommands } from '../context/commands'
import type { Project } from '../types/project'
import { FocusToggle } from './FocusToggle'
import { LinkifiedText } from './LinkifiedText'
import { ResumeButton } from './ProjectActions'
import { CategorySelect, ChatLinkSection, GoalEditor, TaskSection } from './ProjectEditors'
import { StaleBadge } from './StaleBadge'
import { StatusBadge } from './StatusBadge'

interface ProjectDetailProps {
  project: Project
  stale: boolean
  onClose: () => void
}

function Field({ label, children, editable = false }: { label: string; children: ReactNode; editable?: boolean }) {
  return (
    <div className="py-2.5">
      <dt className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-slate-400">
        {label}
        {editable && (
          <span className="rounded bg-navy-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-navy-600">編集可</span>
        )}
      </dt>
      <dd className="mt-1 text-[15px] leading-relaxed text-slate-700">{children}</dd>
    </div>
  )
}

/** 「総合管理」シートの内容（アプリからは編集しない）であることを示す見出し */
function ReadOnlyHeading({ title }: { title: string }) {
  return (
    <h3 className="flex items-center gap-1.5 pt-4 text-sm font-bold text-slate-800">
      {title}
      <span className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
        <Lock className="size-2.5" aria-hidden />
        シートで編集
      </span>
    </h3>
  )
}

/** ID 未発行・重複・名称変更など、紐付けに関するお知らせ */
function IdentityNotice({ project }: { project: Project }) {
  const { v3Ready, assignProjectIds } = useCommands()
  if (!v3Ready) return null
  const box = 'mt-4 flex items-start gap-2 rounded-xl px-3.5 py-3 text-sm leading-relaxed'
  if (project.idMissing) {
    return (
      <div className={`${box} bg-orange-50 text-orange-900`}>
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <div className="flex-1">
          <p>この案件にはプロジェクトIDがまだありません（「総合管理」に追加された行など）。発行すると目標・タスク・FOCUSを使えます。</p>
          <button
            type="button"
            onClick={() => void assignProjectIds()}
            className="mt-2 inline-flex h-9 items-center rounded-lg bg-orange-600 px-3 text-sm font-semibold text-white hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
          >
            IDを発行（「総合管理」K列の空欄に書き込み）
          </button>
        </div>
      </div>
    )
  }
  if (project.idConflict) {
    return (
      <div className={`${box} bg-red-50 text-red-900`}>
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>同じプロジェクトIDが複数行にあります。「総合管理」で行をコピーした場合は、コピー先のK列（プロジェクトID）を空にしてください。</p>
      </div>
    )
  }
  if (project.previousName) {
    return (
      <div className={`${box} bg-slate-100 text-slate-700`}>
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          前回の記録では案件名が「{project.previousName}」でした。名称を変更した場合は問題ありません（次に編集したときに記録が更新されます）。
          並べ替えなどで K列がずれた可能性がある場合は、「総合管理」の K列を確認してください。
        </p>
      </div>
    )
  }
  return null
}

function Empty() {
  return <span className="text-slate-400">未設定</span>
}

function UrlValue({ url }: { url: string }) {
  if (!url) return <Empty />
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex max-w-full items-center gap-1 text-navy-600 underline decoration-navy-200 underline-offset-2 hover:decoration-navy-600"
    >
      <span className="break-all">{url}</span>
      <ExternalLink className="size-3.5 shrink-0" aria-hidden />
    </a>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(timer)
  }, [copied])

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
        } catch {
          // クリップボード非対応の環境では何もしない
        }
      }}
      className="ml-2 inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 px-2 align-middle text-xs font-medium text-slate-600 hover:bg-slate-50"
    >
      {copied ? <Check className="size-3.5 text-emerald-600" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      {copied ? 'コピーしました' : 'コピー'}
    </button>
  )
}

/**
 * 案件詳細（情報を見る・編集する場所）。スマホはボトムシート、PC（md〜）は右サイドパネル。
 * 並び: 基本情報 → 現在地 → NEXT → 目標 → タスク → メインチャット → その他
 */
export function ProjectDetail({ project, stale, onClose }: ProjectDetailProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      // 入力中の Esc は入力のキャンセルに使うので、パネルは閉じない
      const target = event.target as HTMLElement | null
      if (event.key === 'Escape' && !target?.closest('input, textarea, select')) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end" role="presentation">
      <div className="absolute inset-0 animate-fade-in bg-slate-900/45" onClick={onClose} aria-hidden />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-detail-title"
        className="relative flex max-h-[94dvh] w-full animate-sheet-up flex-col rounded-t-3xl bg-white shadow-2xl md:max-h-none md:w-[560px] md:animate-panel-in md:rounded-none md:rounded-l-2xl"
      >
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-slate-300 md:hidden" aria-hidden />

        <header className="flex shrink-0 items-start gap-3 border-b border-slate-100 px-5 pt-3 pb-4 md:px-6 md:pt-6">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium tracking-wide text-slate-500">{project.category || '大分類なし'}</p>
            <h2 id="project-detail-title" className="mt-1 text-xl leading-snug font-bold text-slate-900">
              {project.name || '（無題の案件）'}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <StatusBadge project={project} size="md" />
              {stale && <StaleBadge updatedAt={project.updatedAt} />}
              <FocusToggle project={project} variant="button" />
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="詳細を閉じる"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto overscroll-contain px-5 pb-4 md:px-6">
          {/* 基本情報 */}
          <div>
            <IdentityNotice project={project} />
            <ReadOnlyHeading title="基本情報" />
            <dl className="grid grid-cols-2 gap-x-4">
              <Field label="大分類">{project.category || <Empty />}</Field>
              <Field label="状態">{project.statusLabel || <Empty />}</Field>
              <Field label="最終更新日">
                {project.updatedAt ? (
                  <>
                    {formatDate(project.updatedAt)}
                    <span className="ml-1 text-sm text-slate-400">（{formatRelative(project.updatedAt)}）</span>
                  </>
                ) : (
                  <Empty />
                )}
              </Field>
              <Field label="カテゴリー" editable>
                <CategorySelect project={project} />
              </Field>
            </dl>
          </div>

          {/* 現在地・NEXT（「総合管理」D・E列） */}
          <div className="pb-4">
            <ReadOnlyHeading title="現在地" />
            <p className="mt-1.5 text-[15px] leading-relaxed text-slate-700">
              {project.currentState ? <LinkifiedText text={project.currentState} /> : <Empty />}
            </p>
            <div className="mt-4 rounded-xl border-l-4 border-navy-700 bg-navy-50 px-4 py-3">
              <p className="flex items-center gap-1 text-xs font-bold tracking-wider text-navy-700">
                <ArrowRight className="size-3.5" aria-hidden />
                NEXT（次にやること）
              </p>
              <p className="mt-1 text-base leading-relaxed font-semibold text-navy-950">
                {project.nextAction ? <LinkifiedText text={project.nextAction} /> : <Empty />}
              </p>
            </div>
          </div>

          <GoalEditor key={`goal-${project.projectId}`} project={project} />
          <TaskSection project={project} />
          <ChatLinkSection key={`chat-${project.projectId}`} project={project} />

          {/* その他（「総合管理」F・H・J列） */}
          <div>
            <ReadOnlyHeading title="その他" />
            <dl>
              <Field label="検索キーワード">
                {project.keywords ? (
                  <>
                    <span className="break-words">{project.keywords}</span>
                    <CopyButton text={project.keywords} />
                  </>
                ) : (
                  <Empty />
                )}
              </Field>
              <Field label="メモ">{project.memo ? <LinkifiedText text={project.memo} /> : <Empty />}</Field>
              <Field label="プロジェクトURL">
                <UrlValue url={project.projectUrl} />
              </Field>
            </dl>
          </div>
        </div>

        {(project.chatUrl || project.projectUrl) && (
          <footer className="flex shrink-0 gap-2 border-t border-slate-100 bg-white px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-6 md:pb-5">
            {project.chatUrl && <ResumeButton project={project} size="lg" className="flex-1" />}
            {project.projectUrl && (
              <a
                href={project.projectUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${project.name} のプロジェクトを新しいタブで開く`}
                className={`inline-flex h-12 items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-4 text-[15px] font-semibold whitespace-nowrap text-navy-800 hover:border-navy-300 hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-500 ${
                  project.chatUrl ? '' : 'flex-1'
                }`}
              >
                <ArrowUpRight className="size-4 shrink-0" aria-hidden />
                プロジェクトを開く
              </a>
            )}
          </footer>
        )}
      </section>
    </div>
  )
}
