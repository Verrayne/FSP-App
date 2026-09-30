import { createRouter } from '../server/router.js'
import handler0 from '../server/api/platform/tenants.js'

export default createRouter([{ path: '/api/platform/tenants', handler: handler0 }])
