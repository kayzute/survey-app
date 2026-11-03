import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { toFriendlyError } from '../lib/errors'
import { getAnonymousToken, hasSubmittedSurvey, markSurveySubmitted } from '../lib/anonymousToken'
import { getActiveSurveyBySlug, submitSurveyResponse } from '../lib/surveyApi'
import type { Survey } from '../lib/types'

export function StudentSurveyPage() {
  const { slug = '' } = useParams()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    void getActiveSurveyBySlug(slug).then((loaded) => {
      if (cancelled) return
      setSurvey(loaded)
      setAlreadySubmitted(hasSubmittedSurvey(loaded.id))
    }).catch((cause: unknown) => {
      if (!cancelled) setError(toFriendlyError(cause))
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [slug])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!survey) return
    const questions = survey.questions ?? []
    const missing = questions.some((question) => !answers[question.id])
    if (missing) { setError('Please answer every question before submitting.'); return }
    setError('')
    setSubmitting(true)
    try {
      await submitSurveyResponse(survey.id, getAnonymousToken(), questions.map((question) => ({ question_id: question.id, choice_id: answers[question.id] })))
      markSurveySubmitted(survey.id)
      setSubmitted(true)
    } catch (cause) {
      const message = toFriendlyError(cause)
      if (message.includes('already been submitted')) setAlreadySubmitted(true)
      else setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <main className="student-state">Loading survey…</main>
  if (error && !survey) return <main className="student-state"><section className="panel student-message"><h1>Survey unavailable</h1><p role="alert">{error}</p></section></main>
  if (!survey) return null
  if (submitted || alreadySubmitted) return <main className="student-state"><section className="panel student-message success-message"><span className="success-icon" aria-hidden="true">✓</span><h1>{submitted ? 'Thank you!' : 'Response already received'}</h1><p>{submitted ? 'Your response has been recorded.' : 'You have already submitted a response to this survey.'}</p></section></main>

  return (
    <main className="student-page">
      <div className="student-brand">Classroom Survey</div>
      <header className="student-heading"><span className="eyebrow">Quick class check</span><h1>{survey.title}</h1>{survey.description && <p>{survey.description}</p>}</header>
      {error && <div role="alert" className="notice notice-error">{error}</div>}
      <form className="student-form" onSubmit={handleSubmit}>
        {(survey.questions ?? []).map((question, index) => (
          <fieldset className="panel student-question" key={question.id}>
            <legend><span className="question-number">{index + 1}</span>{question.question_text}</legend>
            <div className="student-choices">
              {question.choices.map((choice) => (
                <label className={`student-choice ${answers[question.id] === choice.id ? 'is-selected' : ''}`} key={choice.id}>
                  <input type="radio" name={question.id} value={choice.id} checked={answers[question.id] === choice.id} onChange={() => setAnswers((current) => ({ ...current, [question.id]: choice.id }))} />
                  <span>{choice.choice_text}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <button className="button button-primary button-full student-submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit response'}</button>
        <p className="student-privacy">No student account is needed. One response is accepted from this browser.</p>
      </form>
    </main>
  )
}

