// Shared date helpers. All month math is done on plain YYYY-MM / YYYY-MM-DD
// strings to avoid timezone surprises from Date.toISOString().

// Half-open [start, end) range covering a calendar month ("2026-05").
export function getMonthRange(month) {
  const [y, m] = month.split('-').map(Number)
  const start = `${month}-01`
  const endY = m === 12 ? y + 1 : y
  const endM = m === 12 ? 1 : m + 1
  return { start, end: `${endY}-${String(endM).padStart(2, '0')}-01` }
}

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
