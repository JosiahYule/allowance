import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Transactions from './pages/Transactions'
import Plan from './pages/Plan'
import Profile from './pages/Profile'
import Auth from './pages/Auth'
import BottomNav from './components/BottomNav'
import AddExpense from './components/AddExpense'
import { supabase } from './lib/supabase'
import Budgets from './pages/Budgets'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session)
        setLoading(false)
      })
      .catch(() => setLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
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

  return (
    <BrowserRouter>
      <div className="pb-16">
        <Routes>
          <Route path="/" element={<Home refreshKey={refreshKey} />} />
          <Route path="/transactions" element={<Transactions refreshKey={refreshKey} />} />
          <Route path="/plan" element={<Plan refreshKey={refreshKey} />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/budgets" element={<Budgets />} />
        </Routes>
      </div>

      {showAddExpense && (
        <AddExpense
          onClose={() => setShowAddExpense(false)}
          onSave={() => {
            setRefreshKey(k => k + 1)
            setShowAddExpense(false)
          }}
        />
      )}

      <button
        onClick={() => setShowAddExpense(true)}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-black text-white text-sm font-medium px-8 py-4 rounded-full shadow-lg z-10"
      >
        + Add expense
      </button>
      <BottomNav />
    </BrowserRouter>
  )
}

export default App
