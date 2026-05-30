import { ChevronLeft, ChevronRight } from 'lucide-react'

function MonthNav({ month, onChange, disableFuture = true }) {
  const currentMonth = new Date().toISOString().slice(0, 7)
  const isAtCurrent = month >= currentMonth

  function shift(n) {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 1 + n, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  const label = new Date(
    parseInt(month.split('-')[0]),
    parseInt(month.split('-')[1]) - 1,
    1
  ).toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="flex items-center justify-between mb-6 bg-fill rounded-full px-2 py-1.5">
      <button
        onClick={() => onChange(shift(-1))}
        className="w-8 h-8 flex items-center justify-center rounded-full text-ink-soft active:bg-surface transition-colors"
        aria-label="Previous month"
      >
        <ChevronLeft size={17} />
      </button>
      <p className="text-[13px] font-medium text-ink">{label}</p>
      <button
        onClick={() => onChange(shift(1))}
        disabled={disableFuture && isAtCurrent}
        className="w-8 h-8 flex items-center justify-center rounded-full text-ink-soft active:bg-surface transition-colors disabled:opacity-20"
        aria-label="Next month"
      >
        <ChevronRight size={17} />
      </button>
    </div>
  )
}

export default MonthNav
