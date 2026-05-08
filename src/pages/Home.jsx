function Home() {
  const safeToSpend = 48.20
  const daysLeft = 12
  const spentThisMonth = 1842

  const formatCurrency = (amount) => {
    return amount.toLocaleString('en-CA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  return (
    <div className="p-6 max-w-md mx-auto">

      <div className="flex justify-between items-center mb-8">
        <div>
          <p className="text-gray-500 text-sm">Good morning,</p>
          <p className="text-3xl font-bold text-black">Alex</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
          <span className="text-gray-400 text-sm">A</span>
        </div>
      </div>

      <div className="mb-8">
        <p className="text-sm text-gray-500 mb-1">Safe to spend today</p>
        <p className="text-7xl font-bold text-black tracking-tight">${formatCurrency(safeToSpend)}</p>
        <p className="text-sm text-gray-500 mt-3">{daysLeft} days left in May</p>
      </div>

      <div className="mb-8">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Spent this month</p>
        <p className="text-2xl font-semibold">${formatCurrency(spentThisMonth)}</p>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Weekly insight</p>
        <p className="text-sm font-semibold text-black">Dining is +18% vs last month</p>
      </div>

    </div>
  )
}

export default Home