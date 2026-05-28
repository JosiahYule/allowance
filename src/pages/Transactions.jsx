import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTransactions() {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false })

      if (error) {
        console.log('Error fetching:', error.message)
      } else {
        setTransactions(data)
      }
      setLoading(false)
    }

    fetchTransactions()
  }, [])

  const formatCurrency = (amount) => {
    const formatted = Math.abs(amount).toLocaleString('en-CA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
    return amount < 0 ? `-$${formatted}` : `+$${formatted}`
  }

  const groupByDate = (transactions) => {
    return transactions.reduce((groups, transaction) => {
      const date = transaction.date
      if (!groups[date]) groups[date] = []
      groups[date].push(transaction)
      return groups
    }, {})
  }

  const formatDateLabel = (dateStr) => {
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    if (dateStr === today) return 'Today'
    if (dateStr === yesterday) return 'Yesterday'
    return dateStr
  }

  if (loading) {
    return <div className="p-6 text-sm text-gray-400">Loading...</div>
  }

  const grouped = groupByDate(transactions)

  return (
    <div className="p-6 max-w-md mx-auto">
      <div className="flex justify-between items-center mb-8">
        <p className="text-2xl font-bold text-black">Transactions</p>
        <button className="text-sm text-gray-400">Filter</button>
      </div>

      {Object.entries(grouped).map(([date, items]) => (
        <div key={date} className="mb-6">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
            {formatDateLabel(date)}
          </p>
          {items.map(transaction => (
            <div key={transaction.id} className="flex justify-between items-center py-3 border-b border-gray-100">
              <div>
                <p className="text-sm font-medium text-black">{transaction.description}</p>
                <p className="text-xs text-gray-400">{transaction.category}</p>
              </div>
              <p className={`text-sm font-medium ${transaction.amount < 0 ? 'text-black' : 'text-green-600'}`}>
                {formatCurrency(transaction.amount)}
              </p>
            </div>
          ))}
        </div>
      ))}

      {transactions.length === 0 && (
        <p className="text-sm text-gray-400">No transactions yet.</p>
      )}
    </div>
  )
}

export default Transactions