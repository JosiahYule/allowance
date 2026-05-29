import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { ArrowLeft, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { DEFAULT_CATEGORIES, fetchAllCategories } from '../lib/categories'

// Steps: 1=type, 2=amount, 3=category (expenses only), 4=description, 5=date, 6=repeat
function AddExpense({ onClose, onSave }) {
  const [step, setStep] = useState(1)
  const [isExpense, setIsExpense] = useState(true)
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [recurring, setRecurring] = useState(false)
  const [recurringInterval, setRecurringInterval] = useState('monthly')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)
  const amountRef = useRef(null)
  const descRef = useRef(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
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
    setDate(d.toISOString().split('T')[0])
  }

  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-CA', {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
  })

  async function handleSave() {
    const parsed = parseFloat(amount)
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()

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

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-white z-50 border-t border-gray-200">

        {step > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <button onClick={back} className="flex items-center gap-1 text-sm text-gray-500">
              <ArrowLeft size={15} />
              Back
            </button>
            <button onClick={onClose}>
              <X size={18} className="text-gray-400" />
            </button>
          </div>
        )}

        <div className="px-6 pt-8 pb-10">

          {/* Step 1 — Type */}
          {step === 1 && (
            <div>
              <div className="flex items-center justify-end mb-8">
                <button onClick={onClose}>
                  <X size={18} className="text-gray-400" />
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleTypeSelect(true)}
                  className="flex-1 py-10 text-lg font-medium border border-gray-200 text-black hover:bg-black hover:text-white transition-colors"
                >
                  Expense
                </button>
                <button
                  onClick={() => handleTypeSelect(false)}
                  className="flex-1 py-10 text-lg font-medium border border-gray-200 text-black hover:bg-black hover:text-white transition-colors"
                >
                  Income
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — Amount */}
          {step === 2 && (
            <div>
              <div className="flex items-start gap-2 mb-10">
                <span className="text-4xl font-thin text-gray-300 pt-2">$</span>
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
                  className="text-6xl font-thin flex-1 outline-none text-black min-w-0"
                />
              </div>
              {error && <p className="text-xs text-black mb-4">{error}</p>}
              <button onClick={handleAmountNext} className="w-full py-4 bg-black text-white text-sm font-medium">
                Continue
              </button>
            </div>
          )}

          {/* Step 3 — Category (expenses only) */}
          {step === 3 && (
            <div>
              <p className="text-2xl font-thin text-gray-300 mb-6">Category?</p>
              <div className="flex flex-wrap gap-2 mb-8">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(c => c === cat ? '' : cat)}
                    className={`text-sm px-4 py-2 border transition-colors capitalize ${
                      category === cat
                        ? 'border-black bg-black text-white'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(4)} className="w-full py-4 bg-black text-white text-sm font-medium">
                {category ? 'Continue' : 'Skip'}
              </button>
            </div>
          )}

          {/* Step 4 — Description */}
          {step === 4 && (
            <div>
              <p className="text-2xl font-thin text-gray-300 mb-6">What for?</p>
              <input
                ref={descRef}
                type="text"
                placeholder={category || 'Optional'}
                value={description}
                onChange={e => setDescription(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && setStep(5)}
                className="w-full text-xl font-thin outline-none text-black border-b border-gray-200 pb-3 mb-8"
              />
              <button onClick={() => setStep(5)} className="w-full py-4 bg-black text-white text-sm font-medium">
                {description ? 'Continue' : 'Skip'}
              </button>
            </div>
          )}

          {/* Step 5 — Date (custom picker) */}
          {step === 5 && (
            <div>
              <p className="text-2xl font-thin text-gray-300 mb-6">Date?</p>
              <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-8">
                <button
                  onClick={() => shiftDate(-1)}
                  className="p-2 text-gray-400 active:text-black"
                >
                  <ChevronLeft size={22} />
                </button>
                <p className="text-base font-medium text-black text-center">{formattedDate}</p>
                <button
                  onClick={() => shiftDate(1)}
                  className="p-2 text-gray-400 active:text-black"
                >
                  <ChevronRight size={22} />
                </button>
              </div>
              <button onClick={() => setStep(6)} className="w-full py-4 bg-black text-white text-sm font-medium">
                Continue
              </button>
            </div>
          )}

          {/* Step 6 — Repeat? */}
          {step === 6 && (
            <div>
              <p className="text-2xl font-thin text-gray-300 mb-6">Repeat?</p>
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
                      className={`text-sm px-4 py-2 border transition-colors capitalize ${
                        isSelected
                          ? 'border-black bg-black text-white'
                          : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
              {error && <p className="text-xs text-black mb-4">{error}</p>}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-4 bg-black text-white text-sm font-medium disabled:opacity-40"
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
