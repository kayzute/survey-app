import { describe, expect, it } from 'vitest'
import { buildSurveyCsv } from './csv'

describe('buildSurveyCsv', () => {
  it('exports metadata and one row per response in question order', () => {
    const csv = buildSurveyCsv(
      { title: 'Recursion check', description: 'Quick, check' },
      [{ id: 'q2', question_text: 'True or false?' }, { id: 'q1', question_text: 'Pick "one"' }],
      [{ id: 'r1', submitted_at: '2026-10-29T14:00:00Z' }],
      [
        { response_id: 'r1', question_id: 'q1', choice_id: 'c1' },
        { response_id: 'r1', question_id: 'q2', choice_id: 'c2' },
      ],
      [{ id: 'c1', choice_text: 'A, then B' }, { id: 'c2', choice_text: 'True' }],
    )
    expect(csv.split('\r\n')).toEqual([
      'survey_title,survey_description,response_id,submitted_at,True or false?,"Pick ""one"""',
      'Recursion check,"Quick, check",r1,2026-10-29T14:00:00Z,True,"A, then B"',
    ])
  })

  it('produces an escaped header even when there are no responses', () => {
    expect(buildSurveyCsv({ title: 'Line\nbreak', description: null }, [], [], [], []))
      .toBe('survey_title,survey_description,response_id,submitted_at')
  })

  it('quotes embedded double quotes', () => {
    const csv = buildSurveyCsv(
      { title: 'Say "yes"', description: null }, [],
      [{ id: 'r1', submitted_at: '2026-10-29T14:00:00Z' }], [], [],
    )
    expect(csv).toContain('"Say ""yes"""')
  })
})
