/** 状態（C列）の正規化済みキー */
export type ProjectStatus = 'operating' | 'developing' | 'planning' | 'onHold' | 'done' | 'unknown'

/** V3 タスク（「タスク」シート 1 行） */
export interface Task {
  taskId: string
  projectKey: string
  title: string
  completed: boolean
  sortOrder: number
}

/** 「総合管理」シート 1 行 ＋ V3 の管理情報（「プロジェクト管理」「タスク」） */
export interface Project {
  /** シート上の行番号（表示・React key 用。書き込み対象の特定には使わない） */
  rowNumber: number
  /** 案件名から Apps Script が算出する安定キー（V3 の書き込みはこれで対象を特定） */
  projectKey: string
  /** 同じ案件名が複数行あり、V3 の書き込みができない */
  keyConflict: boolean
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
  /** F: プロジェクトURL（http(s) のみ。不正なら空） */
  projectUrl: string
  /** G: メインチャットURL（http(s) のみ。不正なら空） */
  chatUrl: string
  /** G: シート上の値そのまま（setChatUrl の競合検知に使う） */
  chatUrlRaw: string
  /** H: 検索キーワード */
  keywords: string
  /** I: 最終更新日（yyyy-MM-dd。空・不正な場合は空文字） */
  updatedAt: string
  /** J: メモ */
  memo: string
  /** V3 カテゴリーのキー（空 = 未分類） */
  topCategory: string
  /** FOCUS（今やる最大 3 件）に入っているか */
  focus: boolean
  /** 現在の目標 */
  goal: string
  /** タスク（sortOrder 順） */
  tasks: Task[]
}

/** V3 カテゴリー定義（Apps Script から配信） */
export interface Category {
  key: string
  label: string
  emoji: string
}

/** Apps Script API が返す案件 1 件 */
export interface ProjectRow {
  rowNumber: number
  projectKey?: string
  keyConflict?: boolean
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
  topCategory?: string
  focus?: boolean
  goal?: string
}

/** Apps Script API が返すタスク 1 件 */
export interface TaskRow {
  taskId: string
  projectKey: string
  task: string
  completed: boolean
  sortOrder: number
}

/** 画面が扱うデータ一式 */
export interface ProjectDataset {
  projects: Project[]
  categories: Category[]
  /** V3 用シートが用意され、FOCUS・目標・タスクが使えるか */
  v3Ready: boolean
  /** 案件名の変更などで「総合管理」と紐付かなくなった管理データの件数 */
  orphanCount: number
  maxFocus: number
}

/** サーバーに許可された更新操作（任意セルの書き換えはできない） */
export type Mutation =
  | { action: 'setCategory'; projectKey: string; category: string }
  | { action: 'setFocus'; projectKey: string; focus: boolean }
  | { action: 'setGoal'; projectKey: string; goal: string }
  | { action: 'addTask'; projectKey: string; task: string }
  | { action: 'updateTask'; taskId: string; task: string }
  | { action: 'toggleTask'; taskId: string; completed: boolean }
  | { action: 'deleteTask'; taskId: string }
  | { action: 'reorderTask'; taskId: string; direction: 'up' | 'down' }
  | { action: 'setChatUrl'; projectKey: string; url: string; expectedUrl: string; clear?: boolean }
