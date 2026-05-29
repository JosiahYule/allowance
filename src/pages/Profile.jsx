import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Check, X } from 'lucide-react'

function Profile() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [monthlyIncome, setMonthlyIncome] = useState(null)
  const [editingIncome, setEditingIncome] = useState(false)
  const [incomeInput, setIncomeInput] = useState('')
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [savingIncome, setSavingIncome] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setEmail(user?.email || '')
      if (user) {
        const { data } = await supabase
          .from('user_settings')
          .select('monthly_income')
          .eq('user_id', user.id)
          .maybeSingle()
        setMonthlyIncome(data?.monthly_income ?? null)
      }
    })
  }, [])

  async function saveIncome() {
    const parsed = parseFloat(incomeInput)
    setSavingIncome(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('user_settings').upsert({
      user_id: user.id,
      monthly_income: incomeInput === '' ? null : (isNaN(parsed) ? null : parsed),
      updated_at: new Date().toISOString(),
    })
    setMonthlyIncome(incomeInput === '' ? null : (isNaN(parsed) ? null : parsed))
    setEditingIncome(false)
    setSavingIncome(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  const fmt = (v) => v != null ? `$${v.toLocaleString('en-CA', { minimumFractionDigits: 2 })}` : 'Not set'

  return (
    <div className="px-6 pt-10 pb-6 max-w-md mx-auto">
      <p className="text-2xl font-semibold text-black mb-8">Profile</p>

      <div className="mb-6 pb-6 border-b border-gray-100">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Account</p>
        <p className="text-sm text-black">{email}</p>
      </div>

      {/* Monthly income */}
      <div className="mb-6 pb-6 border-b border-gray-100">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Monthly Income</p>
        {editingIncome ? (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-400">$</span>
            <input
              type="number"
              inputMode="decimal"
              value={incomeInput}
              onChange={e => setIncomeInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveIncome()}
              placeholder="0.00"
              className="flex-1 text-sm outline-none border-b border-gray-200 pb-1"
              autoFocus
            />
            <button onClick={saveIncome} disabled={savingIncome} className="disabled:opacity-50">
              <Check size={16} className="text-black" />
            </button>
            <button onClick={() => setEditingIncome(false)}>
              <X size={16} className="text-gray-300" />
            </button>
          </div>
        ) : (
          <div
            className="flex justify-between items-center cursor-pointer"
            onClick={() => { setIncomeInput(monthlyIncome != null ? String(monthlyIncome) : ''); setEditingIncome(true) }}
          >
            <p className="text-sm text-black">{fmt(monthlyIncome)}</p>
            <span className="text-gray-300 text-xl">›</span>
          </div>
        )}
      </div>

      <div
        onClick={() => navigate('/budgets')}
        className="mb-6 pb-6 border-b border-gray-100 cursor-pointer flex justify-between items-center"
      >
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Budgets</p>
          <p className="text-sm text-black">Set and edit monthly limits</p>
        </div>
        <span className="text-gray-300 text-xl">›</span>
      </div>

      <div
        onClick={() => navigate('/categories')}
        className="mb-6 pb-6 border-b border-gray-100 cursor-pointer flex justify-between items-center"
      >
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Categories</p>
          <p className="text-sm text-black">Manage custom spending categories</p>
        </div>
        <span className="text-gray-300 text-xl">›</span>
      </div>

      {!showLogoutConfirm ? (
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full text-sm text-red-500 font-medium py-4 text-left"
        >
          Log out
        </button>
      ) : (
        <div className="flex items-center gap-4 py-4">
          <p className="text-sm text-gray-500 flex-1">Log out of your account?</p>
          <button onClick={handleLogout} className="text-sm font-medium text-red-500">Yes, log out</button>
          <button onClick={() => setShowLogoutConfirm(false)} className="text-sm text-gray-400">Cancel</button>
        </div>
      )}
    </div>
  )
}

export default Profile
