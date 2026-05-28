import { useState } from 'react'
import { supabase } from '../lib/supabase'

function AddExpense({ onClose, onSave }) {
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')
  const [description, setDescription] = useState('')
  const [isExpense, setIsExpense] = useState(true)

  async function handleSave() {
    if (!amount) {
      alert('Please enter an amount')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        description: description || category || (isExpense ? 'Expense' : 'Income'),
        amount: isExpense ? parseFloat(amount) * -1 : parseFloat(amount),
        category,
        note,
        date: new Date().toISOString().split('T')[0]
      })

    if (error) {
      console.log('Error saving:', error.message)
      return
    }

    onSave()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-white z-50 p-6">
      <div className="flex justify-between items-center mb-6">
        <button onClick={onClose} className="text-sm text-gray-500">Cancel</button>
        <p className="text-sm font-medium">{isExpense ? 'Add expense' : 'Add income'}</p>
        <button onClick={handleSave} className="text-sm font-medium text-black">Save</button>
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
        <input
          type="number"
          placeholder="0.00"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="text-5xl font-thin w-full outline-none text-black"
        />
      </div>

      <div className="mb-6">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Description</p>
        <input
          type="text"
          placeholder="e.g. Coffee Bar"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="text-xl font-thin w-full outline-none text-black border-b border-gray-200 pb-2"
        />
      </div>

      <div className="mb-6">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Category</p>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="w-full text-base outline-none text-black bg-white"
        >
          <option value="">Select category</option>
          <option value="groceries">Groceries</option>
          <option value="dining">Dining</option>
          <option value="transport">Transport</option>
          <option value="shopping">Shopping</option>
          <option value="health">Health</option>
          <option value="entertainment">Entertainment</option>
        </select>
      </div>

      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Note</p>
        <input
          type="text"
          placeholder="Optional"
          value={note}
          onChange={e => setNote(e.target.value)}
          className="w-full text-base outline-none text-black"
        />
      </div>
    </div>
  )
}

export default AddExpense