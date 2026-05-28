import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function Budgets() {
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [newLimit, setNewLimit] = useState('')

  const currentMonth = new Date().toISOString().slice(0, 7)

  const categories = [
    'groceries', 'dining', 'transport', 'shopping', 'health', 'entertainment'
  ]

  useEffect(() => {
    fetchBudgets()
  }, [])

  async function fetchBudgets() {
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('month', currentMonth)
      .eq('user_id', user.id)

    if (error) {
      console.log('Error:', error.message)
    } else {
      setBudgets(data)
    }
    setLoading(false)
  }

  async function handleSave(category) {
    if (!newLimit) return

    const { data: { user } } = await supabase.auth.getUser()

    const existing = budgets.find(b => b.category === category)

    if (existing) {
      await supabase
        .from('budgets')
        .update({ monthly_limit: parseFloat(newLimit) })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('budgets')
        .insert({
          user_id: user.id,
          category,
          monthly_limit: parseFloat(newLimit),
          month: currentMonth
        })
    }

    setEditing(null)
    setNewLimit('')
    fetchBudgets()
  }

  if (loading) return <div className="p-6 text-sm text-gray-400">Loading...</div>

  return (
    <div className="p-6 max-w-md mx-auto">
      <p className="text-2xl font-bold text-black mb-2">Budgets</p>
      <p className="text-sm text-gray-400 mb-8">Set your monthly limits for {currentMonth}</p>

      {categories.map(category => {
        const existing = budgets.find(b => b.category === category)
        const isEditing = editing === category

        return (
          <div key={category} className="mb-6 pb-6 border-b border-gray-100">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-black capitalize">{category}</p>
              {!isEditing && (
                <button
                  onClick={() => {
                    setEditing(category)
                    setNewLimit(existing?.monthly_limit?.toString() || '')
                  }}
                  className="text-xs text-gray-400"
                >
                  {existing ? `$${existing.monthly_limit} — Edit` : 'Set limit'}
                </button>
              )}
            </div>

            {isEditing && (
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="number"
                  value={newLimit}
                  onChange={e => setNewLimit(e.target.value)}
                  placeholder="0"
                  className="flex-1 text-base outline-none border-b border-gray-300 pb-1"
                />
                <button
                  onClick={() => handleSave(category)}
                  className="text-sm font-medium text-black"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditing(null)}
                  className="text-sm text-gray-400"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default Budgets