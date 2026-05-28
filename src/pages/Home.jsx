import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function Home() {
  const [spentThisMonth, setSpentThisMonth] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMonthlySpend() {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { data, error } = await supabase
        .from('transactions')
        .select('amount')
        .gte('created_at', startOfMonth.toISOString())
        .lt('amount', 0)

      if (error) {
        console.log('Error:', error.message)
      } else {
        const total = data.reduce((sum, t) => sum + Math.abs(t.amount), 0)
        setSpentThisMonth(total)
      }
      setLoading(false)
    }

    fetchMonthlySpend()
  }, [])

  const daysLeft = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0
  ).getDate() - new Date().getDate()

  const formatCurrency = (amount, decimals = 2) => {
    return amount.toLocaleString('en-CA', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })
  }

  return (
    <div className="p-6 max-w-md mx-auto">

      <div className="flex justify-between items-center mb-10">
        <div>
          <p className="text-black text-sm">Good morning,</p>
          <p className="text-4xl font-thin text-black">Alex</p>
        </div>
        <div className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center">
          <span className="text-gray-500 text-sm">A</span>
        </div>
      </div>

      <div className="mb-10">
        <p className="text-base text-black mb-1">Spent this month</p>
        <p className="text-8xl font-thin text-black tracking-tight leading-none">
          ${loading ? '...' : formatCurrency(spentThisMonth, 0)}
        </p>
        <p className="text-sm text-black mt-4 pb-4 border-b border-gray-200">{daysLeft} days left in {new Date().toLocaleString('default', { month: 'long' })}</p>
      </div>

      <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4">
        <div>
          <p className="text-xs text-gray-400 mb-1">Weekly insight</p>
          <p className="text-sm font-semibold text-black">Dining is +18% vs last month</p>
        </div>
        <span className="text-gray-300 text-xl">›</span>
      </div>

    </div>
  )
}

export default Home