import { strToU8, zipSync } from 'fflate'
import {
  historyData,
  portfolioCell,
  portfolioColumns,
  percentageFields,
  reportSeries,
  reportTitles,
  type ReportKind,
  type TenantReporting,
} from './model.js'

type Cell = string | number | null
interface Chart {
  title: string
  headerRow: number
  firstRow: number
  lastRow: number
  columns: number
  row: number
}
const spreadsheetNs = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
const relationshipNs = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const packageNs = 'http://schemas.openxmlformats.org/package/2006/relationships'
const chartNs = 'http://schemas.openxmlformats.org/drawingml/2006/chart'
const drawingNs = 'http://schemas.openxmlformats.org/drawingml/2006/main'
const header = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
function xml(value: unknown) {
  return String(value)
    .split('')
    .filter((character) => character.charCodeAt(0) >= 32 || ['\t', '\n', '\r'].includes(character))
    .join('')
    .replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!,
    )
}
function column(index: number): string {
  let name = ''
  for (let number = index + 1; number > 0; number = Math.floor((number - 1) / 26))
    name = String.fromCharCode(65 + ((number - 1) % 26)) + name
  return name
}

function nativeChart(chart: Chart, rows: Cell[][]) {
  const title = `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-ZA"/><a:t>${xml(chart.title)}</a:t></a:r></a:p></c:rich></c:tx></c:title>`
  const series = Array.from({ length: chart.columns - 1 }, (_, index) => {
    const col = column(index + 1)
    const values = rows.slice(chart.firstRow - 1, chart.lastRow)
    const categories = values
      .map((row, i) => `<c:pt idx="${i}"><c:v>${xml(row[0] ?? '')}</c:v></c:pt>`)
      .join('')
    const numbers = values
      .map((row, i) =>
        typeof row[index + 1] === 'number'
          ? `<c:pt idx="${i}"><c:v>${row[index + 1]}</c:v></c:pt>`
          : '',
      )
      .join('')
    return `<c:ser><c:idx val="${index}"/><c:order val="${index}"/><c:tx><c:v>${xml(rows[chart.headerRow - 1]?.[index + 1] ?? 'Count')}</c:v></c:tx><c:spPr><a:solidFill><a:srgbClr val="${['2563EB', 'F97316', '0D9488', '8B5CF6', '94A3B8'][index % 5]}"/></a:solidFill></c:spPr><c:cat><c:strRef><c:f>'Report'!$A$${chart.firstRow}:$A$${chart.lastRow}</c:f><c:strCache><c:ptCount val="${values.length}"/>${categories}</c:strCache></c:strRef></c:cat><c:val><c:numRef><c:f>'Report'!$${col}$${chart.firstRow}:$${col}$${chart.lastRow}</c:f><c:numCache><c:formatCode>0</c:formatCode><c:ptCount val="${values.length}"/>${numbers}</c:numCache></c:numRef></c:val></c:ser>`
  }).join('')
  return `${header}<c:chartSpace xmlns:c="${chartNs}" xmlns:a="${drawingNs}" xmlns:r="${relationshipNs}"><c:chart>${title}<c:plotArea><c:layout/><c:barChart><c:barDir val="bar"/><c:grouping val="clustered"/>${series}<c:gapWidth val="70"/><c:overlap val="0"/><c:axId val="1"/><c:axId val="2"/></c:barChart><c:catAx><c:axId val="1"/><c:scaling><c:orientation val="maxMin"/></c:scaling><c:axPos val="l"/><c:tickLblPos val="nextTo"/><c:crossAx val="2"/><c:crosses val="autoZero"/></c:catAx><c:valAx><c:axId val="2"/><c:scaling><c:orientation val="minMax"/><c:min val="0"/></c:scaling><c:axPos val="b"/><c:majorGridlines/><c:numFmt formatCode="0" sourceLinked="0"/><c:tickLblPos val="nextTo"/><c:crossAx val="1"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx></c:plotArea><c:legend><c:legendPos val="b"/><c:layout/></c:legend><c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart></c:chartSpace>`
}

// A small standards-based OOXML writer shared by downloads and server-generated attachments.
// All user text is written as inline strings, never formulas or external workbook links.
export function buildReportWorkbook(
  report: TenantReporting,
  kind: ReportKind,
  tenantName: string,
  windowDays: number,
): Uint8Array {
  const rows: Cell[][] = [
    [`${tenantName} — ${reportTitles[kind]}`],
    ['As of', report.asOf.slice(0, 10)],
    ['Reporting window', `Last ${windowDays === 1 ? 'day' : windowDays === 7 ? 'week' : 'month'}`],
    ['History available from', report.coverageStart?.slice(0, 10) ?? 'Unavailable'],
    ['Missing data is not treated as zero. Earlier months have no recorded snapshot.'],
  ]
  const charts: Chart[] = []
  let filterRow: number
  if (kind === 'fsps') {
    rows.push(
      [],
      portfolioColumns.map((item) => item.label),
    )
    filterRow = rows.length
    for (const row of report.portfolio)
      rows.push(
        portfolioColumns.map((item) => {
          const cell = portfolioCell(row, item.key, report.asOf)
          if (
            item.key !== 'certificateValid' &&
            percentageFields.has(item.key) &&
            row[item.key] !== null &&
            Number.isFinite(Number(row[item.key]))
          )
            return Number(row[item.key])
          return cell
        }),
      )
  } else {
    const current = reportSeries(kind, report.portfolio, report.asOf, report.enterpriseTypes)
    rows.push([], ['Category', 'FSPs'])
    const currentHeader = rows.length
    rows.push(...current.map((item) => [item.label, item.value]))
    charts.push({
      title: reportTitles[kind],
      headerRow: currentHeader,
      firstRow: currentHeader + 1,
      lastRow: rows.length,
      columns: 2,
      row: 0,
    })
    rows.push(
      [],
      ['Monthly portfolio status'],
      ['Month', ...historyData(kind, report).labels, 'Total FSPs'],
    )
    filterRow = rows.length
    const history = historyData(kind, report)
    rows.push(...history.rows.map((item) => [item.month, ...item.values, item.total]))
    charts.push({
      title: 'Previous 12 months',
      headerRow: filterRow,
      firstRow: filterRow + 1,
      lastRow: rows.length,
      columns: history.labels.length + 1,
      row: 17,
    })
  }
  const width = Math.max(...rows.map((row) => row.length))
  const styledHeaders = new Set([filterRow, 7])
  const sheetData = rows
    .map(
      (row, index) =>
        `<row r="${index + 1}"${styledHeaders.has(index + 1) ? ' ht="44" customHeight="1"' : ''}>${row
          .map((value, col) => {
            const address = `${column(col)}${index + 1}`
            const style = index === 0 ? 2 : styledHeaders.has(index + 1) ? 1 : 0
            return typeof value === 'number'
              ? `<c r="${address}" s="${style}"><v>${value}</v></c>`
              : `<c r="${address}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value ?? 'Unavailable')}</t></is></c>`
          })
          .join('')}</row>`,
    )
    .join('')
  const entries: Record<string, string> = {
    '[Content_Types].xml': `${header}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${charts.length ? '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>' : ''}${charts.map((_, i) => `<Override PartName="/xl/charts/chart${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`).join('')}</Types>`,
    '_rels/.rels': `${header}<Relationships xmlns="${packageNs}"><Relationship Id="rId1" Type="${relationshipNs}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `${header}<workbook xmlns="${spreadsheetNs}" xmlns:r="${relationshipNs}"><sheets><sheet name="Report" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `${header}<Relationships xmlns="${packageNs}"><Relationship Id="rId1" Type="${relationshipNs}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${relationshipNs}/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': `${header}<styleSheet xmlns="${spreadsheetNs}"><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="16"/><color rgb="FF0F172A"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0D9488"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
    'xl/worksheets/sheet1.xml': `${header}<worksheet xmlns="${spreadsheetNs}" xmlns:r="${relationshipNs}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="${filterRow}" topLeftCell="A${filterRow + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${Array.from({ length: width }, (_, i) => `<col min="${i + 1}" max="${i + 1}" width="${i === 0 ? 28 : 24}" customWidth="1"/>`).join('')}</cols><sheetData>${sheetData}</sheetData><autoFilter ref="A${filterRow}:${column(width - 1)}${rows.length}"/>${charts.length ? '<drawing r:id="rId1"/>' : ''}</worksheet>`,
  }
  if (charts.length) {
    entries['xl/worksheets/_rels/sheet1.xml.rels'] =
      `${header}<Relationships xmlns="${packageNs}"><Relationship Id="rId1" Type="${relationshipNs}/drawing" Target="../drawings/drawing1.xml"/></Relationships>`
    entries['xl/drawings/_rels/drawing1.xml.rels'] =
      `${header}<Relationships xmlns="${packageNs}">${charts.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${relationshipNs}/chart" Target="../charts/chart${i + 1}.xml"/>`).join('')}</Relationships>`
    entries['xl/drawings/drawing1.xml'] =
      `${header}<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="${drawingNs}" xmlns:r="${relationshipNs}">${charts.map((chart, i) => `<xdr:twoCellAnchor><xdr:from><xdr:col>${width + 1}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${chart.row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>${width + 10}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${chart.row + 16}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${i + 1}" name="${xml(chart.title)}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="${chartNs}"><c:chart xmlns:c="${chartNs}" r:id="rId${i + 1}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`).join('')}</xdr:wsDr>`
    charts.forEach((chart, i) => {
      entries[`xl/charts/chart${i + 1}.xml`] = nativeChart(chart, rows)
    })
  }
  return zipSync(
    Object.fromEntries(Object.entries(entries).map(([name, value]) => [name, strToU8(value)])),
    { level: 6 },
  )
}

export function reportFilename(kind: ReportKind, asOf: string) {
  return `fsp-${kind}-${asOf.slice(0, 10)}.xlsx`
}
