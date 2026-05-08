function Transactions() {
  const transactions = [
    { id: 1, description: 'Coffee Bar', amount: -6.50, category: 'Dining', date: '2026-05-08' },
    { id: 2, description: 'Grocery Market', amount: -42.10, category: 'Groceries', date: '2026-05-08' },
    { id: 3, description: 'Salary Deposit', amount: 2800.00, category: 'Income', date: '2026-05-07' },
    { id: 4, description: 'Metro Card', amount: -25.00, category: 'Transport', date: '2026-05-07' },
  ]

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

  const grouped = groupByDate(transactions)

  const formatDateLabel = (dateStr) => {
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    if (dateStr === today) return 'Today'
    if (dateStr === yesterday) return 'Yesterday'
    return dateStr
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <div className="flex justify-between items-center mb-8">
        <p className="text-3xl font-semibold text-black">Transactions</p>
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
    </div>
  )
}

export default Transactions