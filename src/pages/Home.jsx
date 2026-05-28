import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function Home({ refreshKey }) {
  const [available, setAvailable] = useState(0)
  const [loading, setLoading] = useState(true)
  const [displayName, setDisplayName] = useState('')
  const [insight, setInsight] = useState(null)

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      const rawName = user?.email?.split('@')[0] || ''
      setDisplayName(rawName.charAt(0).toUpperCase() + rawName.slice(1))

      const currentMonth = new Date().toISOString().slice(0, 7)
      const startOfMonth = `${currentMonth}-01`

      const [budgetsRes, transactionsRes] = await Promise.all([
        supabase.from('budgets').select('monthly_limit').eq('month', currentMonth).eq('user_id', user.id),
        supabase.from('transactions').select('amount, category').gte('date', startOfMonth).lt('amount', 0).eq('user_id', user.id)
      ])

      const totalBudget = (budgetsRes.data || []).reduce((sum, b) => sum + b.monthly_limit, 0)
      const totalSpent = (transactionsRes.data || []).reduce((sum, t) => sum + Math.abs(t.amount), 0)
      setAvailable(totalBudget - totalSpent)

      const spendingByCategory = (transactionsRes.data || []).reduce((acc, t) => {
        const cat = t.category?.toLowerCase()
        if (!cat) return acc
        acc[cat] = (acc[cat] || 0) + Math.abs(t.amount)
        return acc
      }, {})
      const top = Object.entries(spendingByCategory).sort((a, b) => b[1] - a[1])[0]
      if (top) {
        const matchedBudget = (budgetsRes.data || []).find(b => b.category === top[0])
        setInsight({ category: top[0], spent: top[1], limit: matchedBudget?.monthly_limit ?? null })
      } else {
        setInsight(null)
      }

      setLoading(false)
    }

    fetchData()
  }, [refreshKey])

  const daysLeft = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0
  ).getDate() - new Date().getDate()

  const formatCurrency = (amount, decimals = 0) => {
    const abs = Math.abs(amount)
    const formatted = abs.toLocaleString('en-CA', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })
    return amount < 0 ? `-$${formatted}` : `$${formatted}`
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <div className="flex justify-between items-center mb-10">
        <div>
          <p className="text-black text-sm">{getGreeting()},</p>
          <p className="text-4xl font-thin text-black">{displayName}</p>
        </div>
        <div className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center">
          <span className="text-gray-500 text-sm">{displayName.charAt(0) || '?'}</span>
        </div>
      </div>

      <div className="mb-10">
        <p className="text-base text-black mb-1">Available to spend</p>
        <p className={`text-8xl font-thin tracking-tight leading-none ${!loading && available < 0 ? 'text-red-500' : 'text-black'}`}>
          {loading ? (
            <span className="text-4xl text-gray-300">—</span>
          ) : (
            formatCurrency(available)
          )}
        </p>
        <p className="text-sm text-black mt-4 pb-4 border-b border-gray-200">
          {daysLeft} day{daysLeft !== 1 ? 's' : ''} left in {new Date().toLocaleString('default', { month: 'long' })}
        </p>
      </div>

      {!loading && insight && (
        <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">Top spend this month</p>
            <p className="text-sm font-semibold text-black capitalize">
              {insight.category} — {formatCurrency(insight.spent)}
              {insight.limit != null ? ` of ${formatCurrency(insight.limit)}` : ''}
            </p>
          </div>
        </div>
      )}

      {!loading && !insight && (
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-xs text-gray-400 mb-1">Getting started</p>
          <p className="text-sm font-semibold text-black">Add your first expense to track spending</p>
        </div>
      )}
    </div>
  )
}

export default Home
