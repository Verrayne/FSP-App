import { createRouter } from '../server/router.js'
import handler0 from '../server/api/ai-review/process.js'

export default createRouter([{ path: '/api/ai-review/process', handler: handler0 }])
