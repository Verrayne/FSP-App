import { createRouter } from '../server/router.js'
import handler0 from '../server/api/registry/imports.js'
import handler1 from '../server/api/registry/imports/[importId].js'
import handler2 from '../server/api/registry/imports/[importId]/confirm.js'
import handler3 from '../server/api/registry/template.js'

export default createRouter([
  { path: '/api/registry/imports', handler: handler0 },
  { path: '/api/registry/imports/:importId', handler: handler1 },
  { path: '/api/registry/imports/:importId/confirm', handler: handler2 },
  { path: '/api/registry/template', handler: handler3 },
])
