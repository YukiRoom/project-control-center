import { createGasRepository } from './gasRepository'
import { createMockRepository } from './mockRepository'
import { DataError, type ProjectRepository } from './repository'

export { DataError } from './repository'
export type { DataErrorCode, ProjectRepository } from './repository'

const apiUrl = (import.meta.env.VITE_SHEETS_API_URL ?? '').trim()

function createNotConfiguredRepository(): ProjectRepository {
  return {
    sourceLabel: '未接続',
    async listProjects() {
      throw new DataError(
        'NOT_CONFIGURED',
        '接続先（VITE_SHEETS_API_URL）が設定されていません。README の「Google Sheets 接続方法」を参照してください。',
      )
    },
  }
}

/**
 * 接続先の決定:
 * - VITE_SHEETS_API_URL があれば Apps Script から読み取る
 * - 未設定なら開発時はモック、本番ビルドでは「未接続」エラーを表示
 */
export const projectRepository: ProjectRepository = apiUrl
  ? createGasRepository(apiUrl)
  : import.meta.env.DEV
    ? createMockRepository()
    : createNotConfiguredRepository()
