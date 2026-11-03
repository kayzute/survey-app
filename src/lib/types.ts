export type SurveyStatus = 'draft' | 'active' | 'closed' | 'archived'
export type QuestionType = 'multiple_choice' | 'true_false'

export interface Choice {
  id: string
  question_id: string
  choice_text: string
  position: number
}

export interface SurveyQuestion {
  id: string
  survey_id: string
  question_text: string
  question_type: QuestionType
  position: number
  choices: Choice[]
}

export interface Survey {
  id: string
  title: string
  description: string | null
  status: SurveyStatus
  public_slug: string | null
  created_at: string
  updated_at: string
  questions?: SurveyQuestion[]
}

export interface DraftQuestionInput {
  question_text: string
  question_type: QuestionType
  choices: Array<{ choice_text: string }>
}

export interface SurveyResults {
  survey_id: string
  response_count: number
  questions: Array<{
    question_id: string
    question_text: string
    response_count: number
    choices: Array<{
      choice_id: string
      choice_text: string
      count: number
      percentage: number
    }>
  }>
}

export interface SurveyAnswerInput {
  question_id: string
  choice_id: string
}

