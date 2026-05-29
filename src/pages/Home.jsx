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

function Home({ refreshKey }) {
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
      supabase.from('transactions').select('amount, category').gte('date', start).lt('date', end).eq('user_id', user.id),
    ])

    const budgets = budgetsRes.data || []
    const transactions = txRes.data || []
    const expenses = transactions.filter(t => t.amount < 0)
    const income = transactions.filter(t => t.amount > 0)

    const totalBudget = budgets.reduce((sum, b) => sum + b.monthly_limit, 0)
    const totalSpent = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0)

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

    const alerts = budgets
      .map(b => {
        const spent = spendingByCategory[b.category] || 0
        const pct = b.monthly_limit > 0 ? spent / b.monthly_limit : 0
        if (pct >= 1) return { category: b.category, pct, status: 'over' }
        if (pct >= 0.85) return { category: b.category, pct, status: 'warning' }
        return null
      })
      .filter(Boolean)

    const chartData = budgets
      .map(b => ({
        category: b.category,
        spent: spendingByCategory[b.category] || 0,
        limit: b.monthly_limit,
        pct: b.monthly_limit > 0 ? Math.min((spendingByCategory[b.category] || 0) / b.monthly_limit, 1) : 0,
      }))
      .sort((a, b) => b.pct - a.pct)

    setData({
      available: totalBudget - totalSpent,
      totalBudget,
      totalSpent,
      totalIncome,
      net: totalIncome - totalSpent,
      topInsight,
      alerts,
      chartData,
    })
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => { fetchData() }, [refreshKey, month])

  const currentMonthStr = new Date().toISOString().slice(0, 7)
  const isCurrentMonth = month === currentMonthStr

  const daysLeft = isCurrentMonth
    ? new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate()
    : 0

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

  const available = data?.available ?? 0

  return (
    <div className="p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
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

      {/* Month navigation */}
      <MonthNav month={month} onChange={m => { setMonth(m); setData(null) }} />

      {/* Balance */}
      <div className="mb-6">
        <p className="text-base text-black mb-1">Available to spend</p>
        <p className={`text-8xl font-thin tracking-tight leading-none ${!loading && available < 0 ? 'text-red-500' : 'text-black'}`}>
          {loading ? <span className="text-4xl text-gray-300">—</span> : fmt(available)}
        </p>
        <div className="mt-4 pb-4 border-b border-gray-200">
          {isCurrentMonth && (
            <p className="text-sm text-black">
              {daysLeft} day{daysLeft !== 1 ? 's' : ''} left in {new Date().toLocaleString('default', { month: 'long' })}
            </p>
          )}
          {!loading && data && data.totalBudget > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              {fmt(data.totalSpent)} spent of {fmt(data.totalBudget)} budgeted
            </p>
          )}
        </div>
      </div>

      {/* Budget alerts */}
      {!loading && data?.alerts?.length > 0 && (
        <div className={`rounded-xl p-3 mb-4 ${data.alerts.some(a => a.status === 'over') ? 'bg-black' : 'bg-amber-50 border border-amber-100'}`}>
          {data.alerts.map(alert => (
            <p key={alert.category} className={`text-xs capitalize leading-5 ${alert.status === 'over' ? 'text-white' : 'text-amber-800'}`}>
              {alert.status === 'over' ? '⚠ ' : '· '}
              <span className="font-medium">{alert.category}</span>
              {' '}
              {alert.status === 'over' ? 'is over budget' : `is ${Math.round(alert.pct * 100)}% used`}
            </p>
          ))}
        </div>
      )}

      {/* Net cash flow */}
      {!loading && data && (data.totalIncome > 0 || data.totalSpent > 0) && (
        <div className="bg-gray-50 rounded-2xl p-4 mb-4">
          <p className="text-xs text-gray-400 mb-3">Cash flow</p>
          <div className="flex gap-6">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Income</p>
              <p className="text-sm font-medium text-green-600">+{fmt(data.totalIncome)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Expenses</p>
              <p className="text-sm font-medium text-black">{fmt(-data.totalSpent)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Net</p>
              <p className={`text-sm font-medium ${data.net >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {fmt(data.net)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top spend insight */}
      {!loading && data?.topInsight && (
        <div className="bg-gray-50 rounded-2xl p-4 mb-4">
          <p className="text-xs text-gray-400 mb-1">Top spend this month</p>
          <p className="text-sm font-semibold text-black capitalize">
            {data.topInsight.category} — {fmt(data.topInsight.spent)}
            {data.topInsight.limit != null ? ` of ${fmt(data.topInsight.limit)}` : ''}
          </p>
        </div>
      )}

      {!loading && !data?.topInsight && (
        <div className="bg-gray-50 rounded-2xl p-4 mb-4">
          <p className="text-xs text-gray-400 mb-1">Getting started</p>
          <p className="text-sm font-semibold text-black">
            Set budgets in the Plan tab, then tap + Add to track your first expense.
          </p>
        </div>
      )}

      {/* Spending chart */}
      {!loading && data?.chartData?.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-4">Spending by category</p>
          {data.chartData.map(item => {
            const status = item.pct >= 1 ? 'over' : item.pct >= 0.85 ? 'warning' : 'good'
            const barColor = status === 'over' ? 'bg-red-500' : status === 'warning' ? 'bg-amber-400' : 'bg-black'
            return (
              <div key={item.category} className="mb-4">
                <div className="flex justify-between items-baseline mb-1.5">
                  <p className="text-xs text-black capitalize">{item.category}</p>
                  <p className="text-xs text-gray-400">
                    ${Math.round(item.spent).toLocaleString()} / ${Math.round(item.limit).toLocaleString()}
                  </p>
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full transition-all ${barColor}`}
                    style={{ width: `${item.pct * 100}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Home
