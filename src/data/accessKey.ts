/**
 * Apps Script 側で ACCESS_KEY を設定した場合に使う閲覧用キー。
 * ビルド成果物には含めず、利用者が端末ごとに入力して localStorage に保存する。
 */
const STORAGE_KEY = 'pcc:access-key'

export function loadAccessKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveAccessKey(key: string): void {
  try {
    if (key) localStorage.setItem(STORAGE_KEY, key)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ストレージが使えない環境（プライベートブラウズ等）では保存しない
  }
}
