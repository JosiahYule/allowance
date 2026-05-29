import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ShoppingCart, Utensils, Car, ShoppingBag, Heart, Tv, Plus, X, Tag, Trash2 } from 'lucide-react'
import { DEFAULT_CATEGORIES, fetchAllCategories } from '../lib/categories'
import MonthNav from '../components/MonthNav'

const CATEGORY_ICONS = {
  groceries:     ShoppingCart,
  dining:        Utensils,
  transport:     Car,
  shopping:      ShoppingBag,
  health:        Heart,
  entertainment: Tv,
}

function getCategoryIcon(category) {
  return CATEGORY_ICONS[category] || Tag
}

function getStatus(spent, limit) {
  if (limit <= 0) return 'good'
  const pct = spent / limit
  if (pct >= 1) return 'over'
  if (pct >= 0.85) return 'warning'
  return 'good'
}

function statusColors(status) {
  if (status === 'over') return { bar: 'bg-red-500', text: 'text-red-500', label: 'font-medium' }
  if (status === 'warning') return { bar: 'bg-amber-400', text: 'text-amber-500', label: '' }
  return { bar: 'bg-black', text: 'text-gray-400', label: '' }
}

function fmtWhole(n) {
  return Math.abs(n).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtDec(n) {
  return Math.abs(n).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

function getMonthRange(month) {
  const [y, m] = month.split('-').map(Number)
  const start = `${month}-01`
  const endY = m === 12 ? y + 1 : y
  const endM = m === 12 ? 1 : m + 1
  return { start, end: `${endY}-${String(endM).padStart(2, '0')}-01` }
}

/* eslint-disable react-hooks/static-components */
// getCategoryIcon returns an existing lucide component reference — not a dynamic component declaration
function CategoryIcon({ category, ...props }) {
  const Icon = getCategoryIcon(category)
  return <Icon {...props} />
}
/* eslint-enable react-hooks/static-components */

function Plan({ refreshKey }) {
  const [budgets, setBudgets] = useState([])
  const [transactions, setTransactions] = useState([])
  const [allCategories, setAllCategories] = useState(DEFAULT_CATEGORIES)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))

  const [selectedBudget, setSelectedBudget] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [showAddBudget, setShowAddBudget] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [newLimit, setNewLimit] = useState('')
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState('')

  // Goals state
  const [goals, setGoals] = useState([])
  const [goalsLoading, setGoalsLoading] = useState(true)
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [newGoalTitle, setNewGoalTitle] = useState('')
  const [newGoalTarget, setNewGoalTarget] = useState('')
  const [goalSaving, setGoalSaving] = useState(false)
  const [goalError, setGoalError] = useState('')
  const [addFundsAmount, setAddFundsAmount] = useState('')
  const [fundsSaving, setFundsSaving] = useState(false)
  const [deleteGoalConfirm, setDeleteGoalConfirm] = useState(false)

  useEffect(() => { fetchData() }, [refreshKey, month])

  async function fetchData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user.id)

    const { start, end } = getMonthRange(month)

    const [budgetsRes, txRes, allCats] = await Promise.all([
      supabase.from('budgets').select('*').eq('month', month).eq('user_id', user.id),
      supabase.from('transactions').select('*').gte('date', start).lt('date', end).lt('amount', 0).eq('user_id', user.id).order('date', { ascending: false }),
      fetchAllCategories(user.id),
    ])

    if (budgetsRes.data) setBudgets(budgetsRes.data)
    if (txRes.data) setTransactions(txRes.data)
    setAllCategories(allCats)
    setLoading(false)

    fetchGoals(user.id)
  }

  async function fetchGoals(uid) {
    setGoalsLoading(true)
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', uid)
        .order('created_at')
      if (!error) setGoals(data || [])
    } catch {
      // goals table not yet migrated — show empty state
    }
    setGoalsLoading(false)
  }

  const spending = transactions.reduce((acc, t) => {
    const cat = t.category?.toLowerCase()
    if (!cat) return acc
    acc[cat] = (acc[cat] || 0) + Math.abs(t.amount)
    return acc
  }, {})

  const availableCategories = allCategories.filter(cat => !budgets.find(b => b.category === cat))

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
    const { error } = await supabase.from('budgets').insert({
      user_id: userId,
      category: newCategory,
      monthly_limit: parsed,
      month,
    })
    if (error) {
      setAddError('Failed to save. Try again.')
    } else {
      setShowAddBudget(false)
      fetchData()
    }
    setAddSaving(false)
  }

  async function handleDeleteBudget() {
    if (!selectedBudget) return
    setDeleting(true)
    await supabase.from('budgets').delete().eq('id', selectedBudget.id)
    setSelectedBudget(null)
    setDeleteConfirm(false)
    setDeleting(false)
    fetchData()
  }

  // Goals helpers
  async function handleAddGoal() {
    if (!userId) return
    const parsed = parseFloat(newGoalTarget)
    if (!newGoalTitle.trim()) { setGoalError('Enter a title.'); return }
    if (!newGoalTarget || isNaN(parsed) || parsed <= 0) { setGoalError('Enter a target amount.'); return }

    setGoalSaving(true)
    setGoalError('')
    const { error } = await supabase.from('goals').insert({
      user_id: userId,
      title: newGoalTitle.trim(),
      target_amount: parsed,
      current_amount: 0,
    })
    if (error) {
      setGoalError('Failed to save. Run the migration first.')
    } else {
      setNewGoalTitle('')
      setNewGoalTarget('')
      setShowAddGoal(false)
      fetchGoals(userId)
    }
    setGoalSaving(false)
  }

  async function handleAddFunds() {
    const parsed = parseFloat(addFundsAmount)
    if (!addFundsAmount || isNaN(parsed) || parsed <= 0) return
    setFundsSaving(true)
    const newAmount = (selectedGoal.current_amount || 0) + parsed
    const { error } = await supabase
      .from('goals')
      .update({ current_amount: Math.min(newAmount, selectedGoal.target_amount) })
      .eq('id', selectedGoal.id)
    if (!error) {
      setAddFundsAmount('')
      setSelectedGoal(null)
      fetchGoals(userId)
    }
    setFundsSaving(false)
  }

  async function handleDeleteGoal() {
    if (!selectedGoal) return
    await supabase.from('goals').delete().eq('id', selectedGoal.id)
    setSelectedGoal(null)
    setDeleteGoalConfirm(false)
    fetchGoals(userId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-40">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    )
  }

  const selSpent   = selectedBudget ? (spending[selectedBudget.category] || 0) : 0
  const selStatus  = selectedBudget ? getStatus(selSpent, selectedBudget.monthly_limit) : 'good'
  const selPct     = selectedBudget ? Math.min(selSpent / selectedBudget.monthly_limit, 1) : 0
  const selTxns    = selectedBudget
    ? transactions.filter(t => t.category?.toLowerCase() === selectedBudget.category)
    : []

  return (
    <div className="p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-2xl font-semibold text-black">Plan</p>
        {availableCategories.length > 0 && (
          <button onClick={openAddBudget} className="w-8 h-8 bg-black flex items-center justify-center rounded">
            <Plus size={16} className="text-white" />
          </button>
        )}
      </div>

      {/* Month navigation */}
      <MonthNav month={month} onChange={m => { setMonth(m); setBudgets([]); setTransactions([]) }} />

      {/* Budget grid or empty state */}
      {budgets.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-xl">📊</span>
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">No budgets for this month</p>
          <p className="text-xs text-gray-400 mb-4">Set limits to track your spending by category.</p>
          <button onClick={openAddBudget} className="text-sm font-medium text-black underline underline-offset-2">
            Add your first budget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-8">
          {budgets.map(budget => {
            const Icon = getCategoryIcon(budget.category)
            const spent  = spending[budget.category] || 0
            const status = getStatus(spent, budget.monthly_limit)
            const pct    = Math.min(spent / budget.monthly_limit, 1)
            const rem    = budget.monthly_limit - spent
            const colors = statusColors(status)

            return (
              <button
                key={budget.id}
                onClick={() => { setSelectedBudget(budget); setDeleteConfirm(false) }}
                className="bg-white border border-gray-100 rounded-xl p-4 text-left active:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center mb-3">
                  <Icon size={16} className="text-black" />
                </div>
                <p className="text-sm font-medium text-black capitalize mb-1">{budget.category}</p>
                <p className="text-xs text-gray-400 mb-3">
                  ${fmtWhole(spent)} / ${fmtWhole(budget.monthly_limit)}
                </p>
                <div className="w-full bg-gray-100 h-1.5 rounded-full mb-2 overflow-hidden">
                  <div className={`h-1.5 rounded-full ${colors.bar}`} style={{ width: `${pct * 100}%` }} />
                </div>
                <p className={`text-xs ${colors.text} ${colors.label}`}>
                  {status === 'over'
                    ? `Over by $${fmtWhole(Math.abs(rem))}`
                    : `$${fmtWhole(rem)} left`}
                </p>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Goals section ── */}
      <div className="border-t border-gray-100 pt-6">
        <div className="flex justify-between items-center mb-5">
          <p className="text-base font-semibold text-black">Goals</p>
          <button
            onClick={() => { setShowAddGoal(true); setGoalError('') }}
            className="w-7 h-7 bg-black flex items-center justify-center rounded"
          >
            <Plus size={14} className="text-white" />
          </button>
        </div>

        {goalsLoading ? (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400 mb-3">No savings goals yet.</p>
            <button
              onClick={() => { setShowAddGoal(true); setGoalError('') }}
              className="text-sm font-medium text-black underline underline-offset-2"
            >
              Create your first goal
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map(goal => {
              const pct = goal.target_amount > 0
                ? Math.min(goal.current_amount / goal.target_amount, 1)
                : 0
              const rem = goal.target_amount - goal.current_amount

              return (
                <button
                  key={goal.id}
                  onClick={() => { setSelectedGoal(goal); setAddFundsAmount(''); setDeleteGoalConfirm(false) }}
                  className="w-full bg-white border border-gray-100 rounded-xl p-4 text-left active:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-baseline mb-2">
                    <p className="text-sm font-medium text-black">{goal.title}</p>
                    <p className="text-xs text-gray-400">{Math.round(pct * 100)}%</p>
                  </div>
                  <div className="w-full bg-gray-100 h-1.5 rounded-full mb-2 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${pct >= 1 ? 'bg-green-500' : 'bg-black'}`}
                      style={{ width: `${pct * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    ${fmtWhole(goal.current_amount)} saved of ${fmtWhole(goal.target_amount)}
                    {rem > 0 ? ` · $${fmtWhole(rem)} to go` : ' · Complete!'}
                  </p>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Category detail sheet ── */}
      {selectedBudget && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSelectedBudget(null)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white z-50 max-h-[85vh] flex flex-col border-t border-gray-200">
            <div className="flex-shrink-0 px-6 pt-5 pb-5 border-b border-gray-100">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                    {selectedBudget && <CategoryIcon category={selectedBudget.category} size={16} className="text-black" />}
                  </div>
                  <p className="text-base font-semibold capitalize">{selectedBudget.category}</p>
                </div>
                <button onClick={() => setSelectedBudget(null)} className="text-gray-400 p-1">
                  <X size={18} />
                </button>
              </div>

              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-2xl font-semibold">${fmtWhole(selSpent)}</span>
                <span className="text-sm text-gray-400">spent of ${fmtWhole(selectedBudget.monthly_limit)}</span>
                <span className={`text-sm ml-auto ${statusColors(selStatus).text} ${statusColors(selStatus).label}`}>
                  {selStatus === 'over'
                    ? `over $${fmtWhole(Math.abs(selectedBudget.monthly_limit - selSpent))}`
                    : `$${fmtWhole(selectedBudget.monthly_limit - selSpent)} left`}
                </span>
              </div>

              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                <div className={`h-1.5 rounded-full ${statusColors(selStatus).bar}`} style={{ width: `${selPct * 100}%` }} />
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
                      <p className="text-xs text-gray-400 mt-0.5">{fmtDate(txn.date)}</p>
                    </div>
                    <p className="text-sm text-black">-${fmtDec(Math.abs(txn.amount))}</p>
                  </div>
                ))
              )}

              {/* Delete budget */}
              <div className="mt-8">
                {!deleteConfirm ? (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="flex items-center gap-2 text-sm text-gray-400"
                  >
                    <Trash2 size={14} /> Remove this budget
                  </button>
                ) : (
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-500 flex-1">Remove {selectedBudget.category} budget?</p>
                    <button
                      onClick={handleDeleteBudget}
                      disabled={deleting}
                      className="text-sm font-medium text-red-500 disabled:opacity-50"
                    >
                      {deleting ? '…' : 'Remove'}
                    </button>
                    <button onClick={() => setDeleteConfirm(false)} className="text-sm text-gray-400">Cancel</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Add Budget sheet ── */}
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
                onKeyDown={e => e.key === 'Enter' && handleAddBudget()}
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

      {/* ── Add Goal sheet ── */}
      {showAddGoal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowAddGoal(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white z-50 px-6 pt-5 pb-8 border-t border-gray-200">
            <div className="flex items-center justify-between mb-7">
              <p className="text-base font-semibold">New goal</p>
              <button onClick={() => setShowAddGoal(false)} className="text-gray-400"><X size={18} /></button>
            </div>

            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">What are you saving for?</p>
            <input
              type="text"
              placeholder="e.g. Emergency fund"
              value={newGoalTitle}
              onChange={e => { setNewGoalTitle(e.target.value); setGoalError('') }}
              autoFocus
              className="w-full text-base outline-none border-b border-gray-200 pb-2 mb-6"
            />

            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Target amount</p>
            <div className="flex items-center gap-2 border-b border-gray-200 pb-3 mb-7">
              <span className="text-xl text-gray-400">$</span>
              <input
                type="number"
                placeholder="0"
                value={newGoalTarget}
                onChange={e => { setNewGoalTarget(e.target.value); setGoalError('') }}
                onKeyDown={e => e.key === 'Enter' && handleAddGoal()}
                min="0"
                inputMode="decimal"
                className="text-xl flex-1 outline-none text-black"
              />
            </div>

            {goalError && <p className="text-xs text-red-500 mb-4">{goalError}</p>}

            <button
              onClick={handleAddGoal}
              disabled={goalSaving}
              className="w-full bg-black text-white text-sm font-medium py-4 disabled:opacity-40"
            >
              {goalSaving ? 'Saving…' : 'Create goal'}
            </button>
          </div>
        </>
      )}

      {/* ── Goal detail / Add funds sheet ── */}
      {selectedGoal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSelectedGoal(null)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white z-50 px-6 pt-5 pb-8 border-t border-gray-200">
            <div className="flex items-center justify-between mb-5">
              <p className="text-base font-semibold">{selectedGoal.title}</p>
              <button onClick={() => setSelectedGoal(null)}><X size={18} className="text-gray-400" /></button>
            </div>

            {(() => {
              const pct = selectedGoal.target_amount > 0
                ? Math.min(selectedGoal.current_amount / selectedGoal.target_amount, 1)
                : 0
              return (
                <>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-2xl font-semibold">${fmtWhole(selectedGoal.current_amount)}</span>
                    <span className="text-sm text-gray-400">saved of ${fmtWhole(selectedGoal.target_amount)}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mb-6">
                    <div
                      className={`h-1.5 rounded-full ${pct >= 1 ? 'bg-green-500' : 'bg-black'}`}
                      style={{ width: `${pct * 100}%` }}
                    />
                  </div>
                </>
              )
            })()}

            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Add funds</p>
            <div className="flex items-center gap-2 border-b border-gray-200 pb-3 mb-6">
              <span className="text-xl text-gray-400">$</span>
              <input
                type="number"
                placeholder="0"
                value={addFundsAmount}
                onChange={e => setAddFundsAmount(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddFunds()}
                min="0"
                inputMode="decimal"
                autoFocus
                className="text-xl flex-1 outline-none text-black"
              />
            </div>

            <button
              onClick={handleAddFunds}
              disabled={fundsSaving || !addFundsAmount}
              className="w-full bg-black text-white text-sm font-medium py-4 mb-4 disabled:opacity-40"
            >
              {fundsSaving ? 'Saving…' : 'Add funds'}
            </button>

            {!deleteGoalConfirm ? (
              <button
                onClick={() => setDeleteGoalConfirm(true)}
                className="flex items-center gap-2 text-sm text-gray-400 mx-auto"
              >
                <Trash2 size={14} /> Remove this goal
              </button>
            ) : (
              <div className="flex items-center gap-4 justify-center">
                <p className="text-sm text-gray-500">Remove goal?</p>
                <button onClick={handleDeleteGoal} className="text-sm font-medium text-red-500">Remove</button>
                <button onClick={() => setDeleteGoalConfirm(false)} className="text-sm text-gray-400">Cancel</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default Plan
