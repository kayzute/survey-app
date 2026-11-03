import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { isSupabaseConfigured } from '../lib/supabase'

export function HomePage() {
  return (
    <>
      <AppHeader showDashboard={false} />
      <main className="hero-page">
        <section className="hero-card">
          <span className="eyebrow">Quick classroom check-ins</span>
          <h1>Find out what your class understands.</h1>
          <p>Create a short survey, project its QR code, and see responses as they arrive.</p>
          {!isSupabaseConfigured() && (
            <p className="setup-note" role="status">
              Connect Supabase to run the app: copy <code>.env.example</code> to <code>.env.local</code> and add your project URL and anon key.
            </p>
          )}
          <Link className="button button-primary" to="/login">Instructor login</Link>
        </section>
      </main>
    </>
  )
}

