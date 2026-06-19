import { useState, useEffect } from 'react'
import { supabase, getCurrentUser } from '../lib/supabase'
import { X, Delete, StickyNote, Calendar, Repeat } from 'lucide-react'
import { DEFAULT_CATEGORIES, fetchAllCategories } from '../lib/categories'
import { todayStr, toLocalDateStr } from '../lib/dates'

const REPEAT_OPTIONS = [
  { label: 'Once', value: false },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Biweekly', value: 'biweekly' },
  { label: 'Monthly', value: 'monthly' },
]

function yesterdayStr() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return toLocalDateStr(d)
}

function Key({ onPress, k, children }) {
  return (
    <button
      onClick={() => onPress(k)}
      className="h-14 rounded-2xl text-2xl font-display font-light text-ink active:bg-fill transition-colors flex items-center justify-center"
    >
      {children ?? k}
    </button>
  )
}

function Pill({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 text-[13px] px-3 py-2 rounded-full transition-colors ${
        active ? 'bg-ink text-paper' : 'bg-fill text-ink-soft'
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  )
}

// Single-screen quick add. Amount is driven by a custom keypad so the sheet
// never fights the OS keyboard; note / date / repeat live in a compact area
// that swaps in place of the keypad, keeping the sheet height steady.
function AddExpense({ onClose, onSave }) {
  const [isExpense, setIsExpense] = useState(true)
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(todayStr())
  const [recurring, setRecurring] = useState(false)
  const [recurringInterval, setRecurringInterval] = useState('monthly')
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)
  const [editor, setEditor] = useState(null) // null | 'note' | 'date' | 'repeat'
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getCurrentUser().then(user => {
      if (user) fetchAllCategories(user.id).then(setCategories)
    })
  }, [])

  function press(key) {
    setError('')
    setAmount(a => {
      if (key === 'back') return a.slice(0, -1)
      if (key === '.') {
        if (a.includes('.')) return a
        return a === '' ? '0.' : a + '.'
      }
      if (a.includes('.') && a.split('.')[1].length >= 2) return a // max 2 decimals
      if (a === '0') return key === '0' ? a : key                   // no leading zeros
      if (a.replace('.', '').length >= 9) return a                  // sane cap
      return a + key
    })
  }

  function displayAmount() {
    if (!amount) return '0'
    const [int, dec] = amount.split('.')
    const intFmt = Number(int || '0').toLocaleString('en-CA')
    return dec !== undefined ? `${intFmt}.${dec}` : intFmt
  }

  const repeatLabel = recurring
    ? REPEAT_OPTIONS.find(o => o.value === recurringInterval)?.label
    : 'Once'

  const dateLabel = date === todayStr() ? 'Today' : date === yesterdayStr() ? 'Yesterday'
    : new Date(date + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })

  async function handleSave() {
    const parsed = parseFloat(amount)
    if (!amount || isNaN(parsed) || parsed <= 0) { setError('Enter an amount.'); return }
    setSaving(true)
    setError('')
    const user = await getCurrentUser()

    const insertData = {
      user_id: user.id,
      description: description.trim() || category || (isExpense ? 'Expense' : 'Income'),
      amount: isExpense ? -parsed : parsed,
      category: isExpense ? (category || null) : null,
      date,
    }
    if (recurring) {
      insertData.recurring = true
      insertData.recurring_interval = recurringInterval
    }

    const { error: insertError } = await supabase.from('transactions').insert(insertData)
    if (insertError) {
      // Recurring columns may not be migrated yet — retry without them.
      if (recurring && (insertError.code === '42703' || insertError.message?.includes('column'))) {
        delete insertData.recurring
        delete insertData.recurring_interval
        const { error: retryError } = await supabase.from('transactions').insert(insertData)
        if (retryError) { setError('Failed to save. Try again.'); setSaving(false); return }
      } else {
        setError('Failed to save. Try again.'); setSaving(false); return
      }
    }
    onSave()
  }

  return (
    <>
      <div className="fixed inset-0 bg-ink/30 z-40" onClick={onClose} />
      <div className="sheet fixed bottom-0 left-0 right-0 z-50 px-5 pt-4 pb-8 max-w-md mx-auto">

        {/* Type segmented control */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex bg-fill rounded-full p-1">
            <button
              onClick={() => setIsExpense(true)}
              className={`text-[13px] font-medium px-4 py-1.5 rounded-full transition-colors ${isExpense ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}
            >
              Expense
            </button>
            <button
              onClick={() => setIsExpense(false)}
              className={`text-[13px] font-medium px-4 py-1.5 rounded-full transition-colors ${!isExpense ? 'bg-surface text-accent shadow-sm' : 'text-muted'}`}
            >
              Income
            </button>
          </div>
          <button onClick={onClose} aria-label="Close"><X size={20} className="text-faint" /></button>
        </div>

        {/* Amount */}
        <div className="flex items-end justify-center gap-1 mb-5 min-h-[64px]">
          <span className="font-display font-light text-3xl text-faint pb-2">$</span>
          <span className={`font-display font-light text-6xl tabular-nums leading-none ${amount ? 'text-ink' : 'text-faint'}`}>
            {displayAmount()}
          </span>
        </div>

        {/* Category chips (expenses only) */}
        {isExpense && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-5 px-5 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(c => c === cat ? '' : cat)}
                className={`text-[13px] px-3.5 py-1.5 rounded-full whitespace-nowrap capitalize transition-colors ${
                  category === cat ? 'bg-ink text-paper' : 'bg-fill text-ink-soft'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Option pills */}
        <div className="flex gap-2 mb-4">
          <Pill icon={StickyNote} label={description.trim() || 'Note'} active={editor === 'note'} onClick={() => setEditor(e => e === 'note' ? null : 'note')} />
          <Pill icon={Calendar} label={dateLabel} active={editor === 'date'} onClick={() => setEditor(e => e === 'date' ? null : 'date')} />
          <Pill icon={Repeat} label={repeatLabel} active={editor === 'repeat'} onClick={() => setEditor(e => e === 'repeat' ? null : 'repeat')} />
        </div>

        {/* Swappable bottom area: keypad by default, editors in its place */}
        <div className="min-h-[244px]">
          {editor === null && (
            <div className="grid grid-cols-3 gap-1.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => <Key key={d} onPress={press} k={d} />)}
              <Key onPress={press} k="." />
              <Key onPress={press} k="0" />
              <Key onPress={press} k="back"><Delete size={22} /></Key>
            </div>
          )}

          {editor === 'note' && (
            <div className="pt-2">
              <p className="eyebrow mb-3">Note</p>
              <input
                type="text"
                autoFocus
                value={description}
                onChange={e => setDescription(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && setEditor(null)}
                placeholder={category || 'What was it for?'}
                className="w-full text-lg outline-none text-ink border-b border-line pb-2 bg-transparent placeholder-faint focus:border-ink transition-colors"
              />
              <button onClick={() => setEditor(null)} className="mt-5 text-[13px] font-medium text-ink">Done</button>
            </div>
          )}

          {editor === 'date' && (
            <div className="pt-2">
              <p className="eyebrow mb-3">When</p>
              <div className="flex gap-2 mb-4">
                {[['Today', todayStr()], ['Yesterday', yesterdayStr()]].map(([label, value]) => (
                  <button
                    key={value}
                    onClick={() => { setDate(value); setEditor(null) }}
                    className={`text-[13px] px-4 py-2 rounded-full transition-colors ${date === value ? 'bg-ink text-paper' : 'bg-fill text-ink-soft'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input
                type="date"
                value={date}
                max={todayStr()}
                onChange={e => e.target.value && setDate(e.target.value)}
                className="w-full text-base outline-none text-ink border-b border-line pb-2 bg-transparent focus:border-ink transition-colors"
              />
              <button onClick={() => setEditor(null)} className="mt-5 text-[13px] font-medium text-ink">Done</button>
            </div>
          )}

          {editor === 'repeat' && (
            <div className="pt-2">
              <p className="eyebrow mb-3">Repeat</p>
              <div className="flex flex-wrap gap-2">
                {REPEAT_OPTIONS.map(opt => {
                  const selected = opt.value === false ? !recurring : recurring && recurringInterval === opt.value
                  return (
                    <button
                      key={String(opt.value)}
                      onClick={() => {
                        if (opt.value === false) setRecurring(false)
                        else { setRecurring(true); setRecurringInterval(opt.value) }
                      }}
                      className={`text-[13px] px-4 py-2 rounded-full transition-colors ${selected ? 'bg-ink text-paper' : 'bg-fill text-ink-soft'}`}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
              <button onClick={() => setEditor(null)} className="mt-5 text-[13px] font-medium text-ink">Done</button>
            </div>
          )}
        </div>

        {error && <p className="text-[13px] text-danger mt-3">{error}</p>}

        <button onClick={handleSave} disabled={saving} className="btn-primary w-full py-4 text-sm mt-4">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </>
  )
}

export default AddExpense
