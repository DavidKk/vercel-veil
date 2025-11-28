import * as cssSelect from 'css-select'

import type { TasiCompanyDailyRecord } from './types'
import { ensureDoc, nodeText, parseNumber, parsePercent } from './utils'

export function parseTasiCompaniesDaily(htmlOrDoc: string | any): TasiCompanyDailyRecord[] {
  const doc = ensureDoc(htmlOrDoc)

  // extract report date from page (e.g. "Market Date 2025/08/18")
  let reportDate: string | null = null
  try {
    const lastUpdateEl = cssSelect.selectOne('.lastUpdate', doc as any)
    const lastUpdateText = lastUpdateEl ? nodeText(lastUpdateEl).trim() : ''
    // try to find a date like 2025/08/18 or 18/08/2025 etc.
    const m1 = lastUpdateText.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/) // YYYY/MM/DD
    if (m1) {
      const y = m1[1].padStart(4, '0')
      const mm = m1[2].padStart(2, '0')
      const dd = m1[3].padStart(2, '0')
      reportDate = `${y}-${mm}-${dd}`
    } else {
      const m2 = lastUpdateText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/) // DD/MM/YYYY or MM/DD/YYYY
      if (m2) {
        // assume format is YYYY at the end -> treat as DD/MM/YYYY and convert to YYYY-MM-DD
        const dd = m2[1].padStart(2, '0')
        const mm = m2[2].padStart(2, '0')
        const y = m2[3]
        reportDate = `${y}-${mm}-${dd}`
      }
    }
  } catch (e) {
    reportDate = null
  }

  // choose the most likely data table by scoring headers and row count
  let bestTable: any | null = null
  let bestScore = -1
  const tables = cssSelect.selectAll('table', doc as any)
  tables.forEach((table: any) => {
    const $table = table

    // collect header texts (thead preferred, fallback to first row)
    let headers: string[] = []
    const headerCells = cssSelect.selectAll('thead th, thead td', $table)
    if (headerCells && headerCells.length) {
      headers = headerCells.map((th: any) => nodeText(th).trim().toLowerCase())
    } else {
      const firstRow = cssSelect.selectAll('tr', $table)[0]
      if (firstRow) {
        const cells = cssSelect.selectAll('td,th', firstRow)
        headers = cells.map((h: any) => nodeText(h).trim().toLowerCase())
      }
    }

    const joined = headers.join(' ')

    // simple header match score: prefer presence of these keywords
    let score = 0
    if (joined.includes('company')) score += 5
    if (joined.includes('company name')) score += 5
    if (joined.includes('close')) score += 2
    if (joined.includes('% change') || joined.includes('% change')) score += 2
    if (joined.includes('volume')) score += 2
    if (joined.includes('market cap') || joined.includes('market cap')) score += 2

    // count data rows (tbody tr preferred)
    const dataRows = cssSelect.selectAll('tbody tr', $table)
    const rowCount = dataRows.length ? dataRows.length : Math.max(0, cssSelect.selectAll('tr', $table).length - 1)

    // boost tables with many rows
    score += Math.min(rowCount, 100) / 10

    if (score > bestScore) {
      bestScore = score
      bestTable = $table
    }
  })

  let dataTable: any | null = bestTable
  if (!dataTable) {
    const first = cssSelect.selectAll('table', doc as any)[0]
    if (first) dataTable = first
  }

  if (!dataTable || dataTable.length === 0) {
    return []
  }

  // detect header cells to build a column -> field mapping
  const headerCells = cssSelect.selectAll('thead th, thead td', dataTable)
  let headersText: string[] = []
  if (headerCells && headerCells.length) {
    headersText = headerCells.map((h: any) =>
      nodeText(h)
        .trim()
        .toLowerCase()
        .replace(/\(.*?\)/g, '')
        .trim()
    )
  } else {
    // fallback: use first row as header
    const firstRow = cssSelect.selectAll('tr', dataTable)[0]
    if (firstRow) {
      const cells = cssSelect.selectAll('td,th', firstRow)
      headersText = cells.map((h: any) =>
        nodeText(h)
          .trim()
          .toLowerCase()
          .replace(/\(.*?\)/g, '')
          .trim()
      )
    }
  }

  // If this is the Companies List with the known header set, prepare fixed positional mapping
  const isCompaniesList = headersText.some((h) => h.includes('company')) && headersText.some((h) => h.includes('close'))
  let fixedMapping: Array<string | null> | null = null
  if (isCompaniesList) {
    // Expected columns (one-to-one from the report):
    // 0: Company, 1: Open, 2: High, 3: Low, 4: Close, 5: % Change, 6: Volume Traded, 7: Value Traded, 8: No. of Trades, 9: Market Cap
    const fixed: Array<string | null> = []
    fixed[0] = 'name'
    fixed[1] = 'open'
    fixed[2] = 'high'
    fixed[3] = 'low'
    fixed[4] = 'lastPrice'
    fixed[5] = 'changePercent'
    fixed[6] = 'volume'
    fixed[7] = 'turnover'
    fixed[8] = 'numberOfTrades' // number of trades column
    fixed[9] = 'marketCap'

    while (fixed.length < headersText.length) {
      fixed.push(null)
    }

    fixedMapping = headersText.map((_, idx) => (idx < fixed.length ? fixed[idx] : null))
  }

  function detectFieldFromHeader(h: string): string | null {
    if (!h) return null
    if (h.includes('no') || h === '#' || h.includes('sno') || h.includes('sequence') || /^\d+$/.test(h)) return 'no'
    if (h.includes('code') || h.includes('ticker') || h.includes('symbol')) return 'code'
    if (h.includes('company') || h.includes('name') || h.includes('company name')) return 'name'
    if (h.includes('close') && !h.includes('previous')) return 'lastPrice'
    if (h.includes('% change') || (h.includes('change') && h.includes('%')) || h === '% change') return 'changePercent'
    if (h === 'change' || h.includes('chg') || (h.includes('change') && !h.includes('%'))) return 'change'
    if (h.includes('volume')) return 'volume'
    if (h.includes('value') || h.includes('value traded') || h.includes('turnover')) return 'turnover'
    if (h.includes('amplitude')) return 'amplitude'
    if (h.includes('high')) return 'high'
    if (h.includes('low')) return 'low'
    if (h.includes('open')) return 'open'
    if (h.includes('prev') || h.includes('yest')) return 'prevClose'
    if (h.includes('volume ratio') || h.includes('vol ratio') || h.includes('vol%')) return 'volumeRatio'
    if (h.includes('turnover rate') || h.includes('turnover%') || h.includes('turnover rate')) return 'turnoverRate'
    if (h.includes('pe') && !h.includes('pb')) return 'peRatio'
    if (h.includes('pb') || h.includes('price to book')) return 'pbRatio'
    if (h.includes('market cap')) return 'marketCap'
    if (h.includes('circulat') || h.includes('free float') || h.includes('float')) return 'circulatingMarketCap'
    if (h.includes('speed') || h.includes('rate of change')) return 'speed'
    if (h.includes('5m') || h.includes('5 m') || h.includes('5 min')) return 'change_5m'
    if (h.includes('60') && h.includes('day')) return 'change_60d'
    if (h.includes('ytd') || h.includes('year to date') || h.includes('year')) return 'change_ytd'
    return null
  }

  const colToField: Array<string | null> = fixedMapping ? fixedMapping : headersText.map((h) => detectFieldFromHeader(h))

  const rows = cssSelect.selectAll('tbody tr', dataTable)
  const rowElems = rows.length ? rows : cssSelect.selectAll('tr', dataTable).slice(headersText.length ? 1 : 1)

  const results: TasiCompanyDailyRecord[] = []
  rowElems.forEach((tr: any) => {
    const tds = cssSelect.selectAll('td', tr).map((td: any) => nodeText(td).trim())
    if (tds.length < 1) return

    // helper to get value by field using detected mapping
    function val(field: string): string | undefined {
      const idx = colToField.indexOf(field)
      if (idx >= 0 && idx < tds.length) return tds[idx]
      return undefined
    }

    // if no mapping was detected (all null), fall back to positional mapping
    const hasMapping = colToField.some((c) => c)
    const rec: TasiCompanyDailyRecord = {
      no: hasMapping ? parseNumber(val('no')) : parseNumber(tds[0]),
      code: (hasMapping ? val('code') || '' : tds[1] || '') || '',
      name: (hasMapping ? val('name') || '' : tds[2] || '') || '',
      lastPrice: hasMapping ? parseNumber(val('lastPrice')) : parseNumber(tds[3]),
      changePercent: hasMapping ? parsePercent(val('changePercent')) : parsePercent(tds[4]),
      change: hasMapping ? parseNumber(val('change')) : parseNumber(tds[5]),
      volume: hasMapping ? parseNumber(val('volume')) : parseNumber(tds[6]),
      turnover: hasMapping ? parseNumber(val('turnover')) : parseNumber(tds[7]),
      amplitude: hasMapping ? parsePercent(val('amplitude')) : parsePercent(tds[8]),
      high: hasMapping ? parseNumber(val('high')) : parseNumber(tds[9]),
      low: hasMapping ? parseNumber(val('low')) : parseNumber(tds[10]),
      open: hasMapping ? parseNumber(val('open')) : parseNumber(tds[11]),
      prevClose: hasMapping ? parseNumber(val('prevClose')) : parseNumber(tds[12]),
      volumeRatio: hasMapping ? parseNumber(val('volumeRatio')) : parseNumber(tds[13]),
      turnoverRate: hasMapping ? parsePercent(val('turnoverRate')) : parsePercent(tds[14]),
      peRatio: hasMapping ? parseNumber(val('peRatio')) : parseNumber(tds[15]),
      pbRatio: hasMapping ? parseNumber(val('pbRatio')) : parseNumber(tds[16]),
      marketCap: hasMapping ? parseNumber(val('marketCap')) : parseNumber(tds[17]),
      circulatingMarketCap: hasMapping ? parseNumber(val('circulatingMarketCap')) : parseNumber(tds[18]),
      numberOfTrades: hasMapping ? parseNumber(val('numberOfTrades')) : parseNumber(tds[19]),
      speed: hasMapping ? parseNumber(val('speed')) : parseNumber(tds[20]),
      change_5m: hasMapping ? parsePercent(val('change_5m')) : parsePercent(tds[20]),
      change_60d: hasMapping ? parsePercent(val('change_60d')) : parsePercent(tds[21]),
      change_ytd: hasMapping ? parsePercent(val('change_ytd')) : parsePercent(tds[22]),
      date: reportDate,
    }

    // compute derived fields when possible
    // prevClose and change can be derived from lastPrice and changePercent
    if (rec.lastPrice !== null && rec.changePercent !== null) {
      const pct = rec.changePercent
      const denom = 1 + pct / 100
      if (denom !== 0) {
        const prev = rec.lastPrice / denom
        rec.prevClose = Number(Number(prev).toFixed(6))
        rec.change = Number((rec.lastPrice - prev).toFixed(6))
      }
    }

    // amplitude = (high - low) / prevClose * 100
    if (rec.high !== null && rec.low !== null && rec.prevClose !== null && rec.prevClose !== 0) {
      rec.amplitude = Number((((rec.high - rec.low) / rec.prevClose) * 100).toFixed(4))
    }

    // turnoverRate approximated as turnover / marketCap * 100 when both present
    if (rec.turnover !== null && rec.marketCap !== null && rec.marketCap !== 0) {
      rec.turnoverRate = Number(((rec.turnover / rec.marketCap) * 100).toFixed(4))
    }

    results.push(rec)
  })

  return results
}
