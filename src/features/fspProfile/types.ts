export type AddressType = 'BUSINESS' | 'POSTAL' | 'REGISTERED'

export interface FspProfile {
  id: string
  fspNumber: string
  registeredName: string
  tradeName: string | null
  registrationNumber: string | null
  fspType: string | null
  status: string | null
  statusEffectiveDate: string | null
  source: string | null
  sourceLastCheckDate: string | null
}

export interface FspAddress {
  id: string
  addressType: AddressType
  line1: string
  line2: string | null
  suburb: string | null
  city: string
  province: string | null
  postalCode: string | null
  countryCode: string
  primary: boolean
}

export interface FspContact {
  id: string
  firstName: string
  lastName: string
  jobTitle: string | null
  email: string | null
  contactNumber: string | null
  primary: boolean
}
