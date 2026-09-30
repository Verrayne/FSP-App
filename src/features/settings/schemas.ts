import { z } from 'zod'

export const organisationSchema = z.object({
  name: z.string().trim().min(2, 'Enter an organisation name.').max(255),
})

export const tenantInvitationSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.').max(320),
  role: z.enum(['ADMIN', 'REVIEWER'], { message: 'Select a role.' }),
})

export const periodSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter a period name.').max(255),
    year: z.coerce.number().int().min(2000).max(2200),
    openDate: z.string().min(1, 'Select an open date.'),
    closeDate: z.string().min(1, 'Select a close date.'),
    questionnaireVersionId: z.string().uuid('Select a questionnaire version.'),
    reviewMode: z.enum(['AUTOMATIC_ACCEPTANCE', 'HUMAN_REVIEW', 'AI_REVIEW']),
    status: z.enum(['DRAFT', 'OPEN', 'CLOSED']),
  })
  .refine((value) => value.openDate < value.closeDate, {
    path: ['closeDate'],
    message: 'Close date must be after the open date.',
  })

export const brokerReferenceSchema = z.object({
  brokerReference: z.string().trim().max(100, 'Use 100 characters or fewer.'),
})

export type OrganisationValues = z.infer<typeof organisationSchema>
export type TenantInvitationValues = z.infer<typeof tenantInvitationSchema>
export type PeriodValues = z.infer<typeof periodSchema>
export type BrokerReferenceValues = z.infer<typeof brokerReferenceSchema>
