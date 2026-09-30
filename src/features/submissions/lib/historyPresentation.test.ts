import { describe, expect, it } from 'vitest'

import { readableHistoryCode, submissionAttemptLabel } from './historyPresentation'

describe('submission history presentation', () => {
  it('uses business version names instead of internal identifiers', () => {
    expect(submissionAttemptLabel(1)).toBe('Original submission')
    expect(submissionAttemptLabel(2)).toBe('Resubmission 1')
    expect(submissionAttemptLabel(4)).toBe('Resubmission 3')
  })

  it('renders unknown future event codes without failing', () => {
    expect(readableHistoryCode('NEW_COMPLIANCE_EVENT')).toBe('New compliance event')
  })
})
