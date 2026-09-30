import { Checkbox, FormError, Input, RadioGroup, Select, Textarea } from '../../../components/ui'
import type { QuestionValue, SubmissionQuestion } from '../types/submission'

export function QuestionField({
  question,
  value,
  required,
  disabled,
  error,
  onChange,
  onCommit,
}: {
  question: SubmissionQuestion
  value: QuestionValue | undefined
  required: boolean
  disabled: boolean
  error?: string
  onChange: (value: QuestionValue) => void
  onCommit: (value: QuestionValue) => void
}) {
  const inputId = `question-${question.id}`
  const errorId = `${inputId}-error`
  const describedBy =
    [question.helpText ? `${inputId}-help` : null, error ? errorId : null]
      .filter(Boolean)
      .join(' ') || undefined
  const label = (
    <span className="text-sm font-medium text-slate-900">
      {question.label}{' '}
      {required && (
        <span className="text-red-700" aria-label="required">
          *
        </span>
      )}
    </span>
  )
  const common = {
    id: inputId,
    disabled,
    required,
    'aria-invalid': Boolean(error),
    'aria-describedby': describedBy,
  }

  let control
  if (question.type === 'TEXTAREA') {
    control = (
      <Textarea
        {...common}
        maxLength={
          typeof question.validationRules.maxLength === 'number'
            ? question.validationRules.maxLength
            : undefined
        }
        value={String(value ?? '')}
        placeholder={question.placeholder ?? undefined}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onCommit(e.target.value)}
      />
    )
  } else if (
    ['TEXT', 'NUMBER', 'PERCENTAGE', 'CURRENCY', 'DATE', 'MONTH'].includes(question.type)
  ) {
    const type =
      question.type === 'DATE'
        ? 'date'
        : question.type === 'MONTH'
          ? 'month'
          : ['NUMBER', 'PERCENTAGE', 'CURRENCY'].includes(question.type)
            ? 'number'
            : 'text'
    const minimum = question.validationRules.minimum ?? question.validationRules.min
    const maximum = question.validationRules.maximum ?? question.validationRules.max
    const decimalPlaces = question.validationRules.decimalPlaces
    const numericStep = typeof decimalPlaces === 'number' ? String(1 / 10 ** decimalPlaces) : 'any'
    control = (
      <div className="relative">
        {question.type === 'CURRENCY' && (
          <span className="absolute top-2 left-3 text-sm text-slate-500">R</span>
        )}
        <Input
          {...common}
          type={type}
          maxLength={
            type === 'text' && typeof question.validationRules.maxLength === 'number'
              ? question.validationRules.maxLength
              : undefined
          }
          step={
            ['NUMBER', 'PERCENTAGE', 'CURRENCY'].includes(question.type) ? numericStep : undefined
          }
          min={typeof minimum === 'number' ? minimum : undefined}
          max={typeof maximum === 'number' ? maximum : undefined}
          className={question.type === 'CURRENCY' ? 'pl-8' : undefined}
          value={value === null || value === undefined ? '' : String(value)}
          placeholder={question.placeholder ?? undefined}
          onChange={(e) =>
            onChange(
              ['NUMBER', 'PERCENTAGE', 'CURRENCY'].includes(question.type) && e.target.value !== ''
                ? Number(e.target.value)
                : e.target.value,
            )
          }
          onBlur={(e) =>
            onCommit(
              ['NUMBER', 'PERCENTAGE', 'CURRENCY'].includes(question.type) && e.target.value !== ''
                ? Number(e.target.value)
                : e.target.value,
            )
          }
        />
        {question.type === 'PERCENTAGE' && (
          <span className="absolute top-2 right-3 text-sm text-slate-500">%</span>
        )}
      </div>
    )
  } else if (question.type === 'BOOLEAN') {
    control = (
      <RadioGroup
        disabled={disabled}
        required={required}
        invalid={Boolean(error)}
        describedBy={describedBy}
        legend={question.label}
        name={inputId}
        value={value === true ? 'yes' : value === false ? 'no' : undefined}
        onChange={(next) => {
          const answer = next === 'yes'
          onChange(answer)
          onCommit(answer)
        }}
        options={[
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ]}
      />
    )
  } else if (question.type === 'SINGLE_SELECT') {
    control =
      question.options.length <= 4 ? (
        <RadioGroup
          disabled={disabled}
          required={required}
          invalid={Boolean(error)}
          describedBy={describedBy}
          legend={question.label}
          name={inputId}
          value={typeof value === 'string' ? value : undefined}
          onChange={(next) => {
            onChange(next)
            onCommit(next)
          }}
          options={question.options.map((option) => ({ value: option.id, label: option.label }))}
        />
      ) : (
        <Select
          {...common}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => {
            onChange(e.target.value)
            onCommit(e.target.value)
          }}
        >
          <option value="">Select an option</option>
          {question.options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
      )
  } else {
    const selected = Array.isArray(value) ? value : []
    control = (
      <fieldset className="space-y-2" aria-describedby={describedBy} aria-invalid={Boolean(error)}>
        <legend>{label}</legend>
        {question.options.map((option) => (
          <label
            key={option.id}
            className="flex items-center gap-2 rounded-md border bg-white p-3 text-sm"
          >
            <Checkbox
              disabled={disabled}
              checked={selected.includes(option.id)}
              onChange={(event) => {
                const next = event.target.checked
                  ? [...selected, option.id]
                  : selected.filter((id) => id !== option.id)
                onChange(next)
                onCommit(next)
              }}
            />
            {option.label}
          </label>
        ))}
      </fieldset>
    )
  }

  return (
    <div className="space-y-2" data-question-id={question.id}>
      {!['BOOLEAN', 'SINGLE_SELECT', 'MULTI_SELECT'].includes(question.type) && (
        <label htmlFor={inputId}>{label}</label>
      )}
      {control}
      {question.helpText && (
        <p id={`${inputId}-help`} className="text-xs text-slate-500">
          {question.helpText}
        </p>
      )}
      <FormError id={errorId}>{error}</FormError>
    </div>
  )
}
