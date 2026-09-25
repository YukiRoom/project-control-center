import { AlertTriangle, ArrowDown, ArrowUp, Check, ChevronDown, Circle, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { isPendingTask, useCommands } from '../context/commands'
import { getProgress } from '../lib/progress'
import type { Project, Task } from '../types/project'
import { ResumeButton } from './ProjectActions'
import { ProgressBar } from './ProgressBar'

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 text-base outline-none placeholder:text-slate-400 focus:border-navy-500 focus:ring-2 focus:ring-navy-100 sm:text-sm'
const primaryButton =
  'inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-navy-800 px-4 text-sm font-semibold text-white hover:bg-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-500 disabled:opacity-40'
const ghostButton =
  'inline-flex h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-navy-500'
const linkButton =
  'inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-sm font-semibold text-navy-700 hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-navy-500'

/** 編集できるセクションの見出し（参照のみのセクションと区別する） */
export function EditableSection({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="py-4">
      <div className="mb-2 flex min-h-9 items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
          {title}
          <span className="rounded bg-navy-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-navy-600">編集可</span>
        </h3>
        {action}
      </div>
      {children}
    </section>
  )
}

// ───────────── カテゴリー ─────────────

export function CategorySelect({ project }: { project: Project }) {
  const { categories, setCategory, v3Ready } = useCommands()
  return (
    <label className="relative block w-full max-w-60">
      <span className="sr-only">カテゴリー</span>
      <select
        value={project.topCategory}
        disabled={!v3Ready}
        onChange={(event) => void setCategory(project, event.target.value)}
        className={`${inputClass} h-10 appearance-none pr-9 disabled:bg-slate-50 disabled:text-slate-400`}
      >
        <option value="">未分類</option>
        {categories.map((c) => (
          <option key={c.key} value={c.key}>
            {c.emoji} {c.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
    </label>
  )
}

// ───────────── 目標 ─────────────

export function GoalEditor({ project }: { project: Project }) {
  const { setGoal, v3Ready } = useCommands()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(project.goal)

  const start = () => {
    setDraft(project.goal)
    setEditing(true)
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setEditing(false)
    if (draft.trim() !== project.goal) await setGoal(project, draft)
  }

  return (
    <EditableSection
      title="目標"
      action={
        v3Ready &&
        !editing && (
          <button type="button" onClick={start} className={linkButton}>
            <Pencil className="size-3.5" aria-hidden />
            {project.goal ? '編集' : '目標を登録'}
          </button>
        )
      }
    >
      {editing ? (
        <form onSubmit={submit} className="space-y-2">
          <label className="block">
            <span className="sr-only">目標</span>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={300}
              rows={2}
              autoFocus
              placeholder="例: note記事制作システムを実運用できる状態にする"
              className={`${inputClass} py-2 leading-relaxed`}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} className={ghostButton}>
              キャンセル
            </button>
            <button type="submit" className={primaryButton}>
              保存
            </button>
          </div>
        </form>
      ) : (
        <p className={`text-[15px] leading-relaxed ${project.goal ? 'font-semibold text-slate-900' : 'text-slate-400'}`}>
          {project.goal || (v3Ready ? 'まだ目標がありません。' : '初期設定後に登録できます。')}
        </p>
      )}
    </EditableSection>
  )
}

// ───────────── タスク ─────────────

function TaskItem({ task, index, count }: { task: Task; index: number; count: number }) {
  const { toggleTask, renameTask, deleteTask, moveTask } = useCommands()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(task.title)
  const pending = isPendingTask(task)

  const save = async () => {
    setEditing(false)
    const title = draft.trim()
    if (title && title !== task.title) await renameTask(task, title)
  }

  const iconButton =
    'grid size-9 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-navy-500 disabled:pointer-events-none disabled:opacity-30'

  return (
    <li className="group flex items-center gap-1 py-1">
      <button
        type="button"
        onClick={() => toggleTask(task)}
        disabled={pending}
        aria-pressed={task.completed}
        aria-label={`「${task.title}」を${task.completed ? '未完了に戻す' : '完了にする'}`}
        className={`grid size-10 shrink-0 place-items-center rounded-full transition focus-visible:outline-2 focus-visible:outline-navy-500 disabled:opacity-40 ${
          task.completed ? 'text-emerald-600' : 'text-slate-300 hover:text-navy-500'
        }`}
      >
        {task.completed ? (
          <span className="grid size-5 place-items-center rounded-full bg-emerald-500 text-white">
            <Check className="size-3.5" strokeWidth={3} aria-hidden />
          </span>
        ) : (
          <Circle className="size-5" aria-hidden />
        )}
      </button>

      {editing ? (
        <form
          className="min-w-0 flex-1"
          onSubmit={(event) => {
            event.preventDefault()
            void save()
          }}
        >
          <label>
            <span className="sr-only">タスク名</span>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={() => void save()}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.stopPropagation()
                  setDraft(task.title)
                  setEditing(false)
                }
              }}
              maxLength={200}
              autoFocus
              className={`${inputClass} h-9`}
            />
          </label>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => {
            if (pending) return
            setDraft(task.title)
            setEditing(true)
          }}
          className={`min-w-0 flex-1 rounded-md px-1 py-1.5 text-left text-[15px] leading-snug hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-navy-500 ${
            task.completed ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-800'
          }`}
          aria-label={`「${task.title}」の名前を編集`}
        >
          {task.title}
        </button>
      )}

      {!editing && (
        <div className="flex shrink-0 items-center">
          <button type="button" onClick={() => moveTask(task, 'up')} disabled={pending || index === 0} className={iconButton} aria-label={`「${task.title}」を上へ`}>
            <ArrowUp className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => moveTask(task, 'down')}
            disabled={pending || index === count - 1}
            className={iconButton}
            aria-label={`「${task.title}」を下へ`}
          >
            <ArrowDown className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => deleteTask(task)}
            disabled={pending}
            className={`${iconButton} hover:bg-red-50 hover:text-red-600`}
            aria-label={`「${task.title}」を削除`}
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      )}
    </li>
  )
}

export function TaskSection({ project }: { project: Project }) {
  const { addTask, v3Ready } = useCommands()
  const [draft, setDraft] = useState('')
  const progress = getProgress(project.tasks)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const title = draft.trim()
    if (!title) return
    setDraft('')
    const ok = await addTask(project, title)
    if (!ok) setDraft(title)
  }

  return (
    <EditableSection title="タスク">
      {v3Ready ? (
        <>
          {project.tasks.length > 0 && (
            <div className="mb-2">
              <ProgressBar progress={progress} />
            </div>
          )}
          <ul className="-mx-2" aria-label="タスク一覧">
            {project.tasks.map((task, index) => (
              <TaskItem key={task.taskId} task={task} index={index} count={project.tasks.length} />
            ))}
          </ul>
          <form onSubmit={submit} className="mt-2 flex gap-2">
            <label className="min-w-0 flex-1">
              <span className="sr-only">新しいタスク</span>
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={200}
                enterKeyHint="done"
                placeholder="＋ タスクを追加"
                className={`${inputClass} h-10`}
              />
            </label>
            <button type="submit" disabled={!draft.trim()} className={primaryButton}>
              <Plus className="size-4" aria-hidden />
              追加
            </button>
          </form>
        </>
      ) : (
        <p className="text-sm text-slate-400">初期設定後にタスクを登録できます。</p>
      )}
    </EditableSection>
  )
}

// ───────────── メインチャット ─────────────

/** ChatGPT の URL として自然か（形式変更に備えて厳密にしすぎない） */
function isChatGptUrl(url: string): boolean {
  return /^https:\/\/chatgpt\.com\//i.test(url)
}

function isHttpsUrl(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:' && !/\s/.test(url)
  } catch {
    return false
  }
}

export function ChatLinkSection({ project }: { project: Project }) {
  const { setChatUrl, clearChatUrl } = useCommands()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [confirmUnusual, setConfirmUnusual] = useState(false)

  const url = draft.trim()
  const valid = isHttpsUrl(url)
  const unusual = valid && !isChatGptUrl(url)

  const start = () => {
    setDraft(project.chatUrlRaw)
    setConfirmUnusual(false)
    setEditing(true)
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!valid) return
    if (unusual && !confirmUnusual) {
      setConfirmUnusual(true)
      return
    }
    setEditing(false)
    if (url !== project.chatUrlRaw) await setChatUrl(project, url)
  }

  return (
    <EditableSection title="メインチャット">
      {editing ? (
        <form onSubmit={submit} className="space-y-2">
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">ChatGPT のチャットURL（「総合管理」G列に保存されます）</span>
            <input
              type="url"
              inputMode="url"
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value)
                setConfirmUnusual(false)
              }}
              autoFocus
              placeholder="https://chatgpt.com/c/..."
              className={`${inputClass} h-11`}
            />
          </label>
          {url && !valid && <p className="text-sm text-red-700">https:// で始まる正しいURLを入力してください。</p>}
          {unusual && (
            <p className="flex items-start gap-1.5 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-800">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              https://chatgpt.com/ 以外のURLです。{confirmUnusual ? 'もう一度「保存」を押すと保存します。' : 'このURLで正しいか確認してください。'}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} className={ghostButton}>
              キャンセル
            </button>
            <button type="submit" disabled={!valid} className={primaryButton}>
              保存
            </button>
          </div>
        </form>
      ) : project.chatUrl ? (
        <div className="space-y-2">
          <ResumeButton project={project} size="lg" className="w-full sm:w-auto" />
          <div className="flex flex-wrap items-center gap-1">
            <button type="button" onClick={start} className={linkButton}>
              <Pencil className="size-3.5" aria-hidden />
              リンクを変更
            </button>
            <button type="button" onClick={() => void clearChatUrl(project)} className={`${linkButton} text-slate-500 hover:bg-red-50 hover:text-red-700`}>
              <Trash2 className="size-3.5" aria-hidden />
              リンクを削除
            </button>
          </div>
          <p className="text-xs break-all text-slate-400">{project.chatUrl}</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={start}
          className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-dashed border-navy-300 px-4 text-sm font-semibold text-navy-700 hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-navy-500"
        >
          <Plus className="size-4" aria-hidden />
          ChatGPTリンクを登録
        </button>
      )}
    </EditableSection>
  )
}
