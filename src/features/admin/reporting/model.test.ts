import { describe, expect, it } from 'vitest'
import { certificateValidity, historyData, reportSeries, submissionMetrics } from './model'
import { portfolioFixture, reportingFixture } from './testFixtures'

describe('portfolio reporting', () => {
  it('uses completed submissions rather than portal registration for completion', () => {
    const rows = [
      portfolioFixture(),
      portfolioFixture({ complete: true, submissionStatus: 'COMPLETED' }),
    ]
    expect(reportSeries('completion', rows, '2026-10-01', []).map((item) => item.value)).toEqual([
      1, 1,
    ])
  })
  it('keeps missing expiry and attachments separate, and includes the expiry date as valid', () => {
    const row = portfolioFixture({ expiryDate: '2026-10-01', attachDate: '2026-09-01' })
    expect(certificateValidity(row, '2026-10-01')).toBe('Valid')
    expect(certificateValidity(row, '2026-10-01T22:30:00Z')).toBe('Expired')
    expect(certificateValidity({ ...row, attachDate: null }, '2026-10-01')).toBe('Not recorded')
    expect(certificateValidity({ ...row, expiryDate: '2026-02-30' }, '2026-10-01')).toBe(
      'Not recorded',
    )
  })
  it('includes configured enterprise types with zero counts and future recorded types', () => {
    const series = reportSeries(
      'enterprise',
      [portfolioFixture({ enterpriseType: 'Non-profit' }), portfolioFixture()],
      '2026-10-01',
      ['EME', 'QSE', 'Generic', 'Trust'],
    )
    expect(series.map((item) => [item.label, item.value])).toEqual([
      ['EME', 0],
      ['QSE', 0],
      ['Generic', 0],
      ['Trust', 0],
      ['Non-profit', 1],
      ['Not recorded', 1],
    ])
    expect(series.reduce((total, item) => total + item.value, 0)).toBe(2)
  })
  it('distinguishes unavailable historical months from a recorded empty portfolio', () => {
    const report = reportingFixture()
    report.months[10]!.portfolio = []
    const history = historyData('completion', report)
    expect(history.rows[0]!.values).toEqual([null, null])
    expect(history.rows[10]!.values).toEqual([0, 0])
    expect(history.rows[11]!.values).toEqual([0, 1])
  })
  it('matches dashboard review states and includes changes requested in outstanding and submitted', () => {
    const counts = submissionMetrics(
      [
        'NOT_STARTED',
        'IN_PROGRESS',
        'SUBMITTED',
        'UNDER_REVIEW',
        'HUMAN_REVIEW_REQUIRED',
        'CHANGES_REQUESTED',
        'COMPLETED',
        'REJECTED',
      ].map((submissionStatus) => portfolioFixture({ submissionStatus })),
    )
    expect(counts).toEqual({ submitted: 6, outstanding: 3, underReview: 2, completed: 1 })
  })
})
