import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { toFriendlyError } from '../lib/errors'
import { validateDraft } from '../lib/draftValidation'
import { getSurveyById, saveSurveyDraft } from '../lib/surveyApi'
import type { DraftQuestionInput, QuestionType } from '../lib/types'

interface EditableQuestion extends DraftQuestionInput {
  key: string
}

let questionKeyFallback = 0

function newQuestion(type: QuestionType = 'multiple_choice'): EditableQuestion {
  return {
    // randomUUID is restricted to secure contexts in some browsers. The app's
    // LAN test uses HTTP, so keep question creation working there too.
    key: globalThis.crypto?.randomUUID?.() ?? `question-${Date.now()}-${++questionKeyFallback}`,
    question_text: '',
    question_type: type,
    choices: type === 'true_false'
      ? [{ choice_text: 'True' }, { choice_text: 'False' }]
      : [{ choice_text: '' }, { choice_text: '' }],
  }
}

export function SurveyEditorPage() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const [surveyId, setSurveyId] = useState<string | null>(isNew ? null : id)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [questions, setQuestions] = useState<EditableQuestion[]>([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (isNew || !id) return
    let cancelled = false
    void getSurveyById(id).then((survey) => {
      if (cancelled) return
      if (survey.status !== 'draft') {
        setError('Only draft surveys can be edited. Close the survey before making changes.')
        return
      }
      setSurveyId(survey.id)
      setTitle(survey.title)
      setDescription(survey.description ?? '')
      setQuestions((survey.questions ?? []).map((question) => ({
        key: question.id,
        question_text: question.question_text,
        question_type: question.question_type,
        choices: question.choices.map((choice) => ({ choice_text: choice.choice_text })),
      })))
    }).catch((cause: unknown) => {
      if (!cancelled) setError(toFriendlyError(cause))
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id, isNew])

  function updateQuestion(key: string, update: Partial<EditableQuestion>) {
    setQuestions((items) => items.map((question) => question.key === key ? { ...question, ...update } : question))
  }

  function updateChoice(question: EditableQuestion, index: number, text: string) {
    const choices = [...question.choices]
    choices[index] = { choice_text: text }
    updateQuestion(question.key, { choices })
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    const destination = index + direction
    if (destination < 0 || destination >= questions.length) return
    const next = [...questions]
    ;[next[index], next[destination]] = [next[destination], next[index]]
    setQuestions(next)
  }

  function moveChoice(question: EditableQuestion, index: number, direction: -1 | 1) {
    const destination = index + direction
    if (destination < 0 || destination >= question.choices.length) return
    const choices = [...question.choices]
    ;[choices[index], choices[destination]] = [choices[destination], choices[index]]
    updateQuestion(question.key, { choices })
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validation = validateDraft(title, questions)
    if (validation) { setError(validation); return }
    setError('')
    setSaving(true)
    try {
      const saved = await saveSurveyDraft(surveyId, title.trim(), description.trim(), questions.map(({ question_text, question_type, choices }) => ({ question_text, question_type, choices })))
      setSurveyId(saved.id)
      navigate(`/surveys/${saved.id}/edit`, { replace: true })
    } catch (cause) {
      setError(toFriendlyError(cause))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <main className="center-state">Loading survey…</main>

  return (
    <>
      <AppHeader />
      <main className="page-container editor-page">
        <Link className="back-link" to="/dashboard">← Back to surveys</Link>
        <div className="page-heading compact-heading">
          <div><span className="eyebrow">Survey editor</span><h1>{isNew ? 'Create a survey' : 'Edit draft'}</h1><p className="muted">Add a title and questions. Your changes are saved as a draft.</p></div>
          <button form="survey-editor" className="button button-primary" disabled={saving}>{saving ? 'Saving…' : 'Save draft'}</button>
        </div>
        {error && <div role="alert" className="notice notice-error">{error}</div>}
        <form id="survey-editor" onSubmit={handleSave} className="editor-form">
          <section className="panel form-section">
            <label htmlFor="survey-title">Survey title</label>
            <input id="survey-title" maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="For example, Recursion concept check" required />
            <label htmlFor="survey-description">Description <span className="muted">(optional)</span></label>
            <textarea id="survey-description" rows={3} maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="A short note for students" />
          </section>

          <div className="question-heading"><h2>Questions</h2><span className="muted">{questions.length} total</span></div>
          {questions.length === 0 && <section className="panel empty-inline"><p className="muted">Add at least one question before activating this survey.</p></section>}
          <div className="question-list">
            {questions.map((question, index) => (
              <section className="panel question-card" key={question.key}>
                <div className="question-card-header">
                  <h3>Question {index + 1}</h3>
                  <div className="icon-actions">
                    <button type="button" className="button button-quiet button-small" aria-label={`Move question ${index + 1} up`} onClick={() => moveQuestion(index, -1)} disabled={index === 0}>↑</button>
                    <button type="button" className="button button-quiet button-small" aria-label={`Move question ${index + 1} down`} onClick={() => moveQuestion(index, 1)} disabled={index === questions.length - 1}>↓</button>
                    <button type="button" className="button button-danger-quiet button-small" onClick={() => setQuestions((items) => items.filter((item) => item.key !== question.key))}>Delete</button>
                  </div>
                </div>
                <label htmlFor={`question-${question.key}`}>Question text</label>
                <textarea id={`question-${question.key}`} rows={2} maxLength={500} value={question.question_text} onChange={(event) => updateQuestion(question.key, { question_text: event.target.value })} required />
                <label htmlFor={`type-${question.key}`}>Question type</label>
                <select id={`type-${question.key}`} value={question.question_type} onChange={(event) => {
                  const type = event.target.value as QuestionType
                  updateQuestion(question.key, { question_type: type, choices: type === 'true_false' ? [{ choice_text: 'True' }, { choice_text: 'False' }] : [{ choice_text: '' }, { choice_text: '' }] })
                }}>
                  <option value="multiple_choice">Multiple choice</option>
                  <option value="true_false">True / False</option>
                </select>
                <fieldset className="choices-fieldset">
                  <legend>Answer choices</legend>
                  {question.choices.map((choice, choiceIndex) => (
                    <div className="choice-row" key={`${question.key}-${choiceIndex}`}>
                      <span className="choice-mark" aria-hidden="true">{String.fromCharCode(65 + choiceIndex)}</span>
                      <input aria-label={`Question ${index + 1}, choice ${choiceIndex + 1}`} value={choice.choice_text} onChange={(event) => updateChoice(question, choiceIndex, event.target.value)} disabled={question.question_type === 'true_false'} required />
                      {question.question_type === 'multiple_choice' && <>
                        <button type="button" className="button button-quiet button-small" aria-label={`Move choice ${choiceIndex + 1} up in question ${index + 1}`} onClick={() => moveChoice(question, choiceIndex, -1)} disabled={choiceIndex === 0}>↑</button>
                        <button type="button" className="button button-quiet button-small" aria-label={`Move choice ${choiceIndex + 1} down in question ${index + 1}`} onClick={() => moveChoice(question, choiceIndex, 1)} disabled={choiceIndex === question.choices.length - 1}>↓</button>
                      </>}
                      {question.question_type === 'multiple_choice' && <button type="button" className="button button-quiet button-small" aria-label={`Remove choice ${choiceIndex + 1} from question ${index + 1}`} onClick={() => updateQuestion(question.key, { choices: question.choices.filter((_, itemIndex) => itemIndex !== choiceIndex) })} disabled={question.choices.length <= 2}>Remove</button>}
                    </div>
                  ))}
                  {question.question_type === 'multiple_choice' && <button type="button" className="text-button" onClick={() => updateQuestion(question.key, { choices: [...question.choices, { choice_text: '' }] })}>+ Add choice</button>}
                </fieldset>
              </section>
            ))}
          </div>
          <button type="button" className="button button-secondary" onClick={() => setQuestions((items) => [...items, newQuestion()])}>+ Add question</button>
        </form>
      </main>
    </>
  )
}

