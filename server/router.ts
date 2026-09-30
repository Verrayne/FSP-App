import type { VercelRequest, VercelResponse } from '@vercel/node'

type Handler = (request: VercelRequest, response: VercelResponse) => unknown
type Route = { path: string; handler: Handler }

// Vercel rewrites supply the original path through __path. Each handler keeps
// its existing method, authentication, authorization, and payload validation.
export function createRouter(routes: Route[]) {
  return (request: VercelRequest, response: VercelResponse) => {
    const rewrittenPath = request.query.__path
    if (rewrittenPath !== undefined && typeof rewrittenPath !== 'string') {
      return response.status(404).json({ error: 'NOT_FOUND' })
    }
    const path = rewrittenPath ?? request.url?.split('?')[0]
    const segments = path?.split('/')
    for (const route of routes) {
      const expected = route.path.split('/')
      if (!segments || segments.length !== expected.length) continue
      const params: Record<string, string> = {}
      const matches = expected.every((part, index) => {
        const value = segments[index]
        if (!part.startsWith(':')) return part === value
        if (!value) return false
        params[part.slice(1)] = value
        return true
      })
      if (!matches) continue
      // Path IDs take precedence over user-supplied query parameters.
      const query = { ...request.query }
      delete query.__path
      request.query = { ...query, ...params }
      return route.handler(request, response)
    }
    return response.status(404).json({ error: 'NOT_FOUND' })
  }
}
