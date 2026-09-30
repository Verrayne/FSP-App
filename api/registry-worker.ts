import { createRouter } from '../server/router.js'
import handler0 from '../server/api/registry/process.js'

export default createRouter([{ path: '/api/registry/process', handler: handler0 }])
