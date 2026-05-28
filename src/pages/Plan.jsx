import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ShoppingCart, Utensils, Car, ShoppingBag, Heart, Tv, Plus, X, Tag } from 'lucide-react'

const CATEGORY_CONFIG = {
  groceries:     { icon: ShoppingCart },
  dining:        { icon: Utensils },
  transport:     { icon: Car },
  shopping:      { icon: ShoppingBag },
  health:        { icon: Heart },
  entertainment: { icon: Tv },
}

const ALL_CATEGORIES = ['groceries', 'dining', 'transport', 'shopping', 'health', 'entertainment']

function getCategoryConfig(category) {
  return CATEGORY_CONFIG[category] || { icon: Tag }
}

function getStatus(spent, limit) {
  const pct = spent / limit
  if (pct >= 1) return 'over'
  if (pct >= 0.85) return 'warning'
  return 'good'
}

function formatWhole(amount) {
  return Math.abs(amount).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function formatDecimal(amount) {
  return Math.abs(amount).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

function Plan({ refreshKey }) {
  const [budgets, setBudgets] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)

  const [selectedBudget, setSelectedBudget] = useState(null)

  const [showAddBudget, setShowAddBudget] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [newLimit, setNewLimit] = useState('')
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState('')

  useEffect(() => { fetchData() }, [refreshKey])

  async function fetchData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user.id)

    const currentMonth = new Date().toISOString().slice(0, 7)
    const startOfMonth = `${currentMonth}-01`

    const [budgetsRes, txRes] = await Promise.all([
      supabase.from('budgets').select('*').eq('month', currentMonth).eq('user_id', user.id),
      supabase.from('transactions').select('*')
        .gte('date', startOfMonth).lt('amount', 0).eq('user_id', user.id)
        .order('date', { ascending: false })
    ])

    if (budgetsRes.data) setBudgets(budgetsRes.data)
    if (txRes.data) setTransactions(txRes.data)
    setLoading(false)
  }

  const spending = transactions.reduce((acc, t) => {
    const cat = t.category?.toLowerCase()
    if (!cat) return acc
    acc[cat] = (acc[cat] || 0) + Math.abs(t.amount)
    return acc
  }, {})

  const availableCategories = ALL_CATEGORIES.filter(cat => !budgets.find(b => b.category === cat))

  function openAddBudget() {
    setNewCategory('')
    setNewLimit('')
    setAddError('')
    setShowAddBudget(true)
  }

  async function handleAddBudget() {
    const parsed = parseFloat(newLimit)
    if (!newCategory) { setAddError('Select a category.'); return }
    if (!newLimit || isNaN(parsed) || parsed <= 0) { setAddError('Enter a valid amount.'); return }

    setAddSaving(true)
    setAddError('')
    const currentMonth = new Date().toISOString().slice(0, 7)
    const { error } = await supabase.from('budgets').insert({
      user_id: userId,
      category: newCategory,
      monthly_limit: parsed,
      month: currentMonth
    })
    if (error) {
      setAddError('Failed to save. Try again.')
    } else {
      setShowAddBudget(false)
      fetchData()
    }
    setAddSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-40">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    )
  }

  const selSpent  = selectedBudget ? (spending[selectedBudget.category] || 0) : 0
  const selStatus = selectedBudget ? getStatus(selSpent, selectedBudget.monthly_limit) : 'good'
  const selPct    = selectedBudget ? Math.min(selSpent / selectedBudget.monthly_limit, 1) : 0
  const selConfig = selectedBudget ? getCategoryConfig(selectedBudget.category) : null
  const SelIcon   = selConfig?.icon
  const selTxns   = selectedBudget
    ? transactions.filter(t => t.category?.toLowerCase() === selectedBudget.category)
    : []

  return (
    <div className="p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <p className="text-2xl font-bold text-black">Plan</p>
        {availableCategories.length > 0 && (
          <button
            onClick={openAddBudget}
            className="w-8 h-8 bg-black flex items-center justify-center"
          >
            <Plus size={16} className="text-white" />
          </button>
        )}
      </div>

      {/* Empty state */}
      {budgets.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-gray-400 mb-3">No budgets set yet.</p>
          <button onClick={openAddBudget} className="text-sm font-medium text-black underline underline-offset-2">
            Add your first budget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {budgets.map(budget => {
            const { icon: Icon } = getCategoryConfig(budget.category)
            const spent  = spending[budget.category] || 0
            const status = getStatus(spent, budget.monthly_limit)
            const pct    = Math.min(spent / budget.monthly_limit, 1)
            const rem    = budget.monthly_limit - spent

            return (
              <button
                key={budget.id}
                onClick={() => setSelectedBudget(budget)}
                className="bg-white border border-gray-100 p-4 text-left active:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 bg-gray-100 flex items-center justify-center mb-3">
                  <Icon size={16} className="text-black" />
                </div>
                <p className="text-sm font-medium text-black capitalize mb-1">{budget.category}</p>
                <p className="text-xs text-gray-400 mb-3">
                  ${formatWhole(spent)} / ${formatWhole(budget.monthly_limit)}
                </p>
                <div className="w-full bg-gray-100 h-px mb-2">
                  <div className="h-px bg-black" style={{ width: `${pct * 100}%` }} />
                </div>
                <p className={`text-xs ${status === 'over' ? 'text-black font-medium' : 'text-gray-400'}`}>
                  {status === 'over'
                    ? `Over by $${formatWhole(Math.abs(rem))}`
                    : `$${formatWhole(rem)} left`}
                </p>
              </button>
            )
          })}
        </div>
      )}

      {/* Category Detail Sheet */}
      {selectedBudget && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSelectedBudget(null)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white z-50 max-h-[85vh] flex flex-col border-t border-gray-200">
            <div className="flex-shrink-0 px-6 pt-5 pb-5 border-b border-gray-100">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 flex items-center justify-center">
                    <SelIcon size={16} className="text-black" />
                  </div>
                  <p className="text-base font-semibold capitalize">{selectedBudget.category}</p>
                </div>
                <button onClick={() => setSelectedBudget(null)} className="text-gray-400 p-1">
                  <X size={18} />
                </button>
              </div>

              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-2xl font-semibold">${formatWhole(selSpent)}</span>
                <span className="text-sm text-gray-400">spent of ${formatWhole(selectedBudget.monthly_limit)}</span>
                <span className="text-sm text-gray-400 ml-auto">
                  {selStatus === 'over'
                    ? <span className="text-black font-medium">over ${formatWhole(Math.abs(selectedBudget.monthly_limit - selSpent))}</span>
                    : `$${formatWhole(selectedBudget.monthly_limit - selSpent)} left`}
                </span>
              </div>

              <div className="w-full bg-gray-100 h-px">
                <div className="h-px bg-black" style={{ width: `${selPct * 100}%` }} />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-6 pt-5 pb-8">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-4">This month</p>
              {selTxns.length === 0 ? (
                <p className="text-sm text-gray-400 py-6">No transactions yet.</p>
              ) : (
                selTxns.map(txn => (
                  <div key={txn.id} className="flex justify-between items-center py-3 border-b border-gray-100">
                    <div>
                      <p className="text-sm text-black">{txn.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(txn.date)}</p>
                    </div>
                    <p className="text-sm text-black">-${formatDecimal(Math.abs(txn.amount))}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Add Budget Sheet */}
      {showAddBudget && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowAddBudget(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white z-50 px-6 pt-5 pb-8 border-t border-gray-200">
            <div className="flex items-center justify-between mb-7">
              <p className="text-base font-semibold">New budget</p>
              <button onClick={() => setShowAddBudget(false)} className="text-gray-400">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Category</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {availableCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setNewCategory(cat)}
                  className={`text-sm px-3 py-1.5 border transition-colors capitalize ${
                    newCategory === cat ? 'border-black bg-black text-white' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Monthly limit</p>
            <div className="flex items-center gap-2 border-b border-gray-200 pb-3 mb-7">
              <span className="text-xl text-gray-400">$</span>
              <input
                type="number"
                placeholder="0"
                value={newLimit}
                onChange={e => setNewLimit(e.target.value)}
                min="0"
                inputMode="decimal"
                className="text-xl flex-1 outline-none text-black"
              />
            </div>

            {addError && <p className="text-xs text-black mb-4">{addError}</p>}

            <button
              onClick={handleAddBudget}
              disabled={addSaving}
              className="w-full bg-black text-white text-sm font-medium py-4 disabled:opacity-40"
            >
              {addSaving ? 'Saving…' : 'Add budget'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default Plan
