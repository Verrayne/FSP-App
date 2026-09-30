import { describe, expect, it } from 'vitest'

import { ManualCsvProvider } from './manualCsvProvider'

describe('ManualCsvProvider', () => {
  it('normalises authorised statuses and preserves only supported fields', async () => {
    const result = await new ManualCsvProvider().parse(
      Buffer.from(
        'fsp_number,registered_name,regulatory_status,status_effective_date,trade_name\nFSP 60001, Example   Advice ,Authorized,2026-09-01,Must not import\n',
      ),
    )
    expect(result.ignoredHeaders).toEqual(['trade_name'])
    expect(result.rows[0]).toMatchObject({
      validationStatus: 'VALID',
      normalized: {
        fsp_number: '60001',
        registered_name: 'Example Advice',
        status: 'AUTHORISED',
        status_effective_date: '2026-09-01',
      },
    })
    expect(result.rows[0].raw).not.toHaveProperty('trade_name')
  })

  it('marks conflicting rows and rejects invalid dates and statuses', async () => {
    const result = await new ManualCsvProvider().parse(
      Buffer.from(
        'fsp_number,registered_name,regulatory_status,status_effective_date\n60002,One Advice,AUTHORISED,2026-09-01\n60002,Changed Advice,SUSPENDED,2026-09-02\n60003,Three Advice,Unknown,2026-09-01\n60004,Four Advice,LAPSED,2026-02-31\n',
      ),
    )
    expect(result.rows.map((row) => row.validationStatus)).toEqual([
      'CONFLICT',
      'CONFLICT',
      'INVALID',
      'INVALID',
    ])
    expect(result.rows[2].errorCode).toBe('UNKNOWN_REGULATORY_STATUS')
    expect(result.rows[3].errorCode).toBe('INVALID_EFFECTIVE_DATE')
  })

  it('does not interpret blank optional fields as destructive clears', async () => {
    const result = await new ManualCsvProvider().parse(
      Buffer.from(
        'fsp_number,registered_name,regulatory_status,registration_number,fsp_type\n60005,Five Advice,ACTIVE,,\n',
      ),
    )
    expect(result.rows[0].normalized).not.toHaveProperty('registration_number')
    expect(result.rows[0].normalized).not.toHaveProperty('fsp_type')
  })
})
