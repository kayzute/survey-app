import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AppHeader } from '../components/AppHeader'
import { toFriendlyError } from '../lib/errors'
import { downloadSurveyCsv } from '../lib/csv'
import { getSurveyById, getSurveyResults } from '../lib/surveyApi'
import type { Survey, SurveyResults } from '../lib/types'

export function ResultsPage() {
  const { id = '' } = useParams()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [results, setResults] = useState<SurveyResults | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      const [surveyData, resultData] = await Promise.all([getSurveyById(id), getSurveyResults(id)])
      setSurvey(surveyData)
      setResults(resultData)
      setError('')
    } catch (cause) {
      setError(toFriendlyError(cause))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh() }, 0)
    return () => window.clearTimeout(timer)
  }, [refresh])

  async function handleExport() {
    setBusy(true)
    setError('')
    try { await downloadSurveyCsv(id) } catch (cause) { setError(toFriendlyError(cause)) } finally { setBusy(false) }
  }

  return (
    <>
      <AppHeader />
      <main className="page-container">
        <Link className="back-link" to="/dashboard">← Back to surveys</Link>
        {loading ? <div className="center-state">Loading results…</div> : error && !results ? <div role="alert" className="notice notice-error">{error}</div> : (
          <>
            {error && <div role="alert" className="notice notice-error">{error}</div>}
            <div className="page-heading">
              <div><span className="eyebrow">Survey results</span><h1>{survey?.title}</h1><p className="muted">{results?.response_count ?? 0} response{results?.response_count === 1 ? '' : 's'}</p></div>
              <div className="heading-actions">
                {survey?.status === 'active' && <Link className="button button-secondary" to={`/surveys/${id}/present`}>Present QR</Link>}
                <button className="button button-secondary" onClick={() => void handleExport()} disabled={busy}>{busy ? 'Preparing…' : 'Export CSV'}</button>
                <button className="button button-quiet" onClick={() => void refresh()}>Refresh results</button>
              </div>
            </div>
            {results?.questions.length === 0 ? <section className="panel empty-state"><h2>No questions yet</h2></section> : (
              <div className="results-list">
                {results?.questions.map((question, index) => (
                  <section className="panel result-card" key={question.question_id}>
                    <div className="result-heading"><div><span className="eyebrow">Question {index + 1}</span><h2>{question.question_text}</h2></div><span className="response-count">{question.response_count} answer{question.response_count === 1 ? '' : 's'}</span></div>
                    {!question.response_count ? <p className="muted">No answers yet.</p> : (
                      <>
                        <div className="chart-wrap" aria-label={`Answer chart for ${question.question_text}`}>
                          <ResponsiveContainer width="100%" height={Math.max(180, question.choices.length * 48)}>
                            <BarChart data={question.choices} layout="vertical" margin={{ top: 8, right: 35, bottom: 8, left: 10 }}>
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                              <XAxis type="number" allowDecimals={false} />
                              <YAxis type="category" dataKey="choice_text" width={135} tick={{ fontSize: 13 }} />
                              <Tooltip formatter={(value, _name, item) => [`${value} (${item.payload.percentage}%)`, 'Responses']} />
                              <Bar dataKey="count" fill="#2563eb" radius={[0, 5, 5, 0]} label={{ position: 'right', fill: '#334155', fontSize: 12 }} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <ul className="choice-results">
                          {question.choices.map((choice) => <li key={choice.choice_id}><span>{choice.choice_text}</span><strong>{choice.count} <span className="muted">({choice.percentage}%)</span></strong></li>)}
                        </ul>
                      </>
                    )}
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </>
  )
}

