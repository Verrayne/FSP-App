import { useContext } from 'react'
import { TenantContext } from '../context/TenantContext'

export function useTenant() {
  const value = useContext(TenantContext)
  if (!value) throw new Error('useTenant must be used within TenantProvider.')
  return value
}

export function useOptionalTenant() {
  return useContext(TenantContext)
}
