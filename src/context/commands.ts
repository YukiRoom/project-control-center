import { createContext, useContext } from 'react'
import type { Category, Project, Task } from '../types/project'

/**
 * 画面から呼ぶ更新操作。確認ダイアログ・FOCUS 上限チェック・未セットアップ時の案内などを
 * ここにまとめ、各コンポーネントは結果（成功したか）だけを受け取る。
 */
export interface Commands {
  v3Ready: boolean
  categories: Category[]
  maxFocus: number
  focusCount: number
  toggleFocus: (project: Project) => void
  setCategory: (project: Project, category: string) => Promise<boolean>
  setGoal: (project: Project, goal: string) => Promise<boolean>
  addTask: (project: Project, title: string) => Promise<boolean>
  renameTask: (task: Task, title: string) => Promise<boolean>
  toggleTask: (task: Task) => void
  deleteTask: (task: Task) => void
  moveTask: (task: Task, direction: 'up' | 'down') => void
  setChatUrl: (project: Project, url: string) => Promise<boolean>
  clearChatUrl: (project: Project) => Promise<boolean>
}

export const CommandsContext = createContext<Commands | null>(null)

export function useCommands(): Commands {
  const commands = useContext(CommandsContext)
  if (!commands) throw new Error('CommandsContext が見つかりません')
  return commands
}

/** 送信中（サーバーで ID が確定していない）タスク */
export function isPendingTask(task: Task): boolean {
  return task.taskId.startsWith('pending_')
}
