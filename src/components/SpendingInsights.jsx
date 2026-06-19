import { TrendingUp, TrendingDown } from 'lucide-react'
import { CategoryIcon } from '../lib/categoryIcons'

function fmt(n) {
  return Math.abs(n).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// Breakdown of a month's expenses by category, sorted high to low, with an
// optional trend vs the prior month. `transactions` is the list of expense rows
// (amount < 0) for the period. `prevTotal` is the comparable prior-month total
// (pace-adjusted to the same day when viewing the current month).
function SpendingInsights({ transactions, customIcons, prevTotal = 0, prevLabel, paceAdjusted = false }) {
  const expenses = transactions.filter(t => t.amount < 0)
  const total = expenses.reduce((s, t) => s + Math.abs(t.amount), 0)
  if (total === 0) return null

  const byCategory = expenses.reduce((acc, t) => {
    const key = t.category?.toLowerCase() || 'uncategorized'
    acc[key] = (acc[key] || 0) + Math.abs(t.amount)
    return acc
  }, {})
  const rows = Object.entries(byCategory).sort((a, b) => b[1] - a[1])

  const pct = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : null
  const up = pct != null && pct > 0

  return (
    <div className="mb-8">
      <div className="flex items-baseline justify-between mb-1">
        <p className="eyebrow">Spending</p>
        <p className="text-[13px] text-muted tabular-nums">${fmt(total)} total</p>
      </div>

      {pct != null && pct !== 0 && (
        <div className={`flex items-center gap-1 mb-4 text-[12px] ${up ? 'text-danger' : 'text-accent'}`}>
          {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          <span className="tabular-nums">{Math.abs(pct)}%</span>
          <span className="text-muted">{paceAdjusted ? 'vs last month to date' : `vs ${prevLabel}`}</span>
        </div>
      )}
      {pct === 0 && (
        <p className="mb-4 text-[12px] text-muted">Even with {paceAdjusted ? 'last month to date' : prevLabel}</p>
      )}
      <div className={pct == null ? 'mb-4' : ''} />

      <div className="space-y-3.5">
        {rows.map(([category, amount]) => {
          const barPct = Math.round((amount / total) * 100)
          return (
            <div key={category} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-fill flex items-center justify-center flex-shrink-0">
                <CategoryIcon
                  category={category === 'uncategorized' ? null : category}
                  isSavings={category === 'savings'}
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
                  <div className="h-1 bg-ink rounded-full" style={{ width: `${barPct}%` }} />
                </div>
              </div>
              <span className="text-[11px] text-muted tabular-nums w-8 text-right flex-shrink-0">{barPct}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SpendingInsights
