import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase, getCurrentUser } from '../lib/supabase'
import { CategoryIcon } from '../lib/categoryIcons'
import { fetchCategoryIconMap } from '../lib/categories'
import { getMonthRange } from '../lib/dates'

function Home({ refreshKey }) {
  const [loading, setLoading] = useState(true)
  const [displayName, setDisplayName] = useState('')
  const [totalSpent, setTotalSpent] = useState(0)
  const [totalEarned, setTotalEarned] = useState(0)
  const [totalPlanned, setTotalPlanned] = useState(0)
  const [recent, setRecent] = useState([])
  const [customIcons, setCustomIcons] = useState({})

  const currentMonth = new Date().toISOString().slice(0, 7)

  async function fetchData() {
    setLoading(true)
    const user = await getCurrentUser()
    const raw = user?.email?.split('@')[0] || ''
    setDisplayName(raw.charAt(0).toUpperCase() + raw.slice(1))

    const { start, end } = getMonthRange(currentMonth)

    const [budgetsRes, txRes, settingsRes, iconMap] = await Promise.all([
      supabase.from('budgets').select('monthly_limit').eq('month', currentMonth).eq('user_id', user.id),
      supabase.from('transactions').select('*').gte('date', start).lt('date', end).eq('user_id', user.id).order('date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('user_settings').select('monthly_income').eq('user_id', user.id).maybeSingle(),
      fetchCategoryIconMap(user.id),
    ])

    const income = settingsRes.data?.monthly_income ?? null
    setCustomIcons(iconMap)

    const txns = txRes.data || []
    const spent = txns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
    const earned = txns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
    const budgetTotal = (budgetsRes.data || []).reduce((s, b) => s + b.monthly_limit, 0)

    setTotalSpent(spent)
    setTotalEarned(earned)
    setTotalPlanned(income ?? budgetTotal)
    setRecent(txns.slice(0, 4))
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => { fetchData() }, [refreshKey])

  const hasPlan = totalPlanned > 0
  const available = totalPlanned - totalSpent
  const net = totalEarned - totalSpent
  const heroValue = hasPlan ? available : net
  const heroNegative = heroValue < 0

  const getGreeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const fmtBig = (n) => {
    const s = Math.abs(n).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    return (n < 0 ? '−' : '') + '$' + s
  }

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
          <p className="text-xl font-semibold text-ink tracking-tight">{displayName || ' '}</p>
        </div>
        <Link
          to="/profile"
          className="w-10 h-10 rounded-full bg-fill flex items-center justify-center active:scale-95 transition-transform"
        >
          <span className="text-sm font-semibold text-ink-soft">{displayName.charAt(0) || '?'}</span>
        </Link>
      </div>

      {/* Money card — the centerpiece */}
      <div className="card p-7 mb-9">
        <p className="eyebrow mb-4">{hasPlan ? 'Available to spend' : 'Net this month'}</p>

        {loading ? (
          <div className="h-[76px] w-52 bg-fill rounded-2xl animate-pulse" />
        ) : (
          <p className={`font-display font-light text-[80px] leading-[0.9] tracking-tight tabular-nums ${heroNegative ? 'text-danger' : 'text-ink'}`}>
            {fmtBig(heroValue)}
          </p>
        )}

        {!hasPlan && !loading && (
          <Link to="/profile" className="inline-flex items-center text-[13px] text-accent font-medium mt-5">
            Set a monthly income to track what's available →
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
