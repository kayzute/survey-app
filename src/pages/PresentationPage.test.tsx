import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PresentationPage } from './PresentationPage'
import { getSurveyById, getSurveyResults } from '../lib/surveyApi'
import type { Survey } from '../lib/types'

vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,qr') } }))
vi.mock('../lib/surveyApi', () => ({ closeSurvey: vi.fn(), getSurveyById: vi.fn(), getSurveyResults: vi.fn() }))

const activeSurvey: Survey = {
  id: 'survey-1', title: 'Class check', description: 'Ready?', status: 'active', public_slug: 'join123',
  created_at: '', updated_at: '', questions: [],
}

describe('PresentationPage', () => {
  beforeEach(() => {
    vi.mocked(getSurveyById).mockResolvedValue(activeSurvey)
    vi.mocked(getSurveyResults).mockResolvedValue({ survey_id: activeSurvey.id, response_count: 7, questions: [] })
  })

  it('shows the public URL, QR code, response count, and PNG download', async () => {
    render(<MemoryRouter initialEntries={['/surveys/survey-1/present']}><Routes>
      <Route path="/surveys/:id/present" element={<PresentationPage />} />
    </Routes></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'Class check' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'http://localhost:3000/s/join123' })).toHaveAttribute('href', 'http://localhost:3000/s/join123')
    expect(screen.getByRole('img', { name: 'QR code linking to http://localhost:3000/s/join123' })).toHaveAttribute('src', 'data:image/png;base64,qr')
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Download QR PNG' })).toHaveAttribute('download', 'join123-qr.png')
  })
})
