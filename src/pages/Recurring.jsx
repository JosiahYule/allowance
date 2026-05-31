import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, X, Repeat } from 'lucide-react'
import { supabase, getCurrentUser } from '../lib/supabase'
import { fetchCategoryIconMap } from '../lib/categories'
import { CategoryIcon } from '../lib/categoryIcons'

const INTERVALS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
]

function intervalLabel(interval) {
  return INTERVALS.find(i => i.value === interval)?.label || 'Monthly'
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function scheduleLabel(item) {
  const interval = item.recurring_interval || 'monthly'
  if (interval === 'monthly') {
    const [, , d] = item.date.split('-').map(Number)
    return `Monthly · ${ordinal(d)}`
  }
  return intervalLabel(interval)
}

function fmtAmount(amount) {
  const s = Math.abs(amount).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (amount < 0 ? '−' : '+') + '$' + s
}

function Recurring() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [customIcons, setCustomIcons] = useState({})
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)

  const [selected, setSelected] = useState(null)
  const [editDesc, setEditDesc] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editInterval, setEditInterval] = useState('monthly')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [stopConfirm, setStopConfirm] = useState(false)
  const [stopping, setStopping] = useState(false)

  useEffect(() => { fetchRecurring() }, [])

  async function fetchRecurring() {
    setLoading(true)
    try {
      const user = await getCurrentUser()
      const [{ data, error: err }, iconMap] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .eq('recurring', true)
          .is('recurring_parent_id', null)
          .order('created_at'),
        fetchCategoryIconMap(user.id),
      ])
      if (err?.code === '42703') setUnavailable(true)
      else setItems(data || [])
      setCustomIcons(iconMap)
    } catch {
      setUnavailable(true)
    }
    setLoading(false)
  }

  function openItem(item) {
    setSelected(item)
    setEditDesc(item.description || '')
    setEditAmount(String(Math.abs(item.amount)))
    setEditInterval(item.recurring_interval || 'monthly')
    setError('')
    setStopConfirm(false)
  }

  function closeSheet() {
    setSelected(null)
    setError('')
    setStopConfirm(false)
  }

  async function handleSave() {
    const parsed = parseFloat(editAmount)
    if (!editAmount || isNaN(parsed) || parsed <= 0) { setError('Enter a valid amount.'); return }
    setSaving(true)
    setError('')
    const isExpense = selected.amount < 0
    const user = await getCurrentUser()
    const { error: err } = await supabase
      .from('transactions')
      .update({
        description: editDesc.trim() || selected.category || (isExpense ? 'Expense' : 'Income'),
        amount: isExpense ? -parsed : parsed,
        recurring_interval: editInterval,
      })
      .eq('id', selected.id)
      .eq('user_id', user.id)
    if (err) {
      setError('Could not save. Try again.')
    } else {
      closeSheet()
      fetchRecurring()
    }
    setSaving(false)
  }

  // "Stop" turns the template into a one-off transaction: clearing the recurring
  // flag stops future generation while keeping the record (and its history) intact.
  async function handleStop() {
    setStopping(true)
    const user = await getCurrentUser()
    const { error: err } = await supabase
      .from('transactions')
      .update({ recurring: false, recurring_interval: null })
      .eq('id', selected.id)
      .eq('user_id', user.id)
    if (!err) {
      closeSheet()
      fetchRecurring()
    }
    setStopping(false)
  }

  return (
    <div className="px-5 pt-12 pb-8 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate(-1)} className="text-ink-soft active:opacity-60">
          <ArrowLeft size={20} />
        </button>
        <p className="text-2xl font-semibold text-ink tracking-tight">Recurring</p>
      </div>
      <p className="text-[14px] text-muted mb-8 pl-8">Bills and income that repeat automatically</p>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-line border-t-ink rounded-full animate-spin" />
        </div>
      ) : unavailable ? (
        <p className="text-[13px] text-muted bg-fill rounded-2xl p-4 leading-relaxed">
          Recurring transactions require a database migration. See <code className="font-mono text-ink">supabase/migrations/</code> in the repo.
        </p>
      ) : items.length === 0 ? (
        <div className="py-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-fill flex items-center justify-center mx-auto mb-4">
            <Repeat size={20} className="text-muted" />
          </div>
          <p className="text-sm text-muted mb-1">No recurring transactions yet.</p>
          <p className="text-[13px] text-faint">Mark a transaction as repeating when you add it.</p>
        </div>
      ) : (
        <div className="card p-2.5">
          {items.map((item, i) => (
            <div key={item.id}>
              {i > 0 && <div className="h-px bg-line mx-3" />}
              <button
                onClick={() => openItem(item)}
                className="w-full flex items-center gap-3.5 px-3 py-3.5 text-left active:opacity-60 transition-opacity"
              >
                <div className="w-9 h-9 rounded-2xl bg-fill flex items-center justify-center flex-shrink-0">
                  <CategoryIcon
                    category={item.category}
                    isIncome={item.amount >= 0}
                    size={16}
                    className="text-ink-soft"
                    customIcons={customIcons}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-ink truncate">{item.description}</p>
                  <p className="text-[12px] text-muted">{scheduleLabel(item)}</p>
                </div>
                <p className={`text-[15px] font-medium tabular-nums flex-shrink-0 ${item.amount >= 0 ? 'text-accent' : 'text-ink'}`}>
                  {fmtAmount(item.amount)}
                </p>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Edit sheet */}
      {selected && (
        <>
          <div className="fixed inset-0 bg-ink/30 z-40" onClick={closeSheet} />
          <div className="sheet fixed bottom-0 left-0 right-0 z-50 px-6 pt-6 pb-9">
            <div className="flex items-center justify-between mb-7">
              <p className="text-base font-semibold text-ink">Edit recurring</p>
              <button onClick={closeSheet}><X size={18} className="text-muted" /></button>
            </div>

            <p className="eyebrow mb-2">Description</p>
            <input
              type="text"
              value={editDesc}
              onChange={e => { setEditDesc(e.target.value); setError('') }}
              className="w-full text-base outline-none border-b border-line pb-2.5 mb-6 bg-transparent placeholder-faint focus:border-ink transition-colors"
            />

            <p className="eyebrow mb-2">Amount</p>
            <div className="flex items-center gap-2 border-b border-line pb-3 mb-6">
              <span className="text-xl text-muted">{selected.amount < 0 ? '−' : '+'}$</span>
              <input
                type="number"
                value={editAmount}
                onChange={e => { setEditAmount(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                min="0"
                step="0.01"
                inputMode="decimal"
                className="text-xl flex-1 outline-none text-ink tabular-nums bg-transparent"
              />
            </div>

            <p className="eyebrow mb-3">Repeats</p>
            <div className="flex flex-wrap gap-2 mb-7">
              {INTERVALS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setEditInterval(opt.value)}
                  className={`text-sm px-4 py-2 rounded-full transition-all ${
                    editInterval === opt.value ? 'bg-ink text-paper' : 'bg-fill text-ink-soft active:scale-95'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {error && <p className="text-[13px] text-danger mb-4">{error}</p>}

            <button onClick={handleSave} disabled={saving} className="btn-primary w-full text-sm py-4 mb-5">
              {saving ? 'Saving…' : 'Save changes'}
            </button>

            {!stopConfirm ? (
              <button onClick={() => setStopConfirm(true)} className="w-full text-center text-sm text-muted">
                Stop repeating
              </button>
            ) : (
              <div className="flex items-center gap-4 justify-center">
                <p className="text-sm text-ink-soft">Stop repeating?</p>
                <button onClick={handleStop} disabled={stopping} className="text-sm font-medium text-ink disabled:opacity-50">
                  {stopping ? '…' : 'Stop'}
                </button>
                <button onClick={() => setStopConfirm(false)} className="text-sm text-muted">Cancel</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default Recurring
