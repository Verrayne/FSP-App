import { createRouter } from '../server/router.js'
import handler0 from '../server/api/fsp-users/invitations.js'
import handler1 from '../server/api/fsp-users/invitations/[invitationId]/resend.js'
import handler2 from '../server/api/tenant-users/invitations.js'
import handler3 from '../server/api/tenant-users/invitations/[invitationId]/resend.js'

export default createRouter([
  { path: '/api/fsp-users/invitations', handler: handler0 },
  { path: '/api/fsp-users/invitations/:invitationId/resend', handler: handler1 },
  { path: '/api/tenant-users/invitations', handler: handler2 },
  { path: '/api/tenant-users/invitations/:invitationId/resend', handler: handler3 },
])
