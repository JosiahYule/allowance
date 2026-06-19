// Shared date helpers. All month math is done on plain YYYY-MM / YYYY-MM-DD
// strings to avoid timezone surprises from Date.toISOString() (which formats in
// UTC and can shift the calendar day/month for users in non-UTC timezones).

// Format a Date as a local YYYY-MM-DD string. Unlike toISOString(), this never
// shifts the calendar day for users in non-UTC timezones.
export function toLocalDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Today as a local YYYY-MM-DD string.
export function todayStr() {
  return toLocalDateStr(new Date())
}

// The current calendar month as a local YYYY-MM string. Use this instead of
// `new Date().toISOString().slice(0, 7)`, which is UTC and wrong near month
// boundaries for negative-offset timezones.
export function currentMonth() {
  return todayStr().slice(0, 7)
}

// Half-open [start, end) range covering a calendar month ("2026-05").
export function getMonthRange(month) {
  const [y, m] = month.split('-').map(Number)
  const start = `${month}-01`
  const endY = m === 12 ? y + 1 : y
  const endM = m === 12 ? 1 : m + 1
  return { start, end: `${endY}-${String(endM).padStart(2, '0')}-01` }
}

// Shift a YYYY-MM month string by n months (n may be negative).
export function addMonths(month, n) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Number of days in a YYYY-MM month.
export function daysInMonth(month) {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

// Days remaining in `month` counting `today` itself, when today falls inside it.
// For a past month this is 0; for a future month it's the whole month. Used to
// spread the remaining safe-to-spend into a daily allowance.
export function daysRemainingInMonth(month, today = todayStr()) {
  const total = daysInMonth(month)
  const todayMonth = today.slice(0, 7)
  if (todayMonth < month) return total          // month hasn't started
  if (todayMonth > month) return 0              // month is over
  const day = Number(today.slice(8, 10))
  return Math.max(0, total - day + 1)
}

// Long human label for a YYYY-MM month, e.g. "June 2026".
export function monthLabel(month) {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })
}
