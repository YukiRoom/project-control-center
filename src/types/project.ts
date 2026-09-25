/** 状態（C列）の正規化済みキー */
export type ProjectStatus = 'operating' | 'developing' | 'planning' | 'onHold' | 'done' | 'unknown'

/** 「総合管理」シート 1 行分 */
export interface Project {
  /** シート上の行番号（1 始まり・ヘッダー行 = 1）。Phase 2 の更新 API で行を特定するために使う */
  rowNumber: number
  /** A: 大分類 */
  category: string
  /** B: プロジェクト／案件 */
  name: string
  /** C: 状態（シート上の表記そのまま） */
  statusLabel: string
  /** C: 状態（正規化済み） */
  status: ProjectStatus
  /** D: 現在地 */
  currentState: string
  /** E: 次にやること */
  nextAction: string
  /** F: プロジェクトURL */
  projectUrl: string
  /** G: メインチャットURL */
  chatUrl: string
  /** H: 検索キーワード */
  keywords: string
  /** I: 最終更新日（yyyy-MM-dd。空・不正な場合は空文字） */
  updatedAt: string
  /** J: メモ */
  memo: string
}

/** Apps Script API が返す 1 行分（列名は英字キー、状態は生文字列） */
export interface ProjectRow {
  rowNumber: number
  category: string
  name: string
  status: string
  currentState: string
  nextAction: string
  projectUrl: string
  chatUrl: string
  keywords: string
  updatedAt: string
  memo: string
}

/** Phase 2 で Web アプリから変更可能にする項目 */
export type EditableProjectFields = Pick<Project, 'statusLabel' | 'currentState' | 'nextAction' | 'memo'>
