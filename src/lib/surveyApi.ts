import { getSupabaseClient } from './supabase'
import type {
  DraftQuestionInput,
  Survey,
  SurveyAnswerInput,
  SurveyQuestion,
  SurveyResults,
} from './types'

async function loadQuestions(surveyId: string): Promise<SurveyQuestion[]> {
  const client = getSupabaseClient()
  const { data: questionRows, error: questionError } = await client
    .from('questions')
    .select('*')
    .eq('survey_id', surveyId)
    .order('position')
  if (questionError) throw questionError

  const questions = (questionRows ?? []) as Omit<SurveyQuestion, 'choices'>[]
  if (questions.length === 0) return []
  const { data: choiceRows, error: choiceError } = await client
    .from('choices')
    .select('*')
    .in('question_id', questions.map((question) => question.id))
    .order('position')
  if (choiceError) throw choiceError

  const choicesByQuestion = new Map<string, SurveyQuestion['choices']>()
  for (const choice of choiceRows ?? []) {
    const group = choicesByQuestion.get(choice.question_id) ?? []
    group.push(choice)
    choicesByQuestion.set(choice.question_id, group)
  }
  return questions.map((question) => ({
    ...question,
    choices: choicesByQuestion.get(question.id) ?? [],
  }))
}

export async function listSurveys(): Promise<Survey[]> {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('surveys')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Survey[]
}

export async function getSurveyById(id: string): Promise<Survey> {
  const client = getSupabaseClient()
  const { data, error } = await client.from('surveys').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) throw new Error('SURVEY_NOT_FOUND')
  return { ...(data as Survey), questions: await loadQuestions(id) }
}

export async function getActiveSurveyBySlug(slug: string): Promise<Survey> {
  const client = getSupabaseClient()
  const { data, error } = await client.rpc('resolve_public_survey', { p_slug: slug })
  if (error) throw error
  if (!data) throw new Error('SURVEY_NOT_FOUND')
  const survey = data as Survey
  return { ...survey, questions: await loadQuestions(survey.id) }
}

export async function saveSurveyDraft(
  id: string | null,
  title: string,
  description: string,
  questions: DraftQuestionInput[],
): Promise<Survey> {
  const client = getSupabaseClient()
  const { data, error } = await client.rpc('save_survey_draft', {
    p_survey_id: id,
    p_title: title,
    p_description: description || null,
    p_questions: questions,
  })
  if (error) throw error
  if (!data) throw new Error('No data was returned by the server.')
  const saved = data as Survey
  return getSurveyById(saved.id)
}

export async function duplicateSurvey(id: string): Promise<Survey> {
  const source = await getSurveyById(id)
  const questions = (source.questions ?? []).map((question) => ({
    question_text: question.question_text,
    question_type: question.question_type,
    choices: question.choices.map((choice) => ({ choice_text: choice.choice_text })),
  }))
  return saveSurveyDraft(null, `Copy of ${source.title}`, source.description ?? '', questions)
}

export async function activateSurvey(id: string): Promise<Survey> {
  const client = getSupabaseClient()
  const { data, error } = await client.rpc('activate_survey', { p_survey_id: id })
  if (error) throw error
  if (!data) throw new Error('No data was returned by the server.')
  return data as Survey
}

export async function closeSurvey(id: string): Promise<Survey> {
  const client = getSupabaseClient()
  const { data, error } = await client.rpc('close_survey', { p_survey_id: id })
  if (error) throw error
  if (!data) throw new Error('No data was returned by the server.')
  return data as Survey
}

export async function archiveSurvey(id: string): Promise<Survey> {
  const client = getSupabaseClient()
  const { data, error } = await client.rpc('archive_survey', { p_survey_id: id })
  if (error) throw error
  if (!data) throw new Error('No data was returned by the server.')
  return data as Survey
}

export async function deleteSurvey(id: string): Promise<void> {
  const client = getSupabaseClient()
  const { error } = await client.rpc('delete_survey', { p_survey_id: id })
  if (error) throw error
}

export async function submitSurveyResponse(
  surveyId: string,
  anonymousToken: string,
  answers: SurveyAnswerInput[],
): Promise<{ success: true; response_id: string }> {
  const client = getSupabaseClient()
  const { data, error } = await client.rpc('submit_survey_response', {
    p_survey_id: surveyId,
    p_anonymous_token: anonymousToken,
    p_answers: answers,
  })
  if (error) throw error
  if (!data) throw new Error('No data was returned by the server.')
  return data as { success: true; response_id: string }
}

export async function getSurveyResults(surveyId: string): Promise<SurveyResults> {
  const client = getSupabaseClient()
  const { data, error } = await client.rpc('get_survey_results', { p_survey_id: surveyId })
  if (error) throw error
  if (!data) throw new Error('No data was returned by the server.')
  return data as SurveyResults
}

