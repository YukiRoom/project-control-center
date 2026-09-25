import type { Mutation, ProjectDataset, ProjectRow, Task, TaskRow } from '../types/project'
import { toProject } from './projects'

export interface ApiState {
  apiVersion?: number
  projects: ProjectRow[]
  tasks?: TaskRow[]
  categories?: ProjectDataset['categories']
  v3?: { ready: boolean; orphanCount: number; missingIdCount?: number; nameChangedCount?: number; maxFocus: number }
}

const DEFAULT_MAX_FOCUS = 3

/** API 応答を画面用のデータに変換する（V3 未対応の Apps Script でも動く） */
export function toDataset(state: ApiState): ProjectDataset {
  const tasksByProject = new Map<string, Task[]>()
  for (const row of state.tasks ?? []) {
    const task: Task = {
      taskId: String(row.taskId),
      projectId: String(row.projectId),
      title: String(row.task ?? ''),
      completed: row.completed === true,
      sortOrder: Number(row.sortOrder) || 0,
    }
    const list = tasksByProject.get(task.projectId) ?? []
    list.push(task)
    tasksByProject.set(task.projectId, list)
  }
  const isV3 = (state.apiVersion ?? 1) >= 3
  return {
    projects: state.projects.map((row) => toProject(row, row.projectId ? tasksByProject.get(row.projectId) : [])),
    categories: isV3 ? (state.categories ?? []) : [],
    v3Ready: isV3 && state.v3?.ready === true,
    orphanCount: state.v3?.orphanCount ?? 0,
    missingIdCount: state.v3?.missingIdCount ?? 0,
    nameChangedCount: state.v3?.nameChangedCount ?? 0,
    maxFocus: state.v3?.maxFocus ?? DEFAULT_MAX_FOCUS,
  }
}

let tempId = 0

/**
 * 楽観的更新: サーバーの応答を待たずに画面へ反映する。
 * 応答が返ったらサーバーの最新データで置き換え、失敗したら元に戻す。
 */
export function applyMutation(dataset: ProjectDataset, m: Mutation): ProjectDataset {
  if (m.action === 'assignProjectIds') return dataset
  const projects = dataset.projects.map((project) => {
    const tasks = project.tasks
    switch (m.action) {
      case 'setCategory':
        return project.projectId === m.projectId ? { ...project, topCategory: m.category } : project
      case 'setFocus':
        return project.projectId === m.projectId ? { ...project, focus: m.focus } : project
      case 'setGoal':
        return project.projectId === m.projectId ? { ...project, goal: m.goal.trim() } : project
      case 'setChatUrl':
        return project.projectId === m.projectId
          ? { ...project, chatUrl: m.url.trim(), chatUrlRaw: m.url.trim() }
          : project
      case 'addTask': {
        if (project.projectId !== m.projectId) return project
        const sortOrder = tasks.reduce((max, t) => Math.max(max, t.sortOrder), 0) + 1
        tempId += 1
        return {
          ...project,
          tasks: [
            ...tasks,
            { taskId: `pending_${tempId}`, projectId: project.projectId, title: m.task.trim(), completed: false, sortOrder },
          ],
        }
      }
      case 'updateTask':
      case 'toggleTask':
      case 'deleteTask':
      case 'reorderTask': {
        const index = tasks.findIndex((t) => t.taskId === m.taskId)
        if (index === -1) return project
        if (m.action === 'updateTask') {
          return { ...project, tasks: tasks.map((t, i) => (i === index ? { ...t, title: m.task.trim() } : t)) }
        }
        if (m.action === 'toggleTask') {
          return { ...project, tasks: tasks.map((t, i) => (i === index ? { ...t, completed: m.completed } : t)) }
        }
        if (m.action === 'deleteTask') return { ...project, tasks: tasks.filter((_, i) => i !== index) }
        const target = m.direction === 'up' ? index - 1 : index + 1
        if (target < 0 || target >= tasks.length) return project
        const next = [...tasks]
        ;[next[index], next[target]] = [next[target], next[index]]
        return { ...project, tasks: next.map((t, i) => ({ ...t, sortOrder: i + 1 })) }
      }
    }
  })
  return { ...dataset, projects }
}
