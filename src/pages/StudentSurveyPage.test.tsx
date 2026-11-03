import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StudentSurveyPage } from './StudentSurveyPage'
import { markSurveySubmitted } from '../lib/anonymousToken'
import { getActiveSurveyBySlug, submitSurveyResponse } from '../lib/surveyApi'
import type { Survey } from '../lib/types'

vi.mock('../lib/surveyApi', () => ({
  getActiveSurveyBySlug: vi.fn(),
  submitSurveyResponse: vi.fn(),
}))

const survey: Survey = {
  id: 'survey-1', title: 'Quick check', description: 'Two questions', status: 'active',
  public_slug: 'abc123', created_at: '', updated_at: '',
  questions: [
    { id: 'q1', survey_id: 'survey-1', question_text: 'Choose A', question_type: 'multiple_choice', position: 1,
      choices: [{ id: 'c1', question_id: 'q1', choice_text: 'A', position: 1 }, { id: 'c2', question_id: 'q1', choice_text: 'B', position: 2 }] },
    { id: 'q2', survey_id: 'survey-1', question_text: 'True?', question_type: 'true_false', position: 2,
      choices: [{ id: 'c3', question_id: 'q2', choice_text: 'True', position: 1 }, { id: 'c4', question_id: 'q2', choice_text: 'False', position: 2 }] },
  ],
}

function renderStudentPage() {
  return render(<MemoryRouter initialEntries={['/s/abc123']}><Routes><Route path="/s/:slug" element={<StudentSurveyPage />} /></Routes></MemoryRouter>)
}

describe('StudentSurveyPage', () => {
  beforeEach(() => {
    vi.mocked(getActiveSurveyBySlug).mockResolvedValue(survey)
    vi.mocked(submitSurveyResponse).mockResolvedValue({ success: true, response_id: 'response-1' })
  })

  it('lets students answer without signing in and confirms a successful submission', async () => {
    const user = userEvent.setup()
    renderStudentPage()
    await screen.findByRole('heading', { name: 'Quick check' })
    await user.click(screen.getByLabelText('A'))
    await user.click(screen.getByLabelText('True'))
    await user.click(screen.getByRole('button', { name: 'Submit response' }))

    expect(await screen.findByRole('heading', { name: 'Thank you!' })).toBeInTheDocument()
    expect(submitSurveyResponse).toHaveBeenCalledWith('survey-1', expect.any(String), [
      { question_id: 'q1', choice_id: 'c1' }, { question_id: 'q2', choice_id: 'c3' },
    ])
  })

  it('requires an answer for each question', async () => {
    renderStudentPage()
    await screen.findByRole('heading', { name: 'Quick check' })
    fireEvent.click(screen.getByRole('button', { name: 'Submit response' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('answer every question')
    expect(submitSurveyResponse).not.toHaveBeenCalled()
  })

  it('shows the already-submitted state for this browser', async () => {
    markSurveySubmitted('survey-1')
    renderStudentPage()
    expect(await screen.findByRole('heading', { name: 'Response already received' })).toBeInTheDocument()
  })
})
