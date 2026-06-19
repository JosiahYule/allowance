import { describe, it, expect } from 'vitest'
import {
  toLocalDateStr, getMonthRange, addMonths, daysInMonth,
  daysRemainingInMonth, monthLabel,
} from './dates'

describe('toLocalDateStr', () => {
  it('formats in local time, not UTC', () => {
    // Late evening in a negative-offset zone must not roll to the next day.
    const d = new Date(2026, 0, 31, 23, 30) // local Jan 31
    expect(toLocalDateStr(d)).toBe('2026-01-31')
  })
})

describe('getMonthRange', () => {
  it('returns a half-open [start, end) range', () => {
    expect(getMonthRange('2026-05')).toEqual({ start: '2026-05-01', end: '2026-06-01' })
  })
  it('wraps the year in December', () => {
    expect(getMonthRange('2026-12')).toEqual({ start: '2026-12-01', end: '2027-01-01' })
  })
})

describe('addMonths', () => {
  it('adds and subtracts across year boundaries', () => {
    expect(addMonths('2026-06', 1)).toBe('2026-07')
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(addMonths('2026-06', -6)).toBe('2025-12')
  })
})

describe('daysInMonth', () => {
  it('handles leap years and short months', () => {
    expect(daysInMonth('2026-02')).toBe(28)
    expect(daysInMonth('2028-02')).toBe(29)
    expect(daysInMonth('2026-04')).toBe(30)
    expect(daysInMonth('2026-12')).toBe(31)
  })
})

describe('daysRemainingInMonth', () => {
  it('counts today itself', () => {
    expect(daysRemainingInMonth('2026-06', '2026-06-19')).toBe(12) // 19..30
  })
  it('is the whole month before it starts', () => {
    expect(daysRemainingInMonth('2026-06', '2026-05-31')).toBe(30)
  })
  it('is zero once the month is over', () => {
    expect(daysRemainingInMonth('2026-06', '2026-07-01')).toBe(0)
  })
  it('is 1 on the last day', () => {
    expect(daysRemainingInMonth('2026-06', '2026-06-30')).toBe(1)
  })
})

describe('monthLabel', () => {
  it('renders a human label', () => {
    expect(monthLabel('2026-06')).toBe('June 2026')
  })
})
