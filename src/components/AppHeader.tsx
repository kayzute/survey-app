import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import { toFriendlyError } from '../lib/errors'

export function AppHeader({ showDashboard = true }: { showDashboard?: boolean }) {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()

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
        ) : <Link to="/login">Instructor login</Link>}
      </nav>
    </header>
  )
}

