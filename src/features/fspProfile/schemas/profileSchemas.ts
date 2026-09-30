import { z } from 'zod'

const optionalText = (maximum: number) => z.string().trim().max(maximum)

export const organisationSchema = z.object({ tradeName: optionalText(255) })

export const addressSchema = z
  .object({
    addressType: z.enum(['BUSINESS', 'POSTAL', 'REGISTERED']),
    line1: z.string().trim().min(1, 'Address line 1 is required.').max(255),
    line2: optionalText(255),
    suburb: optionalText(120),
    city: z.string().trim().min(1, 'City or town is required.').max(120),
    province: optionalText(120),
    postalCode: optionalText(20),
    countryCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, 'Use a two-letter country code.'),
    primary: z.boolean(),
  })
  .superRefine((value, context) => {
    if (value.countryCode === 'ZA' && value.postalCode && !/^\d{4}$/.test(value.postalCode)) {
      context.addIssue({
        code: 'custom',
        path: ['postalCode'],
        message: 'Use a four-digit South African postal code.',
      })
    }
  })

export const contactSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required.').max(120),
  lastName: z.string().trim().min(1, 'Last name is required.').max(120),
  jobTitle: optionalText(160),
  email: optionalText(320).refine(
    (value) => !value || z.string().email().safeParse(value).success,
    'Enter a valid email address.',
  ),
  contactNumber: optionalText(40).refine(
    (value) => !value || /^[0-9+() .xX-]{5,40}$/.test(value),
    'Enter a valid telephone number.',
  ),
  primary: z.boolean(),
})

export type OrganisationValues = z.infer<typeof organisationSchema>
export type AddressValues = z.infer<typeof addressSchema>
export type ContactValues = z.infer<typeof contactSchema>
