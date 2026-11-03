import { describe, expect, it } from 'vitest'
import { validateDraft } from './draftValidation'
import type { DraftQuestionInput } from './types'

const validQuestion: DraftQuestionInput = {
  question_text: 'What is 2 + 2?',
  question_type: 'multiple_choice',
  choices: [{ choice_text: '4' }, { choice_text: '5' }],
}

describe('validateDraft', () => {
  it('accepts a title with complete multiple-choice and true/false questions', () => {
    expect(validateDraft('Math check', [validQuestion, {
      question_text: 'A statement', question_type: 'true_false',
      choices: [{ choice_text: 'True' }, { choice_text: 'False' }],
    }])).toBeNull()
  })

  it('requires a non-empty title', () => {
    expect(validateDraft('   ', [validQuestion])).toContain('title')
  })

  it('requires at least two multiple-choice answers', () => {
    expect(validateDraft('Check', [{ ...validQuestion, choices: [{ choice_text: 'Only one' }] }])).toContain('at least two')
  })

  it('requires exactly two true/false answers', () => {
    expect(validateDraft('Check', [{ ...validQuestion, question_type: 'true_false', choices: [{ choice_text: 'True' }] }])).toContain('True and False')
  })

  it('requires text for every choice', () => {
    expect(validateDraft('Check', [{ ...validQuestion, choices: [{ choice_text: 'A' }, { choice_text: ' ' }] }])).toContain('every choice')
  })
})
