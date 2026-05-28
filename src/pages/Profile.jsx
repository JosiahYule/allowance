import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

function Profile() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email || '')
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <p className="text-2xl font-bold text-black mb-8">Profile</p>

      <div className="mb-6 pb-6 border-b border-gray-100">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Account</p>
        <p className="text-sm text-black">{email}</p>
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

      <button
        onClick={handleLogout}
        className="w-full text-sm text-red-500 font-medium py-4 text-left"
      >
        Log out
      </button>
    </div>
  )
}

export default Profile
