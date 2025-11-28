import * as cssSelect from 'css-select'

import type { TasiMarketSummary } from './types'
import { ensureDoc, nodeText, parseNumber } from './utils'

export function parseTasiMarketSummary(htmlOrDoc: string | any): TasiMarketSummary {
  const doc = ensureDoc(htmlOrDoc)

  // extract date from .lastUpdate if present
  let date: string | null = null
  try {
    const last = cssSelect.selectOne('.lastUpdate', doc as any)
    const lastText = last ? nodeText(last).trim() : ''
    const m1 = lastText.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/)
    if (m1) {
      const y = m1[1].padStart(4, '0')
      const mm = m1[2].padStart(2, '0')
      const dd = m1[3].padStart(2, '0')
      date = `${y}-${mm}-${dd}`
    }
  } catch (e) {
    date = null
  }

  const result: TasiMarketSummary = {
    date,
    open: null,
    high: null,
    low: null,
    close: null,
    change: null,
    changePercent: null,
    companiesTraded: null,
    volumeTraded: null,
    valueTraded: null,
    numberOfTrades: null,
    marketCap: null,
    notes: null,
  }

  // find the market summary table(s)
  const tables = cssSelect.selectAll('.market_summary_Table table, .market_summary_Table .tableStyle table, table', doc as any)

  // look for a table that contains a header 'Market Summary' nearby
  let targetTable: any = null
  for (const t of tables) {
    const text = nodeText(t).toLowerCase()
    if (text.includes('market summary')) {
      targetTable = t
      break
    }
  }

  // fallback: pick the first table that has at least one row with two cells
  if (!targetTable) {
    for (const t of tables) {
      const rows = cssSelect.selectAll('tr', t)
      if (rows && rows.length) {
        const r0 = rows[0]
        const cells = cssSelect.selectAll('td,th', r0)
        if (cells && cells.length >= 1) {
          targetTable = t
          break
        }
      }
    }
  }

  if (!targetTable) return result

  // parse rows of key/value pairs. Many rows are two-column: key in first cell, value in second
  const rows = cssSelect.selectAll('tr', targetTable)
  rows.forEach((tr: any) => {
    const cells = cssSelect.selectAll('td,th', tr)
    if (!cells || cells.length === 0) return
    // collapse cell text
    const texts = cells.map((c: any) => nodeText(c).trim()).filter(Boolean)
    if (texts.length === 1) {
      // single cell may be header like 'Market Summary' - skip
      return
    }
    if (texts.length >= 2) {
      // interpret first as key, last as value
      const rawKey = texts[0].replace(/[:\s]+$/, '')
      const key = rawKey.toLowerCase()
      const rawVal = texts[texts.length - 1]
      const num = parseNumber(rawVal)

      // map common keys to normalized field names
      switch (key) {
        case 'open':
          result.open = num
          break
        case 'high':
          result.high = num
          break
        case 'low':
          result.low = num
          break
        case 'close':
          result.close = num
          break
        case 'change':
          result.change = num
          break
        case '% change':
        case '%change':
        case 'change %':
          result.changePercent = num
          break
        case 'companies traded':
          result.companiesTraded = num !== null ? Number(num) : null
          break
        case 'volume traded':
          result.volumeTraded = num !== null ? Number(num) : null
          break
        case 'value traded  (sar)':
        case 'value traded (sar)':
        case 'value traded':
          result.valueTraded = num
          break
        case 'no. of trades':
        case 'no of trades':
        case 'number of trades':
          result.numberOfTrades = num !== null ? Number(num) : null
          break
        case 'market cap  (sar)':
        case 'market cap (sar)':
        case 'market cap':
          result.marketCap = num
          break
        default:
          // accumulate unknown entries into notes (append)
          const valForNotes = num !== null ? String(num) : rawVal
          result.notes = result.notes ? `${result.notes}; ${rawKey}: ${valForNotes}` : `${rawKey}: ${valForNotes}`
      }
    }
  })

  return result
}
