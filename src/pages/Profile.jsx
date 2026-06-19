import { useState, useEffect } from 'react'
import { supabase, getCurrentUser } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, X, Check, Wallet, Tag, LogOut, PieChart, Repeat, ArrowRightLeft } from 'lucide-react'

function Row({ icon: Icon, label, value, onPress }) {
  return (
    <button
      onClick={onPress}
      className="w-full flex items-center gap-3.5 py-3.5 text-left active:opacity-60 transition-opacity"
    >
      <div className="w-9 h-9 rounded-2xl bg-fill flex items-center justify-center flex-shrink-0">
        <Icon size={16} className="text-ink-soft" />
      </div>
      <p className="text-[15px] text-ink flex-1">{label}</p>
      {value && <p className="text-[14px] text-muted tabular-nums">{value}</p>}
      <ChevronRight size={16} className="text-faint" />
    </button>
  )
}

function ToggleRow({ icon: Icon, label, hint, on, onToggle, busy }) {
  return (
    <div className="w-full flex items-center gap-3.5 py-3.5">
      <div className="w-9 h-9 rounded-2xl bg-fill flex items-center justify-center flex-shrink-0">
        <Icon size={16} className="text-ink-soft" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] text-ink">{label}</p>
        {hint && <p className="text-[12px] text-muted mt-0.5">{hint}</p>}
      </div>
      <button
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={busy}
        onClick={onToggle}
        className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors disabled:opacity-50 ${on ? 'bg-ink' : 'bg-line'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-surface transition-transform ${on ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  )
}

function Profile() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [monthlyIncome, setMonthlyIncome] = useState(null)
  const [editingIncome, setEditingIncome] = useState(false)
  const [incomeInput, setIncomeInput] = useState('')
  const [savingIncome, setSavingIncome] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [rolloverEnabled, setRolloverEnabled] = useState(true)
  const [savingRollover, setSavingRollover] = useState(false)

  useEffect(() => {
    getCurrentUser().then(async (user) => {
      const raw = user?.email?.split('@')[0] || ''
      setDisplayName(raw.charAt(0).toUpperCase() + raw.slice(1))
      setEmail(user?.email || '')
      if (user) {
        const { data } = await supabase
          .from('user_settings')
          .select('monthly_income, rollover_enabled')
          .eq('user_id', user.id)
          .maybeSingle()
        setMonthlyIncome(data?.monthly_income ?? null)
        setRolloverEnabled(data?.rollover_enabled ?? true)
      }
    })
  }, [])

  async function toggleRollover() {
    const next = !rolloverEnabled
    setRolloverEnabled(next)
    setSavingRollover(true)
    const user = await getCurrentUser()
    const { error } = await supabase.from('user_settings').upsert({
      user_id: user.id,
      rollover_enabled: next,
      updated_at: new Date().toISOString(),
    })
    if (error) setRolloverEnabled(!next) // revert on failure (e.g. column not migrated)
    setSavingRollover(false)
  }

  async function saveIncome() {
    const parsed = parseFloat(incomeInput)
    const value = incomeInput === '' || isNaN(parsed) ? null : parsed
    setSavingIncome(true)
    const user = await getCurrentUser()
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

  return (
    <div className="max-w-md mx-auto px-5">

      {/* User hero */}
      <div className="pt-16 pb-9">
        <div className="w-16 h-16 bg-ink rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl font-display font-light text-paper">{displayName.charAt(0) || '?'}</span>
        </div>
        <p className="text-2xl font-semibold text-ink tracking-tight">{displayName}</p>
        <p className="text-[14px] text-muted mt-1">{email}</p>
      </div>

      {/* Finances */}
      <div className="card p-2.5 mb-5">
        {editingIncome ? (
          <div className="flex items-center gap-3 px-3 py-3">
            <div className="w-9 h-9 rounded-2xl bg-fill flex items-center justify-center flex-shrink-0">
              <Wallet size={16} className="text-ink-soft" />
            </div>
            <p className="text-[15px] text-ink flex-1">Income</p>
            <span className="text-[14px] text-muted">$</span>
            <input
              type="number"
              inputMode="decimal"
              value={incomeInput}
              onChange={e => setIncomeInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveIncome()}
              placeholder="0"
              className="w-20 text-[15px] text-right outline-none border-b border-line pb-0.5 bg-transparent tabular-nums"
              autoFocus
            />
            <button onClick={saveIncome} disabled={savingIncome} className="disabled:opacity-50 pl-1 text-accent">
              <Check size={17} />
            </button>
            <button onClick={() => setEditingIncome(false)} className="text-faint">
              <X size={17} />
            </button>
          </div>
        ) : (
          <Row
            icon={Wallet}
            label="Monthly income"
            value={fmtIncome(monthlyIncome)}
            onPress={() => { setIncomeInput(monthlyIncome != null ? String(monthlyIncome) : ''); setEditingIncome(true) }}
          />
        )}
        <div className="h-px bg-line mx-3" />
        <ToggleRow
          icon={ArrowRightLeft}
          label="Roll over leftover"
          hint="Carry last month’s remainder into this month"
          on={rolloverEnabled}
          onToggle={toggleRollover}
          busy={savingRollover}
        />
        <div className="h-px bg-line mx-3" />
        <Row icon={PieChart} label="Budgets" onPress={() => navigate('/plan')} />
        <div className="h-px bg-line mx-3" />
        <Row icon={Repeat} label="Recurring" onPress={() => navigate('/recurring')} />
        <div className="h-px bg-line mx-3" />
        <Row icon={Tag} label="Categories" onPress={() => navigate('/categories')} />
      </div>

      {/* Account */}
      <p className="eyebrow px-3 mb-2">Account</p>
      <div className="card p-2.5">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-3.5 py-3.5 text-left active:opacity-60 transition-opacity"
        >
          <div className="w-9 h-9 rounded-2xl bg-fill flex items-center justify-center flex-shrink-0">
            <LogOut size={16} className="text-danger" />
          </div>
          <p className="text-[15px] text-ink">{loggingOut ? 'Signing out…' : 'Sign out'}</p>
        </button>
      </div>

      <p className="text-center text-[12px] text-faint mt-8">Allowance</p>
    </div>
  )
}

export default Profile
