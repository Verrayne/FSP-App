import { createRouter } from '../server/router.js'
import handler0 from '../server/api/submissions/[submissionId]/certificate.js'
import handler1 from '../server/api/submissions/[submissionId]/attempts/[attemptId]/documents/[documentVersionId].js'
import handler2 from '../server/api/admin/submissions/[submissionId]/documents/[documentId].js'
import handler3 from '../server/api/admin/submissions/[submissionId]/attempts/[attemptId]/documents/[documentVersionId].js'

export default createRouter([
  { path: '/api/submissions/:submissionId/certificate', handler: handler0 },
  {
    path: '/api/submissions/:submissionId/attempts/:attemptId/documents/:documentVersionId',
    handler: handler1,
  },
  { path: '/api/admin/submissions/:submissionId/documents/:documentId', handler: handler2 },
  {
    path: '/api/admin/submissions/:submissionId/attempts/:attemptId/documents/:documentVersionId',
    handler: handler3,
  },
])
