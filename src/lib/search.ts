import type { Project } from '../types/project'

/**
 * 日本語検索用の正規化:
 * - NFKC（全角英数・半角カナ・全角スペースを統一）
 * - 英字は小文字化
 * - カタカナはひらがなへ（「ノート」で「のーと」もヒット）
 */
export function normalizeForSearch(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
}

function searchableText(project: Project): string {
  return normalizeForSearch(
    [
      project.category,
      project.name,
      project.currentState,
      project.nextAction,
      project.keywords,
      project.memo,
    ].join('\n'),
  )
}

/** スペース区切りの全語を含む案件にマッチ（AND 検索） */
export function matchesQuery(project: Project, query: string): boolean {
  const terms = normalizeForSearch(query).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true
  const haystack = searchableText(project)
  return terms.every((term) => haystack.includes(term))
}
