import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DataError, projectRepository } from '../data'
import { applyMutation } from '../lib/dataset'
import type { Mutation, ProjectDataset } from '../types/project'

export type LoadState =
  | { phase: 'loading' }
  | { phase: 'error'; error: DataError }
  | { phase: 'ready'; dataset: ProjectDataset; fetchedAt: Date }

export interface Notice {
  id: number
  kind: 'error' | 'info'
  message: string
}

interface PendingMutation {
  id: number
  mutation: Mutation
}

function toDataError(error: unknown): DataError {
  if (error instanceof DataError) return error
  return new DataError('NETWORK', error instanceof Error ? error.message : '不明なエラーが発生しました。')
}

let sequence = 0

/**
 * データの取得と更新。
 * - 更新は 1 件ずつ順番に送る（同時送信による競合を避ける）
 * - 送信中は楽観的に画面へ反映し、成功したらサーバーの最新データで置き換える
 * - 失敗したら反映を取り消し、通知を出す
 */
export function useProjects() {
  const [state, setState] = useState<LoadState>({ phase: 'loading' })
  const [pending, setPending] = useState<PendingMutation[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [notices, setNotices] = useState<Notice[]>([])
  const controllerRef = useRef<AbortController | null>(null)
  const queueRef = useRef<Promise<void>>(Promise.resolve())

  const notify = useCallback((kind: Notice['kind'], message: string) => {
    sequence += 1
    const id = sequence
    setNotices((list) => [...list.slice(-2), { id, kind, message }])
    setTimeout(() => setNotices((list) => list.filter((n) => n.id !== id)), kind === 'error' ? 6000 : 3000)
  }, [])

  const dismissNotice = useCallback((id: number) => setNotices((list) => list.filter((n) => n.id !== id)), [])

  /** 取得して結果を state に反映する。中断された取得の結果は捨てる */
  const request = useCallback(() => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    projectRepository
      .load(controller.signal)
      .then(
        (dataset): LoadState => ({ phase: 'ready', dataset, fetchedAt: new Date() }),
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

  const mutate = useCallback(
    (mutation: Mutation): Promise<boolean> => {
      sequence += 1
      const item: PendingMutation = { id: sequence, mutation }
      setPending((list) => [...list, item])

      const run = queueRef.current.then(async () => {
        try {
          const dataset = await projectRepository.mutate(mutation)
          // 取得中のリクエストがあれば、書き込み後の最新データを優先する
          controllerRef.current?.abort()
          setIsRefreshing(false)
          setState({ phase: 'ready', dataset, fetchedAt: new Date() })
          return true
        } catch (error) {
          const dataError = toDataError(error)
          notify('error', dataError.code === 'REJECTED' ? dataError.message : `保存できませんでした。${dataError.message}`)
          return false
        } finally {
          setPending((list) => list.filter((p) => p.id !== item.id))
        }
      })
      queueRef.current = run.then(() => undefined)
      return run
    },
    [notify],
  )

  /** サーバーで確定したデータに、送信中の更新を重ねたもの（画面に表示するデータ） */
  const displayState = useMemo<LoadState>(() => {
    if (state.phase !== 'ready' || pending.length === 0) return state
    return { ...state, dataset: pending.reduce((data, p) => applyMutation(data, p.mutation), state.dataset) }
  }, [state, pending])

  return {
    state: displayState,
    isRefreshing,
    isSaving: pending.length > 0,
    notices,
    notify,
    dismissNotice,
    mutate,
    sourceLabel: projectRepository.sourceLabel,
    /** データ表示中は表示を保ったまま再取得、エラー時はローディングから再試行 */
    reload: useCallback(() => {
      if (state.phase === 'ready') setIsRefreshing(true)
      else setState({ phase: 'loading' })
      request()
    }, [request, state.phase]),
  }
}
