import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import { toFriendlyError } from '../lib/errors'
import { isDemoLoginEnabled } from '../lib/supabase'

const demoLoginBuildEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true'
const demoEmail = demoLoginBuildEnabled ? 'instructor@uconn.edu' : ''
const demoPassword = demoLoginBuildEnabled ? '123456' : ''

export function AppHeader({ showDashboard = true }: { showDashboard?: boolean }) {
  const { session, signIn, signOut } = useAuth()
  const [demoBusy, setDemoBusy] = useState(false)
  const navigate = useNavigate()

  async function handleDemoLogin() {
    setDemoBusy(true)
    try {
      await signIn(demoEmail, demoPassword)
      navigate('/dashboard')
    } catch (error) {
      window.alert(toFriendlyError(error))
    } finally {
      setDemoBusy(false)
    }
  }

  async function handleSignOut() {
    try {
      await signOut()
      navigate('/')
    } catch (error) {
      window.alert(toFriendlyError(error))
    }
  }

  return (
    <header className="app-header">
      <Link to="/" className="brand">Classroom Survey</Link>
      <nav aria-label="Instructor navigation" className="header-nav">
        {showDashboard && session && <Link to="/dashboard">Dashboard</Link>}
        {session ? (
          <>
            <span className="user-email">{session.user.email}</span>
            <button className="button button-quiet" onClick={handleSignOut}>Log out</button>
          </>
        ) : (
          <>
            {isDemoLoginEnabled() && <button className="button button-primary" onClick={() => void handleDemoLogin()} disabled={demoBusy}>{demoBusy ? 'Opening demo…' : 'Use demo instructor'}</button>}
            <Link to="/login">Instructor login</Link>
          </>
        )}
      </nav>
    </header>
  )
}

