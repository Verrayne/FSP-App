import { getSupabaseBrowserClient } from '../../../lib/supabase/client'
import type { AddressValues, ContactValues, OrganisationValues } from '../schemas/profileSchemas'
import type { FspAddress, FspContact, FspProfile } from '../types'

export const fspProfileQueryKeys = {
  profile: (fspId: string) => ['fsp-profile', fspId] as const,
  addresses: (fspId: string) => ['fsp-addresses', fspId] as const,
  contacts: (fspId: string) => ['fsp-contacts', fspId] as const,
}

export async function getFspProfile(fspId: string): Promise<FspProfile> {
  const { data, error } = await getSupabaseBrowserClient()
    .from('fsps')
    .select(
      'id,fsp_number,registered_name,trade_name,registration_number,fsp_type,status,status_effective_date,source,source_last_check_date',
    )
    .eq('id', fspId)
    .single()
  if (error) throw error
  return {
    id: data.id,
    fspNumber: data.fsp_number,
    registeredName: data.registered_name,
    tradeName: data.trade_name,
    registrationNumber: data.registration_number,
    fspType: data.fsp_type,
    status: data.status,
    statusEffectiveDate: data.status_effective_date,
    source: data.source,
    sourceLastCheckDate: data.source_last_check_date,
  }
}

export async function getFspAddresses(fspId: string): Promise<FspAddress[]> {
  const { data, error } = await getSupabaseBrowserClient()
    .from('addresses')
    .select('id,address_type,line_1,line_2,suburb,city,province,postal_code,country_code,primary')
    .eq('fsp_id', fspId)
    .eq('active', true)
    .order('primary', { ascending: false })
    .order('address_type')
  if (error) throw error
  return data.map((row) => ({
    id: row.id,
    addressType: row.address_type as FspAddress['addressType'],
    line1: row.line_1,
    line2: row.line_2,
    suburb: row.suburb,
    city: row.city,
    province: row.province,
    postalCode: row.postal_code,
    countryCode: row.country_code,
    primary: row.primary,
  }))
}

export async function getFspContacts(fspId: string): Promise<FspContact[]> {
  const { data, error } = await getSupabaseBrowserClient()
    .from('contacts')
    .select('id,first_name,last_name,job_title,email,contact_number,primary')
    .eq('fsp_id', fspId)
    .eq('active', true)
    .order('primary', { ascending: false })
    .order('last_name')
  if (error) throw error
  return data.map((row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    jobTitle: row.job_title,
    email: row.email,
    contactNumber: row.contact_number,
    primary: row.primary,
  }))
}

export async function updateFspProfile(fspId: string, values: OrganisationValues) {
  const { error } = await getSupabaseBrowserClient().rpc('update_fsp_profile', {
    target_fsp_id: fspId,
    target_trade_name: values.tradeName,
  })
  if (error) throw error
}

export async function saveFspAddress(
  fspId: string,
  addressId: string | null,
  values: AddressValues,
) {
  const { error } = await getSupabaseBrowserClient().rpc('save_fsp_address', {
    target_fsp_id: fspId,
    // Supabase's generated function types do not encode nullable PostgreSQL arguments.
    target_address_id: addressId as string,
    target_address_type: values.addressType,
    target_line_1: values.line1,
    target_line_2: values.line2,
    target_suburb: values.suburb,
    target_city: values.city,
    target_province: values.province,
    target_postal_code: values.postalCode,
    target_country_code: values.countryCode,
    target_primary: values.primary,
  })
  if (error) throw error
}

export async function removeFspAddress(fspId: string, addressId: string) {
  const { error } = await getSupabaseBrowserClient().rpc('remove_fsp_address', {
    target_fsp_id: fspId,
    target_address_id: addressId,
  })
  if (error) throw error
}

export async function saveFspContact(
  fspId: string,
  contactId: string | null,
  values: ContactValues,
) {
  const { error } = await getSupabaseBrowserClient().rpc('save_fsp_contact', {
    target_fsp_id: fspId,
    // Supabase's generated function types do not encode nullable PostgreSQL arguments.
    target_contact_id: contactId as string,
    target_first_name: values.firstName,
    target_last_name: values.lastName,
    target_job_title: values.jobTitle,
    target_email: values.email,
    target_contact_number: values.contactNumber,
    target_primary: values.primary,
  })
  if (error) throw error
}

export async function removeFspContact(fspId: string, contactId: string) {
  const { error } = await getSupabaseBrowserClient().rpc('remove_fsp_contact', {
    target_fsp_id: fspId,
    target_contact_id: contactId,
  })
  if (error) throw error
}
