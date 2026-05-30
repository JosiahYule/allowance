import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { DEFAULT_CATEGORIES, fetchAllCategories } from '../lib/categories'
import { CategoryIcon } from '../lib/categoryIcons'

function Budgets() {
  const navigate = useNavigate()
  const [budgets, setBudgets] = useState([])
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)
  const [customIcons, setCustomIcons] = useState({})
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

      const currentMonth = new Date().toISOString().slice(0, 7)
      const [{ data: budgetData }, allCats] = await Promise.all([
        supabase.from('budgets').select('*').eq('month', currentMonth).eq('user_id', user.id),
        fetchAllCategories(user.id),
      ])

      // build custom icon map
      try {
        const { data } = await supabase.from('user_categories').select('name, icon').eq('user_id', user.id)
        setCustomIcons(Object.fromEntries((data || []).map(c => [c.name, c.icon])))
      } catch { /* ignore */ }

      setBudgets(budgetData ?? [])
      setCategories(allCats)
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

    const currentMonth = new Date().toISOString().slice(0, 7)
    const existing = budgets.find(b => b.category === category)
    const { error } = existing
      ? await supabase.from('budgets').update({ monthly_limit: parsed }).eq('id', existing.id)
      : await supabase.from('budgets').insert({
          user_id: userIdRef.current,
          category,
          monthly_limit: parsed,
          month: currentMonth,
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-line border-t-ink rounded-full animate-spin" />
      </div>
    )
  }

  const currentMonthLabel = new Date().toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="px-5 pt-12 pb-8 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate(-1)} className="text-ink-soft active:opacity-60">
          <ArrowLeft size={20} />
        </button>
        <p className="text-2xl font-semibold text-ink tracking-tight">Budgets</p>
      </div>
      <p className="text-[14px] text-muted mb-8 pl-8">Monthly limits for {currentMonthLabel}</p>

      <div className="card p-2.5">
        {categories.map((category, i) => {
          const existing = budgets.find(b => b.category === category)
          const isEditing = editing === category

          return (
            <div key={category}>
              {i > 0 && <div className="h-px bg-line mx-3" />}
              <div className="px-3 py-3.5">
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-2xl bg-fill flex items-center justify-center flex-shrink-0">
                    <CategoryIcon category={category} size={16} className="text-ink-soft" customIcons={customIcons} />
                  </div>
                  <p className="text-[15px] font-medium text-ink capitalize flex-1">{category}</p>
                  {!isEditing && (
                    <button onClick={() => startEditing(category)} className="text-[13px] text-muted tabular-nums active:text-ink transition-colors">
                      {existing ? `$${existing.monthly_limit.toLocaleString()} · Edit` : 'Set limit'}
                    </button>
                  )}
                </div>

                {isEditing && (
                  <div className="mt-3 pl-[3.125rem]">
                    <div className="flex items-center gap-3">
                      <span className="text-base text-muted">$</span>
                      <input
                        type="number"
                        value={newLimit}
                        onChange={e => setNewLimit(e.target.value)}
                        placeholder="0"
                        min="0"
                        step="1"
                        inputMode="decimal"
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && handleSave(category)}
                        className="flex-1 text-base outline-none border-b border-line pb-1 bg-transparent tabular-nums focus:border-ink transition-colors"
                      />
                      <button
                        onClick={() => handleSave(category)}
                        disabled={saving}
                        className="text-[13px] font-semibold text-accent disabled:opacity-50"
                      >
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button onClick={cancelEditing} className="text-[13px] text-muted">Cancel</button>
                    </div>
                    {saveError && <p className="text-[12px] text-danger mt-2">{saveError}</p>}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Budgets
