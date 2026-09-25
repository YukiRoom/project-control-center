const DAY_MS = 24 * 60 * 60 * 1000

/** 最終更新日からこの日数以上経過した進行中案件を「要確認」とする */
export const STALE_THRESHOLD_DAYS = 30

/** yyyy-MM-dd / yyyy/M/d をローカル日付として解釈する。不正な値は null */
export function parseDate(value: string): Date | null {
  const match = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(value.trim())
  if (!match) return null
  const [, y, m, d] = match
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  return Number.isNaN(date.getTime()) ? null : date
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** 経過日数（日付が不正なら null） */
export function daysSince(value: string, today: Date = new Date()): number | null {
  const date = parseDate(value)
  if (!date) return null
  return Math.floor((startOfDay(today).getTime() - date.getTime()) / DAY_MS)
}

/** 表示用: 2026/08/24 */
export function formatDate(value: string): string {
  const date = parseDate(value)
  if (!date) return value || '—'
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}/${mm}/${dd}`
}

/** 表示用: 今日 / 3日前 / 42日前 */
export function formatRelative(value: string, today: Date = new Date()): string {
  const days = daysSince(value, today)
  if (days === null) return ''
  if (days <= 0) return '今日'
  if (days === 1) return '昨日'
  return `${days}日前`
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

/** 一覧用の短い表示: 9/25（今年以外は 2025/9/25） */
export function formatShortDate(value: string, today: Date = new Date()): string {
  const date = parseDate(value)
  if (!date) return '—'
  const md = `${date.getMonth() + 1}/${date.getDate()}`
  return date.getFullYear() === today.getFullYear() ? md : `${date.getFullYear()}/${md}`
}
