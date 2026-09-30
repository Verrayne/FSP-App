import { describe, expect, it } from 'vitest'

import { addressSchema, contactSchema, organisationSchema } from './profileSchemas'

const address = {
  addressType: 'BUSINESS' as const,
  line1: '1 Market Street',
  line2: '',
  suburb: '',
  city: 'Cape Town',
  province: 'Western Cape',
  postalCode: '8001',
  countryCode: 'ZA',
  primary: true,
}

describe('FSP profile validation', () => {
  it('trims editable organisation values and enforces their maximum length', () => {
    expect(organisationSchema.parse({ tradeName: '  Acme Advice  ' }).tradeName).toBe('Acme Advice')
    expect(organisationSchema.safeParse({ tradeName: 'x'.repeat(256) }).success).toBe(false)
  })

  it('requires address identity fields and validates South African postal codes', () => {
    expect(addressSchema.safeParse(address).success).toBe(true)
    expect(addressSchema.safeParse({ ...address, line1: '' }).success).toBe(false)
    expect(addressSchema.safeParse({ ...address, city: '' }).success).toBe(false)
    expect(addressSchema.safeParse({ ...address, postalCode: '800' }).success).toBe(false)
    expect(
      addressSchema.safeParse({ ...address, countryCode: 'GB', postalCode: 'SW1A 1AA' }).success,
    ).toBe(true)
  })

  it('validates optional contact email and telephone values', () => {
    const contact = {
      firstName: 'Lerato',
      lastName: 'Molefe',
      jobTitle: '',
      email: 'lerato@example.test',
      contactNumber: '+27 (21) 555-0100',
      primary: false,
    }
    expect(contactSchema.safeParse(contact).success).toBe(true)
    expect(contactSchema.safeParse({ ...contact, email: 'not-an-email' }).success).toBe(false)
    expect(contactSchema.safeParse({ ...contact, contactNumber: 'phone!' }).success).toBe(false)
    expect(contactSchema.safeParse({ ...contact, firstName: '' }).success).toBe(false)
  })
})
