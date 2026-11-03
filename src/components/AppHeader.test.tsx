import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppHeader } from './AppHeader'

const { signIn, demoLoginEnabled } = vi.hoisted(() => ({
  signIn: vi.fn(),
  demoLoginEnabled: vi.fn(),
}))

vi.mock('../auth/authContext', () => ({
  useAuth: () => ({ session: null, signIn, signOut: vi.fn() }),
}))
vi.mock('../lib/supabase', () => ({ isDemoLoginEnabled: demoLoginEnabled }))

describe('AppHeader demo entry', () => {
  beforeEach(() => {
    signIn.mockReset().mockResolvedValue(undefined)
    demoLoginEnabled.mockReset().mockReturnValue(true)
  })

  it('shows a one-click demo instructor sign-in', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><AppHeader showDashboard={false} /></MemoryRouter>)

    await user.click(screen.getByRole('button', { name: 'Use demo instructor' }))

    expect(signIn).toHaveBeenCalledWith('instructor@uconn.edu', '123456')
  })

  it('hides the shortcut when demo access is disabled', () => {
    demoLoginEnabled.mockReturnValue(false)
    render(<MemoryRouter><AppHeader showDashboard={false} /></MemoryRouter>)

    expect(screen.queryByRole('button', { name: 'Use demo instructor' })).not.toBeInTheDocument()
  })
})
