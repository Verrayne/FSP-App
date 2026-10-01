import type { PortfolioRow, TenantReporting } from './model'

export function portfolioFixture(overrides: Partial<PortfolioRow> = {}): PortfolioRow {
  return {
    id: 'ae000000-0000-4000-8000-000000000001',
    fspNumber: '51234',
    tiaFspNumber: null,
    fspName: 'Karoo Oak',
    registrationStatus: 'Registered',
    classification: 'FINANCIAL_ADVISER',
    fscaStatus: 'AUTHORISED',
    region: 'Western Cape',
    contributor: null,
    bbbeeLevel: 'Level 1',
    bbbeePercentage: null,
    blackOwned: '51.25',
    blackFemaleOwned: '30',
    blackDesignatedOwned: null,
    blackYouth: null,
    blackDisabled: null,
    blackUnemployed: null,
    blackRural: null,
    blackVeterans: null,
    expiryDate: null,
    contactPerson: 'Ayanda Dlamini',
    email: 'compliance@example.test',
    enterpriseType: null,
    enterpriseNature: null,
    linkDate: '2026-08-01',
    attachDate: null,
    submissionStatus: 'UNDER_REVIEW',
    periodId: 'period-a',
    submittedAt: '2026-09-01',
    complete: false,
    ...overrides,
  }
}
export function reportingFixture(): TenantReporting {
  return {
    asOf: '2026-10-01T10:00:00+00:00',
    coverageStart: '2026-10-01T09:00:00+00:00',
    portfolio: [
      portfolioFixture(),
      portfolioFixture({
        id: 'fsp-b',
        fspNumber: '53456',
        fspName: 'Ubuntu Meridian',
        submissionStatus: 'COMPLETED',
        complete: true,
        enterpriseType: 'EME',
        expiryDate: '2026-10-01',
        attachDate: '2026-09-01',
      }),
    ],
    baseline: null,
    enterpriseTypes: ['EME', 'QSE', 'Generic'],
    months: Array.from({ length: 12 }, (_, i) => ({
      month: new Date(Date.UTC(2025, 10 + i, 1)).toISOString().slice(0, 7),
      asOf: new Date(Date.UTC(2025, 11 + i, 0)).toISOString().slice(0, 10),
      portfolio: i === 11 ? [portfolioFixture()] : null,
    })),
  }
}
