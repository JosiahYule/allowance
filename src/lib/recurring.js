// Pure helpers for recurring transactions. Extracted so the (timezone- and
// edge-of-month-sensitive) schedule logic can be unit tested and shared between
// the materializer in App.jsx and the safe-to-spend engine in finance.js.

import { getMonthRange, daysInMonth, toLocalDateStr, todayStr } from './dates'

// Every date a recurring template is due within `month` (YYYY-MM), returned as
// sorted YYYY-MM-DD strings. Occurrences before the template's own start date
// (its anchor) are excluded.
export function recurringDueDates(template, month) {
  const interval = template.recurring_interval || 'monthly'
  const anchor = template.date // YYYY-MM-DD
  const { start: monthStart, end: monthEnd } = getMonthRange(month)
  const dates = []

  if (interval === 'monthly') {
    const anchorDay = Number(anchor.slice(8, 10))
    const due = `${month}-${String(Math.min(anchorDay, daysInMonth(month))).padStart(2, '0')}`
    if (due >= anchor && due >= monthStart && due < monthEnd) dates.push(due)
    return dates
  }

  // weekly / biweekly: step a fixed number of days from the anchor
  const stepDays = interval === 'weekly' ? 7 : 14
  const anchorDate = new Date(anchor + 'T00:00:00')
  const monthStartDate = new Date(monthStart + 'T00:00:00')
  const msPerDay = 86400000
  // Jump close to the month start instead of looping from the anchor forward.
  const daysToStart = Math.max(0, Math.floor((monthStartDate - anchorDate) / msPerDay))
  const cursor = new Date(anchorDate)
  cursor.setDate(cursor.getDate() + Math.floor(daysToStart / stepDays) * stepDays)
  for (;;) {
    const ds = toLocalDateStr(cursor)
    if (ds >= monthEnd) break
    if (ds >= anchor && ds >= monthStart) dates.push(ds)
    cursor.setDate(cursor.getDate() + stepDays)
  }
  return dates
}

// Total of recurring *expense* commitments due later this month that have not
// posted yet. Subtracting these keeps "safe to spend" stable across the month
// instead of dropping each time a bill auto-posts. `transactions` is the month's
// posted rows (used to detect occurrences that already exist).
export function upcomingBillsTotal({ templates = [], transactions = [], month, today = todayStr() }) {
  const posted = new Set(
    transactions.filter(t => t.recurring_parent_id).map(t => `${t.recurring_parent_id}|${t.date}`)
  )
  let total = 0
  for (const tmpl of templates) {
    if (!(tmpl.amount < 0)) continue // only expense bills reduce what's safe to spend
    for (const due of recurringDueDates(tmpl, month)) {
      if (due <= today) continue            // due in the past — already posted (or generator will)
      if (due === tmpl.date) continue       // the template row itself covers its anchor occurrence
      if (posted.has(`${tmpl.id}|${due}`)) continue
      total += Math.abs(tmpl.amount)
    }
  }
  return Math.round(total * 100) / 100
}
