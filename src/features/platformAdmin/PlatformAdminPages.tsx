import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Building2, Database, Plus, Trash2, Users } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  EmptyState,
  Input,
  Select,
  Skeleton,
  Table,
  Textarea,
} from '../../components/ui'
import { buttonVariants } from '../../components/ui/buttonVariants'
import {
  addQuestionnaireQuestion,
  addQuestionnaireSection,
  createPlatformQuestion,
  createPlatformQuestionnaire,
  createPlatformTenant,
  createPlatformValueSet,
  createQuestionnaireVersion,
  getPlatformDashboard,
  getQuestionnaireVersion,
  listPlatformQuestionnaires,
  listPlatformQuestions,
  listPlatformTenants,
  listPlatformValueSets,
  listQuestionTypes,
  platformQueryKeys,
  publishQuestionnaire,
  removeQuestionnaireItem,
  updatePlatformTenant,
} from './platformAdminService'
import type { PlatformTenant } from './types'

function statusBadge(status: string) {
  if (status === 'ACTIVE' || status === 'PUBLISHED') return 'success' as const
  if (status === 'DRAFT') return 'warning' as const
  if (status === 'SUSPENDED') return 'danger' as const
  return 'neutral' as const
}

function formText(data: FormData, name: string) {
  const value = data.get(name)
  return typeof value === 'string' ? value : ''
}

function SectionIntro({ children }: { children: string }) {
  return <p className="max-w-3xl text-sm leading-6 text-slate-600">{children}</p>
}

function LoadingCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((item) => (
        <Skeleton key={item} className="h-28" />
      ))}
    </div>
  )
}

export function PlatformDashboardPage() {
  const summary = useQuery({
    queryKey: platformQueryKeys.dashboard(),
    queryFn: getPlatformDashboard,
  })
  if (summary.isPending) return <LoadingCards />
  if (summary.isError || !summary.data)
    return (
      <Alert title="Platform summary could not be loaded" variant="danger">
        Refresh the page to retry.
      </Alert>
    )
  const cards = [
    ['Active tenants', summary.data.activeTenants, Building2],
    ['Authorised FSPs', summary.data.activeFsps, Users],
    ['Published questionnaires', summary.data.publishedQuestionnaires, BookOpen],
    ['Questionnaire drafts', summary.data.draftQuestionnaires, Database],
  ] as const
  return (
    <div className="space-y-6">
      <SectionIntro>
        Provision insurer workspaces and maintain the shared compliance data that every tenant
        starts from.
      </SectionIntro>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value, Icon]) => (
          <Card key={label} className="p-5">
            <div className="flex items-center justify-between text-slate-500">
              <p className="text-xs font-semibold tracking-wide uppercase">{label}</p>
              <Icon className="size-4" aria-hidden="true" />
            </div>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-800">{value}</p>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Link className="block" to="/platform/tenants">
          <Card className="h-full p-5 transition-colors hover:border-slate-400">
            <h2 className="font-semibold text-slate-800">Tenant provisioning</h2>
            <p className="mt-2 text-sm text-slate-600">
              Create insurer workspaces and invite their first administrator.
            </p>
          </Card>
        </Link>
        <Link className="block" to="/platform/reference-data">
          <Card className="h-full p-5 transition-colors hover:border-slate-400">
            <h2 className="font-semibold text-slate-800">Questions</h2>
            <p className="mt-2 text-sm text-slate-600">
              Maintain reusable answer sets and questions.
            </p>
          </Card>
        </Link>
        <Link className="block" to="/platform/questionnaires">
          <Card className="h-full p-5 transition-colors hover:border-slate-400">
            <h2 className="font-semibold text-slate-800">Questionnaires</h2>
            <p className="mt-2 text-sm text-slate-600">
              Assemble, version and publish the questionnaires tenants can use.
            </p>
          </Card>
        </Link>
      </div>
    </div>
  )
}

export function PlatformTenantsPage() {
  const queryClient = useQueryClient()
  const tenants = useQuery({ queryKey: platformQueryKeys.tenants(), queryFn: listPlatformTenants })
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<PlatformTenant | null>(null)
  const [notice, setNotice] = useState<string>()
  const [error, setError] = useState<string>()
  const create = useMutation({
    mutationFn: createPlatformTenant,
    onSuccess: async (result) => {
      setCreateOpen(false)
      setNotice(
        result.previewUrl
          ? `Tenant created. The local invitation was captured at ${result.previewUrl}`
          : `Tenant created and an invitation was sent to ${result.adminEmail}.`,
      )
      await queryClient.invalidateQueries({ queryKey: platformQueryKeys.root })
    },
    onError: () =>
      setError('The tenant could not be created. Check the code and administrator email.'),
  })
  const update = useMutation({
    mutationFn: (tenant: PlatformTenant) =>
      updatePlatformTenant(tenant.id, tenant.name, tenant.status),
    onSuccess: async () => {
      setEditing(null)
      setNotice('Tenant settings updated.')
      await queryClient.invalidateQueries({ queryKey: platformQueryKeys.root })
    },
    onError: () => setError('The tenant could not be updated.'),
  })

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(undefined)
    const values = new FormData(event.currentTarget)
    create.mutate({
      code: formText(values, 'code'),
      name: formText(values, 'name'),
      adminEmail: formText(values, 'adminEmail'),
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionIntro>
          Each tenant is an isolated insurer workspace. Creating one also issues a seven-day
          invitation to its first administrator.
        </SectionIntro>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" /> New tenant
        </Button>
      </div>
      {notice && <Alert title="Update complete">{notice}</Alert>}
      {error && (
        <Alert title="Unable to complete the operation" variant="danger">
          {error}
        </Alert>
      )}
      {tenants.isPending ? (
        <Skeleton className="h-72" />
      ) : tenants.isError ? (
        <Alert title="Tenants could not be loaded" variant="danger" />
      ) : (
        <Table>
          <thead>
            <tr className="border-b bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
              <th className="px-4 py-3">Tenant</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Administrators</th>
              <th className="px-4 py-3">FSPs</th>
              <th className="px-4 py-3">Periods</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {tenants.data?.map((tenant) => (
              <tr key={tenant.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{tenant.name}</p>
                  <p className="text-xs text-slate-500">{tenant.code}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={statusBadge(tenant.status)}>{tenant.status}</Badge>
                </td>
                <td className="px-4 py-3">{tenant.administratorCount}</td>
                <td className="px-4 py-3">{tenant.fspCount}</td>
                <td className="px-4 py-3">{tenant.submissionPeriodCount}</td>
                <td className="px-4 py-3 text-right">
                  <Button variant="secondary" size="sm" onClick={() => setEditing(tenant)}>
                    Manage
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Dialog open={createOpen} title="Create tenant" onClose={() => setCreateOpen(false)}>
        <form className="space-y-4" onSubmit={submitCreate}>
          <label className="block text-sm font-medium">
            Tenant code
            <Input className="mt-1" name="code" placeholder="EXAMPLE_INSURER" required />
          </label>
          <label className="block text-sm font-medium">
            Insurer name
            <Input className="mt-1" name="name" required />
          </label>
          <label className="block text-sm font-medium">
            First administrator email
            <Input className="mt-1" name="adminEmail" type="email" required />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Creating…' : 'Create tenant'}
            </Button>
          </div>
        </form>
      </Dialog>
      <Dialog open={Boolean(editing)} title="Manage tenant" onClose={() => setEditing(null)}>
        {editing && (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              update.mutate(editing)
            }}
          >
            <label className="block text-sm font-medium">
              Insurer name
              <Input
                className="mt-1"
                value={editing.name}
                onChange={(event) => setEditing({ ...editing, name: event.target.value })}
              />
            </label>
            <label className="block text-sm font-medium">
              Workspace status
              <Select
                className="mt-1"
                value={editing.status}
                onChange={(event) =>
                  setEditing({ ...editing, status: event.target.value as PlatformTenant['status'] })
                }
              >
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="CLOSED">Closed</option>
              </Select>
            </label>
            <p className="text-xs text-slate-500">
              Suspending or closing a tenant immediately removes its users’ workspace access.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={update.isPending}>
                Save changes
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  )
}

export function PlatformReferenceDataPage() {
  const queryClient = useQueryClient()
  const [valueSetOpen, setValueSetOpen] = useState(false)
  const [questionOpen, setQuestionOpen] = useState(false)
  const [selectedType, setSelectedType] = useState('')
  const [error, setError] = useState<string>()
  const valueSets = useQuery({
    queryKey: [...platformQueryKeys.references(), 'value-sets'],
    queryFn: listPlatformValueSets,
  })
  const questions = useQuery({
    queryKey: [...platformQueryKeys.references(), 'questions'],
    queryFn: listPlatformQuestions,
  })
  const questionTypes = useQuery({
    queryKey: [...platformQueryKeys.references(), 'types'],
    queryFn: listQuestionTypes,
  })
  const selectedTypeItem = questionTypes.data?.find((item) => item.id === selectedType)
  const createSet = useMutation({
    mutationFn: createPlatformValueSet,
    onSuccess: async () => {
      setValueSetOpen(false)
      await queryClient.invalidateQueries({ queryKey: platformQueryKeys.references() })
    },
    onError: () => setError('The answer set could not be created. Check its name and options.'),
  })
  const createQuestion = useMutation({
    mutationFn: createPlatformQuestion,
    onSuccess: async () => {
      setQuestionOpen(false)
      setSelectedType('')
      await queryClient.invalidateQueries({ queryKey: platformQueryKeys.references() })
    },
    onError: () => setError('The question could not be created. Check its label and answer type.'),
  })

  return (
    <div className="space-y-6">
      <SectionIntro>
        Build reusable answer sets, then create and manage questions used across questionnaires.
        These records remain stable so historical submissions can always be interpreted.
      </SectionIntro>
      {error && (
        <Alert title="Unable to save questions" variant="danger">
          {error}
        </Alert>
      )}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-800">Answer sets</h2>
            <p className="mt-1 text-sm text-slate-600">
              Reusable lists for single- and multi-select questions.
            </p>
          </div>
          <Button size="sm" onClick={() => setValueSetOpen(true)}>
            <Plus className="size-4" /> Add answer set
          </Button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {valueSets.data?.map((set) => (
            <div key={set.id} className="rounded-md border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{set.name}</p>
                </div>
                <Badge>{set.optionCount} options</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {set.options.map((option) => (
                  <Badge key={option.id ?? option.code} className="font-medium">
                    {option.label}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-800">Questions</h2>
            <p className="mt-1 text-sm text-slate-600">
              Questions available when assembling a questionnaire.
            </p>
          </div>
          <Button size="sm" onClick={() => setQuestionOpen(true)}>
            <Plus className="size-4" /> Add question
          </Button>
        </div>
        <div className="mt-5">
          <Table>
            <thead>
              <tr className="border-b bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
                <th className="px-4 py-3">Question</th>
                <th className="px-4 py-3">Answer type</th>
                <th className="px-4 py-3">Answer set</th>
              </tr>
            </thead>
            <tbody>
              {questions.data?.map((question) => (
                <tr key={question.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium">{question.label}</p>
                  </td>
                  <td className="px-4 py-3">{question.typeName}</td>
                  <td className="px-4 py-3 text-slate-600">{question.valueSetName ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>
      <Dialog open={valueSetOpen} title="Add answer set" onClose={() => setValueSetOpen(false)}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            const data = new FormData(event.currentTarget)
            const options = formText(data, 'options')
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
              .map((label) => ({ label }))
            createSet.mutate({
              name: formText(data, 'name'),
              description: formText(data, 'description'),
              options,
            })
          }}
        >
          <label className="block text-sm font-medium">
            Name
            <Input className="mt-1" name="name" required />
          </label>
          <label className="block text-sm font-medium">
            Description
            <Textarea className="mt-1" name="description" />
          </label>
          <label className="block text-sm font-medium">
            Options
            <Textarea className="mt-1 font-mono" name="options" placeholder={'Yes\nNo'} required />
            <span className="mt-1 block text-xs font-normal text-slate-500">
              One option label per line. Internal codes are generated automatically.
            </span>
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setValueSetOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createSet.isPending}>
              Create answer set
            </Button>
          </div>
        </form>
      </Dialog>
      <Dialog open={questionOpen} title="Add question" onClose={() => setQuestionOpen(false)}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            const data = new FormData(event.currentTarget)
            createQuestion.mutate({
              label: formText(data, 'label'),
              helpText: formText(data, 'helpText'),
              questionTypeId: selectedType,
              valueSetId: formText(data, 'valueSetId') || null,
            })
          }}
        >
          <label className="block text-sm font-medium">
            Question label
            <Textarea className="mt-1" name="label" required />
          </label>
          <label className="block text-sm font-medium">
            Help text
            <Input className="mt-1" name="helpText" />
          </label>
          <label className="block text-sm font-medium">
            Answer type
            <Select
              className="mt-1"
              value={selectedType}
              onChange={(event) => setSelectedType(event.target.value)}
              required
            >
              <option value="">Select a type</option>
              {questionTypes.data?.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </Select>
          </label>
          {selectedTypeItem?.allowsValueSet && (
            <label className="block text-sm font-medium">
              Answer set
              <Select className="mt-1" name="valueSetId" required>
                <option value="">Select an answer set</option>
                {valueSets.data?.map((set) => (
                  <option key={set.id} value={set.id}>
                    {set.name}
                  </option>
                ))}
              </Select>
            </label>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setQuestionOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createQuestion.isPending}>
              Create question
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}

export function PlatformQuestionnairesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [error, setError] = useState<string>()
  const questionnaires = useQuery({
    queryKey: platformQueryKeys.questionnaires(),
    queryFn: listPlatformQuestionnaires,
  })
  const tenants = useQuery({ queryKey: platformQueryKeys.tenants(), queryFn: listPlatformTenants })
  const create = useMutation({
    mutationFn: createPlatformQuestionnaire,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: platformQueryKeys.questionnaires() })
      void navigate(`/platform/questionnaires/${result.versionId}`)
    },
    onError: () => setError('The questionnaire could not be created. Check its name and scope.'),
  })
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionIntro>
          Global questionnaires are available to every insurer. Tenant-specific questionnaires are
          restricted to the selected insurer. Only published versions can be used in a submission
          period.
        </SectionIntro>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" /> New questionnaire
        </Button>
      </div>
      {error && (
        <Alert title="Unable to create questionnaire" variant="danger">
          {error}
        </Alert>
      )}
      {questionnaires.isPending ? (
        <Skeleton className="h-72" />
      ) : questionnaires.data?.length ? (
        <Table>
          <thead>
            <tr className="border-b bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
              <th className="px-4 py-3">Questionnaire</th>
              <th className="px-4 py-3">Scope</th>
              <th className="px-4 py-3">Version</th>
              <th className="px-4 py-3">Contents</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {questionnaires.data.map((item) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{item.name}</p>
                </td>
                <td className="px-4 py-3">{item.tenantName ?? 'All tenants'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span>v{item.latestVersion}</span>
                    <Badge variant={statusBadge(item.latestStatus)}>{item.latestStatus}</Badge>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {item.sectionCount} sections · {item.questionCount} questions
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                    to={`/platform/questionnaires/${item.latestVersionId}`}
                  >
                    {item.latestStatus === 'DRAFT' ? 'Edit draft' : 'View'}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <EmptyState
          title="No questionnaires"
          description="Create the first questionnaire to begin assembling its draft version."
        />
      )}
      <Dialog open={createOpen} title="Create questionnaire" onClose={() => setCreateOpen(false)}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            const data = new FormData(event.currentTarget)
            create.mutate({
              tenantId: formText(data, 'tenantId') || null,
              name: formText(data, 'name'),
              description: formText(data, 'description'),
            })
          }}
        >
          <label className="block text-sm font-medium">
            Scope
            <Select className="mt-1" name="tenantId">
              <option value="">All tenants</option>
              {tenants.data?.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="block text-sm font-medium">
            Name
            <Input className="mt-1" name="name" required />
          </label>
          <label className="block text-sm font-medium">
            Description
            <Textarea className="mt-1" name="description" />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              Create draft
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}

export function PlatformQuestionnaireEditorPage() {
  const { versionId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [sectionOpen, setSectionOpen] = useState(false)
  const [questionSection, setQuestionSection] = useState<string>()
  const [selectedQuestion, setSelectedQuestion] = useState('')
  const [required, setRequired] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [error, setError] = useState<string>()
  const detail = useQuery({
    queryKey: platformQueryKeys.questionnaire(versionId),
    queryFn: () => getQuestionnaireVersion(versionId),
    enabled: Boolean(versionId),
  })
  const questions = useQuery({
    queryKey: [...platformQueryKeys.references(), 'questions'],
    queryFn: listPlatformQuestions,
  })
  const usedQuestionIds = useMemo(
    () =>
      new Set(
        detail.data?.sections.flatMap((section) =>
          section.questions.map((question) => question.questionId),
        ) ?? [],
      ),
    [detail.data],
  )
  const availableQuestions =
    questions.data?.filter((question) => !usedQuestionIds.has(question.id)) ?? []
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: platformQueryKeys.questionnaire(versionId) }),
      queryClient.invalidateQueries({ queryKey: platformQueryKeys.questionnaires() }),
      queryClient.invalidateQueries({ queryKey: platformQueryKeys.dashboard() }),
    ])
  }
  const operation = useMutation({
    mutationFn: async (task: () => Promise<unknown>) => task(),
    onSuccess: refresh,
    onError: () =>
      setError('The questionnaire could not be updated. Refresh the page and try again.'),
  })
  if (detail.isPending) return <Skeleton className="h-96" />
  if (detail.isError || !detail.data)
    return <Alert title="Questionnaire could not be loaded" variant="danger" />
  const item = detail.data
  const editable = item.status === 'DRAFT'
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            {item.tenantName ?? 'Global questionnaire'}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-800">{item.name}</h2>
          <p className="mt-1 text-sm text-slate-600">
            Version {item.versionNumber} · {item.sections.length} sections
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusBadge(item.status)}>{item.status}</Badge>
          {editable ? (
            <Button onClick={() => setPublishOpen(true)}>Publish version</Button>
          ) : (
            <Button
              variant="secondary"
              onClick={() =>
                operation.mutate(async () => {
                  const id = await createQuestionnaireVersion(item.questionnaireId)
                  if (id) void navigate(`/platform/questionnaires/${id}`)
                })
              }
            >
              Create next version
            </Button>
          )}
        </div>
      </div>
      {error && (
        <Alert title="Unable to update questionnaire" variant="danger">
          {error}
        </Alert>
      )}
      {editable && (
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={() => setSectionOpen(true)}>
            <Plus className="size-4" /> Add section
          </Button>
        </div>
      )}
      <div className="space-y-4">
        {item.sections.map((section, index) => (
          <Card key={section.id} className="overflow-hidden">
            <div className="flex items-start justify-between gap-4 border-b bg-slate-50 px-5 py-4">
              <div>
                <p className="text-xs font-medium text-slate-500">SECTION {index + 1}</p>
                <h3 className="mt-1 font-semibold text-slate-800">{section.title}</h3>
                {section.description && (
                  <p className="mt-1 text-sm text-slate-600">{section.description}</p>
                )}
              </div>
              {editable && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setQuestionSection(section.id)}>
                    <Plus className="size-4" /> Question
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove ${section.title}`}
                    onClick={() =>
                      operation.mutate(() => removeQuestionnaireItem(section.id, 'SECTION'))
                    }
                  >
                    <Trash2 className="size-4 text-red-700" />
                  </Button>
                </div>
              )}
            </div>
            {section.questions.length ? (
              <ol className="divide-y">
                {section.questions.map((question, questionIndex) => (
                  <li key={question.id} className="flex items-start gap-3 px-5 py-4">
                    <span className="mt-0.5 text-xs font-semibold text-slate-400">
                      {questionIndex + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-800">{question.label}</p>
                      {question.valueSetName && (
                        <p className="mt-1 text-xs text-slate-500">{question.valueSetName}</p>
                      )}
                    </div>
                    {question.required && <Badge variant="info">Required</Badge>}
                    {editable && (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Remove ${question.label}`}
                        onClick={() =>
                          operation.mutate(() => removeQuestionnaireItem(question.id, 'QUESTION'))
                        }
                      >
                        <Trash2 className="size-4 text-red-700" />
                      </Button>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="px-5 py-6 text-sm text-slate-500">No questions in this section yet.</p>
            )}
          </Card>
        ))}
        {!item.sections.length && (
          <EmptyState
            title="No sections yet"
            description="Add a section, then choose from your questions."
          />
        )}
      </div>
      <Dialog open={sectionOpen} title="Add section" onClose={() => setSectionOpen(false)}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            const data = new FormData(event.currentTarget)
            operation.mutate(
              () =>
                addQuestionnaireSection(versionId, {
                  title: formText(data, 'title'),
                  description: formText(data, 'description'),
                }),
              { onSuccess: () => setSectionOpen(false) },
            )
          }}
        >
          <label className="block text-sm font-medium">
            Title
            <Input className="mt-1" name="title" required />
          </label>
          <label className="block text-sm font-medium">
            Description
            <Textarea className="mt-1" name="description" />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSectionOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add section</Button>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={Boolean(questionSection)}
        title="Add question"
        onClose={() => setQuestionSection(undefined)}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (!questionSection || !selectedQuestion) return
            operation.mutate(
              () =>
                addQuestionnaireQuestion(versionId, questionSection, selectedQuestion, required),
              {
                onSuccess: () => {
                  setQuestionSection(undefined)
                  setSelectedQuestion('')
                  setRequired(false)
                },
              },
            )
          }}
        >
          <label className="block text-sm font-medium">
            Question
            <Select
              className="mt-1"
              value={selectedQuestion}
              onChange={(event) => setSelectedQuestion(event.target.value)}
              required
            >
              <option value="">Select a question</option>
              {availableQuestions.map((question) => (
                <option key={question.id} value={question.id}>
                  {question.label}
                </option>
              ))}
            </Select>
          </label>
          <p className="text-sm text-slate-600">
            Question not listed?{' '}
            <Link
              className="font-medium text-blue-700 underline underline-offset-2"
              to="/platform/reference-data"
              onClick={() => setQuestionSection(undefined)}
            >
              Create a new question
            </Link>
            .
          </p>
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox checked={required} onChange={(event) => setRequired(event.target.checked)} />
            Required response
          </label>
          {!availableQuestions.length && (
            <p className="text-sm text-slate-500">Every available question is already included.</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setQuestionSection(undefined)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!selectedQuestion}>
              Add question
            </Button>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={publishOpen}
        title="Publish questionnaire version"
        onClose={() => setPublishOpen(false)}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            const data = new FormData(event.currentTarget)
            operation.mutate(
              () =>
                publishQuestionnaire(
                  versionId,
                  formText(data, 'effectiveFrom'),
                  formText(data, 'effectiveTo') || null,
                ),
              { onSuccess: () => setPublishOpen(false) },
            )
          }}
        >
          <Alert title="Publishing is permanent">
            Published versions cannot be edited. Future changes require a new version.
          </Alert>
          <label className="block text-sm font-medium">
            Effective from
            <Input className="mt-1" name="effectiveFrom" type="date" required />
          </label>
          <label className="block text-sm font-medium">
            Effective to (optional)
            <Input className="mt-1" name="effectiveTo" type="date" />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPublishOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Publish version</Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
