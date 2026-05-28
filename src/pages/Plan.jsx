import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function Plan() {
  const [budgets, setBudgets] = useState([])
  const [spending, setSpending] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const currentMonth = new Date().toISOString().slice(0, 7)
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const [budgetsRes, transactionsRes] = await Promise.all([
        supabase.from('budgets').select('*').eq('month', currentMonth),
        supabase.from('transactions').select('amount, category').gte('created_at', startOfMonth.toISOString()).lt('amount', 0)
      ])

      if (budgetsRes.data) setBudgets(budgetsRes.data)

      if (transactionsRes.data) {
        const spendingByCategory = transactionsRes.data.reduce((acc, t) => {
          const cat = t.category?.toLowerCase()
          if (!cat) return acc
          acc[cat] = (acc[cat] || 0) + Math.abs(t.amount)
          return acc
        }, {})
        setSpending(spendingByCategory)
      }

      setLoading(false)
    }

    fetchData()
  }, [])

  const formatCurrency = (amount) => {
    return amount.toLocaleString('en-CA', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
  }

  const getStatus = (spent, limit) => {
    const pct = spent / limit
    if (pct >= 1) return 'over'
    if (pct >= 0.85) return 'warning'
    return 'good'
  }

  const statusColor = {
    good: 'text-green-600',
    warning: 'text-yellow-600',
    over: 'text-red-600'
  }

  if (loading) return <div className="p-6 text-sm text-gray-400">Loading...</div>

  return (
    <div className="p-6 max-w-md mx-auto">
      <p className="text-2xl font-bold text-black mb-8">Plan</p>

      {budgets.map(budget => {
        const spent = spending[budget.category] || 0
        const status = getStatus(spent, budget.monthly_limit)
        const remaining = budget.monthly_limit - spent

        return (
          <div key={budget.id} className="mb-6 pb-6 border-b border-gray-100">
            <div className="flex justify-between items-center mb-1">
              <p className="text-sm font-medium text-black capitalize">{budget.category}</p>
              <p className="text-sm text-gray-400">${formatCurrency(spent)} / ${formatCurrency(budget.monthly_limit)}</p>
            </div>
            <p className={`text-xs ${statusColor[status]}`}>
              {status === 'over'
                ? `Over by $${formatCurrency(Math.abs(remaining))}`
                : `$${formatCurrency(remaining)} left`}
            </p>
          </div>
        )
      })}
    </div>
  )
}

export default Plan