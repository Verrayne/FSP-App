export type FspUserRole = 'ADMIN' | 'SUBMITTER' | 'VIEWER'

export interface FspMember {
  membershipId: string
  userId: string
  firstName: string
  lastName: string
  email: string
  role: FspUserRole
  status: string
  isPrimary: boolean
  createDate: string
  updateDate: string
}

export interface FspInvitation {
  invitationId: string
  email: string
  role: FspUserRole
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED'
  inviteDate: string
  expiryDate: string
  deliveryStatus: 'PENDING' | 'SENT' | 'CAPTURED' | 'FAILED'
  deliveryDate: string | null
}

export interface InvitationContext {
  fspName: string
  fspNumber: string
  role: FspUserRole
  expiryDate: string
}
