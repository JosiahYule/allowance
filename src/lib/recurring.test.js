import { describe, it, expect } from 'vitest'
import { recurringDueDates, upcomingBillsTotal } from './recurring'

describe('recurringDueDates — monthly', () => {
  it('returns the anchor day within a later month', () => {
    const tmpl = { date: '2026-01-15', recurring_interval: 'monthly', amount: -100 }
    expect(recurringDueDates(tmpl, '2026-06')).toEqual(['2026-06-15'])
  })
  it('clamps a day-31 anchor to the last day of a short month', () => {
    const tmpl = { date: '2026-01-31', recurring_interval: 'monthly', amount: -100 }
    expect(recurringDueDates(tmpl, '2026-02')).toEqual(['2026-02-28'])
  })
  it('excludes months before the anchor', () => {
    const tmpl = { date: '2026-06-10', recurring_interval: 'monthly', amount: -100 }
    expect(recurringDueDates(tmpl, '2026-05')).toEqual([])
  })
  it('includes the anchor month itself', () => {
    const tmpl = { date: '2026-06-10', recurring_interval: 'monthly', amount: -100 }
    expect(recurringDueDates(tmpl, '2026-06')).toEqual(['2026-06-10'])
  })
})

describe('recurringDueDates — weekly / biweekly', () => {
  it('lists every weekly occurrence inside the month', () => {
    const tmpl = { date: '2026-05-04', recurring_interval: 'weekly', amount: -20 }
    // June 2026: 1, 8, 15, 22, 29 (Mondays stepping from May 4)
    expect(recurringDueDates(tmpl, '2026-06')).toEqual([
      '2026-06-01', '2026-06-08', '2026-06-15', '2026-06-22', '2026-06-29',
    ])
  })
  it('lists biweekly occurrences aligned to the anchor', () => {
    const tmpl = { date: '2026-06-03', recurring_interval: 'biweekly', amount: -50 }
    expect(recurringDueDates(tmpl, '2026-06')).toEqual(['2026-06-03', '2026-06-17'])
  })
  it('excludes occurrences before the anchor', () => {
    const tmpl = { date: '2026-06-15', recurring_interval: 'weekly', amount: -20 }
    expect(recurringDueDates(tmpl, '2026-06')).toEqual(['2026-06-15', '2026-06-22', '2026-06-29'])
  })
})

describe('upcomingBillsTotal', () => {
  const rent = { id: 'r', date: '2026-01-25', recurring_interval: 'monthly', amount: -1200 }

  it('counts a future bill that has not posted', () => {
    const total = upcomingBillsTotal({ templates: [rent], transactions: [], month: '2026-06', today: '2026-06-19' })
    expect(total).toBe(1200)
  })
  it('ignores a bill already due (on/before today)', () => {
    const total = upcomingBillsTotal({ templates: [rent], transactions: [], month: '2026-06', today: '2026-06-26' })
    expect(total).toBe(0)
  })
  it('ignores a future bill whose instance is already posted', () => {
    const posted = [{ recurring_parent_id: 'r', date: '2026-06-25', amount: -1200 }]
    const total = upcomingBillsTotal({ templates: [rent], transactions: posted, month: '2026-06', today: '2026-06-19' })
    expect(total).toBe(0)
  })
  it('ignores income templates', () => {
    const paycheck = { id: 'p', date: '2026-01-30', recurring_interval: 'monthly', amount: 3000 }
    const total = upcomingBillsTotal({ templates: [paycheck], transactions: [], month: '2026-06', today: '2026-06-01' })
    expect(total).toBe(0)
  })
})
