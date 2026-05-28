import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function Transactions({ refreshKey }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchTransactions() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })

      if (error) {
        setError('Failed to load transactions.')
      } else {
        setTransactions(data)
        setError('')
      }
      setLoading(false)
    }

    fetchTransactions()
  }, [refreshKey])

  const formatCurrency = (amount) => {
    const formatted = Math.abs(amount).toLocaleString('en-CA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
    return amount < 0 ? `-$${formatted}` : `+$${formatted}`
  }

  const groupByDate = (txns) => {
    return txns.reduce((groups, txn) => {
      const date = txn.date
      if (!groups[date]) groups[date] = []
      groups[date].push(txn)
      return groups
    }, {})
  }

  const formatDateLabel = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number)
    const txnDate = new Date(year, month - 1, day)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)

    const isSameDay = (a, b) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()

    if (isSameDay(txnDate, today)) return 'Today'
    if (isSameDay(txnDate, yesterday)) return 'Yesterday'
    return txnDate.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: txnDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-40">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return <div className="p-6 text-sm text-red-500">{error}</div>
  }

  const grouped = groupByDate(transactions)

  return (
    <div className="p-6 max-w-md mx-auto">
      <div className="flex justify-between items-center mb-8">
        <p className="text-2xl font-bold text-black">Transactions</p>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-gray-400">No transactions yet.</p>
          <p className="text-xs text-gray-300 mt-1">Tap + Add expense to get started.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, items]) => (
          <div key={date} className="mb-6">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
              {formatDateLabel(date)}
            </p>
            {items.map(txn => (
              <div key={txn.id} className="flex justify-between items-center py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-black">{txn.description}</p>
                  {txn.category && (
                    <p className="text-xs text-gray-400 capitalize">{txn.category}</p>
                  )}
                </div>
                <p className={`text-sm font-medium ${txn.amount < 0 ? 'text-black' : 'text-green-600'}`}>
                  {formatCurrency(txn.amount)}
                </p>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  )
}

export default Transactions
