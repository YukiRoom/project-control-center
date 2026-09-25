import { useCallback, useEffect, useRef, useState } from 'react'
import { DataError, projectRepository } from '../data'
import type { Project } from '../types/project'

export type LoadState =
  | { phase: 'loading' }
  | { phase: 'error'; error: DataError }
  | { phase: 'ready'; projects: Project[]; fetchedAt: Date }

function toDataError(error: unknown): DataError {
  if (error instanceof DataError) return error
  return new DataError('NETWORK', error instanceof Error ? error.message : '不明なエラーが発生しました。')
}

export function useProjects() {
  const [state, setState] = useState<LoadState>({ phase: 'loading' })
  const [isRefreshing, setIsRefreshing] = useState(false)
  const controllerRef = useRef<AbortController | null>(null)

  /** 取得して結果を state に反映する。中断された取得の結果は捨てる */
  const request = useCallback(() => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    projectRepository
      .listProjects(controller.signal)
      .then(
        (projects): LoadState => ({ phase: 'ready', projects, fetchedAt: new Date() }),
        (error: unknown): LoadState => ({ phase: 'error', error: toDataError(error) }),
      )
      .then((next) => {
        if (controller.signal.aborted) return
        setState(next)
        setIsRefreshing(false)
      })
  }, [])

  useEffect(() => {
    request()
    return () => controllerRef.current?.abort()
  }, [request])

  return {
    state,
    isRefreshing,
    sourceLabel: projectRepository.sourceLabel,
    /** データ表示中は表示を保ったまま再取得、エラー時はローディングから再試行 */
    reload: useCallback(() => {
      if (state.phase === 'ready') setIsRefreshing(true)
      else setState({ phase: 'loading' })
      request()
    }, [request, state.phase]),
  }
}
