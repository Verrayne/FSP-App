import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link2, MoreHorizontal, Search } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import {
  Alert,
  Badge,
  Button,
  Card,
  Dialog,
  Dropdown,
  EmptyState,
  Input,
  PageHeader,
  Skeleton,
  Table,
} from '../../../components/ui'
import { useTenant } from '../../tenant/hooks/useTenant'
import {
  delinkTenantFsp,
  getTenantFspRelationships,
  linkTenantFsp,
  searchFspRegistry,
  settingsQueryKeys,
  updateTenantFspRelationship,
} from '../services/settingsService'
import type { TenantFspRelationship, TenantFspSearchResult } from '../types'

export function FspRelationshipsSettingsPage() {
  const { currentTenant } = useTenant()
  const tenantId = currentTenant?.tenantId ?? ''
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const search = params.get('search') ?? ''
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1)
  const [linkOpen, setLinkOpen] = useState(false)
  const [registrySearch, setRegistrySearch] = useState('')
  const [selected, setSelected] = useState<TenantFspSearchResult>()
  const [brokerReference, setBrokerReference] = useState('')
  const [editing, setEditing] = useState<TenantFspRelationship>()
  const [delinking, setDelinking] = useState<TenantFspRelationship>()
  const [notice, setNotice] = useState<string>()
  const relationships = useQuery({
    queryKey: settingsQueryKeys.relationships(tenantId, search, page),
    queryFn: () => getTenantFspRelationships(tenantId, search, page),
    enabled: Boolean(tenantId),
    placeholderData: (previous) => previous,
  })
  const registry = useQuery({
    queryKey: settingsQueryKeys.registry(tenantId, registrySearch),
    queryFn: () => searchFspRegistry(tenantId, registrySearch),
    enabled: Boolean(tenantId && registrySearch.trim().length >= 2),
  })
  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: settingsQueryKeys.root(tenantId) }),
      queryClient.invalidateQueries({ queryKey: ['tenant-fsps', tenantId] }),
      queryClient.invalidateQueries({ queryKey: ['tenant-dashboard', tenantId] }),
    ])
  }
  const action = useMutation({
    mutationFn: (task: () => Promise<unknown>) => task(),
    onSuccess: async () => {
      setLinkOpen(false)
      setSelected(undefined)
      setEditing(undefined)
      setDelinking(undefined)
      setBrokerReference('')
      setNotice('FSP relationship updated.')
      await refresh()
    },
  })
  const total = relationships.data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / 25))
  function updateSearch(value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set('search', value)
    else next.delete('search')
    next.delete('page')
    setParams(next, { replace: true })
  }
  function updatePage(value: number) {
    const next = new URLSearchParams(params)
    if (value > 1) next.set('page', String(value))
    else next.delete('page')
    setParams(next)
  }
  if (relationships.isPending)
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-72 w-full" />
        <span className="sr-only" role="status">
          Loading FSP relationships…
        </span>
      </div>
    )
  return (
    <section className="space-y-5">
      <PageHeader
        title="FSP Relationships"
        action={
          <Button onClick={() => setLinkOpen(true)}>
            <Link2 className="size-4" />
            Link FSP
          </Button>
        }
      />
      {notice && <Alert title={notice} />}{' '}
      {(relationships.isError || action.isError) && (
        <Alert title="Unable to update FSP relationships" variant="danger">
          The relationship may already exist, or your access may have changed.
        </Alert>
      )}
      <Card className="p-4">
        <label htmlFor="relationship-search" className="sr-only">
          Search FSP relationships
        </label>
        <div className="relative max-w-md">
          <Search className="absolute top-2.5 left-3 size-4 text-slate-400" />
          <Input
            id="relationship-search"
            className="pl-9"
            value={search}
            onChange={(event) => updateSearch(event.target.value)}
            placeholder="Search name, FSP number or broker reference"
          />
        </div>
      </Card>
      {(relationships.data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title="No FSP relationships found"
          description={
            search
              ? 'Try a different search.'
              : 'Link an FSP from the local registry to add it to this insurer portfolio.'
          }
        />
      ) : (
        <Table>
          <thead>
            <tr className="border-b text-xs tracking-wide text-slate-500 uppercase">
              <th className="px-4 py-3">FSP</th>
              <th className="px-4 py-3">Broker Reference</th>
              <th className="px-4 py-3">Regulatory Status</th>
              <th className="px-4 py-3">Relationship Status</th>
              <th className="w-14 px-4 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {relationships.data?.items.map((item) => (
              <tr key={item.tenantFspId} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{item.tradeName ?? item.registeredName}</p>
                  <p className="text-xs text-slate-500">
                    FSP {item.fspNumber} · {item.submissionCount} historical submission
                    {item.submissionCount === 1 ? '' : 's'}
                  </p>
                </td>
                <td className="px-4 py-3">{item.brokerReference ?? '—'}</td>
                <td className="px-4 py-3">
                  <Badge variant={item.regulatoryStatus === 'AUTHORISED' ? 'success' : 'warning'}>
                    {item.regulatoryStatus}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={item.relationshipStatus === 'ACTIVE' ? 'success' : 'neutral'}>
                    {item.relationshipStatus === 'DELINKED' ? 'Delinked' : item.relationshipStatus}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Dropdown
                    labelText={`Actions for FSP ${item.fspNumber}`}
                    label={
                      <Button size="sm" variant="ghost">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    }
                  >
                    <Button
                      className="w-full justify-start"
                      variant="ghost"
                      onClick={() => {
                        setEditing(item)
                        setBrokerReference(item.brokerReference ?? '')
                      }}
                    >
                      Edit broker reference
                    </Button>
                    {item.relationshipStatus === 'ACTIVE' ? (
                      <Button
                        className="w-full justify-start text-red-700"
                        variant="ghost"
                        onClick={() => setDelinking(item)}
                      >
                        Delink FSP
                      </Button>
                    ) : (
                      <Button
                        className="w-full justify-start"
                        variant="ghost"
                        onClick={() => {
                          setSelected({
                            fspId: item.fspId,
                            fspNumber: item.fspNumber,
                            registeredName: item.registeredName,
                            tradeName: item.tradeName,
                            regulatoryStatus: item.regulatoryStatus,
                            relationshipId: item.tenantFspId,
                            relationshipStatus: item.relationshipStatus,
                          })
                          setBrokerReference(item.brokerReference ?? '')
                          setLinkOpen(true)
                        }}
                      >
                        Relink FSP
                      </Button>
                    )}
                  </Dropdown>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {total > 25 && (
        <nav aria-label="FSP relationship pages" className="flex items-center justify-between">
          <Button variant="secondary" disabled={page <= 1} onClick={() => updatePage(page - 1)}>
            Previous
          </Button>
          <span className="text-sm text-slate-600">
            Page {page} of {pages}
          </span>
          <Button variant="secondary" disabled={page >= pages} onClick={() => updatePage(page + 1)}>
            Next
          </Button>
        </nav>
      )}
      <Dialog
        open={linkOpen}
        title={selected?.relationshipStatus === 'DELINKED' ? 'Relink FSP' : 'Link FSP'}
        onClose={() => {
          setLinkOpen(false)
          setSelected(undefined)
        }}
      >
        <div className="space-y-4">
          {!selected && (
            <>
              <label htmlFor="registry-search" className="text-sm font-medium">
                Search the FSP registry
              </label>
              <Input
                id="registry-search"
                value={registrySearch}
                onChange={(event) => setRegistrySearch(event.target.value)}
                placeholder="FSP number or name"
              />
              {registrySearch.trim().length < 2 ? (
                <p className="text-sm text-slate-500">Enter at least two characters.</p>
              ) : registry.isPending ? (
                <Skeleton className="h-32" />
              ) : (
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {registry.data?.map((item) => (
                    <button
                      key={item.fspId}
                      type="button"
                      className="w-full rounded-md border p-3 text-left hover:bg-slate-50"
                      disabled={item.relationshipStatus === 'ACTIVE'}
                      onClick={() => {
                        setSelected(item)
                        setBrokerReference('')
                      }}
                    >
                      <span className="font-medium">{item.tradeName ?? item.registeredName}</span>
                      <span className="block text-xs text-slate-500">
                        FSP {item.fspNumber} · {item.regulatoryStatus}
                        {item.relationshipStatus
                          ? ` · ${item.relationshipStatus.toLowerCase()}`
                          : ''}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          {selected && (
            <>
              <div className="rounded-md bg-slate-50 p-4">
                <p className="font-medium">{selected.registeredName}</p>
                {selected.tradeName && (
                  <p className="text-sm text-slate-600">Trading as {selected.tradeName}</p>
                )}
                <p className="mt-2 text-sm">
                  FSP {selected.fspNumber} · {selected.regulatoryStatus}
                </p>
              </div>
              <div>
                <label htmlFor="link-broker-reference" className="text-sm font-medium">
                  Broker reference <span className="text-slate-500">(optional)</span>
                </label>
                <Input
                  id="link-broker-reference"
                  maxLength={100}
                  value={brokerReference}
                  onChange={(event) => setBrokerReference(event.target.value)}
                />
              </div>
            </>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setLinkOpen(false)
                setSelected(undefined)
              }}
            >
              Cancel
            </Button>
            {selected && (
              <Button
                disabled={action.isPending}
                onClick={() =>
                  action.mutate(() => linkTenantFsp(tenantId, selected.fspId, brokerReference))
                }
              >
                {action.isPending
                  ? 'Linking…'
                  : selected.relationshipStatus === 'DELINKED'
                    ? 'Relink FSP'
                    : 'Link FSP'}
              </Button>
            )}
          </div>
        </div>
      </Dialog>
      <Dialog
        open={Boolean(editing)}
        title="Edit Broker Reference"
        onClose={() => setEditing(undefined)}
      >
        <div className="space-y-4">
          <label htmlFor="edit-broker-reference" className="text-sm font-medium">
            Broker reference
          </label>
          <Input
            id="edit-broker-reference"
            maxLength={100}
            value={brokerReference}
            onChange={(event) => setBrokerReference(event.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditing(undefined)}>
              Cancel
            </Button>
            <Button
              disabled={action.isPending}
              onClick={() =>
                editing &&
                action.mutate(() =>
                  updateTenantFspRelationship(editing.tenantFspId, brokerReference),
                )
              }
            >
              {action.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      </Dialog>
      <Dialog open={Boolean(delinking)} title="Delink FSP" onClose={() => setDelinking(undefined)}>
        <p className="text-sm text-slate-600">
          The FSP will no longer count as an active portfolio member or receive future submission
          requirements. Existing submissions, documents, responses, and audit history remain
          available.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDelinking(undefined)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={action.isPending}
            onClick={() => delinking && action.mutate(() => delinkTenantFsp(delinking.tenantFspId))}
          >
            {action.isPending ? 'Delinking…' : 'Delink FSP'}
          </Button>
        </div>
      </Dialog>
    </section>
  )
}
