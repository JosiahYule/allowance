import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import MonthNav from '../components/MonthNav'

function getMonthRange(month) {
  const [y, m] = month.split('-').map(Number)
  const start = `${month}-01`
  const endY = m === 12 ? y + 1 : y
  const endM = m === 12 ? 1 : m + 1
  const end = `${endY}-${String(endM).padStart(2, '0')}-01`
  return { start, end }
}

function Home({ refreshKey, monthlyIncome }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [displayName, setDisplayName] = useState('')
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))

  async function fetchData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const rawName = user?.email?.split('@')[0] || ''
    setDisplayName(rawName.charAt(0).toUpperCase() + rawName.slice(1))

    const { start, end } = getMonthRange(month)

    const [budgetsRes, txRes] = await Promise.all([
      supabase.from('budgets').select('monthly_limit, category').eq('month', month).eq('user_id', user.id),
      supabase.from('transactions').select('amount, category').gte('date', start).lt('date', end).lt('amount', 0).eq('user_id', user.id),
    ])

    const budgets = budgetsRes.data || []
    const expenses = txRes.data || []

    const totalBudget = budgets.reduce((sum, b) => sum + b.monthly_limit, 0)
    const totalSpent = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0)

    const spendingByCategory = expenses.reduce((acc, t) => {
      const cat = t.category?.toLowerCase()
      if (!cat) return acc
      acc[cat] = (acc[cat] || 0) + Math.abs(t.amount)
      return acc
    }, {})

    const topEntry = Object.entries(spendingByCategory).sort((a, b) => b[1] - a[1])[0]
    const topInsight = topEntry ? {
      category: topEntry[0],
      spent: topEntry[1],
      limit: budgets.find(b => b.category === topEntry[0])?.monthly_limit ?? null,
    } : null

    setData({ totalBudget, totalSpent, topInsight })
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => { fetchData() }, [refreshKey, month])

  const currentMonthStr = new Date().toISOString().slice(0, 7)
  const isCurrentMonth = month === currentMonthStr

  const daysLeft = isCurrentMonth
    ? new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate()
    : null

  const fmt = (amount, dec = 0) => {
    const abs = Math.abs(amount)
    const s = abs.toLocaleString('en-CA', { minimumFractionDigits: dec, maximumFractionDigits: dec })
    return amount < 0 ? `-$${s}` : `$${s}`
  }

  const getGreeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const available = data
    ? monthlyIncome != null
      ? monthlyIncome - data.totalSpent
      : data.totalBudget - data.totalSpent
    : 0

  return (
    <div className="px-6 pt-10 pb-6 max-w-md mx-auto">
      <div className="flex justify-between items-center mb-10">
        <div>
          <p className="text-black text-sm">{getGreeting()},</p>
          <p className="text-4xl font-thin text-black">{displayName}</p>
        </div>
        <Link
          to="/profile"
          className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center"
        >
          <span className="text-gray-500 text-sm">{displayName.charAt(0) || '?'}</span>
        </Link>
      </div>

      <MonthNav month={month} onChange={m => { setMonth(m); setData(null) }} />

      <div className="mb-10">
        <p className="text-base text-black mb-1">{monthlyIncome != null ? 'Available to spend' : 'Budget remaining'}</p>
        <p className={`text-8xl font-thin tracking-tight leading-none ${!loading && available < 0 ? 'text-red-800' : 'text-black'}`}>
          {loading ? <span className="text-4xl text-gray-300">—</span> : fmt(available)}
        </p>
        <p className="text-sm text-gray-500 mt-4 pb-4 border-b border-gray-200">
          {daysLeft !== null
            ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left in ${new Date().toLocaleString('default', { month: 'long' })}`
            : new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]) - 1, 1)
                .toLocaleString('default', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {!loading && data?.topInsight && (
        <div>
          <p className="text-xs text-gray-400 mb-1">Top spend this month</p>
          <p className="text-sm font-medium text-black capitalize">
            {data.topInsight.category}
            {data.topInsight.limit != null
              ? ` — ${fmt(data.topInsight.spent)} of ${fmt(data.topInsight.limit)}`
              : ` — ${fmt(data.topInsight.spent)}`}
          </p>
        </div>
      )}

      {!loading && !data?.topInsight && (
        <p className="text-sm text-gray-400">Add your first expense to start tracking.</p>
      )}
    </div>
  )
}

export default Home
