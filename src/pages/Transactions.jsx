import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { Search, X } from 'lucide-react'
import MonthNav from '../components/MonthNav'
import { DEFAULT_CATEGORIES, fetchAllCategories, fetchCategoryIconMap } from '../lib/categories'
import { CategoryIcon } from '../lib/categoryIcons'

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
  const [customIcons, setCustomIcons] = useState({})

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const [expandedId, setExpandedId] = useState(null)
  const [editState, setEditState] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => { fetchTransactions() }, [refreshKey, month])
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        fetchAllCategories(user.id).then(setCategories)
        fetchCategoryIconMap(user.id).then(setCustomIcons)
      }
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
    if (error) setError('Failed to load transactions.')
    else { setAll(data); setError('') }
    setLoading(false)
  }

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
    return (amount < 0 ? '-' : '+') + '$' + s
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
      const { data: { user } } = await supabase.auth.getUser()
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
      const { data: { user } } = await supabase.auth.getUser()
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
        <div className="w-6 h-6 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    )
  }

  if (error) return <div className="px-6 pt-10 text-sm text-red-800">{error}</div>

  return (
    <div className="px-6 pt-10 pb-6 max-w-md mx-auto">

      <p className="text-2xl font-bold text-black mb-6">Transactions</p>

      <MonthNav month={month} onChange={m => { setMonth(m); setAll([]) }} />

      {/* Search */}
      <div className="flex items-center gap-2 border-b border-gray-200 py-2 mb-4">
        <Search size={14} className="text-gray-300 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search"
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
      <div className="flex gap-5 mb-6">
        {[['all', 'All'], ['expenses', 'Expenses'], ['income', 'Income']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setTypeFilter(val)}
            className={`text-sm pb-1 transition-colors ${
              typeFilter === val
                ? 'text-black font-semibold border-b-2 border-black'
                : 'text-gray-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-gray-400">
            {all.length === 0 ? 'No transactions this month.' : 'No results.'}
          </p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, items]) => (
          <div key={date} className="mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              {formatDateLabel(date)}
            </p>
            {items.map(txn => (
              <div key={txn.id}>
                {/* Row */}
                <button
                  onClick={() => toggleExpand(txn.id)}
                  className="w-full flex items-center gap-3 py-3 border-b border-gray-100 text-left"
                >
                  <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <CategoryIcon
                      category={txn.category}
                      isIncome={txn.amount >= 0}
                      size={15}
                      className="text-gray-500"
                      customIcons={customIcons}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-black truncate">{txn.description}</p>
                    {txn.category && (
                      <p className="text-xs text-gray-400 capitalize">{txn.category}</p>
                    )}
                  </div>
                  <p className={`text-sm font-medium flex-shrink-0 ${txn.amount >= 0 ? 'text-green-800' : 'text-black'}`}>
                    {fmt(txn.amount)}
                  </p>
                </button>

                {/* Edit / Delete toggle */}
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
                  <>
                    <div className="flex border-b border-gray-100">
                      <button
                        onClick={() => confirmDelete(txn.id)}
                        disabled={actionLoading}
                        className="flex-1 py-3 text-xs font-medium text-black border-r border-gray-100 hover:bg-black hover:text-white transition-colors disabled:opacity-50"
                      >
                        {actionLoading ? '...' : 'Confirm delete'}
                      </button>
                      <button
                        onClick={() => { setDeleteConfirmId(null); setActionError('') }}
                        className="flex-1 py-3 text-xs text-gray-400 hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                    {actionError && (
                      <p className="text-xs text-red-800 px-1 py-2 border-b border-gray-100">{actionError}</p>
                    )}
                  </>
                )}

                {/* Inline edit form */}
                {expandedId === txn.id && editState?.id === txn.id && (
                  <div className="py-4 border-b border-gray-100 space-y-4">
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
                        <p className="text-xs text-gray-400 mb-2">Category</p>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            onClick={() => setEditState(s => ({ ...s, category: '' }))}
                            className={`text-xs px-3 py-1.5 border capitalize transition-colors ${
                              !editState.category ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-500'
                            }`}
                          >
                            None
                          </button>
                          {categories.map(cat => (
                            <button
                              key={cat}
                              onClick={() => setEditState(s => ({ ...s, category: cat }))}
                              className={`text-xs px-3 py-1.5 border capitalize transition-colors ${
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
                    {actionError && <p className="text-xs text-red-800">{actionError}</p>}
                    <div className="flex border-t border-gray-100 pt-1">
                      <button
                        onClick={saveEdit}
                        disabled={actionLoading}
                        className="flex-1 py-3 text-xs font-medium text-black border-r border-gray-100 hover:bg-black hover:text-white transition-colors disabled:opacity-50"
                      >
                        {actionLoading ? 'Saving...' : 'Save'}
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
