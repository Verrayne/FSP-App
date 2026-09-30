import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Clock3, Mail, MessageSquareText } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Alert, Button, Card, FormError, Input, Select, Textarea } from '../../../components/ui'
import { PageHero, SectionHeader } from '../components/Marketing'
import { PageMeta } from '../components/PageMeta'

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.'),
  email: z.string().trim().email('Enter a valid email address.'),
  fspNumber: z.string().trim().max(40, 'FSP number is too long.').optional(),
  subject: z.string().min(1, 'Select a subject.'),
  message: z.string().trim().min(20, 'Please provide at least 20 characters.'),
})

type ContactValues = z.infer<typeof contactSchema>

export function ContactPage() {
  const [validated, setValidated] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', fspNumber: '', subject: '', message: '' },
  })

  // TODO(Prompt 13+): Send validated messages through the approved support/notification service.
  const onSubmit = () => setValidated(true)

  return (
    <>
      <PageMeta
        title="Contact Support"
        description="Contact support about registration, FSP access, B-BBEE submissions, documents, or use of the FSP Compliance platform."
      />
      <PageHero
        eyebrow="Support"
        title="Need help?"
        description="Contact support if you experience a problem with registration, accessing your FSP, completing a submission, uploading documents or using the platform."
      />
      <section className="py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[.65fr_1.35fr] lg:px-8">
          <aside>
            <SectionHeader
              title="Contact support"
              description="Operational contact details will be confirmed before the platform launches."
            />
            <div className="mt-6 space-y-4">
              <Card className="flex gap-3 p-4">
                <Mail className="text-brand-700 mt-0.5 size-5" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-semibold">Support email</h2>
                  <p className="mt-1 text-sm text-slate-600">[Support email to be confirmed]</p>
                </div>
              </Card>
              <Card className="flex gap-3 p-4">
                <Clock3 className="text-brand-700 mt-0.5 size-5" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-semibold">Business hours</h2>
                  <p className="mt-1 text-sm text-slate-600">[Business hours to be confirmed]</p>
                </div>
              </Card>
            </div>
          </aside>
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="bg-brand-50 text-brand-700 grid size-9 place-items-center rounded-md">
                <MessageSquareText className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-semibold">Send a support request</h2>
                <p className="text-xs text-slate-500">
                  Prototype form — no message service is connected.
                </p>
              </div>
            </div>
            {validated ? (
              <div className="mt-6" role="status">
                <Alert title="Prototype validation complete">
                  <div className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <p>
                      Your details passed client-side validation. No email or support request was
                      sent.
                    </p>
                  </div>
                </Alert>
                <Button variant="secondary" className="mt-4" onClick={() => setValidated(false)}>
                  Edit details
                </Button>
              </div>
            ) : (
              <form
                className="mt-6 space-y-4"
                onSubmit={(event) => void handleSubmit(onSubmit)(event)}
                noValidate
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium">
                      Name
                    </label>
                    <Input
                      id="contact-name"
                      autoComplete="name"
                      {...register('name')}
                      aria-invalid={Boolean(errors.name)}
                      aria-describedby={errors.name ? 'contact-name-error' : undefined}
                    />
                    <div id="contact-name-error">
                      <FormError>{errors.name?.message}</FormError>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium">
                      Email
                    </label>
                    <Input
                      id="contact-email"
                      type="email"
                      autoComplete="email"
                      {...register('email')}
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? 'contact-email-error' : undefined}
                    />
                    <div id="contact-email-error">
                      <FormError>{errors.email?.message}</FormError>
                    </div>
                  </div>
                </div>
                <div>
                  <label htmlFor="fsp-number" className="mb-1.5 block text-sm font-medium">
                    FSP Number <span className="font-normal text-slate-500">(optional)</span>
                  </label>
                  <Input
                    id="fsp-number"
                    {...register('fspNumber')}
                    aria-invalid={Boolean(errors.fspNumber)}
                  />
                  <FormError>{errors.fspNumber?.message}</FormError>
                </div>
                <div>
                  <label htmlFor="contact-subject" className="mb-1.5 block text-sm font-medium">
                    Subject
                  </label>
                  <Select
                    id="contact-subject"
                    {...register('subject')}
                    aria-invalid={Boolean(errors.subject)}
                  >
                    <option value="">Select a subject</option>
                    <option value="registration">Registration</option>
                    <option value="fsp-access">Accessing my FSP</option>
                    <option value="submission">Completing a submission</option>
                    <option value="documents">Uploading documents</option>
                    <option value="platform">Using the platform</option>
                    <option value="other">Other</option>
                  </Select>
                  <FormError>{errors.subject?.message}</FormError>
                </div>
                <div>
                  <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium">
                    Message
                  </label>
                  <Textarea
                    id="contact-message"
                    rows={5}
                    {...register('message')}
                    aria-invalid={Boolean(errors.message)}
                    aria-describedby={errors.message ? 'contact-message-error' : undefined}
                  />
                  <div id="contact-message-error">
                    <FormError>{errors.message?.message}</FormError>
                  </div>
                </div>
                <Button type="submit">Validate Request</Button>
              </form>
            )}
          </Card>
        </div>
      </section>
    </>
  )
}
