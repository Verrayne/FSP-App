import { afterEach, describe, expect, it } from 'vitest'

import { getTrustedAppUrl } from './serverConfig'

const originalEnvironment = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnvironment }
})

describe('getTrustedAppUrl', () => {
  it('uses a valid configured URL outside production', () => {
    process.env.VERCEL_ENV = 'preview'
    process.env.APP_URL = 'https://preview.example.test'

    expect(getTrustedAppUrl()).toBe('https://preview.example.test')
  })

  it('uses localhost only outside production', () => {
    process.env.VERCEL_ENV = 'development'
    delete process.env.APP_URL
    delete process.env.PUBLIC_APP_URL

    expect(getTrustedAppUrl()).toBe('http://localhost:5173')
  })

  it('rejects a missing or insecure production origin', () => {
    process.env.VERCEL_ENV = 'production'
    delete process.env.APP_URL
    delete process.env.PUBLIC_APP_URL

    expect(() => getTrustedAppUrl()).toThrow()

    process.env.APP_URL = 'http://production.example.test'
    expect(() => getTrustedAppUrl()).toThrow()

    process.env.VERCEL_ENV = 'preview'
    process.env.APP_ENV = 'production'
    expect(() => getTrustedAppUrl()).toThrow()
  })
})
