const tokenKey = 'classroom-survey:anonymous-token'

export function getAnonymousToken(): string {
  const existing = localStorage.getItem(tokenKey)
  if (existing) return existing

  const token = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
  localStorage.setItem(tokenKey, token)
  return token
}

export function hasSubmittedSurvey(surveyId: string): boolean {
  return localStorage.getItem(`classroom-survey:submitted:${surveyId}`) === 'true'
}

export function markSurveySubmitted(surveyId: string): void {
  localStorage.setItem(`classroom-survey:submitted:${surveyId}`, 'true')
}

