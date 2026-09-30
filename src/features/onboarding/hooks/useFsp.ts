import { useContext } from 'react'

import { FspContext } from '../context/FspContext'

export function useFsp() {
  const context = useContext(FspContext)
  if (!context) throw new Error('useFsp must be used within FspProvider.')
  return context
}

export function useOptionalFsp() {
  return useContext(FspContext)
}
