import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginPage } from './LoginPage'

const { signIn } = vi.hoisted(() => ({ signIn: vi.fn() }))
vi.mock('../auth/authContext', () => ({ useAuth: () => ({ session: null, signIn }) }))
vi.mock('../lib/supabase', () => ({ isDemoLoginEnabled: () => false, isSupabaseConfigured: () => true }))

describe('LoginPage', () => {
  beforeEach(() => signIn.mockReset().mockResolvedValue(undefined))

  it('submits instructor credentials to Supabase Auth', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><LoginPage /></MemoryRouter>)
    await user.type(screen.getByLabelText('Email'), ' instructor@uconn.edu ')
    await user.type(screen.getByLabelText('Password'), '123456')
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(signIn).toHaveBeenCalledWith('instructor@uconn.edu', '123456')
  })
})
