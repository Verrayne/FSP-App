import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Download, FileUp, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Select,
  Table,
} from '../../components/ui'
import {
  confirmRegistryImport,
  createRegistryImport,
  downloadRegistryTemplate,
  getRegistryDashboard,
  getRegistryImport,
} from './registryService'

function dateTime(value: string | null) {
  return value ? new Date(value).toLocaleString('en-ZA') : 'Never'
}
function badge(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (status === 'COMPLETED') return 'success'
  if (status.includes('ERROR') || status === 'FAILED' || status === 'CONFLICT') return 'danger'
  if (status === 'READY_FOR_CONFIRMATION') return 'warning'
  if (status === 'QUEUED' || status === 'PROCESSING') return 'info'
  return 'neutral'
}
function label(value: string) {
  return value
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^./, (character) => character.toUpperCase())
}

export function RegistryDashboardPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [duplicate, setDuplicate] = useState(false)
  const dashboard = useQuery({ queryKey: ['registry-dashboard'], queryFn: getRegistryDashboard })
  const upload = useMutation({
    mutationFn: (allowReprocess: boolean) => {
      if (!file) throw new Error('Select a CSV file')
      return createRegistryImport(file, allowReprocess)
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['registry-dashboard'] })
      void navigate(`/platform/registry/imports/${result.id}`)
    },
    onError: (error: { code?: string }) => setDuplicate(error.code === 'CONFLICT'),
  })
  if (dashboard.isPending)
    return (
      <div className="space-y-4">
        <PageHeader title="FSP registry" />
        <Card className="h-48 animate-pulse" />
      </div>
    )
  if (dashboard.isError || !dashboard.data)
    return (
      <Alert title="Registry could not be loaded" variant="danger">
        Refresh the page to retry.
      </Alert>
    )
  const data = dashboard.data
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform administration"
        title="FSP registry"
        description="Import an authorised FSCA registry extract into the global FSP master. Every change is previewed and attributed to its source before it can be applied."
        action={
          <Button variant="secondary" onClick={() => void downloadRegistryTemplate()}>
            <Download className="size-4" />
            CSV template
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-500 uppercase">FSPs in master</p>
          <p className="mt-2 text-2xl font-semibold">{data.summary.fspCount.toLocaleString()}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-500 uppercase">Last successful run</p>
          <p className="mt-2 text-sm font-semibold">{dateTime(data.summary.lastCompletedAt)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-500 uppercase">Active sources</p>
          <p className="mt-2 text-2xl font-semibold">{data.sources.length}</p>
        </Card>
      </div>
      <Card className="p-5">
        <h2 className="font-semibold">New manual import</h2>
        <p className="mt-1 text-sm text-slate-600">
          CSV only, up to 3 MB and 10,000 data rows. Required headers: fsp_number, registered_name
          and regulatory_status.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm font-medium">
            Authorised registry CSV
            <input
              className="mt-1 block w-full rounded-md border bg-white px-3 py-2 text-sm"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null)
                setDuplicate(false)
              }}
            />
          </label>
          <Button disabled={!file || upload.isPending} onClick={() => upload.mutate(false)}>
            <FileUp className="size-4" />
            {upload.isPending ? 'Validating…' : 'Validate and preview'}
          </Button>
        </div>
        {duplicate && (
          <div className="mt-4">
            <Alert title="This file has already been imported">
              <span>Reprocessing is explicit and creates a linked import run. </span>
              <Button
                className="ml-2"
                size="sm"
                variant="secondary"
                onClick={() => upload.mutate(true)}
              >
                Reprocess file
              </Button>
            </Alert>
          </div>
        )}
        {upload.isError && !duplicate && (
          <div className="mt-4">
            <Alert title="Import could not be validated" variant="danger">
              Check the template, file size, headers and row values, then try again.
            </Alert>
          </div>
        )}
      </Card>
      <section className="space-y-3">
        <h2 className="font-semibold">Import history</h2>
        {data.imports.length === 0 ? (
          <EmptyState
            title="No registry imports yet"
            description="Download the template and upload an authorised FSCA CSV extract to begin."
          />
        ) : (
          <Table>
            <thead>
              <tr className="border-b bg-slate-50 text-xs text-slate-500 uppercase">
                <th className="px-3 py-2">Run</th>
                <th className="px-3 py-2">Source file</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Rows</th>
                <th className="px-3 py-2">Result</th>
              </tr>
            </thead>
            <tbody>
              {data.imports.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-3 py-3">
                    <Link
                      className="font-medium text-blue-700 hover:underline"
                      to={`/platform/registry/imports/${item.id}`}
                    >
                      {dateTime(item.started_date)}
                    </Link>
                  </td>
                  <td className="px-3 py-3">{item.original_file_name}</td>
                  <td className="px-3 py-3">
                    <Badge variant={badge(item.status)}>{label(item.status)}</Badge>
                  </td>
                  <td className="px-3 py-3">{item.total_count}</td>
                  <td className="px-3 py-3 text-xs text-slate-600">
                    {item.inserted_count} new · {item.updated_count} updated ·{' '}
                    {item.failed_count + item.conflicted_count + item.invalid_count} issues
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>
    </div>
  )
}

export function RegistryImportPage() {
  const { importId = '' } = useParams()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('')
  const detail = useQuery({
    queryKey: ['registry-import', importId, filter],
    queryFn: () => getRegistryImport(importId, filter),
    refetchInterval: (query) =>
      ['QUEUED', 'PROCESSING'].includes(query.state.data?.import.status ?? '') ? 3000 : false,
  })
  const confirm = useMutation({
    mutationFn: () => confirmRegistryImport(importId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['registry-import', importId] })
      void queryClient.invalidateQueries({ queryKey: ['registry-dashboard'] })
    },
  })
  if (detail.isPending) return <Card className="h-52 animate-pulse" />
  if (detail.isError || !detail.data)
    return (
      <Alert title="Import could not be loaded" variant="danger">
        Return to the registry and try again.
      </Alert>
    )
  const item = detail.data.import
  const issues = item.invalid_count + item.conflicted_count
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="FSP registry import"
        title={item.original_file_name ?? 'Registry import'}
        description={`Started ${dateTime(item.started_date)} · schema ${item.schema_version} · ${label(item.source_mode)}`}
        action={
          <Link to="/platform/registry">
            <Button variant="secondary">Back to registry</Button>
          </Link>
        }
      />
      {item.status === 'READY_FOR_CONFIRMATION' && (
        <Alert title="Preview only — no registry records have changed">
          Review new, changed, invalid and conflicting rows below. Confirming queues valid rows for
          bounded background processing.
        </Alert>
      )}
      {issues > 0 && (
        <Alert title={`${issues} row${issues === 1 ? '' : 's'} need attention`} variant="danger">
          <AlertTriangle className="mr-1 inline size-4" />
          Invalid and conflicting rows will not be applied.
        </Alert>
      )}
      <div className="grid gap-3 sm:grid-cols-5">
        {[
          ['Valid', item.valid_count],
          ['Invalid', item.invalid_count],
          ['Conflicts', item.conflicted_count],
          ['Inserted', item.inserted_count],
          ['Updated', item.updated_count],
        ].map(([name, value]) => (
          <Card className="p-4" key={String(name)}>
            <p className="text-xs text-slate-500 uppercase">{name}</p>
            <p className="mt-1 text-xl font-semibold">{value}</p>
          </Card>
        ))}
      </div>
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Badge variant={badge(item.status)}>{label(item.status)}</Badge>
          <p className="mt-2 text-sm text-slate-600">
            {item.processed_count} of {item.total_count} rows processed
          </p>
        </div>
        {item.status === 'READY_FOR_CONFIRMATION' && (
          <Button
            disabled={confirm.isPending || item.valid_count === 0}
            onClick={() => confirm.mutate()}
          >
            <RefreshCw className="size-4" />
            {confirm.isPending ? 'Queuing…' : `Confirm ${item.valid_count} valid rows`}
          </Button>
        )}
      </Card>
      {confirm.isError && (
        <Alert title="Import could not be confirmed" variant="danger">
          Its state may have changed. Refresh and try again.
        </Alert>
      )}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Source records</h2>
        <Select
          className="w-44"
          aria-label="Filter validation status"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="">All rows</option>
          <option value="VALID">Valid</option>
          <option value="INVALID">Invalid</option>
          <option value="CONFLICT">Conflict</option>
        </Select>
      </div>
      <Table>
        <thead>
          <tr className="border-b bg-slate-50 text-xs text-slate-500 uppercase">
            <th className="px-3 py-2">Row</th>
            <th className="px-3 py-2">FSP</th>
            <th className="px-3 py-2">Registered name</th>
            <th className="px-3 py-2">Validation</th>
            <th className="px-3 py-2">Match</th>
            <th className="px-3 py-2">Proposed result</th>
          </tr>
        </thead>
        <tbody>
          {detail.data.records.map((record) => (
            <tr key={record.id} className="border-b align-top last:border-0">
              <td className="px-3 py-3">{record.row_number}</td>
              <td className="px-3 py-3 font-medium">{record.source_record_key ?? '—'}</td>
              <td className="px-3 py-3">{record.normalized_payload?.registered_name ?? '—'}</td>
              <td className="px-3 py-3">
                <Badge variant={badge(record.validation_status)}>
                  {label(record.validation_status)}
                </Badge>
                {record.error_message && (
                  <p className="mt-1 max-w-xs text-xs text-red-700">{record.error_message}</p>
                )}
              </td>
              <td className="px-3 py-3">
                {record.match_status ? label(record.match_status) : '—'}
              </td>
              <td className="px-3 py-3 text-xs text-slate-600">
                {record.proposed_changes.length
                  ? record.proposed_changes
                      .map((change) =>
                        change.field === '__record__' ? 'Create FSP' : label(change.field),
                      )
                      .join(', ')
                  : 'No registry-owned changes'}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  )
}
