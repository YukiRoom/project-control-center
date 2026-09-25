import type { ProjectStatus } from '../types/project'

export interface StatusDefinition {
  key: ProjectStatus
  /** シート上の正式表記 */
  label: string
  /** 絵文字を除いた表記 */
  shortLabel: string
  /** 集計バーなど狭い場所用の略称 */
  compactLabel: string
  emoji: string
  /** バッジの配色（Tailwind クラス） */
  badgeClass: string
  /** ドット・アクセントの配色（Tailwind クラス） */
  dotClass: string
}

export const STATUS_DEFINITIONS: readonly StatusDefinition[] = [
  {
    key: 'operating',
    label: '🟢 運用中',
    shortLabel: '運用中',
    compactLabel: '運用中',
    emoji: '🟢',
    badgeClass: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  {
    key: 'developing',
    label: '🟡 制作・開発中',
    shortLabel: '制作・開発中',
    compactLabel: '制作中',
    emoji: '🟡',
    badgeClass: 'bg-amber-50 text-amber-800 ring-amber-200',
    dotClass: 'bg-amber-400',
  },
  {
    key: 'planning',
    label: '🔵 企画・準備中',
    shortLabel: '企画・準備中',
    compactLabel: '企画中',
    emoji: '🔵',
    badgeClass: 'bg-sky-50 text-sky-800 ring-sky-200',
    dotClass: 'bg-sky-500',
  },
  {
    key: 'onHold',
    label: '⏸ 保留',
    shortLabel: '保留',
    compactLabel: '保留',
    emoji: '⏸',
    badgeClass: 'bg-slate-100 text-slate-600 ring-slate-200',
    dotClass: 'bg-slate-400',
  },
  {
    key: 'done',
    label: '✅ 完了',
    shortLabel: '完了',
    compactLabel: '完了',
    emoji: '✅',
    badgeClass: 'bg-teal-50 text-teal-800 ring-teal-200',
    dotClass: 'bg-teal-600',
  },
]

const UNKNOWN_STATUS: StatusDefinition = {
  key: 'unknown',
  label: '未設定',
  shortLabel: '未設定',
  compactLabel: '未設定',
  emoji: '',
  badgeClass: 'bg-white text-slate-500 ring-slate-300',
  dotClass: 'bg-slate-300',
}

/** 進行中 = 運用中 + 制作・開発中 + 企画・準備中 */
export const ACTIVE_STATUSES: readonly ProjectStatus[] = ['operating', 'developing', 'planning']

/** 「要確認」判定の対象外 */
export const INACTIVE_STATUSES: readonly ProjectStatus[] = ['onHold', 'done']

/** シート上の表記（絵文字の有無・空白ゆれを許容）を正規化キーへ変換する */
export function parseStatus(raw: string): ProjectStatus {
  const text = raw.normalize('NFKC').replace(/\s+/g, '')
  if (!text) return 'unknown'
  for (const def of STATUS_DEFINITIONS) {
    if (text.includes(def.shortLabel.normalize('NFKC')) || text.startsWith(def.emoji.normalize('NFKC'))) {
      return def.key
    }
  }
  return 'unknown'
}

export function getStatusDefinition(status: ProjectStatus): StatusDefinition {
  return STATUS_DEFINITIONS.find((def) => def.key === status) ?? UNKNOWN_STATUS
}

export function isActiveStatus(status: ProjectStatus): boolean {
  return ACTIVE_STATUSES.includes(status)
}
