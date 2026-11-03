import { useCallback, useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toFriendlyError } from '../lib/errors'
import { closeSurvey, getSurveyById, getSurveyResults } from '../lib/surveyApi'
import type { Survey, SurveyResults } from '../lib/types'

export function PresentationPage() {
  const { id = '' } = useParams()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [results, setResults] = useState<SurveyResults | null>(null)
  const [qrCode, setQrCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const surveyUrl = survey?.public_slug ? `${window.location.origin}/s/${survey.public_slug}` : ''

  const refresh = useCallback(async () => {
    try {
      const [surveyData, resultsData] = await Promise.all([getSurveyById(id), getSurveyResults(id)])
      setSurvey(surveyData)
      setResults(resultsData)
      setError('')
      if (surveyData.public_slug) {
        setQrCode(await QRCode.toDataURL(`${window.location.origin}/s/${surveyData.public_slug}`, { width: 700, margin: 2, errorCorrectionLevel: 'H' }))
      }
    } catch (cause) {
      setError(toFriendlyError(cause))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    const initialTimer = window.setTimeout(() => { void refresh() }, 0)
    const timer = window.setInterval(() => { void refresh() }, 10000)
    return () => {
      window.clearTimeout(initialTimer)
      window.clearInterval(timer)
    }
  }, [refresh])

  async function handleClose() {
    if (!window.confirm(`Close “${survey?.title}”? Students will no longer be able to submit responses.`)) return
    setBusy(true)
    setError('')
    try {
      await closeSurvey(id)
      navigate('/dashboard')
    } catch (cause) {
      setError(toFriendlyError(cause))
      setBusy(false)
    }
  }

  if (loading) return <main className="center-state">Loading presentation…</main>
  if (error && !survey) return <main className="presentation-error"><div role="alert" className="notice notice-error">{error}</div><Link to="/dashboard">Back to surveys</Link></main>
  if (!survey || survey.status !== 'active') return <main className="presentation-error"><h1>This survey is not active.</h1><p className="muted">Activate it from the instructor dashboard to present the QR code.</p><Link className="button button-primary" to="/dashboard">Back to surveys</Link></main>

  return (
    <main className="presentation-page">
      <div className="presentation-topline"><Link to="/dashboard">← Dashboard</Link><span>Classroom display</span></div>
      {error && <div role="alert" className="notice notice-error">{error}</div>}
      <section className="presentation-content">
        <span className="eyebrow">Scan to participate</span>
        <h1>{survey.title}</h1>
        {survey.description && <p className="presentation-description">{survey.description}</p>}
        {qrCode && <img className="presentation-qr" src={qrCode} alt={`QR code linking to ${surveyUrl}`} />}
        <a className="presentation-url" href={surveyUrl}>{surveyUrl}</a>
        <div className="presentation-count"><strong>{results?.response_count ?? 0}</strong><span>responses</span></div>
        <p className="presentation-help">Open your camera and point it at the code.</p>
      </section>
      <footer className="presentation-actions">
        <Link className="button button-secondary" to={`/surveys/${id}/results`}>View results</Link>
        {qrCode && <a className="button button-secondary" href={qrCode} download={`${survey.public_slug}-qr.png`}>Download QR PNG</a>}
        <button className="button button-danger" onClick={() => void handleClose()} disabled={busy}>{busy ? 'Closing…' : 'Close survey'}</button>
      </footer>
    </main>
  )
}

