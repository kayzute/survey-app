const friendlyErrors: Record<string, string> = {
  AUTHENTICATION_REQUIRED: 'Please sign in to continue.',
  SURVEY_NOT_FOUND: 'This survey could not be found.',
  SURVEY_NOT_ACTIVE: 'This survey is no longer accepting responses.',
  DUPLICATE_RESPONSE: 'A response from this browser has already been submitted.',
  INVALID_QUESTION: 'One or more answers do not match this survey.',
  INVALID_CHOICE: 'One or more selected choices are not valid.',
  MISSING_REQUIRED_ANSWER: 'Please answer every question before submitting.',
  INVALID_SURVEY_CONTENT: 'Add a question and valid choices before activating this survey.',
  SURVEY_NOT_EDITABLE: 'Only draft surveys can be edited. Close the survey before making changes.',
  TITLE_REQUIRED: 'Enter a title for the survey.',
  QUESTION_REQUIRED: 'Enter text for every question.',
  CHOICE_REQUIRED: 'Enter text for every answer choice.',
  INVALID_CHOICES: 'Each multiple-choice question needs at least two choices. True/false questions need exactly two.',
}

export function toFriendlyError(error: unknown): string {
  if (error instanceof Error) {
    const code = Object.keys(friendlyErrors).find((candidate) => error.message.includes(candidate))
    if (code) return friendlyErrors[code]
    if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
      return 'Unable to reach the server. Check your connection and try again.'
    }
    if (error.message.includes('Invalid login credentials')) return 'The email or password is incorrect.'
    if (error.message.includes('Email not confirmed')) return 'Confirm your instructor email before logging in.'
    if (error.message.includes('Supabase is not configured')) return error.message
  }
  return 'Something went wrong. Please try again.'
}

