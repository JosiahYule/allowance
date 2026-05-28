import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

function Plan({ refreshKey }) {
  const [budgets, setBudgets] = useState([])
  const [spending, setSpending] = useState({})
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()

      const currentMonth = new Date().toISOString().slice(0, 7)
      const startOfMonth = `${currentMonth}-01`

      const [budgetsRes, transactionsRes] = await Promise.all([
        supabase.from('budgets').select('*').eq('month', currentMonth).eq('user_id', user.id),
        supabase.from('transactions').select('amount, category').gte('date', startOfMonth).lt('amount', 0).eq('user_id', user.id)
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
  }, [refreshKey])

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

  const statusColor = { good: 'text-gray-400', warning: 'text-yellow-600', over: 'text-red-600' }
  const barColor = { good: 'bg-black', warning: 'bg-yellow-400', over: 'bg-red-500' }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-40">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <p className="text-2xl font-bold text-black mb-8">Plan</p>

      {budgets.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-gray-400 mb-2">No budgets set yet.</p>
          <button
            onClick={() => navigate('/budgets')}
            className="text-sm font-medium text-black underline underline-offset-2"
          >
            Set up budgets
          </button>
        </div>
      ) : (
        budgets.map(budget => {
          const spent = spending[budget.category] || 0
          const status = getStatus(spent, budget.monthly_limit)
          const remaining = budget.monthly_limit - spent
          const pct = Math.min(spent / budget.monthly_limit, 1)

          return (
            <div key={budget.id} className="mb-6 pb-6 border-b border-gray-100">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium text-black capitalize">{budget.category}</p>
                <p className="text-sm text-gray-400">${formatCurrency(spent)} / ${formatCurrency(budget.monthly_limit)}</p>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1 mb-2">
                <div
                  className={`h-1 rounded-full transition-all ${barColor[status]}`}
                  style={{ width: `${pct * 100}%` }}
                />
              </div>
              <p className={`text-xs ${statusColor[status]}`}>
                {status === 'over'
                  ? `Over by $${formatCurrency(Math.abs(remaining))}`
                  : `$${formatCurrency(remaining)} remaining`}
              </p>
            </div>
          )
        })
      )}
    </div>
  )
}

export default Plan
