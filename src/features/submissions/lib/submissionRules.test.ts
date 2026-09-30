import { describe, expect, it } from 'vitest'

import type {
  QuestionCondition,
  QuestionTypeCode,
  QuestionValue,
  SubmissionQuestion,
  SubmissionSection,
} from '../types/submission'
import {
  conditionMatches,
  displayAnswer,
  questionState,
  responseForPersistence,
  validateQuestion,
  validateWorkflow,
} from './submissionRules'

function question(overrides: Partial<SubmissionQuestion> = {}): SubmissionQuestion {
  return {
    id: 'target',
    sectionId: 'section',
    sortOrder: 1,
    required: false,
    readOnly: false,
    defaultValue: null,
    code: 'TEST',
    label: 'Test question',
    helpText: null,
    placeholder: null,
    validationRules: {},
    type: 'TEXT',
    options: [],
    ...overrides,
  }
}

function condition(overrides: Partial<QuestionCondition> = {}): QuestionCondition {
  return {
    targetQuestionId: 'target',
    sourceQuestionId: 'source',
    operator: 'EQUALS',
    comparisonValue: true,
    action: 'SHOW',
    sortOrder: 1,
    ...overrides,
  }
}

describe('condition engine', () => {
  it('handles true, false, and unanswered boolean sources', () => {
    expect(conditionMatches(condition(), true)).toBe(true)
    expect(conditionMatches(condition(), false)).toBe(false)
    expect(conditionMatches(condition(), undefined)).toBe(false)
  })

  it('supports selected-option, numeric, and emptiness operators', () => {
    expect(conditionMatches(condition({ comparisonValue: 'option-a' }), 'option-a')).toBe(true)
    expect(
      conditionMatches(
        condition({ operator: 'IN', comparisonValue: ['option-a', 'option-b'] }),
        'option-b',
      ),
    ).toBe(true)
    expect(conditionMatches(condition({ operator: 'GREATER_THAN', comparisonValue: 10 }), 11)).toBe(
      true,
    )
    expect(conditionMatches(condition({ operator: 'LESS_THAN', comparisonValue: 10 }), 9)).toBe(
      true,
    )
    expect(conditionMatches(condition({ operator: 'IS_EMPTY' }), [])).toBe(true)
  })

  it('combines multiple visibility conditions and excludes hidden required questions', () => {
    const conditions = [
      condition(),
      condition({ sourceQuestionId: 'source-2', comparisonValue: 'yes' }),
    ]
    expect(
      questionState(question({ required: true }), conditions, { source: true, 'source-2': 'yes' })
        .visible,
    ).toBe(true)
    expect(
      questionState(question({ required: true }), conditions, { source: true, 'source-2': 'no' })
        .visible,
    ).toBe(false)
    const sections: SubmissionSection[] = [
      {
        id: 'section',
        title: 'Section',
        description: null,
        sortOrder: 1,
        questions: [question({ required: true })],
      },
    ]
    expect(validateWorkflow(sections, conditions, { source: false })).toEqual({})
  })
})

describe('dynamic question validation and persistence', () => {
  const persistenceCases: [QuestionTypeCode, QuestionValue, unknown][] = [
    ['TEXT', 'answer', 'answer'],
    ['TEXTAREA', 'long answer', 'long answer'],
    ['NUMBER', '12.5', 12.5],
    ['PERCENTAGE', 51, 51],
    ['CURRENCY', '12500.25', 12500.25],
    ['DATE', '2026-09-10', '2026-09-10'],
    ['MONTH', '2026-09', '2026-09'],
    ['BOOLEAN', false, false],
    ['SINGLE_SELECT', 'option-a', 'option-a'],
    ['MULTI_SELECT', ['option-a'], ['option-a']],
  ]

  it.each(persistenceCases)(
    'maps %s values to their trusted payload representation',
    (type, input, expected) => {
      expect(responseForPersistence(type, input)).toEqual(expected)
    },
  )

  it('validates required, optional, length, numeric bounds, and percentage bounds', () => {
    expect(validateQuestion(question({ required: true }), '', true)).toBe(
      'This question is required.',
    )
    expect(validateQuestion(question(), '', false)).toBeNull()
    expect(
      validateQuestion(question({ validationRules: { minLength: 3 } }), 'ab', false),
    ).toContain('at least 3')
    expect(
      validateQuestion(question({ type: 'NUMBER', validationRules: { maximum: 10 } }), 11, false),
    ).toContain('no greater')
    expect(
      validateQuestion(
        question({ type: 'PERCENTAGE', validationRules: { minimum: 0, maximum: 100 } }),
        101,
        false,
      ),
    ).toContain('no greater')
    expect(
      validateQuestion(
        question({ type: 'CURRENCY', validationRules: { decimalPlaces: 2 } }),
        1.234,
        false,
      ),
    ).toContain('decimal places')
  })

  it('rejects invalid single and multi-select option IDs', () => {
    const options = [{ id: 'option-a', code: 'A', label: 'A', sortOrder: 1 }]
    expect(validateQuestion(question({ type: 'SINGLE_SELECT', options }), 'option-b', false)).toBe(
      'Select a valid option.',
    )
    expect(
      validateQuestion(
        question({ type: 'MULTI_SELECT', options }),
        ['option-a', 'option-b'],
        false,
      ),
    ).toBe('Select only valid options.')
  })

  it('formats human-readable review answers', () => {
    const options = [{ id: 'option-a', code: 'A', label: 'Option A', sortOrder: 1 }]
    expect(displayAnswer(question({ type: 'SINGLE_SELECT', options }), 'option-a')).toBe('Option A')
    expect(displayAnswer(question({ type: 'BOOLEAN' }), false)).toBe('No')
    expect(displayAnswer(question({ type: 'PERCENTAGE' }), 51.25)).toBe('51.25%')
  })
})
