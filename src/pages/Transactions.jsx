import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { Search, X } from 'lucide-react'
import MonthNav from '../components/MonthNav'
import { DEFAULT_CATEGORIES, fetchAllCategories } from '../lib/categories'

function getMonthRange(month) {
  const [y, m] = month.split('-').map(Number)
  const start = `${month}-01`
  const endY = m === 12 ? y + 1 : y
  const endM = m === 12 ? 1 : m + 1
  return { start, end: `${endY}-${String(endM).padStart(2, '0')}-01` }
}

function Transactions({ refreshKey, onRefresh }) {
  const [all, setAll] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)

  // Filters
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all') // 'all' | 'expenses' | 'income'
  const [catFilter, setCatFilter] = useState('')

  // Edit / delete state
  const [expandedId, setExpandedId] = useState(null)
  const [editState, setEditState] = useState(null) // { id, description, amount, category, date, isExpense }
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => { fetchTransactions() }, [refreshKey, month])
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) fetchAllCategories(user.id).then(setCategories)
    })
  }, [])

  async function fetchTransactions() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { start, end } = getMonthRange(month)

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', start)
      .lt('date', end)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      setError('Failed to load transactions.')
    } else {
      setAll(data)
      setError('')
    }
    setLoading(false)
  }

  // Distinct categories in current data for filter chips
  const usedCategories = useMemo(() => {
    const cats = [...new Set(all.map(t => t.category).filter(Boolean))]
    return cats
  }, [all])

  // Filtered view
  const filtered = useMemo(() => {
    return all.filter(t => {
      if (search && !t.description?.toLowerCase().includes(search.toLowerCase())) return false
      if (typeFilter === 'expenses' && t.amount >= 0) return false
      if (typeFilter === 'income' && t.amount < 0) return false
      if (catFilter && t.category !== catFilter) return false
      return true
    })
  }, [all, search, typeFilter, catFilter])

  const fmt = (amount) => {
    const s = Math.abs(amount).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return amount < 0 ? `-$${s}` : `+$${s}`
  }

  const formatDateLabel = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number)
    const txnDate = new Date(year, month - 1, day)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    const same = (a, b) =>
      a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
    if (same(txnDate, today)) return 'Today'
    if (same(txnDate, yesterday)) return 'Yesterday'
    return txnDate.toLocaleDateString('en-CA', {
      month: 'short', day: 'numeric',
      year: txnDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    })
  }

  const grouped = useMemo(() => {
    return filtered.reduce((groups, txn) => {
      if (!groups[txn.date]) groups[txn.date] = []
      groups[txn.date].push(txn)
      return groups
    }, {})
  }, [filtered])

  function toggleExpand(id) {
    if (expandedId === id) {
      setExpandedId(null)
      setEditState(null)
      setDeleteConfirmId(null)
    } else {
      setExpandedId(id)
      setEditState(null)
      setDeleteConfirmId(null)
    }
  }

  function startEdit(txn) {
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
    const { error } = await supabase
      .from('transactions')
      .update({
        description: editState.description || editState.category || (editState.isExpense ? 'Expense' : 'Income'),
        amount: editState.isExpense ? -parsed : parsed,
        category: editState.isExpense ? (editState.category || null) : null,
        date: editState.date,
      })
      .eq('id', editState.id)
    if (!error) {
      setExpandedId(null)
      setEditState(null)
      await fetchTransactions()
      onRefresh?.()
    }
    setActionLoading(false)
  }

  async function confirmDelete(id) {
    setActionLoading(true)
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (!error) {
      setExpandedId(null)
      setDeleteConfirmId(null)
      await fetchTransactions()
      onRefresh?.()
    }
    setActionLoading(false)
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

  return (
    <div className="px-6 pt-10 pb-6 max-w-md mx-auto">
      <div className="flex justify-between items-center mb-6">
        <p className="text-2xl font-semibold text-black">Transactions</p>
      </div>

      <MonthNav month={month} onChange={m => { setMonth(m); setAll([]) }} />

      {/* Search */}
      <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 mb-4">
        <Search size={14} className="text-gray-300 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 text-sm outline-none text-black placeholder-gray-300"
        />
        {search && (
          <button onClick={() => setSearch('')}>
            <X size={14} className="text-gray-300" />
          </button>
        )}
      </div>

      {/* Type filter */}
      <div className="flex gap-2 mb-3">
        {['all', 'expenses', 'income'].map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`text-xs px-3 py-1.5 rounded-full border capitalize transition-colors ${
              typeFilter === t ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-500'
            }`}
          >
            {t === 'all' ? 'All' : t === 'expenses' ? 'Expenses' : 'Income'}
          </button>
        ))}
      </div>

      {/* Category filter */}
      {usedCategories.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-5">
          {usedCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setCatFilter(c => c === cat ? '' : cat)}
              className={`text-xs px-3 py-1.5 rounded-full border capitalize transition-colors ${
                catFilter === cat ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-500'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          {all.length === 0 ? (
            <>
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl">📋</span>
              </div>
              <p className="text-sm text-gray-500 font-medium">No transactions yet</p>
              <p className="text-xs text-gray-400 mt-1">Tap + Add to record your first expense or income.</p>
            </>
          ) : (
            <p className="text-sm text-gray-400">No results match your filters.</p>
          )}
        </div>
      ) : (
        Object.entries(grouped).map(([date, items]) => (
          <div key={date} className="mb-6">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
              {formatDateLabel(date)}
            </p>
            {items.map(txn => (
              <div key={txn.id}>
                {/* Row */}
                <button
                  onClick={() => toggleExpand(txn.id)}
                  className="w-full flex justify-between items-center py-3 border-b border-gray-100 text-left"
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-medium text-black truncate">{txn.description}</p>
                    {txn.category && (
                      <p className="text-xs text-gray-400 capitalize">{txn.category}</p>
                    )}
                  </div>
                  <p className={`text-sm font-medium flex-shrink-0 ${txn.amount < 0 ? 'text-black' : 'text-green-800'}`}>
                    {fmt(txn.amount)}
                  </p>
                </button>

                {/* Expanded: action buttons */}
                {expandedId === txn.id && !editState && !deleteConfirmId && (
                  <div className="flex border-b border-gray-100">
                    <button
                      onClick={() => startEdit(txn)}
                      className="flex-1 py-3 text-xs font-medium text-black border-r border-gray-100 hover:bg-black hover:text-white transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(txn.id)}
                      className="flex-1 py-3 text-xs font-medium text-black hover:bg-black hover:text-white transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                )}

                {/* Delete confirm */}
                {expandedId === txn.id && deleteConfirmId === txn.id && (
                  <div className="flex border-b border-gray-100">
                    <button
                      onClick={() => confirmDelete(txn.id)}
                      disabled={actionLoading}
                      className="flex-1 py-3 text-xs font-medium text-black border-r border-gray-100 hover:bg-black hover:text-white transition-colors disabled:opacity-50"
                    >
                      {actionLoading ? '…' : 'Confirm delete'}
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="flex-1 py-3 text-xs text-gray-400 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Inline edit form */}
                {expandedId === txn.id && editState?.id === txn.id && (
                  <div className="py-3 px-1 border-b border-gray-100 bg-gray-50 space-y-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Description</p>
                      <input
                        type="text"
                        value={editState.description}
                        onChange={e => setEditState(s => ({ ...s, description: e.target.value }))}
                        className="w-full text-sm outline-none border-b border-gray-200 pb-1 bg-transparent"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Amount</p>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-400">{editState.isExpense ? '-' : '+'}$</span>
                        <input
                          type="number"
                          value={editState.amount}
                          onChange={e => setEditState(s => ({ ...s, amount: e.target.value }))}
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          className="flex-1 text-sm outline-none border-b border-gray-200 pb-1 bg-transparent"
                        />
                      </div>
                    </div>
                    {editState.isExpense && (
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Category</p>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            onClick={() => setEditState(s => ({ ...s, category: '' }))}
                            className={`text-xs px-2.5 py-1 border capitalize rounded-full transition-colors ${
                              !editState.category ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-500'
                            }`}
                          >
                            None
                          </button>
                          {categories.map(cat => (
                            <button
                              key={cat}
                              onClick={() => setEditState(s => ({ ...s, category: cat }))}
                              className={`text-xs px-2.5 py-1 border capitalize rounded-full transition-colors ${
                                editState.category === cat ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-500'
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Date</p>
                      <input
                        type="date"
                        value={editState.date}
                        onChange={e => setEditState(s => ({ ...s, date: e.target.value }))}
                        className="text-sm outline-none border-b border-gray-200 pb-1 bg-transparent"
                      />
                    </div>
                    <div className="flex border-t border-gray-100 mt-1">
                      <button
                        onClick={saveEdit}
                        disabled={actionLoading}
                        className="flex-1 py-3 text-xs font-medium text-black border-r border-gray-100 hover:bg-black hover:text-white transition-colors disabled:opacity-50"
                      >
                        {actionLoading ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditState(null)}
                        className="flex-1 py-3 text-xs text-gray-400 hover:bg-gray-50 transition-colors"
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
