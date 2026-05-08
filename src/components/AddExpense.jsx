import { useState } from 'react'

function AddExpense({ onClose }) {
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')

  return (
    <div className="fixed inset-0 bg-white z-50 p-6">
      <div className="flex justify-between items-center mb-8">
        <button onClick={onClose} className="text-sm text-gray-500">Cancel</button>
        <p className="text-sm font-medium">Add expense</p>
        <button className="text-sm font-medium text-black">Save</button>
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