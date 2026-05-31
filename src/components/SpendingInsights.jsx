import { CategoryIcon } from '../lib/categoryIcons'

function fmt(n) {
  return Math.abs(n).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// Breakdown of a month's expenses by category, sorted high to low.
// `transactions` is the list of expense rows (amount < 0) for the period.
function SpendingInsights({ transactions, customIcons }) {
  const expenses = transactions.filter(t => t.amount < 0)
  const total = expenses.reduce((s, t) => s + Math.abs(t.amount), 0)
  if (total === 0) return null

  const byCategory = expenses.reduce((acc, t) => {
    const key = t.category?.toLowerCase() || 'uncategorized'
    acc[key] = (acc[key] || 0) + Math.abs(t.amount)
    return acc
  }, {})
  const rows = Object.entries(byCategory).sort((a, b) => b[1] - a[1])

  return (
    <div className="mb-8">
      <div className="flex items-baseline justify-between mb-4">
        <p className="eyebrow">Spending</p>
        <p className="text-[13px] text-muted tabular-nums">${fmt(total)} total</p>
      </div>

      <div className="space-y-3.5">
        {rows.map(([category, amount]) => {
          const pct = Math.round((amount / total) * 100)
          return (
            <div key={category} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-fill flex items-center justify-center flex-shrink-0">
                <CategoryIcon
                  category={category === 'uncategorized' ? null : category}
                  size={14}
                  className="text-ink-soft"
                  customIcons={customIcons}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <p className="text-sm text-ink capitalize truncate">{category}</p>
                  <p className="text-sm text-ink tabular-nums ml-2 flex-shrink-0">${fmt(amount)}</p>
                </div>
                <div className="w-full h-1 bg-fill rounded-full overflow-hidden">
                  <div className="h-1 bg-ink rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <span className="text-[11px] text-muted tabular-nums w-8 text-right flex-shrink-0">{pct}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SpendingInsights
