import { useState, useEffect } from 'react'
import { supabase, getCurrentUser } from '../lib/supabase'
import { Plus, X } from 'lucide-react'
import { DEFAULT_CATEGORIES, fetchAllCategories, fetchCategoryIconMap } from '../lib/categories'
import { CategoryIcon } from '../lib/categoryIcons'
import MonthNav from '../components/MonthNav'
import SpendingInsights from '../components/SpendingInsights'
import { getMonthRange, currentMonth, todayStr, addMonths, monthLabel } from '../lib/dates'

function fmt(n) {
  return Math.abs(n).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtDec(n) {
  return Math.abs(n).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

function Plan({ refreshKey, onRefresh }) {
  const [budgets, setBudgets] = useState([])
  const [transactions, setTransactions] = useState([])
  const [allCategories, setAllCategories] = useState(DEFAULT_CATEGORIES)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  const [month, setMonth] = useState(currentMonth())
  const [copying, setCopying] = useState(false)

  const [selectedBudget, setSelectedBudget] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [showAddBudget, setShowAddBudget] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [newLimit, setNewLimit] = useState('')
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState('')

  const [customIcons, setCustomIcons] = useState({})

  // Edit budget limit state
  const [editingLimit, setEditingLimit] = useState(false)
  const [editLimitValue, setEditLimitValue] = useState('')
  const [limitSaving, setLimitSaving] = useState(false)
  const [limitError, setLimitError] = useState('')

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData() }, [refreshKey, month])

  async function fetchData() {
    setLoading(true)
    try {
      const user = await getCurrentUser()
      setUserId(user.id)
      const { start, end } = getMonthRange(month)
      const [budgetsRes, txRes, allCats, iconMap] = await Promise.all([
        supabase.from('budgets').select('*').eq('month', month).eq('user_id', user.id),
        supabase.from('transactions').select('*').gte('date', start).lt('date', end).lt('amount', 0).eq('user_id', user.id).order('date', { ascending: false }),
        fetchAllCategories(user.id),
        fetchCategoryIconMap(user.id),
      ])
      if (budgetsRes.data) setBudgets(budgetsRes.data)
      if (txRes.data) setTransactions(txRes.data)
      setAllCategories(allCats)
      setCustomIcons(iconMap)
      fetchGoals(user.id)
    } finally {
      setLoading(false)
    }
  }

  async function fetchGoals(uid) {
    setGoalsLoading(true)
    try {
      const { data, error } = await supabase.from('goals').select('*').eq('user_id', uid).order('created_at')
      if (!error) setGoals(data || [])
    } catch { /* goals table not yet migrated */ }
    setGoalsLoading(false)
  }

  const spending = transactions.reduce((acc, t) => {
    const cat = t.category?.toLowerCase()
    if (!cat) return acc
    acc[cat] = (acc[cat] || 0) + Math.abs(t.amount)
    return acc
  }, {})

  const availableCategories = allCategories.filter(cat => !budgets.find(b => b.category === cat))

  async function handleAddBudget() {
    const parsed = parseFloat(newLimit)
    if (!newCategory) { setAddError('Select a category.'); return }
    if (!newLimit || isNaN(parsed) || parsed <= 0) { setAddError('Enter a valid amount.'); return }
    setAddSaving(true)
    setAddError('')
    const { error } = await supabase.from('budgets').insert({ user_id: userId, category: newCategory, monthly_limit: parsed, month })
    if (error) setAddError('Failed to save. Try again.')
    else { setShowAddBudget(false); setNewCategory(''); setNewLimit(''); fetchData() }
    setAddSaving(false)
  }

  async function handleDeleteBudget() {
    if (!selectedBudget) return
    setDeleting(true)
    const { error } = await supabase.from('budgets').delete().eq('id', selectedBudget.id).eq('user_id', userId)
    if (!error) {
      setSelectedBudget(null)
      setDeleteConfirm(false)
      fetchData()
    }
    setDeleting(false)
  }

  async function handleEditLimit() {
    const parsed = parseFloat(editLimitValue)
    if (!editLimitValue || isNaN(parsed) || parsed <= 0) { setLimitError('Enter a valid amount.'); return }
    setLimitSaving(true)
    setLimitError('')
    const { error } = await supabase
      .from('budgets')
      .update({ monthly_limit: parsed })
      .eq('id', selectedBudget.id)
      .eq('user_id', userId)
    if (error) {
      setLimitError('Failed to save. Try again.')
    } else {
      setEditingLimit(false)
      setEditLimitValue('')
      // Optimistically update selectedBudget so detail sheet reflects new limit
      setSelectedBudget(prev => ({ ...prev, monthly_limit: parsed }))
      fetchData()
    }
    setLimitSaving(false)
  }

  async function handleAddGoal() {
    if (!userId) return
    const parsed = parseFloat(newGoalTarget)
    if (!newGoalTitle.trim()) { setGoalError('Enter a title.'); return }
    if (!newGoalTarget || isNaN(parsed) || parsed <= 0) { setGoalError('Enter a target amount.'); return }
    setGoalSaving(true)
    setGoalError('')
    const { error } = await supabase.from('goals').insert({ user_id: userId, title: newGoalTitle.trim(), target_amount: parsed, current_amount: 0 })
    if (error) setGoalError('Failed to save. Run the migration first.')
    else { setNewGoalTitle(''); setNewGoalTarget(''); setShowAddGoal(false); fetchGoals(userId) }
    setGoalSaving(false)
  }

  async function handleAddFunds() {
    const parsed = parseFloat(addFundsAmount)
    if (!addFundsAmount || isNaN(parsed) || parsed <= 0) return
    setFundsSaving(true)
    const newAmount = Math.min((selectedGoal.current_amount || 0) + parsed, selectedGoal.target_amount)
    const contributed = newAmount - (selectedGoal.current_amount || 0) // clamped to the target

    // Record the contribution as a real outflow so saving reduces what's safe to
    // spend. If the goal_id column isn't migrated yet this insert no-ops and the
    // goal still updates — graceful degradation.
    if (contributed > 0) {
      await supabase.from('transactions').insert({
        user_id: userId,
        description: `Savings · ${selectedGoal.title}`,
        amount: -contributed,
        category: 'savings',
        date: todayStr(),
        goal_id: selectedGoal.id,
      })
    }

    const { error } = await supabase.from('goals').update({ current_amount: newAmount }).eq('id', selectedGoal.id).eq('user_id', userId)
    if (!error) {
      setAddFundsAmount('')
      setSelectedGoal(null)
      fetchGoals(userId)
      fetchData()
      onRefresh?.()
    }
    setFundsSaving(false)
  }

  // Carry a prior month's budget limits forward so budgets stop vanishing each
  // month. Copies the most recent month that has any budgets into this one.
  async function handleCopyBudgets() {
    setCopying(true)
    let cursor = month
    for (let i = 0; i < 12; i++) {
      cursor = addMonths(cursor, -1)
      const { data } = await supabase.from('budgets').select('category, monthly_limit').eq('user_id', userId).eq('month', cursor)
      if (data?.length) {
        await supabase.from('budgets').insert(
          data.map(b => ({ user_id: userId, category: b.category, monthly_limit: b.monthly_limit, month }))
        )
        break
      }
    }
    await fetchData()
    setCopying(false)
  }

  async function handleDeleteGoal() {
    if (!selectedGoal) return
    await supabase.from('goals').delete().eq('id', selectedGoal.id).eq('user_id', userId)
    setSelectedGoal(null)
    setDeleteGoalConfirm(false)
    fetchGoals(userId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-40">
        <div className="w-6 h-6 border-2 border-line border-t-ink rounded-full animate-spin" />
      </div>
    )
  }

  const selSpent  = selectedBudget ? (spending[selectedBudget.category] || 0) : 0
  const selPct    = selectedBudget ? Math.min(selSpent / selectedBudget.monthly_limit, 1) : 0
  const selOver   = selectedBudget ? selSpent > selectedBudget.monthly_limit : false
  const selTxns   = selectedBudget ? transactions.filter(t => t.category?.toLowerCase() === selectedBudget.category) : []

  return (
    <div className="px-5 pt-12 pb-8 max-w-md mx-auto">

      {/* Budgets header */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-2xl font-semibold text-ink tracking-tight">Plan</p>
        {availableCategories.length > 0 && (
          <button
            onClick={() => { setNewCategory(''); setNewLimit(''); setAddError(''); setShowAddBudget(true) }}
            className="w-8 h-8 bg-ink flex items-center justify-center rounded-full active:scale-95 transition-transform"
          >
            <Plus size={16} className="text-paper" />
          </button>
        )}
      </div>

      <MonthNav month={month} onChange={m => { setMonth(m); setBudgets([]); setTransactions([]) }} />

      {/* Spending breakdown */}
      <SpendingInsights transactions={transactions} customIcons={customIcons} />

      {/* Budget list */}
      <p className="eyebrow mb-3">Budgets</p>
      {budgets.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-muted mb-4">No budgets for {monthLabel(month)}.</p>
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={handleCopyBudgets}
              disabled={copying}
              className="text-sm font-medium px-5 py-2.5 rounded-full bg-fill text-ink active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {copying ? 'Copying…' : 'Carry forward last month’s budgets'}
            </button>
            <button
              onClick={() => { setNewCategory(''); setNewLimit(''); setAddError(''); setShowAddBudget(true) }}
              className="text-sm font-medium text-ink underline underline-offset-2"
            >
              Add one from scratch
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-8">
          {budgets.map(budget => {
            const spent = spending[budget.category] || 0
            const pct   = Math.min(spent / budget.monthly_limit, 1)
            const over  = spent > budget.monthly_limit
            const rem   = budget.monthly_limit - spent

            return (
              <button
                key={budget.id}
                onClick={() => { setSelectedBudget(budget); setDeleteConfirm(false); setEditingLimit(false); setLimitError('') }}
                className="w-full flex items-center gap-4 py-4 border-b border-line text-left"
              >
                <div className="w-9 h-9 bg-fill rounded-2xl flex items-center justify-center flex-shrink-0">
                  <CategoryIcon category={budget.category} size={15} className="text-ink-soft" customIcons={customIcons} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1.5">
                    <p className="text-sm font-medium text-ink capitalize">{budget.category}</p>
                    <p className={`text-xs ${over ? 'text-danger font-medium' : 'text-muted'}`}>
                      {over ? `Over $${fmt(Math.abs(rem))}` : `$${fmt(rem)} left`}
                    </p>
                  </div>
                  <div className="w-full h-1 bg-fill rounded-full overflow-hidden">
                    <div className="h-1 bg-ink rounded-full" style={{ width: `${pct * 100}%` }} />
                  </div>
                  <p className="text-xs text-muted mt-1">${fmt(spent)} of ${fmt(budget.monthly_limit)}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Goals */}
      <div className="border-t border-line pt-6">
        <div className="flex justify-between items-center mb-5">
          <p className="text-base font-semibold text-ink">Goals</p>
          <button
            onClick={() => { setShowAddGoal(true); setGoalError('') }}
            className="w-7 h-7 bg-ink flex items-center justify-center rounded-full active:scale-95 transition-transform"
          >
            <Plus size={14} className="text-paper" />
          </button>
        </div>

        {goalsLoading ? (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-2 border-line border-t-ink rounded-full animate-spin" />
          </div>
        ) : goals.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted mb-3">No goals yet.</p>
            <button
              onClick={() => { setShowAddGoal(true); setGoalError('') }}
              className="text-sm font-medium text-ink underline underline-offset-2"
            >
              Create your first goal
            </button>
          </div>
        ) : (
          <div>
            {goals.map(goal => {
              const pct = goal.target_amount > 0 ? Math.min(goal.current_amount / goal.target_amount, 1) : 0
              const done = goal.current_amount >= goal.target_amount

              return (
                <button
                  key={goal.id}
                  onClick={() => { setSelectedGoal(goal); setAddFundsAmount(''); setDeleteGoalConfirm(false) }}
                  className="w-full text-left py-4 border-b border-line"
                >
                  <div className="flex justify-between items-baseline mb-1.5">
                    <p className="text-sm font-medium text-ink">{goal.title}</p>
                    <p className="text-xs text-muted">{Math.round(pct * 100)}%</p>
                  </div>
                  <div className="w-full h-1 bg-fill rounded-full overflow-hidden mb-1.5">
                    <div className="h-1 bg-ink rounded-full" style={{ width: `${pct * 100}%` }} />
                  </div>
                  <p className="text-xs text-muted">
                    ${fmt(goal.current_amount)} of ${fmt(goal.target_amount)}
                    {done ? ' · Complete' : ` · $${fmt(goal.target_amount - goal.current_amount)} to go`}
                  </p>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Budget detail sheet */}
      {selectedBudget && (
        <>
          <div className="fixed inset-0 bg-ink/30 z-40" onClick={() => { setSelectedBudget(null); setEditingLimit(false); setLimitError('') }} />
          <div className="sheet fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] flex flex-col">
            <div className="flex-shrink-0 px-6 pt-5 pb-5 border-b border-line">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-fill rounded-2xl flex items-center justify-center">
                    <CategoryIcon category={selectedBudget.category} size={15} className="text-ink-soft" customIcons={customIcons} />
                  </div>
                  <p className="text-base font-semibold capitalize">{selectedBudget.category}</p>
                </div>
                <button onClick={() => { setSelectedBudget(null); setEditingLimit(false); setLimitError('') }}>
                  <X size={18} className="text-muted" />
                </button>
              </div>

              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-2xl font-bold">${fmt(selSpent)}</span>
                {!editingLimit ? (
                  <>
                    <span className="text-sm text-muted">of ${fmt(selectedBudget.monthly_limit)}</span>
                    <button
                      onClick={() => { setEditingLimit(true); setEditLimitValue(String(selectedBudget.monthly_limit)); setLimitError('') }}
                      className="text-xs text-muted ml-1 underline underline-offset-2"
                    >
                      Edit limit
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 flex-1 ml-1">
                    <span className="text-sm text-muted">of $</span>
                    <input
                      type="number"
                      value={editLimitValue}
                      onChange={e => { setEditLimitValue(e.target.value); setLimitError('') }}
                      onKeyDown={e => e.key === 'Enter' && handleEditLimit()}
                      min="0"
                      inputMode="decimal"
                      autoFocus
                      className="w-24 text-sm border-b border-line outline-none pb-0.5 bg-transparent tabular-nums focus:border-ink transition-colors"
                    />
                    <button onClick={handleEditLimit} disabled={limitSaving} className="text-xs font-medium text-ink disabled:opacity-50">
                      {limitSaving ? '...' : 'Save'}
                    </button>
                    <button onClick={() => { setEditingLimit(false); setLimitError('') }} className="text-xs text-muted">Cancel</button>
                  </div>
                )}
                {!editingLimit && (
                  <span className={`text-sm ml-auto ${selOver ? 'text-danger font-medium' : 'text-muted'}`}>
                    {selOver
                      ? `Over $${fmt(Math.abs(selectedBudget.monthly_limit - selSpent))}`
                      : `$${fmt(selectedBudget.monthly_limit - selSpent)} left`}
                  </span>
                )}
              </div>
              {limitError && <p className="text-xs text-danger mb-2">{limitError}</p>}
              <div className="w-full bg-fill h-1 rounded-full overflow-hidden">
                <div className="h-1 bg-ink rounded-full" style={{ width: `${selPct * 100}%` }} />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-6 pt-5 pb-8">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Transactions</p>
              {selTxns.length === 0 ? (
                <p className="text-sm text-muted py-4">No transactions yet.</p>
              ) : selTxns.map(txn => (
                <div key={txn.id} className="flex justify-between items-center py-3 border-b border-line">
                  <div>
                    <p className="text-sm font-medium text-ink">{txn.description}</p>
                    <p className="text-xs text-muted mt-0.5">{fmtDate(txn.date)}</p>
                  </div>
                  <p className="text-sm text-ink">-${fmtDec(Math.abs(txn.amount))}</p>
                </div>
              ))}

              <div className="mt-8">
                {!deleteConfirm ? (
                  <button onClick={() => setDeleteConfirm(true)} className="text-sm text-muted">
                    Remove this budget
                  </button>
                ) : (
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-ink-soft flex-1">Remove {selectedBudget.category}?</p>
                    <button onClick={handleDeleteBudget} disabled={deleting} className="text-sm font-medium text-ink disabled:opacity-50">
                      {deleting ? '...' : 'Remove'}
                    </button>
                    <button onClick={() => setDeleteConfirm(false)} className="text-sm text-muted">Cancel</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add budget sheet */}
      {showAddBudget && (
        <>
          <div className="fixed inset-0 bg-ink/30 z-40" onClick={() => setShowAddBudget(false)} />
          <div className="sheet fixed bottom-0 left-0 right-0 z-50 px-6 pt-6 pb-9">
            <div className="flex items-center justify-between mb-7">
              <p className="text-base font-semibold">New budget</p>
              <button onClick={() => setShowAddBudget(false)}>
                <X size={18} className="text-muted" />
              </button>
            </div>

            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Category</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {availableCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setNewCategory(cat)}
                  className={`text-sm px-3 py-1.5 rounded-full transition-colors capitalize ${
                    newCategory === cat ? 'bg-ink text-paper' : 'bg-fill text-ink-soft'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Monthly limit</p>
            <div className="flex items-center gap-2 border-b border-line pb-3 mb-7">
              <span className="text-xl text-muted">$</span>
              <input
                type="number"
                placeholder="0"
                value={newLimit}
                onChange={e => setNewLimit(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddBudget()}
                min="0"
                inputMode="decimal"
                className="text-xl flex-1 outline-none text-ink"
                autoFocus
              />
            </div>

            {addError && <p className="text-xs text-danger mb-4">{addError}</p>}
            <button
              onClick={handleAddBudget}
              disabled={addSaving}
              className="btn-primary w-full text-sm py-4"
            >
              {addSaving ? 'Saving…' : 'Add budget'}
            </button>
          </div>
        </>
      )}

      {/* Add goal sheet */}
      {showAddGoal && (
        <>
          <div className="fixed inset-0 bg-ink/30 z-40" onClick={() => setShowAddGoal(false)} />
          <div className="sheet fixed bottom-0 left-0 right-0 z-50 px-6 pt-6 pb-9">
            <div className="flex items-center justify-between mb-7">
              <p className="text-base font-semibold">New goal</p>
              <button onClick={() => setShowAddGoal(false)}><X size={18} className="text-muted" /></button>
            </div>

            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">What are you saving for?</p>
            <input
              type="text"
              placeholder="e.g. Emergency fund"
              value={newGoalTitle}
              onChange={e => { setNewGoalTitle(e.target.value); setGoalError('') }}
              autoFocus
              className="w-full text-base outline-none border-b border-line pb-2 mb-6"
            />

            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Target amount</p>
            <div className="flex items-center gap-2 border-b border-line pb-3 mb-7">
              <span className="text-xl text-muted">$</span>
              <input
                type="number"
                placeholder="0"
                value={newGoalTarget}
                onChange={e => { setNewGoalTarget(e.target.value); setGoalError('') }}
                onKeyDown={e => e.key === 'Enter' && handleAddGoal()}
                min="0"
                inputMode="decimal"
                className="text-xl flex-1 outline-none text-ink"
              />
            </div>

            {goalError && <p className="text-xs text-danger mb-4">{goalError}</p>}
            <button onClick={handleAddGoal} disabled={goalSaving} className="btn-primary w-full text-sm py-4">
              {goalSaving ? 'Saving…' : 'Create goal'}
            </button>
          </div>
        </>
      )}

      {/* Goal detail sheet */}
      {selectedGoal && (
        <>
          <div className="fixed inset-0 bg-ink/30 z-40" onClick={() => setSelectedGoal(null)} />
          <div className="sheet fixed bottom-0 left-0 right-0 z-50 px-6 pt-6 pb-9">
            <div className="flex items-center justify-between mb-5">
              <p className="text-base font-semibold">{selectedGoal.title}</p>
              <button onClick={() => setSelectedGoal(null)}><X size={18} className="text-muted" /></button>
            </div>

            {(() => {
              const pct = selectedGoal.target_amount > 0 ? Math.min(selectedGoal.current_amount / selectedGoal.target_amount, 1) : 0
              return (
                <>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-2xl font-bold tabular-nums">${fmt(selectedGoal.current_amount)}</span>
                    <span className="text-sm text-muted">of ${fmt(selectedGoal.target_amount)}</span>
                  </div>
                  <div className="w-full bg-fill h-1 rounded-full overflow-hidden mb-6">
                    <div className="h-1 bg-ink rounded-full" style={{ width: `${pct * 100}%` }} />
                  </div>
                </>
              )
            })()}

            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Add funds</p>
            <div className="flex items-center gap-2 border-b border-line pb-3 mb-6">
              <span className="text-xl text-muted">$</span>
              <input
                type="number"
                placeholder="0"
                value={addFundsAmount}
                onChange={e => setAddFundsAmount(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddFunds()}
                min="0"
                inputMode="decimal"
                autoFocus
                className="text-xl flex-1 outline-none text-ink"
              />
            </div>

            <button
              onClick={handleAddFunds}
              disabled={fundsSaving || !addFundsAmount}
              className="btn-primary w-full text-sm py-4 mb-5"
            >
              {fundsSaving ? 'Saving…' : 'Add funds'}
            </button>

            {!deleteGoalConfirm ? (
              <button onClick={() => setDeleteGoalConfirm(true)} className="w-full text-center text-sm text-muted">
                Remove this goal
              </button>
            ) : (
              <div className="flex items-center gap-4 justify-center">
                <p className="text-sm text-ink-soft">Remove goal?</p>
                <button onClick={handleDeleteGoal} className="text-sm font-medium text-ink">Remove</button>
                <button onClick={() => setDeleteGoalConfirm(false)} className="text-sm text-muted">Cancel</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default Plan
