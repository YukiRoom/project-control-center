import { useMemo } from 'react'
import type { Commands } from '../context/commands'
import { isPendingTask } from '../context/commands'
import type { Mutation, Project, ProjectDataset, Task } from '../types/project'

const SETUP_MESSAGE = 'FOCUS・目標・タスクを使うには初期設定（V3 用シートの作成）が必要です。'

/** useProjects の mutate を、画面から使いやすい操作にまとめる */
export function useCommandsValue(
  dataset: ProjectDataset,
  mutate: (m: Mutation) => Promise<boolean>,
  notify: (kind: 'error' | 'info', message: string) => void,
): Commands {
  return useMemo(() => {
    const focusCount = dataset.projects.filter((p) => p.focus).length

    const canEditMeta = (project: Project): boolean => {
      if (!dataset.v3Ready) {
        notify('info', SETUP_MESSAGE)
        return false
      }
      return canEditProject(project)
    }
    const canEditProject = (project: Project): boolean => {
      if (project.idMissing && dataset.v3Ready) {
        notify('info', 'この案件はプロジェクトIDが未発行です。詳細画面の「IDを発行」から発行してください。')
        return false
      }
      if (!project.projectId) {
        notify('info', 'Google Sheets 側の V3 初期設定が終わると編集できます。')
        return false
      }
      if (project.idConflict) {
        notify('error', '同じプロジェクトIDが複数行にあります。「総合管理」でコピーした行のK列を空にしてください。')
        return false
      }
      return true
    }
    const canEditTask = (task: Task): boolean => !isPendingTask(task)

    return {
      v3Ready: dataset.v3Ready,
      categories: dataset.categories,
      maxFocus: dataset.maxFocus,
      focusCount,
      toggleFocus(project) {
        if (!canEditMeta(project)) return
        if (!project.focus && focusCount >= dataset.maxFocus) {
          notify('info', `FOCUSは最大${dataset.maxFocus}件です。どれかを外してください`)
          return
        }
        void mutate({ action: 'setFocus', projectId: project.projectId, focus: !project.focus })
      },
      async setCategory(project, category) {
        if (!canEditMeta(project)) return false
        return mutate({ action: 'setCategory', projectId: project.projectId, category })
      },
      async setGoal(project, goal) {
        if (!canEditMeta(project)) return false
        return mutate({ action: 'setGoal', projectId: project.projectId, goal })
      },
      async addTask(project, title) {
        if (!canEditMeta(project)) return false
        return mutate({ action: 'addTask', projectId: project.projectId, task: title })
      },
      async renameTask(task, title) {
        if (!canEditTask(task)) return false
        return mutate({ action: 'updateTask', taskId: task.taskId, task: title })
      },
      toggleTask(task) {
        if (!canEditTask(task)) return
        void mutate({ action: 'toggleTask', taskId: task.taskId, completed: !task.completed })
      },
      deleteTask(task) {
        if (!canEditTask(task)) return
        if (!window.confirm(`タスク「${task.title}」を削除しますか？`)) return
        void mutate({ action: 'deleteTask', taskId: task.taskId })
      },
      moveTask(task, direction) {
        if (!canEditTask(task)) return
        void mutate({ action: 'reorderTask', taskId: task.taskId, direction })
      },
      async setChatUrl(project, url) {
        if (!canEditProject(project)) return false
        return mutate({ action: 'setChatUrl', projectId: project.projectId, url, expectedUrl: project.chatUrlRaw })
      },
      async assignProjectIds() {
        return mutate({ action: 'assignProjectIds' })
      },
      async clearChatUrl(project) {
        if (!canEditProject(project)) return false
        if (!window.confirm(`「${project.name}」のメインチャットURLを削除しますか？\n（「総合管理」G列が空になります）`)) {
          return false
        }
        return mutate({
          action: 'setChatUrl',
          projectId: project.projectId,
          url: '',
          expectedUrl: project.chatUrlRaw,
          clear: true,
        })
      },
    }
  }, [dataset, mutate, notify])
}
