/**
 * Parse custom headers from environment variable
 * @param envVar Environment variable containing JSON string of headers
 * @returns Parsed headers object or empty object if not set or invalid
 */
export function parseCustomHeaders(envVar: string | undefined): Record<string, string> {
  if (!envVar) {
    return {}
  }

  try {
    const parsed = JSON.parse(envVar)
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      // Filter out non-string values and ensure all values are strings
      const headers: Record<string, string> = {}
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === 'string') {
          headers[key] = value
        }
      }
      return headers
    }
    return {}
  } catch {
    // Invalid JSON, return empty object
    return {}
  }
}

/**
 * Check if User-Agent indicates a CLI tool
 */
function isCLIUserAgent(userAgent: string | undefined): boolean {
  if (!userAgent) return false
  const ua = userAgent.toLowerCase()
  const cliPatterns = [
    'curl',
    'wget',
    'httpie',
    'postman',
    'insomnia',
    'rest-client',
    'http',
    'axios',
    'node-fetch',
    'got',
    'python-requests',
    'go-http-client',
    'java/',
    'okhttp',
    'apache-httpclient',
    'scrapy',
    'python-urllib',
  ]
  return cliPatterns.some((pattern) => ua.includes(pattern))
}

/**
 * Filter headers to remove CLI-related and server-exposing headers
 * This ensures requests appear to come from a browser
 * @param headers Headers object to filter
 * @returns Filtered headers object
 */
export function filterBrowserHeaders(headers: HeadersInit): HeadersInit {
  const headersToExclude = [
    'user-agent', // Always filter User-Agent, should be set separately
    'x-requested-with',
    'x-api-key',
    'x-client-version',
    'x-client-name',
    'x-tool',
    'x-sdk-version',
    'x-forwarded-for',
    'x-forwarded-host',
    'x-forwarded-proto',
    'x-real-ip',
    'cf-connecting-ip',
    'cf-ray',
    'cf-visitor',
  ]

  // Convert HeadersInit to a plain object for easier manipulation
  const headersObj: Record<string, string> = {}

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase()
      if (!headersToExclude.includes(lowerKey) && !isCLIUserAgent(value)) {
        headersObj[key] = value
      }
    })
  } else if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      const lowerKey = key.toLowerCase()
      if (!headersToExclude.includes(lowerKey) && !isCLIUserAgent(value)) {
        headersObj[key] = value
      }
    }
  } else if (headers && typeof headers === 'object' && !Array.isArray(headers)) {
    // headers is Record<string, string> at this point
    const recordHeaders = headers as Record<string, string | string[]>
    for (const [key, value] of Object.entries(recordHeaders)) {
      const lowerKey = key.toLowerCase()
      let valueStr: string
      if (typeof value === 'string') {
        valueStr = value
      } else if (Array.isArray(value)) {
        valueStr = value.join(', ')
      } else {
        valueStr = String(value)
      }
      if (!headersToExclude.includes(lowerKey) && !isCLIUserAgent(valueStr)) {
        headersObj[key] = valueStr
      }
    }
  }

  return headersObj
}
