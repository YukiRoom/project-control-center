import type { Project } from '../types/project'

/**
 * データ取得の抽象。UI はこのインターフェースにだけ依存する。
 * Phase 2 では updateProject(rowNumber, fields) をここに追加し、
 * Apps Script 側に対応するアクションを実装する（README 参照）。
 */
export interface ProjectRepository {
  /** 表示用の名前（ヘッダーのバッジに使う） */
  readonly sourceLabel: string
  listProjects(signal?: AbortSignal): Promise<Project[]>
}

export type DataErrorCode = 'NOT_CONFIGURED' | 'UNAUTHORIZED' | 'NETWORK' | 'INVALID_RESPONSE' | 'SERVER'

export class DataError extends Error {
  readonly code: DataErrorCode

  constructor(code: DataErrorCode, message: string) {
    super(message)
    this.name = 'DataError'
    this.code = code
  }
}
