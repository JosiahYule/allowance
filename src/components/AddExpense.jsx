import { useState, useEffect, useRef } from 'react'
import { supabase, getCurrentUser } from '../lib/supabase'
import { ArrowLeft, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { DEFAULT_CATEGORIES, fetchAllCategories } from '../lib/categories'
import { todayStr, toLocalDateStr } from '../lib/dates'

// Steps: 1=type, 2=amount, 3=category (expenses only), 4=description, 5=date, 6=repeat
function AddExpense({ onClose, onSave }) {
  const [step, setStep] = useState(1)
  const [isExpense, setIsExpense] = useState(true)
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(todayStr())
  const [recurring, setRecurring] = useState(false)
  const [recurringInterval, setRecurringInterval] = useState('monthly')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)
  const amountRef = useRef(null)
  const descRef = useRef(null)

  useEffect(() => {
    getCurrentUser().then(user => {
      if (user) fetchAllCategories(user.id).then(setCategories)
    })
  }, [])

  useEffect(() => {
    if (step === 2) amountRef.current?.focus()
    if (step === 4) descRef.current?.focus()
  }, [step])

  function back() {
    setError('')
    // Income skips step 3 (category), so back from step 4 goes to step 2
    if (step === 4 && !isExpense) setStep(2)
    else setStep(s => s - 1)
  }

  function handleTypeSelect(expense) {
    setIsExpense(expense)
    setStep(2)
  }

  function handleAmountNext() {
    const parsed = parseFloat(amount)
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setError('Enter an amount.')
      return
    }
    setError('')
    setStep(isExpense ? 3 : 4)
  }

  // Custom date picker helpers
  function shiftDate(days) {
    const d = new Date(date + 'T00:00:00')
    d.setDate(d.getDate() + days)
    const newDate = toLocalDateStr(d)
    if (newDate > todayStr()) return
    setDate(newDate)
  }

  const isToday = date === todayStr()

  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-CA', {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
  })

  async function handleSave() {
    const parsed = parseFloat(amount)
    setSaving(true)
    setError('')

    const user = await getCurrentUser()

    const insertData = {
      user_id: user.id,
      description: description || category || (isExpense ? 'Expense' : 'Income'),
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
      // If recurring columns don't exist yet, retry without them
      if (recurring && (insertError.code === '42703' || insertError.message?.includes('column'))) {
        delete insertData.recurring
        delete insertData.recurring_interval
        const { error: retryError } = await supabase.from('transactions').insert(insertData)
        if (retryError) {
          setError('Failed to save. Try again.')
          setSaving(false)
          return
        }
      } else {
        setError('Failed to save. Try again.')
        setSaving(false)
        return
      }
    }

    onSave()
  }

  const chip = (selected) =>
    `text-sm px-4 py-2 rounded-full transition-all capitalize ${
      selected ? 'bg-ink text-paper' : 'bg-fill text-ink-soft active:scale-95'
    }`

  return (
    <>
      <div className="fixed inset-0 bg-ink/30 z-40" onClick={onClose} />
      <div className="sheet fixed bottom-0 left-0 right-0 z-50">

        {step > 1 && (
          <div className="flex items-center justify-between px-6 py-4">
            <button onClick={back} className="flex items-center gap-1 text-[13px] text-muted active:text-ink transition-colors">
              <ArrowLeft size={15} />
              Back
            </button>
            <button onClick={onClose}>
              <X size={20} className="text-faint" />
            </button>
          </div>
        )}

        <div className={`px-6 pb-10 ${step > 1 ? 'pt-2' : 'pt-6'}`}>

          {/* Step 1 — Type */}
          {step === 1 && (
            <div>
              <div className="flex items-center justify-between mb-7">
                <p className="text-lg font-semibold text-ink">Add</p>
                <button onClick={onClose}>
                  <X size={20} className="text-faint" />
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleTypeSelect(true)}
                  className="flex-1 py-9 text-base font-medium rounded-3xl bg-fill text-ink active:scale-[0.98] transition-transform"
                >
                  Expense
                </button>
                <button
                  onClick={() => handleTypeSelect(false)}
                  className="flex-1 py-9 text-base font-medium rounded-3xl bg-accent-soft text-accent active:scale-[0.98] transition-transform"
                >
                  Income
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — Amount */}
          {step === 2 && (
            <div>
              <p className="eyebrow mb-5">{isExpense ? 'Expense amount' : 'Income amount'}</p>
              <div className="flex items-start gap-2 mb-10">
                <span className="font-display font-light text-4xl text-faint pt-2">$</span>
                <input
                  ref={amountRef}
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={e => { setAmount(e.target.value); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleAmountNext()}
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  className="font-display font-light text-6xl flex-1 outline-none text-ink min-w-0 tabular-nums placeholder-faint bg-transparent"
                />
              </div>
              {error && <p className="text-[13px] text-danger mb-4">{error}</p>}
              <button onClick={handleAmountNext} className="btn-primary w-full py-4 text-sm">
                Continue
              </button>
            </div>
          )}

          {/* Step 3 — Category (expenses only) */}
          {step === 3 && (
            <div>
              <p className="text-xl font-semibold text-ink mb-6">Category</p>
              <div className="flex flex-wrap gap-2 mb-8">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(c => c === cat ? '' : cat)}
                    className={chip(category === cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(4)} className="btn-primary w-full py-4 text-sm">
                {category ? 'Continue' : 'Skip'}
              </button>
            </div>
          )}

          {/* Step 4 — Description */}
          {step === 4 && (
            <div>
              <p className="text-xl font-semibold text-ink mb-6">What for?</p>
              <input
                ref={descRef}
                type="text"
                placeholder={category || 'Add a note'}
                value={description}
                onChange={e => setDescription(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && setStep(5)}
                className="w-full text-lg outline-none text-ink border-b border-line pb-3 mb-8 bg-transparent placeholder-faint focus:border-ink transition-colors"
              />
              <button onClick={() => setStep(5)} className="btn-primary w-full py-4 text-sm">
                {description ? 'Continue' : 'Skip'}
              </button>
            </div>
          )}

          {/* Step 5 — Date (custom picker) */}
          {step === 5 && (
            <div>
              <p className="text-xl font-semibold text-ink mb-6">When?</p>
              <div className="flex items-center justify-between bg-fill rounded-2xl p-2 mb-8">
                <button
                  onClick={() => shiftDate(-1)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl text-ink-soft active:bg-surface transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <p className="text-[15px] font-medium text-ink text-center">{isToday ? 'Today' : formattedDate}</p>
                <button
                  onClick={() => shiftDate(1)}
                  disabled={isToday}
                  className="w-10 h-10 flex items-center justify-center rounded-xl text-ink-soft active:bg-surface transition-colors disabled:opacity-25"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
              <button onClick={() => setStep(6)} className="btn-primary w-full py-4 text-sm">
                Continue
              </button>
            </div>
          )}

          {/* Step 6 — Repeat? */}
          {step === 6 && (
            <div>
              <p className="text-xl font-semibold text-ink mb-6">Repeat?</p>
              <div className="flex gap-2 flex-wrap mb-8">
                {[
                  { label: 'No', value: false },
                  { label: 'Weekly', value: 'weekly' },
                  { label: 'Biweekly', value: 'biweekly' },
                  { label: 'Monthly', value: 'monthly' },
                ].map(opt => {
                  const isSelected = opt.value === false
                    ? !recurring
                    : recurring && recurringInterval === opt.value

                  return (
                    <button
                      key={String(opt.value)}
                      onClick={() => {
                        if (opt.value === false) {
                          setRecurring(false)
                        } else {
                          setRecurring(true)
                          setRecurringInterval(opt.value)
                        }
                      }}
                      className={chip(isSelected)}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
              {error && <p className="text-[13px] text-danger mb-4">{error}</p>}
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary w-full py-4 text-sm"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  )
}

export default AddExpense
