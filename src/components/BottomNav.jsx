import { Link, useLocation } from 'react-router-dom'
import { Home, List, PieChart, User } from 'lucide-react'

function BottomNav() {
  const { pathname } = useLocation()

  const tabs = [
    { label: 'Home',         path: '/',             icon: Home },
    { label: 'Transactions', path: '/transactions', icon: List },
    { label: 'Plan',         path: '/plan',         icon: PieChart },
    { label: 'Profile',      path: '/profile',      icon: User },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 border-t border-line flex justify-around items-start pt-2.5"
      style={{
        height: 'calc(4.25rem + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        backgroundColor: 'rgba(251, 250, 247, 0.85)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
      }}
    >
      {tabs.map(({ label, path, icon: Icon }) => {
        const active = pathname === path
        return (
          <Link
            key={path}
            to={path}
            className="flex flex-col items-center gap-1.5 w-16 group"
          >
            <Icon
              size={21}
              strokeWidth={active ? 2.25 : 1.75}
              className={`transition-colors ${active ? 'text-ink' : 'text-faint group-active:text-ink-soft'}`}
            />
            <span className={`text-[10px] tracking-wide transition-colors ${active ? 'text-ink font-semibold' : 'text-faint'}`}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

export default BottomNav
