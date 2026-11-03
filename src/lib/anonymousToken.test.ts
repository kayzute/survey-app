import { beforeEach, describe, expect, it } from 'vitest'
import { getAnonymousToken, hasSubmittedSurvey, markSurveySubmitted } from './anonymousToken'

describe('anonymous browser submission token', () => {
  beforeEach(() => localStorage.clear())

  it('reuses a stable browser token', () => {
    const first = getAnonymousToken()
    expect(getAnonymousToken()).toBe(first)
    expect(first.length).toBeGreaterThan(8)
  })

  it('tracks a survey as submitted after success', () => {
    expect(hasSubmittedSurvey('survey-1')).toBe(false)
    markSurveySubmitted('survey-1')
    expect(hasSubmittedSurvey('survey-1')).toBe(true)
    expect(hasSubmittedSurvey('survey-2')).toBe(false)
  })
})
