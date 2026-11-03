import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardPage } from './DashboardPage'
import { activateSurvey, listSurveys } from '../lib/surveyApi'
import type { Survey } from '../lib/types'

vi.mock('../auth/authContext', () => ({
  useAuth: () => ({ session: { user: { email: 'instructor@example.edu' } }, loading: false, signOut: vi.fn() }),
}))
vi.mock('../lib/surveyApi', () => ({
  activateSurvey: vi.fn(),
  closeSurvey: vi.fn(),
  duplicateSurvey: vi.fn(),
  listSurveys: vi.fn(),
}))

const draft: Survey = {
  id: 'survey-1', title: 'Recursion check', description: 'Review recursion', status: 'draft',
  public_slug: null, created_at: '2026-08-17T12:00:00Z', updated_at: '2026-08-17T12:00:00Z',
}
const closed: Survey = { ...draft, id: 'survey-2', title: 'Pointers', status: 'closed' }

describe('DashboardPage', () => {
  beforeEach(() => vi.mocked(listSurveys).mockResolvedValue([draft, closed]))

  it('lists surveys and filters by title and lifecycle state', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><DashboardPage /></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'Recursion check' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pointers' })).toBeInTheDocument()
    await user.type(screen.getByRole('searchbox', { name: 'Search surveys' }), 'recursion')
    expect(screen.getByRole('heading', { name: 'Recursion check' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Pointers' })).not.toBeInTheDocument()
    await user.clear(screen.getByRole('searchbox', { name: 'Search surveys' }))
    await user.selectOptions(screen.getByLabelText('Status'), 'closed')
    expect(screen.getByRole('heading', { name: 'Pointers' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Recursion check' })).not.toBeInTheDocument()
  })

  it('activates a draft and opens its presentation route', async () => {
    const user = userEvent.setup()
    vi.mocked(activateSurvey).mockResolvedValue({ ...draft, status: 'active', public_slug: 'abc123' })
    vi.mocked(listSurveys).mockResolvedValueOnce([draft]).mockResolvedValueOnce([{ ...draft, status: 'active' }])
    render(<MemoryRouter initialEntries={['/dashboard']}><Routes>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/surveys/:id/present" element={<h1>Presentation ready</h1>} />
    </Routes></MemoryRouter>)
    await user.click(await screen.findByRole('button', { name: 'Activate' }))
    expect(await screen.findByRole('heading', { name: 'Presentation ready' })).toBeInTheDocument()
    expect(activateSurvey).toHaveBeenCalledWith('survey-1')
  })
})
