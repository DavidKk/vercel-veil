import { XMLParser } from 'fast-xml-parser'
import type { NextRequest } from 'next/server'

import { api } from '@/initializer/controller'
import { jsonInvalidParameters, jsonSuccess, jsonUnauthorized } from '@/initializer/response'
import { validateCookie } from '@/services/auth/access'
import { type DoubanRSSDTO, extractSeriesListFromDoubanRSSDTO } from '@/services/douban'
import { ensureAuthorized } from '@/utils/webhooks/auth'

const RSS_HEADERS = {
  accept: 'application/xhtml+xml,application/xml;',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
}

export const runtime = 'nodejs'

export const GET = api(async (req: NextRequest) => {
  // 支持两种鉴权方式：
  // 1. Cookie：浏览器页面（如 DoubanTest 页面）发起的请求
  // 2. Header Token：第三方服务（如 Sonarr/Radarr）通过自定义头部携带 token
  const hasCookie = await validateCookie()
  if (!hasCookie) {
    try {
      ensureAuthorized(req)
    } catch (error) {
      // ensureAuthorized 内部会抛出 jsonUnauthorized，这里兜底一层
      if (error && typeof error === 'object' && 'status' in error) {
        return error as any
      }
      return jsonUnauthorized()
    }
  }

  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')

  if (typeof url !== 'string' || !url) {
    return jsonInvalidParameters('url parameter is required')
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: RSS_HEADERS,
  })

  if (!response.ok) {
    return jsonInvalidParameters(`HTTP error! status: ${response.status}`)
  }

  const xmlText = await response.text()
  const parser = new XMLParser()
  const xmlDoc = parser.parse(xmlText) as DoubanRSSDTO

  const seriesList = await extractSeriesListFromDoubanRSSDTO(xmlDoc, { onlySeries: true })

  return jsonSuccess(seriesList, {
    headers: new Headers({
      'Content-Type': 'application/json;charset=UTF-8',
      'Access-Control-Allow-Origin': '*',
    }),
  })
})
