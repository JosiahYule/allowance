import { describe, it, expect } from 'vitest'
import { computeMonth, monthLeftover, isBill, isSavings } from './finance'

const opts = { month: '2026-06', today: '2026-06-19' } // 12 days left incl. today

describe('computeMonth — income reconciliation', () => {
  it('uses the income setting as a floor', () => {
    const r = computeMonth({ transactions: [], monthlyIncome: 3000, ...opts })
    expect(r.incomeBasis).toBe(3000)
    expect(r.available).toBe(3000)
  })
  it('raises the basis when logged income exceeds the setting (bonus)', () => {
    const txns = [{ amount: 1000, date: '2026-06-05' }] // a bonus on top of salary setting
    const r = computeMonth({ transactions: txns, monthlyIncome: 3000, ...opts })
    // max(3000, 1000) — a single mid-month deposit shouldn't lower the basis...
    expect(r.incomeBasis).toBe(3000)
    const r2 = computeMonth({ transactions: [{ amount: 5000, date: '2026-06-05' }], monthlyIncome: 3000, ...opts })
    expect(r2.incomeBasis).toBe(5000) // ...but a larger-than-expected deposit raises it
  })
  it('falls back to logged income when no setting exists', () => {
    const r = computeMonth({ transactions: [{ amount: 2500, date: '2026-06-02' }], monthlyIncome: null, ...opts })
    expect(r.incomeBasis).toBe(2500)
    expect(r.hasPlan).toBe(true)
  })
})

describe('computeMonth — spending split', () => {
  const txns = [
    { amount: -1200, date: '2026-06-01', recurring_parent_id: 'rent' },  // bill
    { amount: -60, date: '2026-06-10' },                                 // discretionary
    { amount: -40, date: '2026-06-12', category: 'dining' },             // discretionary
    { amount: -200, date: '2026-06-15', goal_id: 'g1' },                 // savings
  ]
  it('separates bills, savings, and discretionary', () => {
    const r = computeMonth({ transactions: txns, monthlyIncome: 3000, ...opts })
    expect(r.billsSpent).toBe(1200)
    expect(r.discretionarySpent).toBe(100)
    expect(r.savingsSpent).toBe(200)
    expect(r.totalSpent).toBe(1500)
  })
  it('ties savings into cash flow — a goal contribution reduces available', () => {
    const withSavings = computeMonth({ transactions: txns, monthlyIncome: 3000, ...opts })
    const withoutSavings = computeMonth({ transactions: txns.slice(0, 3), monthlyIncome: 3000, ...opts })
    expect(withoutSavings.available - withSavings.available).toBe(200)
  })
})

describe('computeMonth — safe to spend + daily allowance', () => {
  it('spreads what is left across the days remaining', () => {
    const r = computeMonth({ transactions: [{ amount: -300, date: '2026-06-05' }], monthlyIncome: 3000, ...opts })
    expect(r.available).toBe(2700)
    expect(r.daysLeft).toBe(12)
    expect(r.dailyAllowance).toBe(225) // 2700 / 12
  })
  it('subtracts upcoming bills so the number stays stable', () => {
    const r = computeMonth({ transactions: [], monthlyIncome: 3000, upcomingBills: 1200, ...opts })
    expect(r.available).toBe(1800)
  })
  it('adds last month\'s rollover', () => {
    const r = computeMonth({ transactions: [], monthlyIncome: 3000, rollover: 150, ...opts })
    expect(r.available).toBe(3150)
  })
  it('can go negative when overspent', () => {
    const r = computeMonth({ transactions: [{ amount: -3500, date: '2026-06-02' }], monthlyIncome: 3000, ...opts })
    expect(r.available).toBe(-500)
  })
})

describe('monthLeftover', () => {
  it('is income minus everything spent, with no day-spreading', () => {
    const txns = [{ amount: -800, date: '2026-05-10' }]
    expect(monthLeftover({ transactions: txns, monthlyIncome: 3000 })).toBe(2200)
  })
})

describe('classifiers', () => {
  it('isBill / isSavings', () => {
    expect(isBill({ recurring: true })).toBe(true)
    expect(isBill({ recurring_parent_id: 'x' })).toBe(true)
    expect(isBill({ amount: -5 })).toBe(false)
    expect(isSavings({ goal_id: 'g' })).toBe(true)
    expect(isSavings({ amount: -5 })).toBe(false)
  })
})
