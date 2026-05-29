import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CategoryIcon } from '../lib/categoryIcons'
import { fetchCategoryIconMap } from '../lib/categories'

function getMonthRange(month) {
  const [y, m] = month.split('-').map(Number)
  const start = `${month}-01`
  const endY = m === 12 ? y + 1 : y
  const endM = m === 12 ? 1 : m + 1
  return { start, end: `${endY}-${String(endM).padStart(2, '0')}-01` }
}

function Home({ refreshKey }) {
  const [loading, setLoading] = useState(true)
  const [displayName, setDisplayName] = useState('')
  const [monthlyIncome, setMonthlyIncome] = useState(null)
  const [totalSpent, setTotalSpent] = useState(0)
  const [totalEarned, setTotalEarned] = useState(0)
  const [totalPlanned, setTotalPlanned] = useState(0)
  const [recent, setRecent] = useState([])
  const [customIcons, setCustomIcons] = useState({})

  const currentMonth = new Date().toISOString().slice(0, 7)

  async function fetchData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
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
    setMonthlyIncome(income)
    setCustomIcons(iconMap)

    const txns = txRes.data || []
    const spent = txns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
    const earned = txns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
    const budgetTotal = (budgetsRes.data || []).reduce((s, b) => s + b.monthly_limit, 0)

    setTotalSpent(spent)
    setTotalEarned(earned)
    setTotalPlanned(income ?? budgetTotal)
    setRecent(txns.slice(0, 3))
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => { fetchData() }, [refreshKey])

  const available = totalPlanned - totalSpent
  const pct = totalPlanned > 0 ? Math.min(totalSpent / totalPlanned, 1) : 0

  const today = new Date()

  const getGreeting = () => {
    const h = today.getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const fmtBig = (n) => {
    const abs = Math.abs(n)
    const s = abs.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    return (n < 0 ? '-' : '') + '$' + s
  }

  const fmtTxn = (amount) => {
    const s = Math.abs(amount).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return (amount < 0 ? '-' : '+') + '$' + s
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
    <div className="px-6 pt-10 pb-6 max-w-md mx-auto">

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <p className="text-sm text-gray-500">{getGreeting()},</p>
          <p className="text-2xl font-bold text-black">{displayName || '...'}</p>
        </div>
        <Link
          to="/profile"
          className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center"
        >
          <span className="text-sm text-gray-500">{displayName.charAt(0) || '?'}</span>
        </Link>
      </div>

      {/* Hero: available to spend */}
      <div className="mb-7">
        <p className="text-sm text-gray-500 mb-1">Available to spend</p>
        {loading ? (
          <p className="text-5xl font-bold text-gray-200 tracking-tight">--</p>
        ) : (
          <p className={`text-5xl font-bold tracking-tight ${available < 0 ? 'text-red-800' : 'text-black'}`}>
            {fmtBig(available)}
          </p>
        )}
      </div>

      {/* Month progress */}
      <div className="border-t border-gray-100 pt-5 mb-7">
        <div className="flex justify-between items-baseline mb-3">
          <p className="text-2xl font-bold text-black">
            {loading ? '--' : '$' + totalSpent.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          {!loading && totalPlanned > 0 && (
            <p className="text-sm text-gray-400">
              of ${totalPlanned.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          )}
        </div>
        <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-1 bg-black rounded-full transition-all"
            style={{ width: loading ? '0%' : `${pct * 100}%` }}
          />
        </div>

        {/* Earned / Spent / Net mini-stats */}
        {!loading && (totalEarned > 0 || totalSpent > 0) && (
          <div className="flex justify-between mt-4 pt-4 border-t border-gray-50">
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-0.5">Earned</p>
              <p className="text-sm font-semibold text-green-800">
                +${totalEarned.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-0.5">Spent</p>
              <p className="text-sm font-semibold text-black">
                -${totalSpent.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-0.5">Net</p>
              <p className={`text-sm font-semibold ${totalEarned - totalSpent >= 0 ? 'text-black' : 'text-red-800'}`}>
                {totalEarned - totalSpent >= 0 ? '+' : '-'}${Math.abs(totalEarned - totalSpent).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Recent transactions */}
      <div className="border-t border-gray-100 pt-5">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm font-semibold text-black">Recent transactions</p>
          <Link to="/transactions" className="text-xs text-gray-400">View all</Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gray-100 rounded-full flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-3 bg-gray-100 rounded w-32 mb-1.5" />
                  <div className="h-2.5 bg-gray-100 rounded w-16" />
                </div>
                <div className="h-3 bg-gray-100 rounded w-16" />
              </div>
            ))}
          </div>
        ) : recent.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">No transactions this month. Tap + Add to get started.</p>
        ) : (
          <div>
            {recent.map(txn => (
              <div key={txn.id} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
                <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <CategoryIcon
                    category={txn.category}
                    isIncome={txn.amount >= 0}
                    size={15}
                    className="text-gray-500"
                    customIcons={customIcons}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-black truncate">{txn.description}</p>
                  <p className="text-xs text-gray-400">{formatDate(txn.date)}</p>
                </div>
                <p className={`text-sm font-medium flex-shrink-0 ${txn.amount >= 0 ? 'text-green-800' : 'text-black'}`}>
                  {fmtTxn(txn.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

export default Home
