import type { DraftQuestionInput } from './types'

export function validateDraft(title: string, questions: DraftQuestionInput[]): string | null {
  if (!title.trim()) return 'Enter a title for the survey.'
  for (let index = 0; index < questions.length; index += 1) {
    const question = questions[index]
    if (!question.question_text.trim()) return `Enter text for question ${index + 1}.`
    if (question.question_type === 'multiple_choice' && question.choices.length < 2) {
      return `Question ${index + 1} needs at least two choices.`
    }
    if (question.question_type === 'true_false' && question.choices.length !== 2) {
      return `Question ${index + 1} needs True and False choices.`
    }
    if (question.choices.some((choice) => !choice.choice_text.trim())) {
      return `Enter text for every choice in question ${index + 1}.`
    }
  }
  return null
}

