import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const CATEGORIES = ['groceries', 'dining', 'transport', 'shopping', 'health', 'entertainment']
const currentMonth = new Date().toISOString().slice(0, 7)

function Budgets() {
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [newLimit, setNewLimit] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const userIdRef = useRef(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      userIdRef.current = user.id
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('month', currentMonth)
        .eq('user_id', user.id)
      if (!error) setBudgets(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave(category) {
    const parsed = parseFloat(newLimit)
    if (!newLimit || isNaN(parsed) || parsed <= 0) {
      setSaveError('Enter a positive amount.')
      return
    }

    setSaving(true)
    setSaveError('')

    const existing = budgets.find(b => b.category === category)
    const { error } = existing
      ? await supabase.from('budgets').update({ monthly_limit: parsed }).eq('id', existing.id)
      : await supabase.from('budgets').insert({
          user_id: userIdRef.current,
          category,
          monthly_limit: parsed,
          month: currentMonth
        })

    if (error) {
      setSaveError('Failed to save. Try again.')
    } else {
      setEditing(null)
      setNewLimit('')
      const { data } = await supabase
        .from('budgets')
        .select('*')
        .eq('month', currentMonth)
        .eq('user_id', userIdRef.current)
      if (data) setBudgets(data)
    }
    setSaving(false)
  }

  function startEditing(category) {
    const existing = budgets.find(b => b.category === category)
    setEditing(category)
    setNewLimit(existing?.monthly_limit?.toString() || '')
    setSaveError('')
  }

  function cancelEditing() {
    setEditing(null)
    setNewLimit('')
    setSaveError('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-40">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <p className="text-2xl font-bold text-black mb-2">Budgets</p>
      <p className="text-sm text-gray-400 mb-8">
        Monthly limits for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
      </p>

      {CATEGORIES.map(category => {
        const existing = budgets.find(b => b.category === category)
        const isEditing = editing === category

        return (
          <div key={category} className="mb-6 pb-6 border-b border-gray-100">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-black capitalize">{category}</p>
              {!isEditing && (
                <button onClick={() => startEditing(category)} className="text-xs text-gray-400">
                  {existing ? `$${existing.monthly_limit.toLocaleString()} — Edit` : 'Set limit'}
                </button>
              )}
            </div>

            {isEditing && (
              <div className="mt-3">
                <div className="flex items-center gap-3">
                  <span className="text-base text-gray-400">$</span>
                  <input
                    type="number"
                    value={newLimit}
                    onChange={e => setNewLimit(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="1"
                    inputMode="decimal"
                    autoFocus
                    className="flex-1 text-base outline-none border-b border-gray-300 pb-1"
                  />
                  <button
                    onClick={() => handleSave(category)}
                    disabled={saving}
                    className="text-sm font-medium text-black disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={cancelEditing} className="text-sm text-gray-400">
                    Cancel
                  </button>
                </div>
                {saveError && <p className="text-xs text-red-500 mt-2">{saveError}</p>}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default Budgets
