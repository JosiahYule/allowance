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
    <div className="min-h-screen flex flex-col justify-center px-8 max-w-md mx-auto">
      <div className="mb-14">
        <p className="eyebrow mb-3">Welcome to</p>
        <p className="font-display font-light text-6xl text-ink tracking-tight">Allowance</p>
        <p className="text-[15px] text-muted mt-4 leading-relaxed">
          The simplest way to see what you have left to spend.
        </p>
      </div>

      <div className="mb-5">
        <label className="eyebrow block mb-2.5">Email</label>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="email"
          className="w-full text-[16px] outline-none text-ink placeholder-faint border-b border-line pb-2.5 bg-transparent focus:border-ink transition-colors"
        />
      </div>

      <div className="mb-9">
        <label className="eyebrow block mb-2.5">Password</label>
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          className="w-full text-[16px] outline-none text-ink placeholder-faint border-b border-line pb-2.5 bg-transparent focus:border-ink transition-colors"
        />
      </div>

      {error && <p className="text-[13px] text-danger mb-5">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="btn-primary w-full text-sm py-4 mb-5"
      >
        {loading ? 'Please wait…' : isLogin ? 'Log in' : 'Create account'}
      </button>

      <button onClick={toggleMode} className="text-[13px] text-muted text-center active:text-ink transition-colors">
        {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
      </button>
    </div>
  )
}

export default Auth
