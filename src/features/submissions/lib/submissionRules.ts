import type {
  QuestionCondition,
  QuestionValue,
  SubmissionQuestion,
  SubmissionSection,
  ValueOption,
} from '../types/submission'

function isEmpty(value: QuestionValue | undefined) {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  )
}

export function conditionMatches(condition: QuestionCondition, value: QuestionValue | undefined) {
  const expected = condition.comparisonValue as unknown
  switch (condition.operator) {
    case 'IS_EMPTY':
      return isEmpty(value)
    case 'IS_NOT_EMPTY':
      return !isEmpty(value)
    case 'EQUALS':
      return value === expected
    case 'NOT_EQUALS':
      return value !== expected
    case 'IN':
      return Array.isArray(expected) && expected.includes(value)
    case 'NOT_IN':
      return Array.isArray(expected) && !expected.includes(value)
    case 'GREATER_THAN':
      return typeof value === 'number' && typeof expected === 'number' && value > expected
    case 'LESS_THAN':
      return typeof value === 'number' && typeof expected === 'number' && value < expected
  }
}

export function questionState(
  question: SubmissionQuestion,
  conditions: QuestionCondition[],
  responses: Record<string, QuestionValue>,
) {
  const relevant = conditions.filter((condition) => condition.targetQuestionId === question.id)
  const matches = (condition: QuestionCondition) =>
    conditionMatches(condition, responses[condition.sourceQuestionId])
  return {
    visible: relevant.every(
      (condition) =>
        (condition.action !== 'SHOW' || matches(condition)) &&
        (condition.action !== 'HIDE' || !matches(condition)),
    ),
    required:
      question.required ||
      relevant.some((condition) => condition.action === 'REQUIRE' && matches(condition)),
    disabled:
      question.readOnly ||
      relevant.some((condition) => condition.action === 'DISABLE' && matches(condition)),
  }
}

export function validateQuestion(
  question: SubmissionQuestion,
  value: QuestionValue | undefined,
  required: boolean,
) {
  if (isEmpty(value)) return required ? 'This question is required.' : null
  const rules = question.validationRules
  if (typeof value === 'string') {
    const minimum = Number(rules.minLength ?? 0)
    const maximum = Number(rules.maxLength ?? Number.POSITIVE_INFINITY)
    if (value.length < minimum) return `Enter at least ${minimum} characters.`
    if (value.length > maximum) return `Enter no more than ${maximum} characters.`
    if (typeof rules.pattern === 'string' && !new RegExp(rules.pattern).test(value))
      return 'Enter a value in the required format.'
  }
  if (typeof value === 'number') {
    const minimum = Number(rules.minimum ?? rules.min ?? Number.NEGATIVE_INFINITY)
    const maximum = Number(rules.maximum ?? rules.max ?? Number.POSITIVE_INFINITY)
    if (value < minimum) return `Enter a value of at least ${minimum}.`
    if (value > maximum) return `Enter a value no greater than ${maximum}.`
    if (typeof rules.decimalPlaces === 'number') {
      const decimalPlaces = value.toString().split('.')[1]?.length ?? 0
      if (decimalPlaces > rules.decimalPlaces)
        return `Enter no more than ${rules.decimalPlaces} decimal places.`
    }
  }
  if (question.type === 'SINGLE_SELECT') {
    if (!question.options.some((option) => option.id === value)) return 'Select a valid option.'
  }
  if (question.type === 'MULTI_SELECT') {
    if (
      !Array.isArray(value) ||
      value.some((id) => !question.options.some((option) => option.id === id))
    )
      return 'Select only valid options.'
  }
  return null
}

export function validateWorkflow(
  sections: SubmissionSection[],
  conditions: QuestionCondition[],
  responses: Record<string, QuestionValue>,
) {
  const errors: Record<string, string> = {}
  for (const question of sections.flatMap((section) => section.questions)) {
    const state = questionState(question, conditions, responses)
    if (!state.visible) continue
    const error = validateQuestion(question, responses[question.id], state.required)
    if (error) errors[question.id] = error
  }
  return errors
}

export function responseForPersistence(type: SubmissionQuestion['type'], value: QuestionValue) {
  if (value === null || value === '') return null
  if (['NUMBER', 'PERCENTAGE', 'CURRENCY'].includes(type)) {
    const numeric = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(numeric) ? numeric : value
  }
  return value
}

export function displayAnswer(question: SubmissionQuestion, value: QuestionValue | undefined) {
  if (isEmpty(value)) return 'Not answered'
  const optionLabel = (id: string) =>
    question.options.find((option: ValueOption) => option.id === id)?.label ?? 'Unknown option'
  if (Array.isArray(value)) return value.map(optionLabel).join(', ')
  if (question.type === 'SINGLE_SELECT') return optionLabel(String(value))
  if (question.type === 'BOOLEAN') return value ? 'Yes' : 'No'
  if (question.type === 'PERCENTAGE') return `${value}%`
  if (question.type === 'CURRENCY')
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      maximumFractionDigits: 2,
    }).format(Number(value))
  return String(value)
}
