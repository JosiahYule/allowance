import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Transactions from './pages/Transactions'
import Plan from './pages/Plan'
import Profile from './pages/Profile'
import Auth from './pages/Auth'
import Budgets from './pages/Budgets'
import Categories from './pages/Categories'
import Onboarding from './pages/Onboarding'
import BottomNav from './components/BottomNav'
import AddExpense from './components/AddExpense'
import Toast from './components/Toast'
import { supabase } from './lib/supabase'

async function processRecurringTransactions(userId) {
  try {
    const today = new Date().toISOString().split('T')[0]
    const currentMonth = today.slice(0, 7)
    const startOfMonth = `${currentMonth}-01`

    const { data: templates, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('recurring', true)
      .is('recurring_parent_id', null)

    if (error || !templates?.length) return

    for (const tmpl of templates) {
      // Template itself was created this month — it IS the instance, don't duplicate
      if (tmpl.date >= startOfMonth) continue

      const { data: existing } = await supabase
        .from('transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('recurring_parent_id', tmpl.id)
        .gte('date', startOfMonth)

      if (existing?.length) continue

      const tmplDate = new Date(tmpl.date + 'T00:00:00')
      const dayOfMonth = tmplDate.getDate()
      const [cy, cm] = currentMonth.split('-').map(Number)
      const maxDay = new Date(cy, cm, 0).getDate()
      const dueDateStr = `${currentMonth}-${String(Math.min(dayOfMonth, maxDay)).padStart(2, '0')}`

      if (dueDateStr > today) continue

      await supabase.from('transactions').insert({
        user_id: userId,
        description: tmpl.description,
        amount: tmpl.amount,
        category: tmpl.category,
        date: dueDateStr,
        recurring: false,
        recurring_parent_id: tmpl.id,
      })
    }
  } catch {
    // Silently skip if recurring columns don't exist yet (migration not run)
  }
}

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [setupComplete, setSetupComplete] = useState(null) // null=unknown, true/false
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [toast, setToast] = useState(null)

  const showToast = useCallback((msg) => setToast(msg), [])
  const dismissToast = useCallback(() => setToast(null), [])

  async function loadUserSettings(userId) {
    try {
      const { data } = await supabase
        .from('user_settings')
        .select('setup_complete')
        .eq('user_id', userId)
        .maybeSingle()
      setSetupComplete(data?.setup_complete ?? false)
    } catch {
      setSetupComplete(false)
    }
  }

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session)
        setLoading(false)
        if (session?.user) {
          processRecurringTransactions(session.user.id)
          loadUserSettings(session.user.id)
        }
      })
      .catch(() => setLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        processRecurringTransactions(session.user.id)
        loadUserSettings(session.user.id)
      } else {
        setSetupComplete(null)
        setMonthlyIncome(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return <Auth />

  // Show onboarding until setup_complete — null means still checking (show spinner)
  if (setupComplete === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    )
  }

  if (!setupComplete) {
    return (
      <Onboarding
        user={session.user}
        onComplete={() => {
          setSetupComplete(true)
          setRefreshKey(k => k + 1)
        }}
      />
    )

  }

  return (
    <BrowserRouter>
      <div style={{ paddingBottom: 'calc(9rem + env(safe-area-inset-bottom, 0px))' }}>
        <Routes>
          <Route path="/" element={<Home refreshKey={refreshKey} />} />
          <Route path="/transactions" element={<Transactions refreshKey={refreshKey} onRefresh={() => setRefreshKey(k => k + 1)} />} />
          <Route path="/plan" element={<Plan refreshKey={refreshKey} />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/categories" element={<Categories />} />
        </Routes>
      </div>

      {showAddExpense && (
        <AddExpense
          onClose={() => setShowAddExpense(false)}
          onSave={() => {
            setRefreshKey(k => k + 1)
            setShowAddExpense(false)
            showToast('Saved')
          }}
        />
      )}

      {toast && <Toast message={toast} onDismiss={dismissToast} />}

      <button
        onClick={() => setShowAddExpense(true)}
        style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px) + 1rem)' }}
        className="fixed left-1/2 -translate-x-1/2 bg-black text-white text-sm font-medium px-8 py-4 rounded-full shadow-lg z-10"
      >
        + Add
      </button>
      <BottomNav />
    </BrowserRouter>
  )
}

export default App
