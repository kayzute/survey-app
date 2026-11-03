import { describe, expect, it } from 'vitest'
import { isDemoLoginAllowed } from './localDemo'

describe('isDemoLoginAllowed', () => {
  it('allows the shortcut during local development with either local or hosted Supabase', () => {
    expect(isDemoLoginAllowed(true, '127.0.0.1', 'http://127.0.0.1:54321')).toBe(true)
    expect(isDemoLoginAllowed(true, 'localhost', 'http://localhost:54321')).toBe(true)
    expect(isDemoLoginAllowed(true, 'localhost', 'https://demo-project.supabase.co')).toBe(true)
  })

  it('keeps the shortcut off on hosted environments unless explicitly enabled', () => {
    expect(isDemoLoginAllowed(true, 'class.example.edu', 'http://127.0.0.1:54321')).toBe(false)
    expect(isDemoLoginAllowed(false, 'localhost', 'http://127.0.0.1:54321')).toBe(false)
    expect(isDemoLoginAllowed(true, 'localhost', undefined)).toBe(false)
  })

  it('allows a hosted test deployment only with the explicit demo-login flag', () => {
    expect(isDemoLoginAllowed(false, 'classroom.onrender.com', 'https://demo.supabase.co', true)).toBe(true)
    expect(isDemoLoginAllowed(false, 'classroom.onrender.com', 'https://demo.supabase.co')).toBe(false)
  })
})
