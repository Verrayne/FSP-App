import { apiRequest } from '../../lib/api/client'
import { getSupabaseBrowserClient } from '../../lib/supabase/client'
import type { RegistryDashboardData, RegistryImportDetail } from './types'

async function authHeaders() {
  const session = await getSupabaseBrowserClient().auth.getSession()
  const token = session.data.session?.access_token
  if (!token) throw new Error('Authentication required')
  return { Authorization: `Bearer ${token}` }
}

export async function hasPlatformAccess() {
  const result = await getSupabaseBrowserClient().rpc('get_my_platform_access')
  if (result.error) throw result.error
  return result.data
}

export async function getRegistryDashboard() {
  return apiRequest<RegistryDashboardData>('/api/registry/imports', {
    headers: await authHeaders(),
  })
}

export async function getRegistryImport(importId: string, status = '', page = 1) {
  const query = new URLSearchParams({ page: String(page) })
  if (status) query.set('status', status)
  return apiRequest<RegistryImportDetail>(`/api/registry/imports/${importId}?${query}`, {
    headers: await authHeaders(),
  })
}

export async function createRegistryImport(file: File, allowReprocess = false) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Unable to read file'))
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Unable to read file'))
    reader.readAsDataURL(file)
  })
  return apiRequest<{ id: string }>('/api/registry/imports', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type || 'text/csv',
      contentBase64: dataUrl.split(',')[1],
      sourceCode: 'FSCA_MANUAL_CSV',
      allowReprocess,
    }),
  })
}

export async function confirmRegistryImport(importId: string) {
  return apiRequest(`/api/registry/imports/${importId}/confirm`, {
    method: 'POST',
    headers: await authHeaders(),
  })
}

export async function downloadRegistryTemplate() {
  const response = await fetch('/api/registry/template', { headers: await authHeaders() })
  if (!response.ok) throw new Error('Template download failed')
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = 'fsp-registry-import-v1.csv'
  link.click()
  URL.revokeObjectURL(url)
}
