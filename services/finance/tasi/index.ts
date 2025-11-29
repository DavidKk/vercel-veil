import { fetchWithCache } from '@/services/fetch'

import { DAILY_REPORT_HEADERS, DAILY_REPORT_URL } from './constants'
import { parseTasiCompaniesDaily } from './parseTasiCompaniesDaily'
import { parseTasiMarketSummary } from './parseTasiMarketSummary'

export async function fetchTasiCompaniesDaily() {
  const htmlContent = await fetchDailyReport()
  return parseTasiCompaniesDaily(htmlContent)
}

export async function fetchTasiMarketSummary() {
  const htmlContent = await fetchDailyReport()
  return parseTasiMarketSummary(htmlContent)
}

const textDecoder = new TextDecoder()

async function fetchDailyReport() {
  // TASI 数据更新频率较低，使用缓存减少重复抓取
  const buffer = await fetchWithCache(DAILY_REPORT_URL, {
    headers: DAILY_REPORT_HEADERS,
    cacheDuration: 5 * 60 * 1000, // 5 分钟缓存
  })

  return textDecoder.decode(buffer)
}
