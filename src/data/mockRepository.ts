import { toDataset, type ApiState } from '../lib/dataset'
import type { Mutation, ProjectRow, TaskRow } from '../types/project'
import { MOCK_META, MOCK_PROJECT_ROWS, MOCK_TASKS } from './mockProjects'
import { DataError, type ProjectRepository } from './repository'

const CATEGORIES = [
  { key: 'BUSINESS', label: 'BUSINESS', emoji: '💼' },
  { key: 'CONTENT', label: 'CONTENT', emoji: '✍️' },
  { key: 'CREATIVE', label: 'CREATIVE', emoji: '🎨' },
  { key: 'SYSTEM', label: 'SYSTEM / APP', emoji: '🤖' },
  { key: 'OTHER', label: 'OTHER', emoji: '📦' },
]
const MAX_FOCUS = 3

/** 開発用の簡易キー（本番は Apps Script が SHA-256 から算出） */
function mockKey(name: string): string {
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  for (const ch of name) {
    h1 = Math.imul(h1 ^ ch.codePointAt(0)!, 16777619) >>> 0
    h2 = Math.imul(h2 + ch.codePointAt(0)!, 2246822519) >>> 0
  }
  return `pk_${(h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')).slice(0, 12)}`
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 開発用リポジトリ（メモリ上で読み書きする）。URL に以下を付けると状態を確認できる:
 * ?mock=error / ?mock=empty / ?mock=slow / ?mock=v2（V3 未対応の Apps Script を再現）
 */
export function createMockRepository(): ProjectRepository {
  const mode = new URLSearchParams(window.location.search).get('mock')
  const projects: ProjectRow[] = MOCK_PROJECT_ROWS.map((row) => ({
    ...row,
    projectKey: mockKey(row.name),
    keyConflict: false,
    topCategory: MOCK_META[row.name]?.topCategory ?? '',
    focus: MOCK_META[row.name]?.focus ?? false,
    goal: MOCK_META[row.name]?.goal ?? '',
  }))
  let seq = 0
  const newTaskId = () => `t_${(++seq).toString(16).padStart(16, '0')}`
  let tasks: TaskRow[] = MOCK_TASKS.map(({ projectName, ...task }) => ({
    ...task,
    taskId: newTaskId(),
    projectKey: mockKey(projectName),
  }))

  const state = (): ApiState => ({
    apiVersion: mode === 'v2' ? 1 : 3,
    projects: mode === 'empty' ? [] : projects.map((p) => ({ ...p })),
    tasks: tasks.map((t) => ({ ...t })),
    categories: CATEGORIES,
    v3: { ready: mode !== 'v2', orphanCount: 0, maxFocus: MAX_FOCUS },
  })

  const reject = (apiCode: string, message: string) => new DataError('REJECTED', message, apiCode)
  const findProject = (key: string) => {
    const project = projects.find((p) => p.projectKey === key)
    if (!project) throw reject('NOT_FOUND', '案件が見つかりません。')
    return project
  }
  const findTask = (id: string) => {
    const task = tasks.find((t) => t.taskId === id)
    if (!task) throw reject('NOT_FOUND', 'タスクが見つかりません。')
    return task
  }

  function apply(m: Mutation) {
    switch (m.action) {
      case 'setCategory':
        findProject(m.projectKey).topCategory = m.category
        return
      case 'setFocus': {
        const project = findProject(m.projectKey)
        if (m.focus && projects.filter((p) => p.focus && p !== project).length >= MAX_FOCUS) {
          throw reject('FOCUS_LIMIT', `FOCUSは最大${MAX_FOCUS}件です。どれかを外してください。`)
        }
        project.focus = m.focus
        return
      }
      case 'setGoal':
        findProject(m.projectKey).goal = m.goal.trim()
        return
      case 'addTask': {
        findProject(m.projectKey)
        const own = tasks.filter((t) => t.projectKey === m.projectKey)
        const sortOrder = own.reduce((max, t) => Math.max(max, t.sortOrder), 0) + 1
        tasks.push({ taskId: newTaskId(), projectKey: m.projectKey, task: m.task.trim(), completed: false, sortOrder })
        return
      }
      case 'updateTask':
        findTask(m.taskId).task = m.task.trim()
        return
      case 'toggleTask':
        findTask(m.taskId).completed = m.completed
        return
      case 'deleteTask':
        findTask(m.taskId)
        tasks = tasks.filter((t) => t.taskId !== m.taskId)
        return
      case 'reorderTask': {
        const task = findTask(m.taskId)
        const siblings = tasks.filter((t) => t.projectKey === task.projectKey).sort((a, b) => a.sortOrder - b.sortOrder)
        const index = siblings.indexOf(task)
        const target = m.direction === 'up' ? index - 1 : index + 1
        if (target < 0 || target >= siblings.length) return
        siblings.splice(index, 1)
        siblings.splice(target, 0, task)
        siblings.forEach((t, i) => (t.sortOrder = i + 1))
        return
      }
      case 'setChatUrl': {
        const project = findProject(m.projectKey)
        if (project.chatUrl !== m.expectedUrl) throw reject('CONFLICT', 'チャットURLは別の場所で変更されています。')
        if (!m.url.trim() && !m.clear) throw reject('INVALID_INPUT', 'URLが空です。')
        project.chatUrl = m.url.trim()
        return
      }
    }
  }

  return {
    sourceLabel: 'モックデータ',
    async load(signal) {
      await wait(mode === 'slow' ? 60_000 : 400)
      signal?.throwIfAborted()
      if (mode === 'error') throw new DataError('NETWORK', 'モック: 取得エラーを再現しています。')
      return toDataset(state())
    },
    async mutate(mutation) {
      await wait(500)
      if (mode === 'v2') throw reject('SETUP_REQUIRED', 'V3 用シートがありません。')
      apply(mutation)
      return toDataset(state())
    },
  }
}
