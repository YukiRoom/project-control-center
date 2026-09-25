import type { Mutation, ProjectDataset } from '../types/project'

/**
 * データ取得・更新の抽象。UI はこのインターフェースにだけ依存する。
 * 更新は許可された操作（Mutation）に限られ、成功すると最新のデータ一式が返る。
 */
export interface ProjectRepository {
  /** 表示用の名前（ヘッダーのバッジに使う） */
  readonly sourceLabel: string
  load(signal?: AbortSignal): Promise<ProjectDataset>
  mutate(mutation: Mutation): Promise<ProjectDataset>
}

export type DataErrorCode =
  | 'NOT_CONFIGURED'
  | 'UNAUTHORIZED'
  | 'NETWORK'
  | 'INVALID_RESPONSE'
  | 'SERVER'
  /** 書き込み時のサーバー検証エラー（FOCUS_LIMIT など）。message をそのまま表示する */
  | 'REJECTED'

export class DataError extends Error {
  readonly code: DataErrorCode
  /** Apps Script が返したエラーコード（FOCUS_LIMIT / CONFLICT など） */
  readonly apiCode?: string

  constructor(code: DataErrorCode, message: string, apiCode?: string) {
    super(message)
    this.name = 'DataError'
    this.code = code
    this.apiCode = apiCode
  }
}
