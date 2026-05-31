import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase, getCurrentUser } from '../lib/supabase'
import { Search, X, Repeat } from 'lucide-react'
import MonthNav from '../components/MonthNav'
import { DEFAULT_CATEGORIES, fetchAllCategories, fetchCategoryIconMap } from '../lib/categories'
import { CategoryIcon } from '../lib/categoryIcons'
import { getMonthRange } from '../lib/dates'

function Transactions({ refreshKey, onRefresh }) {
  const [all, setAll] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)
  const [customIcons, setCustomIcons] = useState({})

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const [expandedId, setExpandedId] = useState(null)
  const [editState, setEditState] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    const user = await getCurrentUser()
    const { start, end } = getMonthRange(month)
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', start)
      .lt('date', end)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) setError('Failed to load transactions.')
    else { setAll(data); setError('') }
    setLoading(false)
  }, [month])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchTransactions() }, [refreshKey, fetchTransactions])

  useEffect(() => {
    getCurrentUser().then(user => {
      if (user) {
        fetchAllCategories(user.id).then(setCategories)
        fetchCategoryIconMap(user.id).then(setCustomIcons)
      }
    })
  }, [])

  const filtered = useMemo(() => all.filter(t => {
    if (search && !t.description?.toLowerCase().includes(search.toLowerCase())) return false
    if (typeFilter === 'expenses' && t.amount >= 0) return false
    if (typeFilter === 'income' && t.amount < 0) return false
    return true
  }), [all, search, typeFilter])

  const grouped = useMemo(() => filtered.reduce((g, t) => {
    if (!g[t.date]) g[t.date] = []
    g[t.date].push(t)
    return g
  }, {}), [filtered])

  const fmt = (amount) => {
    const s = Math.abs(amount).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return (amount < 0 ? '−' : '+') + '$' + s
  }

  const formatDateLabel = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    const today = new Date()
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
    const same = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
    if (same(date, today)) return 'Today'
    if (same(date, yesterday)) return 'Yesterday'
    return date.toLocaleDateString('en-CA', {
      month: 'short', day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    })
  }

  function toggleExpand(id) {
    setExpandedId(prev => prev === id ? null : id)
    setEditState(null)
    setDeleteConfirmId(null)
    setActionError('')
  }

  function startEdit(txn) {
    setActionError('')
    setEditState({
      id: txn.id,
      description: txn.description || '',
      amount: String(Math.abs(txn.amount)),
      category: txn.category || '',
      date: txn.date,
      isExpense: txn.amount < 0,
    })
    setDeleteConfirmId(null)
  }

  async function saveEdit() {
    const parsed = parseFloat(editState.amount)
    if (!editState.amount || isNaN(parsed) || parsed <= 0) return
    setActionLoading(true)
    setActionError('')
    try {
      const user = await getCurrentUser()
      const { error, data } = await supabase
        .from('transactions')
        .update({
          description: editState.description || editState.category || (editState.isExpense ? 'Expense' : 'Income'),
          amount: editState.isExpense ? -parsed : parsed,
          category: editState.isExpense ? (editState.category || null) : null,
          date: editState.date,
        })
        .eq('id', editState.id)
        .eq('user_id', user.id)
        .select()
      if (!error && data?.length > 0) {
        setExpandedId(null)
        setEditState(null)
        await fetchTransactions()
        onRefresh?.()
      } else {
        setActionError('Could not save. Try again.')
      }
    } finally {
      setActionLoading(false)
    }
  }

  async function confirmDelete(id) {
    setActionLoading(true)
    setActionError('')
    try {
      const user = await getCurrentUser()
      const { error, data } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
      if (!error && data?.length > 0) {
        setExpandedId(null)
        setDeleteConfirmId(null)
        await fetchTransactions()
        onRefresh?.()
      } else {
        setActionError('Could not delete. Try again.')
      }
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-40">
        <div className="w-6 h-6 border-2 border-line border-t-ink rounded-full animate-spin" />
      </div>
    )
  }

  if (error) return <div className="px-6 pt-10 text-sm text-danger">{error}</div>

  return (
    <div className="px-5 pt-12 pb-8 max-w-md mx-auto">

      <p className="text-2xl font-semibold text-ink tracking-tight mb-6">Transactions</p>

      <MonthNav month={month} onChange={m => { setMonth(m); setAll([]) }} />

      {/* Search */}
      <div className="flex items-center gap-2 border-b border-line py-2 mb-4">
        <Search size={14} className="text-faint flex-shrink-0" />
        <input
          type="text"
          placeholder="Search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 text-sm outline-none text-ink placeholder-faint"
        />
        {search && (
          <button onClick={() => setSearch('')}>
            <X size={14} className="text-faint" />
          </button>
        )}
      </div>

      {/* Type filter */}
      <div className="flex gap-5 mb-6">
        {[['all', 'All'], ['expenses', 'Expenses'], ['income', 'Income']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setTypeFilter(val)}
            className={`text-sm pb-1 transition-colors ${
              typeFilter === val
                ? 'text-ink font-semibold border-b-2 border-ink'
                : 'text-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-muted">
            {all.length === 0 ? 'No transactions this month.' : 'No results.'}
          </p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, items]) => (
          <div key={date} className="mb-6">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              {formatDateLabel(date)}
            </p>
            {items.map(txn => (
              <div key={txn.id}>
                {/* Row */}
                <button
                  onClick={() => toggleExpand(txn.id)}
                  className="w-full flex items-center gap-3 py-3 border-b border-line text-left"
                >
                  <div className="w-9 h-9 bg-fill rounded-2xl flex items-center justify-center flex-shrink-0">
                    <CategoryIcon
                      category={txn.category}
                      isIncome={txn.amount >= 0}
                      size={15}
                      className="text-ink-soft"
                      customIcons={customIcons}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{txn.description}</p>
                    <div className="flex items-center gap-1.5">
                      {txn.category && (
                        <p className="text-xs text-muted capitalize">{txn.category}</p>
                      )}
                      {(txn.recurring || txn.recurring_parent_id) && (
                        <span className="inline-flex items-center gap-0.5 text-[11px] text-faint">
                          <Repeat size={10} strokeWidth={2} />Repeats
                        </span>
                      )}
                    </div>
                  </div>
                  <p className={`text-sm font-medium flex-shrink-0 tabular-nums ${txn.amount >= 0 ? 'text-accent' : 'text-ink'}`}>
                    {fmt(txn.amount)}
                  </p>
                </button>

                {/* Edit / Delete toggle */}
                {expandedId === txn.id && !editState && !deleteConfirmId && (
                  <div className="flex border-b border-line">
                    <button
                      onClick={() => startEdit(txn)}
                      className="flex-1 py-3 text-xs font-medium text-ink border-r border-line active:bg-fill transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(txn.id)}
                      className="flex-1 py-3 text-xs font-medium text-ink active:bg-fill transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                )}

                {/* Delete confirm */}
                {expandedId === txn.id && deleteConfirmId === txn.id && (
                  <>
                    <div className="flex border-b border-line">
                      <button
                        onClick={() => confirmDelete(txn.id)}
                        disabled={actionLoading}
                        className="flex-1 py-3 text-xs font-medium text-ink border-r border-line active:bg-fill transition-colors disabled:opacity-50"
                      >
                        {actionLoading ? '...' : 'Confirm delete'}
                      </button>
                      <button
                        onClick={() => { setDeleteConfirmId(null); setActionError('') }}
                        className="flex-1 py-3 text-xs text-muted active:bg-fill transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                    {actionError && (
                      <p className="text-xs text-danger px-1 py-2 border-b border-line">{actionError}</p>
                    )}
                  </>
                )}

                {/* Inline edit form */}
                {expandedId === txn.id && editState?.id === txn.id && (
                  <div className="py-4 border-b border-line space-y-4">
                    <div>
                      <p className="text-xs text-muted mb-1">Description</p>
                      <input
                        type="text"
                        value={editState.description}
                        onChange={e => setEditState(s => ({ ...s, description: e.target.value }))}
                        className="w-full text-sm outline-none border-b border-line pb-1 bg-transparent"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted mb-1">Amount</p>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-muted">{editState.isExpense ? '−' : '+'}$</span>
                        <input
                          type="number"
                          value={editState.amount}
                          onChange={e => setEditState(s => ({ ...s, amount: e.target.value }))}
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          className="flex-1 text-sm outline-none border-b border-line pb-1 bg-transparent"
                        />
                      </div>
                    </div>
                    {editState.isExpense && (
                      <div>
                        <p className="text-xs text-muted mb-2">Category</p>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            onClick={() => setEditState(s => ({ ...s, category: '' }))}
                            className={`text-xs px-3 py-1.5 rounded-full capitalize transition-colors ${
                              !editState.category ? 'bg-ink text-paper' : 'bg-fill text-ink-soft'
                            }`}
                          >
                            None
                          </button>
                          {categories.map(cat => (
                            <button
                              key={cat}
                              onClick={() => setEditState(s => ({ ...s, category: cat }))}
                              className={`text-xs px-3 py-1.5 rounded-full capitalize transition-colors ${
                                editState.category === cat ? 'bg-ink text-paper' : 'bg-fill text-ink-soft'
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted mb-1">Date</p>
                      <input
                        type="date"
                        value={editState.date}
                        onChange={e => setEditState(s => ({ ...s, date: e.target.value }))}
                        className="text-sm outline-none border-b border-line pb-1 bg-transparent"
                      />
                    </div>
                    {actionError && <p className="text-xs text-danger">{actionError}</p>}
                    <div className="flex border-t border-line pt-1">
                      <button
                        onClick={saveEdit}
                        disabled={actionLoading}
                        className="flex-1 py-3 text-xs font-medium text-ink border-r border-line active:bg-fill transition-colors disabled:opacity-50"
                      >
                        {actionLoading ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditState(null)}
                        className="flex-1 py-3 text-xs text-muted active:bg-fill transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  )
}

export default Transactions
