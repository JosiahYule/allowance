import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase, getCurrentUser } from '../lib/supabase'
import { CategoryIcon } from '../lib/categoryIcons'
import { fetchCategoryIconMap } from '../lib/categories'
import { getMonthRange, currentMonth, addMonths } from '../lib/dates'
import { computeMonth, monthLeftover } from '../lib/finance'
import { upcomingBillsTotal } from '../lib/recurring'

const EMPTY = { available: 0, dailyAllowance: 0, daysLeft: 0, upcomingBills: 0, hasPlan: false }

function Home({ refreshKey }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [snapshot, setSnapshot] = useState(EMPTY)
  const [recent, setRecent] = useState([])
  const [customIcons, setCustomIcons] = useState({})

  const month = currentMonth()

  async function fetchData() {
    setLoading(true)
    setError(false)
    try {
      const user = await getCurrentUser()
      const raw = user?.email?.split('@')[0] || ''
      setDisplayName(raw.charAt(0).toUpperCase() + raw.slice(1))

      const { start, end } = getMonthRange(month)
      const prev = getMonthRange(addMonths(month, -1))

      const [settingsRes, txRes, templatesRes, prevTxRes, iconMap] = await Promise.all([
        supabase.from('user_settings').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('transactions').select('*').gte('date', start).lt('date', end).eq('user_id', user.id).order('date', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('transactions').select('*').eq('user_id', user.id).eq('recurring', true).is('recurring_parent_id', null),
        supabase.from('transactions').select('*').gte('date', prev.start).lt('date', prev.end).eq('user_id', user.id),
        fetchCategoryIconMap(user.id),
      ])

      if (txRes.error) throw txRes.error

      const monthlyIncome = settingsRes.data?.monthly_income ?? null
      const rolloverOn = settingsRes.data?.rollover_enabled ?? false
      const txns = txRes.data || []
      const templates = templatesRes.data || []
      const prevTxns = prevTxRes.data || []

      const upcomingBills = upcomingBillsTotal({ templates, transactions: txns, month })

      // Rollover: last month's leftover, but only if there was real activity then
      // (so a brand-new user's first month isn't inflated by phantom income).
      const rollover = rolloverOn && prevTxns.length > 0
        ? monthLeftover({ transactions: prevTxns, monthlyIncome })
        : 0

      setSnapshot(computeMonth({ transactions: txns, monthlyIncome, rollover, upcomingBills, month }))
      setCustomIcons(iconMap)
      setRecent(txns.slice(0, 4))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => { fetchData() }, [refreshKey])

  const { available, dailyAllowance, daysLeft, upcomingBills, hasPlan } = snapshot
  const heroNegative = available < 0

  const getGreeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const fmtBig = (n) => {
    const s = Math.abs(Math.round(n)).toLocaleString('en-CA')
    return (n < 0 ? '−' : '') + '$' + s
  }

  const fmtMoney = (n) => '$' + Math.abs(Math.round(n)).toLocaleString('en-CA')

  const fmtTxn = (amount) => {
    const s = Math.abs(amount).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return (amount < 0 ? '−' : '+') + '$' + s
  }

  const formatDate = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    const t = new Date()
    const yesterday = new Date(t); yesterday.setDate(t.getDate() - 1)
    const same = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
    if (same(date, t)) return 'Today'
    if (same(date, yesterday)) return 'Yesterday'
    return date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="px-5 pt-12 pb-8 max-w-md mx-auto">

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-[13px] text-muted mb-0.5">{getGreeting()}</p>
          <p className="text-xl font-semibold text-ink tracking-tight">{displayName || ' '}</p>
        </div>
        <Link
          to="/profile"
          aria-label="Profile"
          className="w-10 h-10 rounded-full bg-fill flex items-center justify-center active:scale-95 transition-transform"
        >
          <span className="text-sm font-semibold text-ink-soft">{displayName.charAt(0) || '?'}</span>
        </Link>
      </div>

      {error && !loading && (
        <div className="card p-7 mb-9 text-center">
          <p className="text-[15px] text-ink-soft mb-4">Couldn’t load your numbers. Check your connection.</p>
          <button onClick={fetchData} className="btn-primary px-6 py-3 text-sm">Try again</button>
        </div>
      )}

      {/* Money card — the centerpiece */}
      <div className={`card p-7 mb-9 ${error ? 'hidden' : ''}`}>
        <p className="eyebrow mb-4">{hasPlan ? 'Safe to spend' : 'Net this month'}</p>

        {loading ? (
          <div className="h-[76px] w-52 bg-fill rounded-2xl animate-pulse" />
        ) : (
          <p
            aria-live="polite"
            className={`font-display font-light text-[72px] leading-[0.9] tracking-tight tabular-nums break-words ${heroNegative ? 'text-danger' : 'text-ink'}`}
          >
            {fmtBig(available)}
          </p>
        )}

        {!loading && hasPlan && (
          <div className="mt-5 space-y-1">
            {available >= 0 ? (
              daysLeft > 0 && (
                <p className="text-[14px] text-ink-soft">
                  About <span className="font-semibold text-ink">{fmtMoney(dailyAllowance)}</span> a day
                  {' '}for the next {daysLeft} {daysLeft === 1 ? 'day' : 'days'}.
                </p>
              )
            ) : (
              <p className="text-[14px] text-danger">{fmtMoney(available)} over your plan this month.</p>
            )}
            {upcomingBills > 0 && (
              <p className="text-[13px] text-muted">After {fmtMoney(upcomingBills)} in bills still due this month.</p>
            )}
          </div>
        )}

        {!hasPlan && !loading && (
          <Link to="/profile" className="inline-flex items-center text-[13px] text-accent font-medium mt-5">
            Set a monthly income to track what's safe to spend →
          </Link>
        )}
      </div>

      {/* Recent transactions */}
      <div className="flex justify-between items-center mb-2 px-1">
        <p className="text-[15px] font-semibold text-ink">Recent</p>
        <Link to="/transactions" className="text-[13px] text-muted active:text-ink transition-colors">All</Link>
      </div>

      {loading ? (
        <div className="space-y-1">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3.5 py-3">
              <div className="w-10 h-10 bg-fill rounded-2xl flex-shrink-0 animate-pulse" />
              <div className="flex-1">
                <div className="h-3.5 bg-fill rounded-full w-32 mb-2 animate-pulse" />
                <div className="h-3 bg-fill rounded-full w-16 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : recent.length === 0 ? (
        <p className="text-[14px] text-muted py-6 px-1">Nothing yet this month. Tap Add to get started.</p>
      ) : (
        <div>
          {recent.map(txn => (
            <div key={txn.id} className="flex items-center gap-3.5 py-3.5 px-1">
              <div className="w-10 h-10 bg-fill rounded-2xl flex items-center justify-center flex-shrink-0">
                <CategoryIcon
                  category={txn.category}
                  isIncome={txn.amount >= 0}
                  isSavings={txn.goal_id != null}
                  size={16}
                  className="text-ink-soft"
                  customIcons={customIcons}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium text-ink truncate">{txn.description}</p>
                <p className="text-[13px] text-muted">{formatDate(txn.date)}</p>
              </div>
              <p className={`text-[15px] font-medium flex-shrink-0 tabular-nums ${txn.amount >= 0 ? 'text-accent' : 'text-ink'}`}>
                {fmtTxn(txn.amount)}
              </p>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

export default Home
