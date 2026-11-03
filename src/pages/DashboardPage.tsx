import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { toFriendlyError } from '../lib/errors'
import { activateSurvey, closeSurvey, duplicateSurvey, listSurveys } from '../lib/surveyApi'
import type { Survey, SurveyStatus } from '../lib/types'

const statusLabels: Record<SurveyStatus, string> = {
  draft: 'Draft', active: 'Active', closed: 'Closed', archived: 'Archived',
}

export function DashboardPage() {
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<SurveyStatus | 'all'>('all')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const refresh = useCallback(async () => {
    try {
      const surveyRows = await listSurveys()
      setSurveys(surveyRows)
      setError('')
    } catch (cause) {
      setError(toFriendlyError(cause))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh() }, 0)
    return () => window.clearTimeout(timer)
  }, [refresh])

  const filtered = useMemo(() => surveys.filter((survey) =>
    survey.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
    && (status === 'all' || survey.status === status)), [search, status, surveys])

  async function handleActivate(survey: Survey) {
    setBusyId(survey.id)
    setError('')
    try {
      const activated = await activateSurvey(survey.id)
      await refresh()
      navigate(`/surveys/${activated.id}/present`)
    } catch (cause) {
      setError(toFriendlyError(cause))
    } finally {
      setBusyId(null)
    }
  }

  async function handleClose(survey: Survey) {
    setBusyId(survey.id)
    setError('')
    try {
      await closeSurvey(survey.id)
      await refresh()
    } catch (cause) {
      setError(toFriendlyError(cause))
    } finally {
      setBusyId(null)
    }
  }

  async function handleDuplicate(survey: Survey) {
    setBusyId(survey.id)
    setError('')
    try {
      const copy = await duplicateSurvey(survey.id)
      navigate(`/surveys/${copy.id}/edit`)
    } catch (cause) {
      setError(toFriendlyError(cause))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <AppHeader />
      <main className="page-container">
        <div className="page-heading">
          <div><span className="eyebrow">Instructor workspace</span><h1>Surveys</h1><p className="muted">Prepare a quick check or review past results.</p></div>
          <Link className="button button-primary" to="/surveys/new">New survey</Link>
        </div>
        {error && <div role="alert" className="notice notice-error">{error}</div>}
        <div className="toolbar">
          <label className="search-field">Search surveys<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by title" /></label>
          <label>Status<select value={status} onChange={(event) => setStatus(event.target.value as SurveyStatus | 'all')}>
            <option value="all">All statuses</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
        </div>
        {loading ? <div className="center-state">Loading surveys…</div> : filtered.length === 0 ? (
          <section className="empty-state panel">
            <h2>{surveys.length ? 'No surveys match your filters.' : 'You have not created any surveys yet.'}</h2>
            <p className="muted">Create a survey with multiple-choice or true/false questions.</p>
            {!surveys.length && <Link className="button button-primary" to="/surveys/new">Create your first survey</Link>}
          </section>
        ) : (
          <div className="survey-grid">
            {filtered.map((survey) => (
              <article className="panel survey-card" key={survey.id}>
                <div className="survey-card-top"><span className={`status-badge status-${survey.status}`}>{statusLabels[survey.status]}</span><span className="survey-date">Created {new Date(survey.created_at).toLocaleDateString()}</span></div>
                <h2>{survey.title}</h2>
                {survey.description && <p className="muted clamp-two">{survey.description}</p>}
                <div className="card-actions">
                  {survey.status === 'draft' && <Link className="button button-secondary" to={`/surveys/${survey.id}/edit`}>Edit</Link>}
                  {survey.status === 'draft' && <button className="button button-primary" onClick={() => void handleActivate(survey)} disabled={busyId === survey.id}>{busyId === survey.id ? 'Activating…' : 'Activate'}</button>}
                  {survey.status === 'active' && <Link className="button button-primary" to={`/surveys/${survey.id}/present`}>Present</Link>}
                  {survey.status === 'active' && <button className="button button-secondary" onClick={() => void handleClose(survey)} disabled={busyId === survey.id}>{busyId === survey.id ? 'Closing…' : 'Close'}</button>}
                  {survey.status !== 'draft' && <Link className="button button-secondary" to={`/surveys/${survey.id}/results`}>Results</Link>}
                  <button className="button button-quiet" onClick={() => void handleDuplicate(survey)} disabled={busyId === survey.id}>{busyId === survey.id ? 'Copying…' : 'Duplicate'}</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  )
}

