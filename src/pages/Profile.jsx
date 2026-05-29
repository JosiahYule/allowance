import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, X, Check } from 'lucide-react'

function Profile() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [monthlyIncome, setMonthlyIncome] = useState(null)
  const [editingIncome, setEditingIncome] = useState(false)
  const [incomeInput, setIncomeInput] = useState('')
  const [savingIncome, setSavingIncome] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      const raw = user?.email?.split('@')[0] || ''
      setDisplayName(raw.charAt(0).toUpperCase() + raw.slice(1))
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
    const value = incomeInput === '' || isNaN(parsed) ? null : parsed
    setSavingIncome(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('user_settings').upsert({
      user_id: user.id,
      monthly_income: value,
      updated_at: new Date().toISOString(),
    })
    setMonthlyIncome(value)
    setEditingIncome(false)
    setSavingIncome(false)
  }

  async function handleLogout() {
    setLoggingOut(true)
    await supabase.auth.signOut()
  }

  const fmtIncome = (v) => v != null
    ? '$' + v.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' / mo'
    : 'Not set'

  const Row = ({ label, value, onPress, chevron = true }) => (
    <button
      onClick={onPress}
      className="w-full flex items-center justify-between py-4 border-b border-gray-100 text-left"
    >
      <p className="text-sm text-black">{label}</p>
      <div className="flex items-center gap-2">
        {value && <p className="text-sm text-gray-400">{value}</p>}
        {chevron && <ChevronRight size={15} className="text-gray-300" />}
      </div>
    </button>
  )

  return (
    <div className="max-w-md mx-auto">

      {/* User hero */}
      <div className="px-6 pt-14 pb-8 border-b border-gray-100">
        <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl font-bold text-white">{displayName.charAt(0) || '?'}</span>
        </div>
        <p className="text-2xl font-bold text-black">{displayName}</p>
        <p className="text-sm text-gray-400 mt-1">{email}</p>
      </div>

      <div className="px-6 pt-6 pb-6">

        {/* Finances */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Finances</p>

        {editingIncome ? (
          <div className="flex items-center gap-3 py-4 border-b border-gray-100">
            <p className="text-sm text-black flex-1">Monthly income</p>
            <span className="text-sm text-gray-400">$</span>
            <input
              type="number"
              inputMode="decimal"
              value={incomeInput}
              onChange={e => setIncomeInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveIncome()}
              placeholder="0"
              className="w-24 text-sm text-right outline-none border-b border-gray-200 pb-0.5"
              autoFocus
            />
            <button onClick={saveIncome} disabled={savingIncome} className="disabled:opacity-50 pl-1">
              <Check size={15} className="text-black" />
            </button>
            <button onClick={() => setEditingIncome(false)}>
              <X size={15} className="text-gray-300" />
            </button>
          </div>
        ) : (
          <Row
            label="Monthly income"
            value={fmtIncome(monthlyIncome)}
            onPress={() => { setIncomeInput(monthlyIncome != null ? String(monthlyIncome) : ''); setEditingIncome(true) }}
          />
        )}

        <Row label="Budgets" onPress={() => navigate('/budgets')} />
        <Row label="Categories" onPress={() => navigate('/categories')} />

        {/* Account */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-8 mb-1">Account</p>

        {!loggingOut ? (
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between py-4 border-b border-gray-100 text-left"
          >
            <p className="text-sm text-black">Sign out</p>
          </button>
        ) : (
          <div className="flex items-center justify-between py-4 border-b border-gray-100">
            <p className="text-sm text-gray-400">Signing out...</p>
          </div>
        )}

      </div>
    </div>
  )
}

export default Profile
