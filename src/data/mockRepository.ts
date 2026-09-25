import { toProject } from '../lib/projects'
import { MOCK_PROJECT_ROWS } from './mockProjects'
import { DataError, type ProjectRepository } from './repository'

/**
 * 開発用リポジトリ。URL に ?mock=error / ?mock=empty / ?mock=slow を付けると
 * エラー・0件・ローディングの表示を確認できる。
 */
export function createMockRepository(): ProjectRepository {
  return {
    sourceLabel: 'モックデータ',
    async listProjects(signal) {
      const mode = new URLSearchParams(window.location.search).get('mock')
      await new Promise((resolve) => setTimeout(resolve, mode === 'slow' ? 60_000 : 400))
      signal?.throwIfAborted()
      if (mode === 'error') throw new DataError('NETWORK', 'モック: 取得エラーを再現しています。')
      if (mode === 'empty') return []
      return MOCK_PROJECT_ROWS.map(toProject)
    },
  }
}
