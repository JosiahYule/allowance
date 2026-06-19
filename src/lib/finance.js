// The safe-to-spend engine. Pure and fully unit-tested — this is the heart of
// the "allowance" model, so its correctness matters more than anything else in
// the app. All inputs are plain data; no Supabase, no Dates beyond the helpers.

import { daysRemainingInMonth, currentMonth, todayStr } from './dates'

const round2 = (n) => Math.round(n * 100) / 100

// A transaction originating from a recurring template (a "bill" / committed cost).
export const isBill = (t) => t.recurring === true || t.recurring_parent_id != null

// A transaction that moves money into a savings goal.
export const isSavings = (t) => t.goal_id != null

// Compute a month's safe-to-spend snapshot.
//
//   available = incomeBasis + rollover − totalSpent − upcomingBills
//   daily     = available / days left in the month (incl. today)
//
// incomeBasis reconciles the two notions of income that used to disagree: your
// expected monthly income (the setting) acts as a floor, and any logged income
// beyond it (a bonus, side gig) raises the basis. Either alone still works.
export function computeMonth({
  transactions = [],
  monthlyIncome = null,
  rollover = 0,
  upcomingBills = 0,
  month = currentMonth(),
  today = todayStr(),
} = {}) {
  let incomeReceived = 0
  let billsSpent = 0
  let savingsSpent = 0
  let discretionarySpent = 0

  for (const t of transactions) {
    if (t.amount >= 0) {
      incomeReceived += t.amount
      continue
    }
    const abs = Math.abs(t.amount)
    if (isSavings(t)) savingsSpent += abs
    else if (isBill(t)) billsSpent += abs
    else discretionarySpent += abs
  }

  const totalSpent = round2(billsSpent + savingsSpent + discretionarySpent)
  const incomeBasis = monthlyIncome != null
    ? Math.max(monthlyIncome, incomeReceived)
    : incomeReceived
  const available = round2(incomeBasis + rollover - totalSpent - upcomingBills)
  const daysLeft = daysRemainingInMonth(month, today)
  const dailyAllowance = round2(daysLeft > 0 ? available / daysLeft : available)

  return {
    incomeReceived: round2(incomeReceived),
    incomeBasis: round2(incomeBasis),
    rollover: round2(rollover),
    upcomingBills: round2(upcomingBills),
    billsSpent: round2(billsSpent),
    savingsSpent: round2(savingsSpent),
    discretionarySpent: round2(discretionarySpent),
    totalSpent,
    available,
    dailyAllowance,
    daysLeft,
    hasPlan: incomeBasis > 0,
  }
}

// Leftover at the end of a (typically prior) month, used as the next month's
// rollover. Single-step: it does not recursively chain through earlier months.
export function monthLeftover({ transactions = [], monthlyIncome = null, rollover = 0 } = {}) {
  const { available } = computeMonth({
    transactions,
    monthlyIncome,
    rollover,
    // a finished month has no "upcoming" bills and 0 days left, so available is final
    month: '1970-01',
    today: '1970-02-01',
  })
  return available
}
