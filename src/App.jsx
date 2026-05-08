import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Transactions from './pages/Transactions'
import Plan from './pages/Plan'
import Profile from './pages/Profile'
import BottomNav from './components/BottomNav'

function App() {
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
      <button className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-black text-white text-sm font-medium px-8 py-4 rounded-full shadow-lg">
        + Add expense
      </button>
      <BottomNav />
    </BrowserRouter>
  )
}

export default App