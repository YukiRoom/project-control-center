import { toProject } from '../lib/projects'
import type { ProjectRow } from '../types/project'
import { loadAccessKey } from './accessKey'
import { DataError, type ProjectRepository } from './repository'

/** Apps Script が応答しない場合にローディングのまま止まらないようにする */
const REQUEST_TIMEOUT_MS = 25_000

interface ApiSuccess {
  ok: true
  sheet: string
  fetchedAt: string
  projects: ProjectRow[]
}

interface ApiFailure {
  ok: false
  error: string
  message?: string
}

type ApiResponse = ApiSuccess | ApiFailure

function isApiResponse(value: unknown): value is ApiResponse {
  return typeof value === 'object' && value !== null && 'ok' in value
}

/**
 * Google Apps Script Web アプリ経由で「総合管理」シートを読み取る（読み取り専用）。
 * Content-Type を text/plain にして CORS プリフライトを発生させない。
 * 閲覧キーは URL に載せず POST 本文で送る。
 */
export function createGasRepository(apiUrl: string): ProjectRepository {
  return {
    sourceLabel: 'Google Sheets',
    async listProjects(signal) {
      const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      let response: Response
      try {
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'list', key: loadAccessKey() }),
          redirect: 'follow',
          signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        })
      } catch (error) {
        if (signal?.aborted) throw error
        if (timeout.aborted) throw new DataError('NETWORK', 'Google Sheets からの応答がありませんでした（タイムアウト）。')
        throw new DataError('NETWORK', 'ネットワークに接続できませんでした。')
      }

      if (!response.ok) {
        throw new DataError('SERVER', `サーバーがエラーを返しました（HTTP ${response.status}）。`)
      }

      let body: unknown
      try {
        body = await response.json()
      } catch {
        throw new DataError(
          'INVALID_RESPONSE',
          'Apps Script から JSON 以外の応答が返りました。デプロイ設定（アクセスできるユーザー）を確認してください。',
        )
      }

      if (!isApiResponse(body)) {
        throw new DataError('INVALID_RESPONSE', '応答の形式が正しくありません。')
      }
      if (!body.ok) {
        if (body.error === 'UNAUTHORIZED') {
          throw new DataError('UNAUTHORIZED', '閲覧キーが必要です。')
        }
        throw new DataError('SERVER', body.message ?? body.error)
      }
      if (!Array.isArray(body.projects)) {
        throw new DataError('INVALID_RESPONSE', '応答に案件データが含まれていません。')
      }
      return body.projects.map(toProject)
    },
  }
}
