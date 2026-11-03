import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { useAuth } from '../auth/authContext'
import { toFriendlyError } from '../lib/errors'
import { isSupabaseConfigured } from '../lib/supabase'

export function LoginPage() {
  const { session, signIn } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const returnTo = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  if (session) return <Navigate to={returnTo} replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signIn(email.trim(), password)
    } catch (cause) {
      setError(toFriendlyError(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <AppHeader showDashboard={false} />
      <main className="auth-page">
        <section className="panel auth-panel">
          <Link className="back-link" to="/">← Home</Link>
          <span className="eyebrow">Instructor access</span>
          <h1>Log in</h1>
          <p className="muted">Use your instructor account to manage classroom surveys.</p>
          {!isSupabaseConfigured() && <div role="alert" className="notice notice-warning">Supabase credentials are not configured yet.</div>}
          {error && <div role="alert" className="notice notice-error">{error}</div>}
          <form onSubmit={handleSubmit} className="form-stack">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
            <label htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
            <button className="button button-primary button-full" disabled={busy || !isSupabaseConfigured()}>
              {busy ? 'Logging in…' : 'Log in'}
            </button>
          </form>
        </section>
      </main>
    </>
  )
}

