import { useState } from 'react'
import { supabase } from '../lib/supabase'

function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }

    setLoading(true)
    setError('')

    const { error } = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })

    if (error) setError(error.message)
    setLoading(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSubmit()
  }

  function toggleMode() {
    setIsLogin(v => !v)
    setError('')
  }

  return (
    <div className="min-h-screen flex flex-col justify-center p-8 max-w-md mx-auto">
      <div className="mb-12">
        <p className="text-sm text-gray-500 mb-1">Welcome to</p>
        <p className="text-4xl font-thin text-black">Allowance</p>
      </div>

      <div className="mb-6">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Email</p>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="email"
          className="w-full text-base outline-none text-black border-b border-gray-200 pb-2"
        />
      </div>

      <div className="mb-8">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Password</p>
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          className="w-full text-base outline-none text-black border-b border-gray-200 pb-2"
        />
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-black text-white text-sm font-medium py-4 rounded-full mb-4 disabled:opacity-50 transition-opacity"
      >
        {loading ? 'Please wait...' : isLogin ? 'Log in' : 'Sign up'}
      </button>

      <button onClick={toggleMode} className="text-sm text-gray-400 text-center">
        {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
      </button>
    </div>
  )
}

export default Auth
