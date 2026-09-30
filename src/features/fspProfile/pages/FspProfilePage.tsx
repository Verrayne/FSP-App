import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Mail, MapPin, Pencil, Phone, Plus, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  FormError,
  Input,
  Select,
  Skeleton,
} from '../../../components/ui'
import { useFsp } from '../../onboarding/hooks/useFsp'
import { hasFspPermission } from '../../permissions/fspPermissions'
import {
  addressSchema,
  contactSchema,
  organisationSchema,
  type AddressValues,
  type ContactValues,
  type OrganisationValues,
} from '../schemas/profileSchemas'
import {
  fspProfileQueryKeys,
  getFspAddresses,
  getFspContacts,
  getFspProfile,
  removeFspAddress,
  removeFspContact,
  saveFspAddress,
  saveFspContact,
  updateFspProfile,
} from '../services/profileService'
import type { FspAddress, FspContact } from '../types'

const provinces = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape',
]
const addressLabels = { BUSINESS: 'Business', POSTAL: 'Postal', REGISTERED: 'Registered' }

function display(value: string | null) {
  return value || '—'
}

function displayCode(value: string | null) {
  return value
    ? value
        .toLowerCase()
        .replaceAll('_', ' ')
        .replace(/^./, (letter) => letter.toUpperCase())
    : '—'
}

function formatDateOnly(value: string | null) {
  if (!value) return '—'
  const [year, month, day] = value.split('-').map(Number)
  if (year === undefined || month === undefined || day === undefined) return '—'
  return new Intl.DateTimeFormat('en-ZA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {action}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{display(value)}</dd>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6" data-testid="profile-skeleton">
      <Skeleton className="h-10 w-44" />
      <Skeleton className="h-32" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
      <Skeleton className="h-48" />
      <Skeleton className="h-48" />
    </div>
  )
}

function OrganisationForm({
  tradeName,
  saving,
  onCancel,
  onSave,
}: {
  tradeName: string | null
  saving: boolean
  onCancel: () => void
  onSave: (values: OrganisationValues) => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrganisationValues>({
    resolver: zodResolver(organisationSchema),
    defaultValues: { tradeName: tradeName ?? '' },
  })
  return (
    <form className="space-y-4" onSubmit={(event) => void handleSubmit(onSave)(event)} noValidate>
      <div>
        <label htmlFor="trade-name" className="text-sm font-medium">
          Trading name
        </label>
        <Input
          id="trade-name"
          autoFocus
          {...register('tradeName')}
          aria-invalid={Boolean(errors.tradeName)}
        />
        <FormError>{errors.tradeName?.message}</FormError>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}

function AddressDialog({
  open,
  address,
  saving,
  onClose,
  onSave,
}: {
  open: boolean
  address: FspAddress | null
  saving: boolean
  onClose: () => void
  onSave: (values: AddressValues) => void
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: address
      ? {
          addressType: address.addressType,
          line1: address.line1,
          line2: address.line2 ?? '',
          suburb: address.suburb ?? '',
          city: address.city,
          province: address.province ?? '',
          postalCode: address.postalCode ?? '',
          countryCode: address.countryCode,
          primary: address.primary,
        }
      : {
          addressType: 'BUSINESS',
          line1: '',
          line2: '',
          suburb: '',
          city: '',
          province: '',
          postalCode: '',
          countryCode: 'ZA',
          primary: false,
        },
  })
  const countryCode = useWatch({ control, name: 'countryCode' })
  const addressType = useWatch({ control, name: 'addressType' })
  const isSouthAfrica = countryCode === 'ZA'
  return (
    <Dialog open={open} title={address ? 'Edit address' : 'Add address'} onClose={onClose}>
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(onSave)(event)} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="address-type" className="text-sm font-medium">
              Address type
            </label>
            <Select id="address-type" {...register('addressType')}>
              {Object.entries(addressLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="country-code" className="text-sm font-medium">
              Country code
            </label>
            <Input id="country-code" maxLength={2} {...register('countryCode')} />
            <FormError>{errors.countryCode?.message}</FormError>
          </div>
        </div>
        <div>
          <label htmlFor="line-1" className="text-sm font-medium">
            Address line 1
          </label>
          <Input id="line-1" autoFocus {...register('line1')} />
          <FormError>{errors.line1?.message}</FormError>
        </div>
        <div>
          <label htmlFor="line-2" className="text-sm font-medium">
            Address line 2
          </label>
          <Input id="line-2" {...register('line2')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="suburb" className="text-sm font-medium">
              Suburb
            </label>
            <Input id="suburb" {...register('suburb')} />
          </div>
          <div>
            <label htmlFor="city" className="text-sm font-medium">
              City or town
            </label>
            <Input id="city" {...register('city')} />
            <FormError>{errors.city?.message}</FormError>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="province" className="text-sm font-medium">
              Province
            </label>
            {isSouthAfrica ? (
              <Select id="province" {...register('province')}>
                <option value="">Select province</option>
                {provinces.map((province) => (
                  <option key={province}>{province}</option>
                ))}
              </Select>
            ) : (
              <Input id="province" {...register('province')} />
            )}
          </div>
          <div>
            <label htmlFor="postal-code" className="text-sm font-medium">
              Postal code
            </label>
            <Input
              id="postal-code"
              inputMode={isSouthAfrica ? 'numeric' : 'text'}
              {...register('postalCode')}
            />
            <FormError>{errors.postalCode?.message}</FormError>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox {...register('primary')} />
          Primary {addressType.toLowerCase()} address
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save address'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

function ContactDialog({
  open,
  contact,
  saving,
  onClose,
  onSave,
}: {
  open: boolean
  contact: FspContact | null
  saving: boolean
  onClose: () => void
  onSave: (values: ContactValues) => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: contact
      ? {
          firstName: contact.firstName,
          lastName: contact.lastName,
          jobTitle: contact.jobTitle ?? '',
          email: contact.email ?? '',
          contactNumber: contact.contactNumber ?? '',
          primary: contact.primary,
        }
      : {
          firstName: '',
          lastName: '',
          jobTitle: '',
          email: '',
          contactNumber: '',
          primary: false,
        },
  })
  return (
    <Dialog open={open} title={contact ? 'Edit contact' : 'Add contact'} onClose={onClose}>
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(onSave)(event)} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="contact-first-name" className="text-sm font-medium">
              First name
            </label>
            <Input id="contact-first-name" autoFocus {...register('firstName')} />
            <FormError>{errors.firstName?.message}</FormError>
          </div>
          <div>
            <label htmlFor="contact-last-name" className="text-sm font-medium">
              Last name
            </label>
            <Input id="contact-last-name" {...register('lastName')} />
            <FormError>{errors.lastName?.message}</FormError>
          </div>
        </div>
        <div>
          <label htmlFor="job-title" className="text-sm font-medium">
            Job title
          </label>
          <Input id="job-title" {...register('jobTitle')} />
        </div>
        <div>
          <label htmlFor="contact-email" className="text-sm font-medium">
            Email address
          </label>
          <Input id="contact-email" type="email" {...register('email')} />
          <FormError>{errors.email?.message}</FormError>
        </div>
        <div>
          <label htmlFor="contact-number" className="text-sm font-medium">
            Telephone
          </label>
          <Input id="contact-number" type="tel" {...register('contactNumber')} />
          <FormError>{errors.contactNumber?.message}</FormError>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox {...register('primary')} />
          Primary FSP contact
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save contact'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

function CurrentFspProfilePage({ fspId }: { fspId: string }) {
  const { currentFsp } = useFsp()
  const queryClient = useQueryClient()
  const canEditProfile = hasFspPermission(currentFsp, 'profile:edit')
  const canManageAddresses = hasFspPermission(currentFsp, 'addresses:manage')
  const canManageContacts = hasFspPermission(currentFsp, 'contacts:manage')
  const [editingOrganisation, setEditingOrganisation] = useState(false)
  const [addressDialog, setAddressDialog] = useState(false)
  const [contactDialog, setContactDialog] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState<FspAddress | null>(null)
  const [selectedContact, setSelectedContact] = useState<FspContact | null>(null)
  const [removeAddress, setRemoveAddress] = useState<FspAddress | null>(null)
  const [removeContact, setRemoveContact] = useState<FspContact | null>(null)
  const [notice, setNotice] = useState<string>()
  const [operationError, setOperationError] = useState<string>()
  const profile = useQuery({
    queryKey: fspProfileQueryKeys.profile(fspId),
    queryFn: () => getFspProfile(fspId),
    enabled: Boolean(fspId),
  })
  const addresses = useQuery({
    queryKey: fspProfileQueryKeys.addresses(fspId),
    queryFn: () => getFspAddresses(fspId),
    enabled: Boolean(fspId),
  })
  const contacts = useQuery({
    queryKey: fspProfileQueryKeys.contacts(fspId),
    queryFn: () => getFspContacts(fspId),
    enabled: Boolean(fspId),
  })
  const mutation = useMutation({
    mutationFn: async (task: () => Promise<void>) => task(),
    onMutate: () => {
      setNotice(undefined)
      setOperationError(undefined)
    },
    onError: () =>
      setOperationError(
        'The change could not be saved. Your entered values have been preserved so you can retry.',
      ),
  })
  function complete(message: string, queryKey: readonly unknown[]) {
    setNotice(message)
    setOperationError(undefined)
    void queryClient.invalidateQueries({ queryKey })
  }
  if (profile.isPending) return <ProfileSkeleton />
  if (profile.isError || !profile.data)
    return (
      <div className="space-y-4">
        <Alert title="Unable to load FSP profile" variant="danger">
          The profile could not be loaded for the selected FSP.
        </Alert>
        <Button variant="secondary" onClick={() => void profile.refetch()}>
          Retry
        </Button>
      </div>
    )
  const item = profile.data
  return (
    <div className="space-y-6">
      {notice && <Alert title="Changes saved">{notice}</Alert>}
      {operationError && (
        <Alert title="Unable to save changes" variant="danger">
          {operationError}
        </Alert>
      )}
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="bg-brand-50 text-brand-700 flex size-12 shrink-0 items-center justify-center rounded-lg">
          <Building2 className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold">
            {item.tradeName ?? item.registeredName}
          </h2>
          <p className="text-sm text-slate-500">
            FSP {item.fspNumber} · {item.registeredName}
          </p>
        </div>
        <Badge variant={item.status === 'AUTHORISED' ? 'success' : 'neutral'}>
          {displayCode(item.status)}
        </Badge>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <SectionHeader
            title="Regulatory information"
            action={
              <Badge variant="neutral">
                {item.source === 'DEVELOPMENT_SEED'
                  ? 'Test data'
                  : displayCode(item.source) || 'Source unavailable'}
              </Badge>
            }
          />
          <p className="mt-2 text-xs text-slate-500">
            Source-controlled information is read-only. Authorised registry imports preserve the
            source and last-check date shown here; organisation-maintained fields are never
            overwritten.
          </p>
          <dl className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <Field label="FSP number" value={item.fspNumber} />
            <Field label="Registered name" value={item.registeredName} />
            <Field label="Registration number" value={item.registrationNumber} />
            <Field label="FSP type" value={displayCode(item.fspType)} />
            <Field label="Regulatory status" value={displayCode(item.status)} />
            <Field label="Effective date" value={formatDateOnly(item.statusEffectiveDate)} />
            {item.sourceLastCheckDate && (
              <Field
                label="Source last checked"
                value={new Date(item.sourceLastCheckDate).toLocaleDateString('en-ZA')}
              />
            )}
          </dl>
        </Card>
        <Card className="p-5">
          <SectionHeader
            title="Organisation information"
            action={
              canEditProfile && !editingOrganisation ? (
                <Button size="sm" variant="secondary" onClick={() => setEditingOrganisation(true)}>
                  <Pencil className="size-4" />
                  Edit
                </Button>
              ) : undefined
            }
          />
          <div className="mt-5">
            {editingOrganisation ? (
              <OrganisationForm
                tradeName={item.tradeName}
                saving={mutation.isPending}
                onCancel={() => setEditingOrganisation(false)}
                onSave={(values) =>
                  mutation.mutate(() => updateFspProfile(fspId, values), {
                    onSuccess: () => {
                      setEditingOrganisation(false)
                      complete(
                        'Organisation information updated.',
                        fspProfileQueryKeys.profile(fspId),
                      )
                    },
                  })
                }
              />
            ) : (
              <dl>
                <Field label="Trading name" value={item.tradeName} />
              </dl>
            )}
          </div>
        </Card>
      </div>
      <section className="space-y-3">
        <SectionHeader
          title="Addresses"
          action={
            canManageAddresses ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setSelectedAddress(null)
                  setAddressDialog(true)
                }}
              >
                <Plus className="size-4" />
                Add address
              </Button>
            ) : undefined
          }
        />
        {addresses.isPending ? (
          <Skeleton className="h-40" />
        ) : addresses.isError ? (
          <Card className="p-4">
            <Alert title="Unable to load addresses" variant="danger">
              Other profile information remains available.
            </Alert>
            <Button
              className="mt-3"
              size="sm"
              variant="secondary"
              onClick={() => void addresses.refetch()}
            >
              Retry addresses
            </Button>
          </Card>
        ) : addresses.data.length === 0 ? (
          <Card className="p-5 text-sm text-slate-500">
            {canManageAddresses ? 'No addresses added.' : 'No addresses available.'}
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {addresses.data.map((address) => (
              <Card key={address.id} className="flex gap-3 p-4">
                <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{addressLabels[address.addressType]}</p>
                    {address.primary && <Badge variant="info">Primary</Badge>}
                  </div>
                  <p className="mt-2 text-slate-600">
                    {[
                      address.line1,
                      address.line2,
                      address.suburb,
                      [address.city, address.province].filter(Boolean).join(', '),
                      address.postalCode,
                      address.countryCode === 'ZA' ? 'South Africa' : address.countryCode,
                    ]
                      .filter(Boolean)
                      .map((line) => (
                        <span key={line} className="block">
                          {line}
                        </span>
                      ))}
                  </p>
                  {canManageAddresses && (
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Edit address ${address.line1}`}
                        onClick={() => {
                          setSelectedAddress(address)
                          setAddressDialog(true)
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-700"
                        aria-label={`Remove address ${address.line1}`}
                        onClick={() => setRemoveAddress(address)}
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
      <section className="space-y-3">
        <SectionHeader
          title="Contacts"
          action={
            canManageContacts ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setSelectedContact(null)
                  setContactDialog(true)
                }}
              >
                <Plus className="size-4" />
                Add contact
              </Button>
            ) : undefined
          }
        />
        {contacts.isPending ? (
          <Skeleton className="h-40" />
        ) : contacts.isError ? (
          <Card className="p-4">
            <Alert title="Unable to load contacts" variant="danger">
              Other profile information remains available.
            </Alert>
            <Button
              className="mt-3"
              size="sm"
              variant="secondary"
              onClick={() => void contacts.refetch()}
            >
              Retry contacts
            </Button>
          </Card>
        ) : contacts.data.length === 0 ? (
          <Card className="p-5 text-sm text-slate-500">
            {canManageContacts ? 'No contacts added.' : 'No contacts available.'}
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {contacts.data.map((contact) => (
              <Card key={contact.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">
                        {contact.firstName} {contact.lastName}
                      </p>
                      {contact.primary && <Badge variant="info">Primary</Badge>}
                    </div>
                    <p className="text-sm text-slate-500">{display(contact.jobTitle)}</p>
                  </div>
                  {canManageContacts && (
                    <div className="flex">
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Edit ${contact.firstName} ${contact.lastName}`}
                        onClick={() => {
                          setSelectedContact(contact)
                          setContactDialog(true)
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-700"
                        aria-label={`Remove ${contact.firstName} ${contact.lastName}`}
                        onClick={() => setRemoveContact(contact)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
                {contact.email && (
                  <p className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="size-4" />
                    {contact.email}
                  </p>
                )}
                {contact.contactNumber && (
                  <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="size-4" />
                    {contact.contactNumber}
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>
      {addressDialog && (
        <AddressDialog
          open
          address={selectedAddress}
          saving={mutation.isPending}
          onClose={() => setAddressDialog(false)}
          onSave={(values) =>
            mutation.mutate(() => saveFspAddress(fspId, selectedAddress?.id ?? null, values), {
              onSuccess: () => {
                setAddressDialog(false)
                complete('Address saved.', fspProfileQueryKeys.addresses(fspId))
              },
            })
          }
        />
      )}
      {contactDialog && (
        <ContactDialog
          open
          contact={selectedContact}
          saving={mutation.isPending}
          onClose={() => setContactDialog(false)}
          onSave={(values) =>
            mutation.mutate(() => saveFspContact(fspId, selectedContact?.id ?? null, values), {
              onSuccess: () => {
                setContactDialog(false)
                complete(
                  'Contact saved. Platform access was not changed.',
                  fspProfileQueryKeys.contacts(fspId),
                )
              },
            })
          }
        />
      )}
      {removeAddress && (
        <Dialog open title="Remove address" onClose={() => setRemoveAddress(null)}>
          <p className="text-sm text-slate-600">
            Remove {removeAddress?.line1}? This keeps an audited inactive record.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRemoveAddress(null)}>
              Cancel
            </Button>
            <Button
              disabled={mutation.isPending}
              onClick={() => {
                if (removeAddress)
                  mutation.mutate(() => removeFspAddress(fspId, removeAddress.id), {
                    onSuccess: () => {
                      setRemoveAddress(null)
                      complete('Address removed.', fspProfileQueryKeys.addresses(fspId))
                    },
                  })
              }}
            >
              Remove address
            </Button>
          </div>
        </Dialog>
      )}
      {removeContact && (
        <Dialog open title="Remove contact" onClose={() => setRemoveContact(null)}>
          <p className="text-sm text-slate-600">
            Remove {removeContact?.firstName} {removeContact?.lastName} from FSP contacts? This does
            not change platform access.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRemoveContact(null)}>
              Cancel
            </Button>
            <Button
              disabled={mutation.isPending}
              onClick={() => {
                if (removeContact)
                  mutation.mutate(() => removeFspContact(fspId, removeContact.id), {
                    onSuccess: () => {
                      setRemoveContact(null)
                      complete(
                        'Contact removed. Platform access was not changed.',
                        fspProfileQueryKeys.contacts(fspId),
                      )
                    },
                  })
              }}
            >
              Remove contact
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  )
}

export function FspProfilePage() {
  const { currentFsp } = useFsp()
  const fspId = currentFsp?.fspId ?? ''
  return <CurrentFspProfilePage key={fspId} fspId={fspId} />
}
