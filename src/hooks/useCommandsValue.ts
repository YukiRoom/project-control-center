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
      if (!project.projectKey) {
        notify('info', 'Apps Script を V3 に更新すると編集できます。')
        return false
      }
      if (project.keyConflict) {
        notify('error', '同じ案件名が複数あるため編集できません。「総合管理」の案件名を区別してください。')
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
        void mutate({ action: 'setFocus', projectKey: project.projectKey, focus: !project.focus })
      },
      async setCategory(project, category) {
        if (!canEditMeta(project)) return false
        return mutate({ action: 'setCategory', projectKey: project.projectKey, category })
      },
      async setGoal(project, goal) {
        if (!canEditMeta(project)) return false
        return mutate({ action: 'setGoal', projectKey: project.projectKey, goal })
      },
      async addTask(project, title) {
        if (!canEditMeta(project)) return false
        return mutate({ action: 'addTask', projectKey: project.projectKey, task: title })
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
        return mutate({ action: 'setChatUrl', projectKey: project.projectKey, url, expectedUrl: project.chatUrlRaw })
      },
      async clearChatUrl(project) {
        if (!canEditProject(project)) return false
        if (!window.confirm(`「${project.name}」のメインチャットURLを削除しますか？\n（「総合管理」G列が空になります）`)) {
          return false
        }
        return mutate({
          action: 'setChatUrl',
          projectKey: project.projectKey,
          url: '',
          expectedUrl: project.chatUrlRaw,
          clear: true,
        })
      },
    }
  }, [dataset, mutate, notify])
}
