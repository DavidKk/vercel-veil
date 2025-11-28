import { debug, fail } from './logger'

const DEFAULT_TIMEOUT = 30_000

export interface RequestOptions extends RequestInit {
  timeout?: number
}

export async function request(method: string, input: RequestInfo | URL, init?: RequestOptions): Promise<Response> {
  const { timeout = DEFAULT_TIMEOUT, signal, headers: initHeaders, ...rest } = init || {}
  const controller = new AbortController()
  const finalSignal = signal ?? controller.signal
  const defaultHeaders: Record<string, string> = {
    accept: 'application/json',
  }

  // Only add Content-Type for requests with body
  if (rest.body) {
    defaultHeaders['Content-Type'] = 'application/json'
  }

  const headers = new Headers({
    ...defaultHeaders,
    ...Object.fromEntries(new Headers(initHeaders || {}).entries()),
  })

  const requestInit: RequestInit = {
    method,
    ...rest,
    headers,
    signal: finalSignal,
  }

  if (process.env.NODE_ENV !== 'production') {
    const headerParts = Array.from(headers.entries()).map(([name, value]) => `  -H "${name}: ${value}"`)
    const command = [`curl -X ${method} "${input}"`, ...headerParts].join(' \\\n')
    debug(`Executing request:\n${command}`)
  }

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      controller.abort()
      const message = `Request timed out after ${timeout / 1000}s`
      fail(message)
      reject(new Error(message))
    }, timeout)
  })

  const fetchPromise = fetch(input, requestInit).catch((error) => {
    if (error.name === 'AbortError') {
      fail('Fetch aborted due to timeout')
    } else {
      fail('Fetch failed', error)
    }
    throw error
  })

  return Promise.race([fetchPromise, timeoutPromise])
}
