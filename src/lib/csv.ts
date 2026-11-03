import { getSupabaseClient } from './supabase'
import type { Survey, SurveyQuestion } from './types'

interface ResponseRow {
  id: string
  submitted_at: string
}

interface AnswerRow {
  response_id: string
  question_id: string
  choice_id: string
}

function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? '' : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function buildSurveyCsv(
  survey: Pick<Survey, 'title' | 'description'>,
  questions: Pick<SurveyQuestion, 'id' | 'question_text'>[],
  responses: ResponseRow[],
  answers: AnswerRow[],
  choices: Array<{ id: string; choice_text: string }>,
): string {
  const header = ['survey_title', 'survey_description', 'response_id', 'submitted_at', ...questions.map((q) => q.question_text)]
  const choiceById = new Map(choices.map((choice) => [choice.id, choice.choice_text]))
  const answersByResponse = new Map<string, Map<string, string>>()
  for (const answer of answers) {
    const responseAnswers = answersByResponse.get(answer.response_id) ?? new Map<string, string>()
    responseAnswers.set(answer.question_id, choiceById.get(answer.choice_id) ?? '')
    answersByResponse.set(answer.response_id, responseAnswers)
  }

  const rows = responses.map((response) => [
    survey.title,
    survey.description,
    response.id,
    response.submitted_at,
    ...questions.map((question) => answersByResponse.get(response.id)?.get(question.id) ?? ''),
  ])
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
}

export async function downloadSurveyCsv(surveyId: string): Promise<void> {
  const client = getSupabaseClient()
  const { data: survey, error: surveyError } = await client
    .from('surveys').select('id,title,description').eq('id', surveyId).single()
  if (surveyError) throw surveyError
  const { data: questionRows, error: questionError } = await client
    .from('questions').select('id,question_text,position').eq('survey_id', surveyId).order('position')
  if (questionError) throw questionError
  const { data: responseRows, error: responseError } = await client
    .from('responses').select('id,submitted_at').eq('survey_id', surveyId).order('submitted_at')
  if (responseError) throw responseError

  const questions = questionRows ?? []
  const responses = responseRows ?? []
  let answers: AnswerRow[] = []
  if (responses.length && questions.length) {
    const { data, error } = await client
      .from('answers').select('response_id,question_id,choice_id')
      .in('response_id', responses.map((response) => response.id))
    if (error) throw error
    answers = (data ?? []) as AnswerRow[]
  }
  const choiceIds = [...new Set(answers.map((answer) => answer.choice_id))]
  let choices: Array<{ id: string; choice_text: string }> = []
  if (choiceIds.length) {
    const { data, error } = await client.from('choices').select('id,choice_text').in('id', choiceIds)
    if (error) throw error
    choices = data ?? []
  }

  const csv = buildSurveyCsv(
    survey,
    questions,
    responses,
    answers,
    choices,
  )
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${survey.title.trim().replace(/[^\p{L}\p{N}-]+/gu, '-').replace(/^-|-$/g, '') || 'survey'}-results.csv`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

