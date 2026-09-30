import { describe, expect, it } from 'vitest'

import { isFspClaimable, normalizeFspSearch, validateFspSearch } from './onboardingService'

describe('onboarding domain rules', () => {
  it('normalizes ordinary spacing without changing the user search intent', () => {
    expect(normalizeFspSearch('  Karoo   Oak  ')).toBe('Karoo Oak')
  })

  it('requires a meaningful search term', () => {
    expect(validateFspSearch(' K ')).toBe('Enter at least 2 characters.')
    expect(validateFspSearch('51')).toBeNull()
  })

  it('centralizes claim eligibility for the registry statuses in use', () => {
    expect(isFspClaimable(true, 'AUTHORISED')).toBe(true)
    expect(isFspClaimable(true, 'authorized')).toBe(true)
    expect(isFspClaimable(false, 'AUTHORISED')).toBe(false)
    expect(isFspClaimable(true, 'WITHDRAWN')).toBe(false)
  })
})
