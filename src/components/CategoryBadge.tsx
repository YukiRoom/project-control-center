import type { Category } from '../types/project'

interface CategoryBadgeProps {
  categoryKey: string
  categories: Category[]
}

/** V3 カテゴリーの小さなラベル（未設定なら「未分類」） */
export function CategoryBadge({ categoryKey, categories }: CategoryBadgeProps) {
  const category = categories.find((c) => c.key === categoryKey)
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold tracking-wide whitespace-nowrap ${
        category ? 'bg-navy-50 text-navy-700' : 'bg-slate-100 text-slate-500'
      }`}
    >
      {category ? (
        <>
          <span aria-hidden>{category.emoji}</span>
          {category.label}
        </>
      ) : (
        '未分類'
      )}
    </span>
  )
}
