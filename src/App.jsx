import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Transactions from './pages/Transactions'
import Plan from './pages/Plan'
import Profile from './pages/Profile'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/plan" element={<Plan />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App