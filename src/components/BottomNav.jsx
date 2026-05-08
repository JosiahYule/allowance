import { Link, useLocation } from 'react-router-dom'
import { Home, List, PieChart, User } from 'lucide-react'

function BottomNav() {
  const location = useLocation()

  const tabs = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Transactions', path: '/transactions', icon: List },
    { label: 'Plan', path: '/plan', icon: PieChart },
    { label: 'Profile', path: '/profile', icon: User },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16">
      {tabs.map(tab => {
        const Icon = tab.icon
        const isActive = location.pathname === tab.path
        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={`flex flex-col items-center gap-1 text-xs font-medium ${
              isActive ? 'text-black' : 'text-gray-400'
            }`}
          >
            <Icon size={20} />
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}

export default BottomNav