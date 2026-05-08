import { Link, useLocation } from 'react-router-dom'

function BottomNav() {
  const location = useLocation()

  const tabs = [
    { label: 'Home', path: '/' },
    { label: 'Transactions', path: '/transactions' },
    { label: 'Plan', path: '/plan' },
    { label: 'Profile', path: '/profile' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16">
      {tabs.map(tab => (
        <Link
          key={tab.path}
          to={tab.path}
          className={`flex flex-col items-center text-xs font-medium ${
            location.pathname === tab.path
              ? 'text-black'
              : 'text-gray-400'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}

export default BottomNav