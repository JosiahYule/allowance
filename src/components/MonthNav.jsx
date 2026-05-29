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
    <div className="flex items-center gap-2 mb-6">
      <button
        onClick={() => onChange(shift(-1))}
        className="p-1 text-gray-400 active:text-black"
      >
        <ChevronLeft size={16} />
      </button>
      <p className="text-sm text-gray-500 flex-1 text-center">{label}</p>
      <button
        onClick={() => onChange(shift(1))}
        disabled={disableFuture && isAtCurrent}
        className="p-1 text-gray-400 active:text-black disabled:opacity-20"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

export default MonthNav
