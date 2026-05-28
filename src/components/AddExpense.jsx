import { useState } from 'react'
import { supabase } from '../lib/supabase'

const CATEGORIES = ['groceries', 'dining', 'transport', 'shopping', 'health', 'entertainment']

function AddExpense({ onClose, onSave }) {
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')
  const [description, setDescription] = useState('')
  const [isExpense, setIsExpense] = useState(true)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    const parsed = parseFloat(amount)
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setError('Please enter a valid amount.')
      return
    }
    if (!description && !category) {
      setError('Please add a description or select a category.')
      return
    }

    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()

    const { error: insertError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        description: description || category,
        amount: isExpense ? parsed * -1 : parsed,
        category: category || null,
        note: note || null,
        date
      })

    if (insertError) {
      setError('Failed to save. Please try again.')
      setSaving(false)
      return
    }

    onSave()
  }

  return (
    <div className="fixed inset-0 bg-white z-50 p-6 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <button onClick={onClose} className="text-sm text-gray-500">Cancel</button>
        <p className="text-sm font-medium">{isExpense ? 'Add expense' : 'Add income'}</p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-sm font-medium text-black disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="flex bg-gray-100 rounded-full p-1 mb-8">
        <button
          onClick={() => setIsExpense(true)}
          className={`flex-1 text-sm font-medium py-2 rounded-full transition-all ${
            isExpense ? 'bg-white text-black shadow-sm' : 'text-gray-400'
          }`}
        >
          Expense
        </button>
        <button
          onClick={() => setIsExpense(false)}
          className={`flex-1 text-sm font-medium py-2 rounded-full transition-all ${
            !isExpense ? 'bg-white text-black shadow-sm' : 'text-gray-400'
          }`}
        >
          Income
        </button>
      </div>

      <div className="mb-6">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Amount</p>
        <div className="flex items-start gap-1">
          <span className="text-3xl font-thin text-gray-400 mt-2">$</span>
          <input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            min="0"
            step="0.01"
            inputMode="decimal"
            autoFocus
            className="text-5xl font-thin flex-1 outline-none text-black"
          />
        </div>
      </div>

      <div className="mb-6">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Description</p>
        <input
          type="text"
          placeholder="e.g. Coffee at Tim's"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="text-xl font-thin w-full outline-none text-black border-b border-gray-200 pb-2"
        />
      </div>

      <div className="mb-6">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Category</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(c => c === cat ? '' : cat)}
              className={`text-sm px-3 py-1.5 rounded-full border transition-all capitalize ${
                category === cat
                  ? 'border-black bg-black text-white'
                  : 'border-gray-200 text-gray-500'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Date</p>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full text-base outline-none text-black border-b border-gray-200 pb-2"
        />
      </div>

      <div className="mb-6">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Note</p>
        <input
          type="text"
          placeholder="Optional"
          value={note}
          onChange={e => setNote(e.target.value)}
          className="w-full text-base outline-none text-black border-b border-gray-200 pb-2"
        />
      </div>

      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </div>
  )
}

export default AddExpense
