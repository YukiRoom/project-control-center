import { ArrowRight, Check, Copy, ExternalLink, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { formatDate, formatRelative } from '../lib/date'
import type { Project } from '../types/project'
import { LinkifiedText } from './LinkifiedText'
import { ProjectLinks } from './ProjectLinks'
import { StaleBadge } from './StaleBadge'
import { StatusBadge } from './StatusBadge'

interface ProjectDetailProps {
  project: Project
  stale: boolean
  onClose: () => void
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="py-3.5">
      <dt className="text-xs font-semibold tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-1 text-[15px] leading-relaxed text-slate-700">{children}</dd>
    </div>
  )
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
 * 案件詳細。スマホ（〜sm）はボトムシート、PC（md〜）は右サイドパネル。
 */
export function ProjectDetail({ project, stale, onClose }: ProjectDetailProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
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
        className="relative flex max-h-[92dvh] w-full animate-sheet-up flex-col rounded-t-3xl bg-white shadow-2xl md:max-h-none md:w-[520px] md:animate-panel-in md:rounded-none md:rounded-l-2xl"
      >
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-slate-300 md:hidden" aria-hidden />

        <header className="flex shrink-0 items-start gap-3 border-b border-slate-100 px-5 pt-3 pb-4 md:px-6 md:pt-6">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium tracking-wide text-slate-500">{project.category || '大分類なし'}</p>
            <h2 id="project-detail-title" className="mt-1 text-xl leading-snug font-bold text-slate-900">
              {project.name || '（無題の案件）'}
            </h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <StatusBadge project={project} size="md" />
              {stale && <StaleBadge updatedAt={project.updatedAt} />}
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

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 md:px-6">
          <div className="mt-4 rounded-xl border-l-4 border-navy-700 bg-navy-50 px-4 py-3.5">
            <p className="flex items-center gap-1 text-xs font-bold tracking-wider text-navy-700">
              <ArrowRight className="size-3.5" aria-hidden />
              次にやること
            </p>
            <p className="mt-1 text-base leading-relaxed font-semibold text-navy-950">
              {project.nextAction ? <LinkifiedText text={project.nextAction} /> : <Empty />}
            </p>
          </div>

          <dl className="mt-1 divide-y divide-slate-100">
            <Field label="現在地">{project.currentState ? <LinkifiedText text={project.currentState} /> : <Empty />}</Field>
            <Field label="状態">{project.statusLabel || <Empty />}</Field>
            <Field label="最終更新日">
              {project.updatedAt ? (
                <>
                  {formatDate(project.updatedAt)}
                  <span className="ml-1.5 text-sm text-slate-400">（{formatRelative(project.updatedAt)}）</span>
                </>
              ) : (
                <Empty />
              )}
            </Field>
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
            <Field label="メインチャットURL">
              <UrlValue url={project.chatUrl} />
            </Field>
            <Field label="プロジェクトURL">
              <UrlValue url={project.projectUrl} />
            </Field>
          </dl>
        </div>

        <footer className="shrink-0 border-t border-slate-100 bg-white px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-6 md:pb-5">
          <ProjectLinks project={project} size="lg" />
        </footer>
      </section>
    </div>
  )
}
