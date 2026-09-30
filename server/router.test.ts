import { readFileSync, readdirSync } from 'node:fs'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { describe, expect, it, vi } from 'vitest'

import { createRouter } from './router'

function response() {
  const json = vi.fn()
  const status = vi.fn(() => ({ json }))
  return { value: { status } as unknown as VercelResponse, status, json }
}

const config = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
  rewrites: { source: string; destination: string }[]
  crons: { path: string }[]
}

describe('grouped API routing', () => {
  it('deploys eight entrypoints and maps all 17 other public routes to them', () => {
    const entries = readdirSync('api').filter((file) => file.endsWith('.ts'))
    expect(entries).toHaveLength(8)
    const rewrites = config.rewrites.filter((route) => route.source.startsWith('/api/'))
    expect(rewrites).toHaveLength(17)
    for (const route of rewrites) {
      const [destination, path] = route.destination.split('?__path=')
      expect(entries).toContain(destination.slice('/api/'.length) + '.ts')
      expect(path).toBe(route.source)
      const source = readFileSync(destination.slice(1) + '.ts', 'utf8')
      expect(source).toContain(`path: '${route.source}'`)
    }
    for (const cron of config.crons) {
      expect(rewrites.some((route) => route.source === cron.path)).toBe(true)
    }
  })

  it('passes path IDs, pagination, headers and upload bodies to the original handler', () => {
    const handler = vi.fn()
    const body = Buffer.from('%PDF-test')
    const headers = { authorization: 'Bearer token', 'x-fsp-id': 'fsp' }
    const request = {
      query: { __path: '/api/submissions/path-id/certificate', submissionId: 'spoofed', page: '2' },
      method: 'POST',
      headers,
      body,
    } as unknown as VercelRequest
    const res = response()
    createRouter([{ path: '/api/submissions/:submissionId/certificate', handler }])(
      request,
      res.value,
    )
    expect(handler).toHaveBeenCalledWith(request, res.value)
    expect(request.query).toEqual({ submissionId: 'path-id', page: '2' })
    expect(request.body).toBe(body)
    expect(request.headers).toBe(headers)
    expect(request.method).toBe('POST')
  })

  it.each(['/api/unknown', '/api/items/', ['/api/items/id', '/api/items/other']])(
    'rejects unknown, empty or ambiguous route paths: %s',
    (path) => {
      const handler = vi.fn()
      const res = response()
      createRouter([{ path: '/api/items/:id', handler }])(
        { query: { __path: path } } as unknown as VercelRequest,
        res.value,
      )
      expect(res.status).toHaveBeenCalledWith(404)
      expect(handler).not.toHaveBeenCalled()
    },
  )

  it('supports the health URL directly', () => {
    const handler = vi.fn()
    createRouter([{ path: '/api/health', handler }])(
      { url: '/api/health?test=1', query: {} } as VercelRequest,
      response().value,
    )
    expect(handler).toHaveBeenCalledOnce()
  })
})
