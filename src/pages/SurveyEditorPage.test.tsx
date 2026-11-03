import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SurveyEditorPage } from './SurveyEditorPage'
import { getSurveyById, saveSurveyDraft } from '../lib/surveyApi'
import type { Survey } from '../lib/types'

vi.mock('../auth/authContext', () => ({
  useAuth: () => ({ session: null, loading: false, signOut: vi.fn() }),
}))
vi.mock('../lib/surveyApi', () => ({
  getSurveyById: vi.fn(),
  saveSurveyDraft: vi.fn(),
}))

const savedSurvey: Survey = {
  id: 'survey-1', title: 'Recursion check', description: null, status: 'draft',
  public_slug: null, created_at: '', updated_at: '', questions: [],
}

describe('SurveyEditorPage', () => {
  afterEach(() => vi.unstubAllGlobals())

  beforeEach(() => {
    vi.mocked(saveSurveyDraft).mockResolvedValue(savedSurvey)
    vi.mocked(getSurveyById).mockResolvedValue(savedSurvey)
  })

  it('saves a multiple-choice draft with its questions and choices', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/surveys/new']}><Routes>
      <Route path="/surveys/new" element={<SurveyEditorPage />} />
      <Route path="/surveys/:id/edit" element={<h1>Draft saved</h1>} />
    </Routes></MemoryRouter>)
    await user.type(screen.getByLabelText('Survey title'), 'Recursion check')
    await user.click(screen.getByRole('button', { name: '+ Add question' }))
    await user.type(screen.getByLabelText('Question text'), 'What is recursion?')
    await user.type(screen.getByLabelText('Question 1, choice 1'), 'A function calls itself')
    await user.type(screen.getByLabelText('Question 1, choice 2'), 'A loop')
    await user.click(screen.getByRole('button', { name: 'Save draft' }))

    expect(await screen.findByRole('heading', { name: 'Draft saved' })).toBeInTheDocument()
    expect(saveSurveyDraft).toHaveBeenCalledWith(null, 'Recursion check', '', [{
      question_text: 'What is recursion?', question_type: 'multiple_choice',
      choices: [{ choice_text: 'A function calls itself' }, { choice_text: 'A loop' }],
    }])
  })

  it('loads an existing draft and saves edited survey details', async () => {
    const user = userEvent.setup()
    vi.mocked(getSurveyById).mockResolvedValue({ ...savedSurvey, title: 'Old title', description: 'Old note' })
    render(<MemoryRouter initialEntries={['/surveys/survey-1/edit']}><Routes>
      <Route path="/surveys/:id/edit" element={<SurveyEditorPage />} />
      <Route path="/surveys/:id/edit/saved" element={<h1>Draft saved</h1>} />
    </Routes></MemoryRouter>)
    const title = await screen.findByLabelText('Survey title')
    expect(title).toHaveValue('Old title')
    await user.clear(title)
    await user.type(title, 'Updated title')
    await user.click(screen.getByRole('button', { name: 'Save draft' }))
    expect(saveSurveyDraft).toHaveBeenCalledWith('survey-1', 'Updated title', 'Old note', [])
  })

  it('adds a question when the browser does not expose crypto.randomUUID', async () => {
    vi.stubGlobal('crypto', { randomUUID: undefined })
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/surveys/new']}><Routes>
      <Route path="/surveys/new" element={<SurveyEditorPage />} />
    </Routes></MemoryRouter>)

    await user.click(screen.getByRole('button', { name: '+ Add question' }))

    expect(screen.getByRole('heading', { name: 'Question 1' })).toBeInTheDocument()
    expect(screen.getByLabelText('Question 1, choice 1')).toBeInTheDocument()
  })

  it('reorders multiple-choice options with keyboard-accessible controls', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/surveys/new']}><Routes>
      <Route path="/surveys/new" element={<SurveyEditorPage />} />
    </Routes></MemoryRouter>)
    await user.click(screen.getByRole('button', { name: '+ Add question' }))
    await user.type(screen.getByLabelText('Question 1, choice 1'), 'First')
    await user.type(screen.getByLabelText('Question 1, choice 2'), 'Second')
    await user.click(screen.getByRole('button', { name: 'Move choice 2 up in question 1' }))
    expect(screen.getByLabelText('Question 1, choice 1')).toHaveValue('Second')
    expect(screen.getByLabelText('Question 1, choice 2')).toHaveValue('First')
  })
})
