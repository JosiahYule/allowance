import { supabase } from '../lib/supabase'

function Profile() {
  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <p className="text-2xl font-bold text-black mb-8">Profile</p>

      <div className="mb-6 pb-6 border-b border-gray-100">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Account</p>
        <p className="text-sm text-black">Manage your account settings</p>
      </div>

      <div className="mb-6 pb-6 border-b border-gray-100">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Budgets</p>
        <p className="text-sm text-black">Set and edit monthly budgets</p>
      </div>

      <div className="mb-6 pb-6 border-b border-gray-100">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Notifications</p>
        <p className="text-sm text-black">Manage alerts and reminders</p>
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