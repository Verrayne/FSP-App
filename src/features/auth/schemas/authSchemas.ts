import { z } from 'zod'

const email = z.string().trim().email('Enter a valid email address.').max(320)
const password = z
  .string()
  .min(8, 'Password must contain at least 8 characters.')
  .max(128, 'Password must contain no more than 128 characters.')

export const loginSchema = z.object({ email, password: z.string().min(1, 'Enter your password.') })

export const registrationSchema = z
  .object({
    firstName: z.string().trim().min(1, 'Enter your first name.').max(120),
    lastName: z.string().trim().min(1, 'Enter your last name.').max(120),
    email,
    contactNumber: z.string().trim().max(40).optional(),
    jobTitle: z.string().trim().max(160).optional(),
    password,
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  })

export const emailSchema = z.object({ email })

export const resetPasswordSchema = z
  .object({ password, confirmPassword: z.string().min(1, 'Confirm your new password.') })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  })

export type LoginValues = z.infer<typeof loginSchema>
export type RegistrationValues = z.infer<typeof registrationSchema>
export type EmailValues = z.infer<typeof emailSchema>
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
