import type { Project, Task } from '../types/project'

export interface Progress {
  done: number
  total: number
  /** 0〜100（タスク 0 件なら null = 「タスク未設定」） */
  percent: number | null
}

/** 進捗率は手入力させず、完了タスク数 ÷ 全タスク数 で自動計算する */
export function getProgress(tasks: Task[]): Progress {
  const total = tasks.length
  const done = tasks.filter((t) => t.completed).length
  return { done, total, percent: total === 0 ? null : Math.round((done / total) * 100) }
}

/** 次のタスク: 並び順で最初の未完了タスク */
export function getNextTask(project: Project): Task | null {
  return project.tasks.find((t) => !t.completed) ?? null
}
