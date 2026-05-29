import { Link, useLocation } from 'react-router-dom'
import { Home, List, PieChart, User } from 'lucide-react'

function BottomNav() {
  const { pathname } = useLocation()

  const tabs = [
    { label: 'Home',         path: '/',             icon: Home },
    { label: 'Transactions', path: '/transactions',  icon: List },
    { label: 'Plan',         path: '/plan',          icon: PieChart },
    { label: 'Profile',      path: '/profile',       icon: User },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around items-center h-16">
      {tabs.map(({ label, path, icon: Icon }) => {
        const active = pathname === path
        return (
          <Link
            key={path}
            to={path}
            className="flex flex-col items-center gap-1 w-16"
          >
            <Icon
              size={22}
              strokeWidth={active ? 2.5 : 1.5}
              className={active ? 'text-black' : 'text-gray-400'}
            />
            <span className={`text-xs ${active ? 'text-black font-semibold' : 'text-gray-400'}`}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

export default BottomNav
