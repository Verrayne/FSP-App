import { createRouter } from '../server/router.js'
import handler0 from '../server/api/notifications/process.js'
import handler1 from '../server/api/notifications/reminders.js'

export default createRouter([
  { path: '/api/notifications/process', handler: handler0 },
  { path: '/api/notifications/reminders', handler: handler1 },
])
