import { z } from 'zod'

export const reportingWindows = [1, 7, 30] as const
export type ReportingWindow = (typeof reportingWindows)[number]
export type ReportKind = 'completion' | 'validity' | 'enterprise' | 'fsps'

const nullableText = z.string().nullable()
const portfolioRowSchema = z.object({
  id: z.string(),
  fspNumber: z.string(),
  tiaFspNumber: nullableText,
  fspName: z.string(),
  registrationStatus: z.string(),
  classification: nullableText,
  fscaStatus: nullableText,
  region: nullableText,
  contributor: nullableText,
  bbbeeLevel: nullableText,
  bbbeePercentage: nullableText,
  blackOwned: nullableText,
  blackFemaleOwned: nullableText,
  blackDesignatedOwned: nullableText,
  blackYouth: nullableText,
  blackDisabled: nullableText,
  blackUnemployed: nullableText,
  blackRural: nullableText,
  blackVeterans: nullableText,
  expiryDate: nullableText,
  contactPerson: nullableText,
  email: nullableText,
  enterpriseType: nullableText,
  enterpriseNature: nullableText,
  linkDate: nullableText,
  attachDate: nullableText,
  submissionStatus: z.string(),
  periodId: nullableText,
  submittedAt: nullableText,
  complete: z.boolean(),
})
export type PortfolioRow = z.infer<typeof portfolioRowSchema>
export const percentageFields = new Set<string>([
  'bbbeePercentage',
  'blackOwned',
  'blackFemaleOwned',
  'blackDesignatedOwned',
  'blackYouth',
  'blackDisabled',
  'blackUnemployed',
  'blackRural',
  'blackVeterans',
])
export const reportingSchema = z.object({
  asOf: z.string(),
  coverageStart: nullableText,
  portfolio: z.array(portfolioRowSchema),
  baseline: z.array(portfolioRowSchema).nullable(),
  enterpriseTypes: z.array(z.string()),
  months: z.array(
    z.object({
      month: z.string(),
      asOf: z.string(),
      portfolio: z.array(portfolioRowSchema).nullable(),
    }),
  ),
})
export type TenantReporting = z.infer<typeof reportingSchema>
export const reportTitles: Record<ReportKind, string> = {
  completion: 'Complete vs incomplete',
  validity: 'Valid vs expired',
  enterprise: 'Enterprise type',
  fsps: 'FSP portfolio',
}
export const portfolioColumns: { key: keyof PortfolioRow | 'certificateValid'; label: string }[] = [
  { key: 'fspNumber', label: 'FSP Number' },
  { key: 'tiaFspNumber', label: 'Tia FSP no' },
  { key: 'fspName', label: 'FSP Name' },
  { key: 'registrationStatus', label: 'Portal Registration Status' },
  { key: 'classification', label: 'FSP Classification' },
  { key: 'fscaStatus', label: 'FSCA Status' },
  { key: 'region', label: 'Region' },
  { key: 'contributor', label: 'B-BBEE Contributor' },
  { key: 'bbbeeLevel', label: 'B-BBEE Level' },
  { key: 'bbbeePercentage', label: 'B-BBEE %' },
  { key: 'blackOwned', label: '% Black Owned' },
  { key: 'blackFemaleOwned', label: '% Black Female Owned' },
  { key: 'blackDesignatedOwned', label: '% Black Designated Group Owned' },
  { key: 'blackYouth', label: 'Black Youth %' },
  { key: 'blackDisabled', label: 'Black Disabled %' },
  { key: 'blackUnemployed', label: 'Black Unemployed %' },
  { key: 'blackRural', label: 'Black People living in Rural areas %' },
  { key: 'blackVeterans', label: 'Black Military Veterans %' },
  { key: 'expiryDate', label: 'BBBEE Certificate / Affidavit Expiry Date' },
  { key: 'certificateValid', label: 'BBBEE Certificate / Affidavit Valid' },
  { key: 'contactPerson', label: 'Contact Person' },
  { key: 'email', label: 'E-mail Address' },
  { key: 'enterpriseType', label: 'Enterprise Type' },
  { key: 'enterpriseNature', label: 'Enterprise Nature' },
  { key: 'linkDate', label: 'FSP Link Date' },
  { key: 'attachDate', label: 'Affidavit / BBBEE Certificate Attach Date' },
]

export function certificateValidity(row: PortfolioRow, asOf: string) {
  if (!row.attachDate || !row.expiryDate || !/^\d{4}-\d{2}-\d{2}$/.test(row.expiryDate))
    return 'Not recorded'
  const expiry = new Date(`${row.expiryDate}T12:00:00Z`)
  if (Number.isNaN(expiry.getTime()) || expiry.toISOString().slice(0, 10) !== row.expiryDate)
    return 'Not recorded'
  const reportingDate =
    asOf.length === 10
      ? asOf
      : new Intl.DateTimeFormat('en-CA', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          timeZone: 'Africa/Johannesburg',
        }).format(new Date(asOf))
  return row.expiryDate >= reportingDate ? 'Valid' : 'Expired'
}

export function portfolioCell(
  row: PortfolioRow,
  key: (typeof portfolioColumns)[number]['key'],
  asOf: string,
) {
  if (key === 'certificateValid') return certificateValidity(row, asOf)
  const value = row[key]
  if (value === null || value === '') return 'Not recorded'
  if (percentageFields.has(key) && Number.isFinite(Number(value)))
    return `${new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 2 }).format(Number(value))}%`
  if (['linkDate', 'attachDate'].includes(key)) return String(value).slice(0, 10)
  return String(value)
}

export interface ReportSeries {
  label: string
  value: number
  color: string
}
const colors = ['#2563eb', '#f97316', '#0d9488', '#8b5cf6', '#64748b', '#e11d48']
export function reportSeries(
  kind: Exclude<ReportKind, 'fsps'>,
  rows: PortfolioRow[],
  asOf: string,
  enterpriseTypes: string[],
): ReportSeries[] {
  let labels: string[]
  let category: (row: PortfolioRow) => string
  if (kind === 'completion') {
    labels = ['Complete', 'Incomplete']
    category = (row) => (row.complete ? 'Complete' : 'Incomplete')
  } else if (kind === 'validity') {
    labels = ['Valid', 'Expired', 'Not recorded']
    category = (row) => certificateValidity(row, asOf)
  } else {
    labels = [
      ...new Set([
        ...enterpriseTypes,
        ...rows.flatMap((row) => (row.enterpriseType ? [row.enterpriseType] : [])),
      ]),
      'Not recorded',
    ]
    category = (row) => row.enterpriseType || 'Not recorded'
  }
  return labels.map((label, index) => ({
    label,
    value: rows.filter((row) => category(row) === label).length,
    color: label === 'Not recorded' ? '#94a3b8' : colors[index % colors.length]!,
  }))
}

export function submissionMetrics(rows: PortfolioRow[]) {
  return {
    submitted: rows.filter((row) =>
      [
        'SUBMITTED',
        'UNDER_REVIEW',
        'COMPLETED',
        'REJECTED',
        'CHANGES_REQUESTED',
        'HUMAN_REVIEW_REQUIRED',
      ].includes(row.submissionStatus),
    ).length,
    outstanding: rows.filter((row) =>
      ['NOT_STARTED', 'IN_PROGRESS', 'CHANGES_REQUESTED'].includes(row.submissionStatus),
    ).length,
    underReview: rows.filter((row) =>
      ['UNDER_REVIEW', 'HUMAN_REVIEW_REQUIRED'].includes(row.submissionStatus),
    ).length,
    completed: rows.filter((row) => row.submissionStatus === 'COMPLETED').length,
  }
}

export function monthLabel(month: string) {
  return new Intl.DateTimeFormat('en-ZA', {
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Johannesburg',
  }).format(new Date(`${month}-01T12:00:00Z`))
}

export function historyData(kind: Exclude<ReportKind, 'fsps'>, report: TenantReporting) {
  const labels = [
    ...new Set([
      ...reportSeries(kind, report.portfolio, report.asOf, report.enterpriseTypes).map(
        (item) => item.label,
      ),
      ...report.months.flatMap((month) =>
        month.portfolio
          ? reportSeries(kind, month.portfolio, month.asOf, report.enterpriseTypes).map(
              (item) => item.label,
            )
          : [],
      ),
    ]),
  ]
  return {
    labels,
    rows: report.months.map((month) => {
      const series = month.portfolio
        ? reportSeries(kind, month.portfolio, month.asOf, report.enterpriseTypes)
        : null
      return {
        month: monthLabel(month.month),
        asOf: month.asOf,
        values: labels.map((label) =>
          series ? (series.find((item) => item.label === label)?.value ?? 0) : null,
        ),
        total: month.portfolio?.length ?? null,
      }
    }),
  }
}
