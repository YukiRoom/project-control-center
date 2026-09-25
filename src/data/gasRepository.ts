import { toDataset, type ApiState } from '../lib/dataset'
import { loadAccessKey } from './accessKey'
import { DataError, type ProjectRepository } from './repository'

/** Apps Script が応答しない場合にローディングのまま止まらないようにする */
const REQUEST_TIMEOUT_MS = 30_000

type ApiResponse = ({ ok: true } & ApiState) | { ok: false; error: string; message?: string }

function isApiResponse(value: unknown): value is ApiResponse {
  return typeof value === 'object' && value !== null && 'ok' in value
}

/** サーバー側の入力検証など、ユーザーに内容をそのまま伝えるエラー */
const REJECTION_CODES = new Set([
  'FOCUS_LIMIT',
  'CONFLICT',
  'INVALID_INPUT',
  'NOT_FOUND',
  'KEY_CONFLICT',
  'SETUP_REQUIRED',
  'BUSY',
  'WRITE_DISABLED',
])

/**
 * Google Apps Script Web アプリとの通信。
 * - Content-Type を text/plain にして CORS プリフライトを発生させない
 * - 閲覧キーは URL に載せず POST 本文で送る（ビルド成果物には含めない）
 */
export function createGasRepository(apiUrl: string): ProjectRepository {
  async function call(payload: Record<string, unknown>, signal?: AbortSignal): Promise<ApiState> {
    const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    let response: Response
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ ...payload, key: loadAccessKey() }),
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

    if (!isApiResponse(body)) throw new DataError('INVALID_RESPONSE', '応答の形式が正しくありません。')
    if (!body.ok) {
      if (body.error === 'UNAUTHORIZED') throw new DataError('UNAUTHORIZED', '閲覧キーが必要です。')
      if (REJECTION_CODES.has(body.error)) throw new DataError('REJECTED', body.message ?? body.error, body.error)
      throw new DataError('SERVER', body.message ?? body.error, body.error)
    }
    if (!Array.isArray(body.projects)) {
      throw new DataError('INVALID_RESPONSE', '応答に案件データが含まれていません。')
    }
    return body
  }

  return {
    sourceLabel: 'Google Sheets',
    async load(signal) {
      return toDataset(await call({ action: 'list' }, signal))
    },
    async mutate(mutation) {
      return toDataset(await call({ ...mutation }))
    },
  }
}
