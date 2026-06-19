import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Plus } from 'lucide-react'
import Home from './pages/Home'
import Auth from './pages/Auth'
import BottomNav from './components/BottomNav'
import AddExpense from './components/AddExpense'
import Toast from './components/Toast'
import { supabase } from './lib/supabase'
import { currentMonth, todayStr, getMonthRange, addMonths } from './lib/dates'
import { recurringDueDates } from './lib/recurring'

// Code-split the secondary routes so the initial load only ships Home + Auth.
const Transactions = lazy(() => import('./pages/Transactions'))
const Plan = lazy(() => import('./pages/Plan'))
const Profile = lazy(() => import('./pages/Profile'))
const Categories = lazy(() => import('./pages/Categories'))
const Recurring = lazy(() => import('./pages/Recurring'))
const Onboarding = lazy(() => import('./pages/Onboarding'))

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-7 h-7 border-2 border-line border-t-ink rounded-full animate-spin" />
    </div>
  )
}

// Guard so the (potentially many) recurring queries run at most once per user
// per app load — onAuthStateChange fires INITIAL_SESSION on top of getSession().
const processedRecurring = new Set()

async function processRecurringTransactions(userId) {
  if (processedRecurring.has(userId)) return
  processedRecurring.add(userId)
  try {
    const today = todayStr()
    // Backfill the current month plus the two prior, so bills still post for
    // months the app wasn't opened — without unbounded historical generation.
    const months = [currentMonth(), addMonths(currentMonth(), -1), addMonths(currentMonth(), -2)]
    const earliestStart = getMonthRange(months[months.length - 1]).start

    const { data: templates, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('recurring', true)
      .is('recurring_parent_id', null)

    if (error || !templates?.length) return

    // One read of instances already generated in the window, instead of a query
    // per template per due date.
    const { data: existing } = await supabase
      .from('transactions')
      .select('recurring_parent_id, date')
      .eq('user_id', userId)
      .gte('date', earliestStart)
      .not('recurring_parent_id', 'is', null)
    const have = new Set((existing || []).map(e => `${e.recurring_parent_id}|${e.date}`))

    const toInsert = []
    for (const tmpl of templates) {
      for (const month of months) {
        for (const due of recurringDueDates(tmpl, month)) {
          if (due > today) continue          // not due yet
          if (due === tmpl.date) continue     // the template row already is this occurrence
          if (have.has(`${tmpl.id}|${due}`)) continue
          have.add(`${tmpl.id}|${due}`)
          toInsert.push({
            user_id: userId,
            description: tmpl.description,
            amount: tmpl.amount,
            category: tmpl.category,
            date: due,
            recurring: false,
            recurring_parent_id: tmpl.id,
          })
        }
      }
    }

    // The partial unique index on (recurring_parent_id, date) makes this safe
    // even if two app instances race — duplicates are rejected, not duplicated.
    if (toInsert.length) await supabase.from('transactions').insert(toInsert)
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
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <Spinner />

  if (!session) return <Auth />

  // Show onboarding until setup_complete — null means still checking (show spinner)
  if (setupComplete === null) return <Spinner />

  if (!setupComplete) {
    return (
      <Suspense fallback={<Spinner />}>
        <Onboarding
          user={session.user}
          onComplete={() => {
            setSetupComplete(true)
            setRefreshKey(k => k + 1)
          }}
        />
      </Suspense>
    )
  }

  return (
    <BrowserRouter>
      <div style={{ paddingBottom: 'calc(9rem + env(safe-area-inset-bottom, 0px))' }}>
        <Suspense fallback={<Spinner />}>
          <Routes>
            <Route path="/" element={<Home refreshKey={refreshKey} />} />
            <Route path="/transactions" element={<Transactions refreshKey={refreshKey} onRefresh={() => setRefreshKey(k => k + 1)} />} />
            <Route path="/plan" element={<Plan refreshKey={refreshKey} onRefresh={() => setRefreshKey(k => k + 1)} />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/recurring" element={<Recurring />} />
          </Routes>
        </Suspense>
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
        aria-label="Add transaction"
        style={{
          bottom: 'calc(4.25rem + env(safe-area-inset-bottom, 0px) + 0.875rem)',
          boxShadow: '0 8px 28px -6px rgba(26, 25, 23, 0.45)',
        }}
        className="fixed left-1/2 -translate-x-1/2 bg-ink text-paper text-sm font-medium pl-5 pr-6 py-3.5 rounded-full z-10 flex items-center gap-1.5 active:scale-[0.97] transition-transform"
      >
        <Plus size={17} strokeWidth={2.5} />
        Add
      </button>
      <BottomNav />
    </BrowserRouter>
  )
}

export default App
