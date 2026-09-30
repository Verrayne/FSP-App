import { describe, expect, it } from 'vitest'

import type { DashboardPeriod, DashboardSubmission } from '../types/dashboard'
import {
  dashboardAction,
  deadlineMessage,
  formatDateOnly,
  submissionStatusPresentation,
} from './dashboardPresentation'
import { resolveRelevantPeriod } from '../services/dashboardService'

const period: DashboardPeriod = {
  id: 'period-1',
  name: 'Annual submission',
  year: 2026,
  openDate: '2026-08-01',
  closeDate: '2026-10-31',
  status: 'OPEN',
}

function submission(status: DashboardSubmission['status']): DashboardSubmission {
  return {
    id: 'submission-1',
    periodId: period.id,
    status,
    route: null,
    startDate: status === 'NOT_STARTED' ? null : '2026-08-02T08:00:00Z',
    submitDate: ['SUBMITTED', 'UNDER_REVIEW', 'COMPLETED', 'REJECTED'].includes(status)
      ? '2026-09-01T08:00:00Z'
      : null,
    updateDate: '2026-09-01T08:00:00Z',
  }
}

describe('dashboard presentation', () => {
  it('maps every supported database status to user-facing text', () => {
    expect(Object.values(submissionStatusPresentation).map(({ label }) => label)).toEqual([
      'Not started',
      'In progress',
      'Submitted',
      'Under review',
      'Under review',
      'Changes requested',
      'Completed',
      'Rejected',
    ])
  })

  it('maps editable submission states to Prompt 06 routes', () => {
    expect(dashboardAction(null, period, 'ADMIN', '2026-09-10', 'relationship-1')).toEqual({
      label: 'Start submission',
      href: '/app/submissions/new?period=period-1&relationship=relationship-1',
      readOnly: false,
    })
    expect(
      dashboardAction(
        submission('IN_PROGRESS'),
        period,
        'SUBMITTER',
        '2026-09-10',
        'relationship-1',
      ).label,
    ).toBe('Continue submission')
    expect(
      dashboardAction(submission('COMPLETED'), period, 'ADMIN', '2026-09-10', 'relationship-1')
        .label,
    ).toBe('View submission')
  })

  it('keeps viewer actions read-only', () => {
    expect(
      dashboardAction(submission('IN_PROGRESS'), period, 'VIEWER', '2026-09-10', 'relationship-1'),
    ).toMatchObject({ label: 'View submission', readOnly: true })
    expect(dashboardAction(null, period, 'VIEWER', '2026-09-10', 'relationship-1')).toEqual({
      label: 'Read-only access',
      href: null,
      readOnly: true,
    })
  })

  it('formats date-only deadlines without timezone drift and describes urgency', () => {
    expect(formatDateOnly('2026-10-31')).toBe('31 October 2026')
    expect(deadlineMessage(period, '2026-10-25')).toBe('6 days remaining')
  })

  it('resolves current, upcoming, then most recently closed periods', () => {
    const closed = { ...period, id: 'closed', closeDate: '2025-10-31', status: 'CLOSED' as const }
    const upcoming = {
      ...period,
      id: 'upcoming',
      openDate: '2027-08-01',
      closeDate: '2027-10-31',
      status: 'DRAFT' as const,
    }
    expect(resolveRelevantPeriod([closed, period, upcoming], '2026-09-10')?.id).toBe('period-1')
    expect(resolveRelevantPeriod([closed, upcoming], '2026-09-10')?.id).toBe('upcoming')
    expect(resolveRelevantPeriod([closed], '2026-09-10')?.id).toBe('closed')
    expect(resolveRelevantPeriod([], '2026-09-10')).toBeNull()
  })
})
