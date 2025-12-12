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
