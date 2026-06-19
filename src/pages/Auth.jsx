import { useState } from 'react'
import { supabase } from '../lib/supabase'

// Friendlier copy for the auth errors users actually hit.
function friendlyError(message) {
  const m = (message || '').toLowerCase()
  if (m.includes('invalid login')) return 'That email or password doesn’t look right.'
  if (m.includes('already registered') || m.includes('already been registered')) return 'That email already has an account. Try logging in.'
  if (m.includes('password should be')) return 'Password must be at least 6 characters.'
  if (m.includes('unable to validate email') || m.includes('invalid email')) return 'Please enter a valid email address.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many attempts. Give it a minute and try again.'
  return message || 'Something went wrong. Try again.'
}

function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function handleSubmit() {
    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }
    setLoading(true)
    setError('')
    setNotice('')

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(friendlyError(error.message))
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(friendlyError(error.message))
      } else if (!data.session) {
        // Email confirmation is on — there's no session yet. Tell the user
        // instead of leaving them on a screen that looks like nothing happened.
        setNotice(`Almost there — check ${email} for a confirmation link to finish signing up.`)
      }
      // If a session came back, onAuthStateChange in App takes over automatically.
    }
    setLoading(false)
  }

  async function handleReset() {
    if (!email) {
      setError('Enter your email first, then tap reset.')
      return
    }
    setLoading(true)
    setError('')
    setNotice('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    if (error) setError(friendlyError(error.message))
    else setNotice(`If an account exists for ${email}, a reset link is on its way.`)
    setLoading(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSubmit()
  }

  function toggleMode() {
    setIsLogin(v => !v)
    setError('')
    setNotice('')
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
        <label htmlFor="auth-email" className="eyebrow block mb-2.5">Email</label>
        <input
          id="auth-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="email"
          className="w-full text-[16px] outline-none text-ink placeholder-faint border-b border-line pb-2.5 bg-transparent focus:border-ink transition-colors"
        />
      </div>

      <div className="mb-3">
        <div className="flex items-baseline justify-between mb-2.5">
          <label htmlFor="auth-password" className="eyebrow">Password</label>
          {isLogin && (
            <button onClick={handleReset} className="text-[12px] text-muted active:text-ink transition-colors">
              Forgot?
            </button>
          )}
        </div>
        <input
          id="auth-password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          className="w-full text-[16px] outline-none text-ink placeholder-faint border-b border-line pb-2.5 bg-transparent focus:border-ink transition-colors"
        />
      </div>

      {error && <p className="text-[13px] text-danger mb-5 mt-2">{error}</p>}
      {notice && <p className="text-[13px] text-accent mb-5 mt-2 leading-relaxed">{notice}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="btn-primary w-full text-sm py-4 mb-5 mt-3"
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
