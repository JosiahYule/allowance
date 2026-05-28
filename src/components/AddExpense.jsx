import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { ArrowLeft, X } from 'lucide-react'

const CATEGORIES = ['groceries', 'dining', 'transport', 'shopping', 'health', 'entertainment']

// Steps: 1 = type, 2 = amount, 3 = category, 4 = description, 5 = date
function AddExpense({ onClose, onSave }) {
  const [step, setStep] = useState(1)
  const [isExpense, setIsExpense] = useState(true)
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const amountRef = useRef(null)
  const descRef = useRef(null)

  useEffect(() => {
    if (step === 2) amountRef.current?.focus()
    if (step === 4) descRef.current?.focus()
  }, [step])

  function back() {
    setError('')
    setStep(s => s - 1)
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
    setStep(3)
  }

  async function handleSave() {
    const parsed = parseFloat(amount)
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    const { error: insertError } = await supabase.from('transactions').insert({
      user_id: user.id,
      description: description || category || (isExpense ? 'Expense' : 'Income'),
      amount: isExpense ? parsed * -1 : parsed,
      category: category || null,
      date
    })

    if (insertError) {
      setError('Failed to save. Try again.')
      setSaving(false)
      return
    }
    onSave()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-white z-50 border-t border-gray-200">

        {/* Nav bar — hidden on step 1 */}
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
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  className="text-6xl font-thin flex-1 outline-none text-black min-w-0"
                />
              </div>
              {error && <p className="text-xs text-black mb-4">{error}</p>}
              <button
                onClick={handleAmountNext}
                className="w-full py-4 bg-black text-white text-sm font-medium"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 3 — Category */}
          {step === 3 && (
            <div>
              <p className="text-2xl font-thin text-gray-300 mb-6">Category?</p>
              <div className="flex flex-wrap gap-2 mb-8">
                {CATEGORIES.map(cat => (
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
              <button
                onClick={() => setStep(4)}
                className="w-full py-4 bg-black text-white text-sm font-medium"
              >
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
                className="w-full text-xl font-thin outline-none text-black border-b border-gray-200 pb-3 mb-8"
              />
              <button
                onClick={() => setStep(5)}
                className="w-full py-4 bg-black text-white text-sm font-medium"
              >
                {description ? 'Continue' : 'Skip'}
              </button>
            </div>
          )}

          {/* Step 5 — Date */}
          {step === 5 && (
            <div>
              <p className="text-2xl font-thin text-gray-300 mb-6">Date?</p>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full text-xl font-thin outline-none text-black border-b border-gray-200 pb-3 mb-8"
              />
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
