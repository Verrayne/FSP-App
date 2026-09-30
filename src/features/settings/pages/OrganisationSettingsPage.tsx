import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  FormError,
  Input,
  PageHeader,
  Skeleton,
} from '../../../components/ui'
import { useTenant } from '../../tenant/hooks/useTenant'
import { organisationSchema, type OrganisationValues } from '../schemas'
import {
  getTenantOrganisation,
  getTenantNotificationSettings,
  settingsQueryKeys,
  updateTenantOrganisation,
  updateTenantNotificationSettings,
} from '../services/settingsService'

export function OrganisationSettingsPage() {
  const { currentTenant, refresh } = useTenant()
  const tenantId = currentTenant?.tenantId ?? ''
  const queryClient = useQueryClient()
  const organisation = useQuery({
    queryKey: settingsQueryKeys.organisation(tenantId),
    queryFn: () => getTenantOrganisation(tenantId),
    enabled: Boolean(tenantId),
  })
  const notifications = useQuery({
    queryKey: settingsQueryKeys.notifications(tenantId),
    queryFn: () => getTenantNotificationSettings(tenantId),
    enabled: Boolean(tenantId),
  })
  const form = useForm<OrganisationValues>({
    resolver: zodResolver(organisationSchema),
    defaultValues: { name: '' },
  })
  useEffect(() => {
    if (organisation.data) form.reset({ name: organisation.data.name })
  }, [form, organisation.data])
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (form.formState.isDirty) event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [form.formState.isDirty])
  const save = useMutation({
    mutationFn: (values: OrganisationValues) => updateTenantOrganisation(tenantId, values.name),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: settingsQueryKeys.organisation(tenantId) }),
        refresh(),
      ])
      form.reset(form.getValues())
    },
  })
  const saveNotifications = useMutation({
    mutationFn: (values: {
      notifyAdminReviewRequired: boolean
      notifyAdminAiEvents: boolean
      reminderOffsets: number[]
    }) => updateTenantNotificationSettings(tenantId, values),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: settingsQueryKeys.notifications(tenantId) }),
  })

  if (organisation.isPending)
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-44" />
        <Card className="space-y-5 p-6">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-32" />
        </Card>
        <span className="sr-only" role="status">
          Loading organisation settings…
        </span>
      </div>
    )
  if (organisation.isError || !organisation.data)
    return (
      <Alert title="Unable to load organisation" variant="danger">
        Refresh the page and try again.
      </Alert>
    )

  return (
    <section className="space-y-5">
      <PageHeader title="Organisation" />
      {save.isSuccess && <Alert title="Organisation updated." />}
      {save.isError && (
        <Alert title="Organisation could not be updated" variant="danger">
          Your access may have changed. Refresh and try again.
        </Alert>
      )}
      <Card className="max-w-2xl p-6">
        <form
          className="space-y-5"
          onSubmit={(event) => void form.handleSubmit((values) => save.mutate(values))(event)}
        >
          <div>
            <label htmlFor="organisation-name" className="text-sm font-medium">
              Organisation name
            </label>
            <Input
              id="organisation-name"
              {...form.register('name')}
              aria-invalid={Boolean(form.formState.errors.name)}
              aria-describedby="organisation-name-error"
            />
            <FormError id="organisation-name-error">
              {form.formState.errors.name?.message}
            </FormError>
          </div>
          <div>
            <label htmlFor="tenant-code" className="text-sm font-medium">
              Tenant code
            </label>
            <Input id="tenant-code" value={organisation.data.code} disabled readOnly />
            <p className="mt-1 text-xs text-slate-500">
              This stable identifier is managed by the platform.
            </p>
          </div>
          <div>
            <span className="block text-sm font-medium">Status</span>
            <Badge className="mt-2" variant={organisation.data.active ? 'success' : 'warning'}>
              {organisation.data.status === 'ACTIVE' ? 'Active' : organisation.data.status}
            </Badge>
          </div>
          <Button type="submit" disabled={!form.formState.isDirty || save.isPending}>
            {save.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </Card>
      <Card className="max-w-2xl p-6">
        <h2 className="font-semibold">Notification defaults</h2>
        <p className="mt-1 text-sm text-slate-600">
          Choose who receives review alerts and when FSP deadline reminders are created. Times use
          South Africa Standard Time.
        </p>
        {notifications.isError ? (
          <div className="mt-4">
            <Alert title="Notification defaults could not be loaded" variant="danger" />
          </div>
        ) : notifications.isPending ? (
          <Skeleton className="mt-4 h-24" />
        ) : (
          <form
            className="mt-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              const formData = new FormData(event.currentTarget)
              saveNotifications.mutate({
                notifyAdminReviewRequired: formData.has('review-admins'),
                notifyAdminAiEvents: formData.has('ai-admins'),
                reminderOffsets: formData.getAll('offset').map(Number),
              })
            }}
          >
            <label className="flex items-start gap-3 text-sm">
              <Checkbox
                name="review-admins"
                defaultChecked={notifications.data.notifyAdminReviewRequired}
              />
              <span>
                <strong className="block">Alert tenant administrators about human reviews</strong>
                <span className="text-slate-600">Reviewers always receive these assignments.</span>
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <Checkbox name="ai-admins" defaultChecked={notifications.data.notifyAdminAiEvents} />
              <span>
                <strong className="block">Alert tenant administrators about AI escalations</strong>
                <span className="text-slate-600">
                  Reviewers always receive AI failure and escalation alerts.
                </span>
              </span>
            </label>
            <fieldset>
              <legend className="text-sm font-medium">Deadline reminders</legend>
              <div className="mt-2 flex flex-wrap gap-4">
                {[30, 14, 7, 1].map((days) => (
                  <label key={days} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      name="offset"
                      value={days}
                      defaultChecked={notifications.data.reminderOffsets.includes(days)}
                    />
                    {days} day{days === 1 ? '' : 's'} before
                  </label>
                ))}
              </div>
            </fieldset>
            {saveNotifications.isError && (
              <Alert title="Notification defaults could not be saved" variant="danger" />
            )}
            {saveNotifications.isSuccess && <Alert title="Notification defaults updated." />}
            <Button type="submit" disabled={saveNotifications.isPending}>
              {saveNotifications.isPending ? 'Saving…' : 'Save notification defaults'}
            </Button>
          </form>
        )}
      </Card>
    </section>
  )
}
