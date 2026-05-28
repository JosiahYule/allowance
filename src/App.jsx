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

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAddExpense, setShowAddExpense] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <div className="p-6 text-sm text-gray-400">Loading...</div>

  if (!session) return <Auth />

  return (
    <BrowserRouter>
      <div className="pb-16">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/plan" element={<Plan />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>

      {showAddExpense && (
        <AddExpense onClose={() => setShowAddExpense(false)} />
      )}

      <button
        onClick={() => setShowAddExpense(true)}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-black text-white text-sm font-medium px-8 py-4 rounded-full shadow-lg"
      >
        + Add expense
      </button>
      <BottomNav />
    </BrowserRouter>
  )
}

export default App