import { Link } from 'react-router-dom'

function BottomNav() {
  return (
    <nav>
      <Link to="/">Home</Link>
      <Link to="/transactions">Transactions</Link>
      <Link to="/plan">Plan</Link>
      <Link to="/profile">Profile</Link>
    </nav>
  )
}

export default BottomNav