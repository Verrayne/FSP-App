import { writeFileSync } from 'node:fs'
import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { portfolioColumns } from './model'
import { reportingFixture } from './testFixtures'
import { buildReportWorkbook } from './workbook'

describe('Excel reports', () => {
  it('produces a valid ZIP of XML parts with two native charts and historical gaps', () => {
    const bytes = buildReportWorkbook(reportingFixture(), 'completion', 'Cape Horizon', 7)
    const files = unzipSync(bytes)
    for (const [name, data] of Object.entries(files)) {
      const content = strFromU8(data)
      expect(
        new DOMParser().parseFromString(content, 'application/xml').querySelector('parsererror'),
        name,
      ).toBeNull()
    }
    expect(files['xl/charts/chart1.xml']).toBeDefined()
    expect(files['xl/charts/chart2.xml']).toBeDefined()
    const chart = strFromU8(files['xl/charts/chart2.xml']!)
    expect(chart).toContain('<c:ptCount val="12"/>')
    expect(chart).toContain('<c:dispBlanksAs val="gap"/>')
    expect(chart).not.toContain('<c:pt idx="0"><c:v>0</c:v>')
    expect(strFromU8(files['xl/worksheets/sheet1.xml']!)).toContain('Unavailable')
    if (process.env.REPORT_QA_PATH)
      writeFileSync(`${process.env.REPORT_QA_PATH}/completion.xlsx`, bytes)
  })
  it('exports every portfolio column and writes dangerous-looking text as text', () => {
    const report = reportingFixture()
    report.portfolio[0]!.fspName = '=HYPERLINK("https://example.test", "Click") <&>'
    const bytes = buildReportWorkbook(report, 'fsps', 'Cape Horizon', 30)
    const files = unzipSync(bytes)
    const sheet = strFromU8(files['xl/worksheets/sheet1.xml']!)
    for (const col of portfolioColumns) expect(sheet).toContain(col.label.replaceAll('&', '&amp;'))
    expect(sheet).toContain('=HYPERLINK(&quot;')
    expect(sheet).not.toContain('<f>')
    expect(files['xl/charts/chart1.xml']).toBeUndefined()
    if (process.env.REPORT_QA_PATH) writeFileSync(`${process.env.REPORT_QA_PATH}/fsps.xlsx`, bytes)
  })
})
