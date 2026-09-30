import { createRouter } from '../server/router.js'
import handler0 from '../server/api/health.js'

export default createRouter([{ path: '/api/health', handler: handler0 }])
