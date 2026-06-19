import { ChevronLeft, ChevronRight } from 'lucide-react'
import { currentMonth, addMonths, monthLabel } from '../lib/dates'

function MonthNav({ month, onChange, disableFuture = true }) {
  const isAtCurrent = month >= currentMonth()

  return (
    <div className="flex items-center justify-between mb-6 bg-fill rounded-full px-2 py-1.5">
      <button
        onClick={() => onChange(addMonths(month, -1))}
        className="w-8 h-8 flex items-center justify-center rounded-full text-ink-soft active:bg-surface transition-colors"
        aria-label="Previous month"
      >
        <ChevronLeft size={17} />
      </button>
      <p className="text-[13px] font-medium text-ink">{monthLabel(month)}</p>
      <button
        onClick={() => onChange(addMonths(month, 1))}
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
